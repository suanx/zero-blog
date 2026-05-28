import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, syncAssociations, validatePost, errorResponse, getAssociations } from "@/lib/api-helpers";

// ── GET /api/posts/[slug] ──────────────────────────
export async function GET(_request, { params }) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: "slug 不能为空" }, { status: 400 });

  try {
    const result = await executeQuery(
      `SELECT p.id, p.title, p.slug, p.content, p.excerpt, p.cover_image,
              p.published, p.created_at, p.updated_at, u.name AS author
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       WHERE p.slug = ?`, [slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: `文章 "${slug}" 不存在` }, { status: 404 });
    }

    const post = result.rows[0];
    const assoc = await getAssociations(post.id);

    const response = NextResponse.json({ post: { ...post, ...assoc } });
    response.headers.set("Cache-Control", "private, no-cache");
    return response;
  } catch (error) {
    return errorResponse(error, "获取文章失败");
  }
}

// ── PUT /api/posts/[slug] ──────────────────────────
export async function PUT(request, { params }) {
  const auth = verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { slug } = await params;

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const { title, slug: newSlug, content, excerpt, cover_image, published, category_ids, tag_ids } = body;

  const fields = { title, slug: newSlug, content, excerpt, cover_image, published };
  if (!Object.values(fields).some((v) => v !== undefined) && !Array.isArray(category_ids) && !Array.isArray(tag_ids)) {
    return NextResponse.json({ error: "至少需要提供一个更新字段" }, { status: 400 });
  }

  const validation = validatePost({ title, slug: newSlug, content });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: validation.status });
  }

  try {
    const existing = await executeQuery("SELECT id FROM posts WHERE slug = ?", [slug]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: `文章 "${slug}" 不存在` }, { status: 404 });
    }

    const postId = existing.rows[0].id;

    // 更新文章字段
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

    // 更新关联表
    await syncAssociations(postId, category_ids, tag_ids);

    return NextResponse.json({ message: "文章更新成功", slug: newSlug ?? slug });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: `slug "${newSlug}" 已被其他文章使用` }, { status: 409 });
    }
    return errorResponse(error, "更新文章失败");
  }
}

// ── DELETE /api/posts/[slug] ───────────────────────
export async function DELETE(_request, { params }) {
  const auth = verifyAdmin(_request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { slug } = await params;

  try {
    const existing = await executeQuery("SELECT id, title FROM posts WHERE slug = ?", [slug]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: `文章 "${slug}" 不存在` }, { status: 404 });
    }

    // 关联表有 CASCADE DELETE，无需手动清理
    await executeQuery("DELETE FROM posts WHERE slug = ?", [slug]);
    return NextResponse.json({ message: "文章已删除", slug });
  } catch (error) {
    return errorResponse(error, "删除文章失败");
  }
}
