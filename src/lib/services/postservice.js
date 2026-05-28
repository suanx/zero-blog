/**
 * 文章 Service — CRUD + 关联同步 + 版本历史
 */

import { executeQuery, executeBatch } from "@/src/lib/db";
import { NotFoundError, ValidationError, ConflictError } from "@/src/lib/utils/errors";
import { isValidSlug } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import { emitter } from "@/src/lib/events/emitter";

const log = createLogger("postService");

// ── 关联表映射 ────────────────────────────────────
const ASSOC = {
  categories: { junction: "post_categories", fk: "category_id", target: "categories" },
  tags:       { junction: "post_tags",       fk: "tag_id",      target: "tags" },
};

// ── 分页列表 ──────────────────────────────────────

export async function listPosts({ page = 1, pageSize = 10, category, tag, published } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 10), 100);
  const offset = (safePage - 1) * safePageSize;

  const where = [];
  const params = [];

  if (published !== undefined) {
    where.push("p.published = ?");
    params.push(published ? 1 : 0);
  }

  if (category) {
    where.push(`EXISTS (SELECT 1 FROM post_categories pc
      JOIN categories c ON pc.category_id = c.id
      WHERE pc.post_id = p.id AND c.slug = ?)`);
    params.push(category);
  }

  if (tag) {
    where.push(`EXISTS (SELECT 1 FROM post_tags pt
      JOIN tags t ON pt.tag_id = t.id
      WHERE pt.post_id = p.id AND t.slug = ?)`);
    params.push(tag);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countResult, dataResult] = await Promise.all([
    executeQuery(`SELECT COUNT(*) AS total FROM posts p ${whereClause}`, params),
    executeQuery(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image,
              p.published, p.created_at, p.updated_at, u.name AS author
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset]
    ),
  ]);

  const total = countResult.rows[0]?.total || 0;
  const posts = dataResult.rows;

  // 批量获取关联
  const postIds = posts.map((r) => r.id);
  const associations = postIds.length > 0 ? await getPostAssociations(postIds) : {};

  const enrichedPosts = posts.map((r) => ({
    ...r,
    categories: associations[r.id]?.categories || [],
    tags: associations[r.id]?.tags || [],
  }));

  return {
    posts: enrichedPosts,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
  };
}

// ── 按 slug 获取 ─────────────────────────────────

export async function getPostBySlug(slug) {
  const result = await executeQuery(
    `SELECT p.id, p.title, p.slug, p.content, p.excerpt, p.cover_image,
            p.published, p.views, p.created_at, p.updated_at, u.name AS author
     FROM posts p LEFT JOIN users u ON p.author_id = u.id
     WHERE p.slug = ?`, [slug]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("文章", slug);
  }

  const post = result.rows[0];
  const assoc = await getPostAssociations([post.id]);
  return { ...post, ...(assoc[post.id] || { categories: [], tags: [] }) };
}

// ── 按 ID 获取 ───────────────────────────────────

export async function getPostById(id) {
  const result = await executeQuery(
    `SELECT p.id, p.title, p.slug, p.content, p.excerpt, p.cover_image,
            p.published, p.views, p.created_at, p.updated_at, u.name AS author
     FROM posts p LEFT JOIN users u ON p.author_id = u.id
     WHERE p.id = ?`, [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("文章", String(id));
  }

  const post = result.rows[0];
  const assoc = await getPostAssociations([post.id]);
  return { ...post, ...(assoc[post.id] || { categories: [], tags: [] }) };
}

// ── 创建文章 ─────────────────────────────────────

export async function createPost(data) {
  const { title, slug, content, excerpt, cover_image, published, author_id, category_ids, tag_ids } = data;

  if (!title || !slug) {
    throw new ValidationError("title 和 slug 为必填字段");
  }

  if (!isValidSlug(slug)) {
    throw new ValidationError("slug 格式无效，仅允许小写字母、数字和连字符");
  }

  try {
    const result = await executeQuery(
      `INSERT INTO posts (title, slug, content, excerpt, cover_image, published, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, content ?? "", excerpt ?? "", cover_image ?? "", published ? 1 : 0, author_id ?? 1]
    );

    const postId = result.lastInsertRowid;

    // 同步关联
    if (Array.isArray(category_ids) || Array.isArray(tag_ids)) {
      await syncAssociations(postId, category_ids, tag_ids);
    }

    // 记录版本
    await createVersion(postId, { title, content: content ?? "" }, author_id);

    // 触发事件
    emitter.emit("post.created", { id: postId, slug, title });

    log.info("文章创建成功", { id: postId, slug });
    return { id: postId, slug };
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || error.message?.includes("UNIQUE")) {
      throw new ConflictError(`slug "${slug}" 已存在`);
    }
    throw error;
  }
}

// ── 更新文章 ─────────────────────────────────────

export async function updatePost(slug, data) {
  const { title, slug: newSlug, content, excerpt, cover_image, published, author_id, category_ids, tag_ids } = data;

  const existing = await executeQuery("SELECT id FROM posts WHERE slug = ?", [slug]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("文章", slug);
  }

  const postId = existing.rows[0].id;

  if (newSlug && !isValidSlug(newSlug)) {
    throw new ValidationError("slug 格式无效");
  }

  const setClauses = [];
  const values = [];

  if (title !== undefined)       { setClauses.push("title = ?");       values.push(title); }
  if (newSlug !== undefined)     { setClauses.push("slug = ?");        values.push(newSlug); }
  if (content !== undefined)     { setClauses.push("content = ?");     values.push(content); }
  if (excerpt !== undefined)     { setClauses.push("excerpt = ?");     values.push(excerpt); }
  if (cover_image !== undefined) { setClauses.push("cover_image = ?"); values.push(cover_image); }
  if (published !== undefined)   { setClauses.push("published = ?");   values.push(published ? 1 : 0); }

  if (setClauses.length) {
    setClauses.push("updated_at = datetime('now')");
    values.push(slug);
    await executeQuery(`UPDATE posts SET ${setClauses.join(", ")} WHERE slug = ?`, values);
  }

  // 同步关联
  if (Array.isArray(category_ids) || Array.isArray(tag_ids)) {
    await syncAssociations(postId, category_ids, tag_ids);
  }

  // 记录版本
  if (title !== undefined || content !== undefined) {
    const current = await executeQuery("SELECT title, content FROM posts WHERE id = ?", [postId]);
    await createVersion(postId, {
      title: title ?? current.rows[0]?.title,
      content: content ?? current.rows[0]?.content,
    }, author_id);
  }

  emitter.emit("post.updated", { id: postId, slug: newSlug ?? slug });
  log.info("文章更新成功", { id: postId, slug: newSlug ?? slug });

  return { slug: newSlug ?? slug };
}

// ── 删除文章 ─────────────────────────────────────

export async function deletePost(slug) {
  const existing = await executeQuery("SELECT id, title FROM posts WHERE slug = ?", [slug]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("文章", slug);
  }

  const postId = existing.rows[0].id;

  // 批量清理关联
  await executeBatch([
    { sql: "DELETE FROM post_categories WHERE post_id = ?", args: [postId] },
    { sql: "DELETE FROM post_tags WHERE post_id = ?", args: [postId] },
    { sql: "DELETE FROM post_versions WHERE post_id = ?", args: [postId] },
    { sql: "DELETE FROM posts WHERE id = ?", args: [postId] },
  ]);

  emitter.emit("post.deleted", { id: postId, slug });
  log.info("文章已删除", { slug });
}

// ── 批量获取关联 ─────────────────────────────────

export async function getPostAssociations(postIds) {
  if (!postIds.length) return {};

  const ph = postIds.map(() => "?").join(",");
  const [catRes, tagRes] = await Promise.all([
    executeQuery(
      `SELECT pc.post_id, c.id, c.name, c.slug
       FROM post_categories pc JOIN categories c ON pc.category_id = c.id
       WHERE pc.post_id IN (${ph})`, postIds
    ),
    executeQuery(
      `SELECT pt.post_id, t.id, t.name, t.slug
       FROM post_tags pt JOIN tags t ON pt.tag_id = t.id
       WHERE pt.post_id IN (${ph})`, postIds
    ),
  ]);

  const map = {};
  for (const id of postIds) map[id] = { categories: [], tags: [] };
  for (const r of catRes.rows) map[r.post_id].categories.push({ id: r.id, name: r.name, slug: r.slug });
  for (const r of tagRes.rows) map[r.post_id].tags.push({ id: r.id, name: r.name, slug: r.slug });
  return map;
}

// ── 同步关联 ─────────────────────────────────────

export async function syncAssociations(postId, categoryIds, tagIds) {
  const batch = [];

  if (Array.isArray(categoryIds)) {
    batch.push({ sql: "DELETE FROM post_categories WHERE post_id = ?", args: [postId] });
    for (const cid of categoryIds) {
      batch.push({ sql: "INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)", args: [postId, cid] });
    }
  }
  if (Array.isArray(tagIds)) {
    batch.push({ sql: "DELETE FROM post_tags WHERE post_id = ?", args: [postId] });
    for (const tid of tagIds) {
      batch.push({ sql: "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)", args: [postId, tid] });
    }
  }

  if (batch.length > 0) {
    await executeBatch(batch);
  }
}

// ── 版本记录 ─────────────────────────────────────

export async function createVersion(postId, { title, content }, authorId) {
  const maxVersion = await executeQuery(
    "SELECT MAX(version) AS max_v FROM post_versions WHERE post_id = ?", [postId]
  );
  const nextVersion = (maxVersion.rows[0]?.max_v || 0) + 1;

  await executeQuery(
    `INSERT INTO post_versions (post_id, version, title, content, author_id)
     VALUES (?, ?, ?, ?, ?)`,
    [postId, nextVersion, title, content, authorId ?? null]
  );
}
