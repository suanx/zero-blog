/**
 * 分类/标签 Service — 通用分类法 CRUD
 */

import { executeQuery } from "@/src/lib/db";
import { NotFoundError, ValidationError, ConflictError } from "@/src/lib/utils/errors";
import { isValidSlug } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";

const log = createLogger("taxonomyService");

const TABLES = {
  category: { table: "categories", junction: "post_categories", fk: "category_id" },
  tag:      { table: "tags",       junction: "post_tags",       fk: "tag_id" },
};

function resolveType(type) {
  const cfg = TABLES[type];
  if (!cfg) throw new ValidationError("type 参数必填，可选值: category | tag");
  return cfg;
}

// ── 分页列表 ─────────────────────────────────────

export async function listTaxonomy(type, { page = 1, pageSize = 20 } = {}) {
  const cfg = resolveType(type);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 20), 100);
  const offset = (safePage - 1) * safePageSize;

  const { table: t, junction: j, fk } = cfg;

  const [countResult, dataResult] = await Promise.all([
    executeQuery(`SELECT COUNT(*) AS total FROM ${t}`),
    executeQuery(
      `SELECT t.*, COUNT(j.post_id) AS post_count
       FROM ${t} t LEFT JOIN ${j} j ON t.id = j.${fk}
       GROUP BY t.id ORDER BY t.name ASC
       LIMIT ? OFFSET ?`,
      [safePageSize, offset]
    ),
  ]);

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil((countResult.rows[0]?.total || 0) / safePageSize),
  };
}

// ── 创建 ─────────────────────────────────────────

export async function createTaxonomy(type, { name, slug }) {
  const cfg = resolveType(type);

  if (!name || !slug) {
    throw new ValidationError("name 和 slug 为必填字段");
  }

  if (!isValidSlug(slug)) {
    throw new ValidationError("slug 格式无效");
  }

  // slug 唯一性校验
  const existing = await executeQuery(`SELECT id FROM ${cfg.table} WHERE slug = ?`, [slug]);
  if (existing.rows.length > 0) {
    throw new ConflictError("slug 已存在");
  }

  const result = await executeQuery(
    `INSERT INTO ${cfg.table} (name, slug) VALUES (?, ?)`,
    [name, slug]
  );

  log.info(`${cfg.table} 创建成功`, { id: result.lastInsertRowid, name });
  return { id: result.lastInsertRowid, name, slug };
}

// ── 更新 ─────────────────────────────────────────

export async function updateTaxonomy(type, id, { name, slug }) {
  const cfg = resolveType(type);

  if (name === undefined && slug === undefined) {
    throw new ValidationError("至少需要提供 name 或 slug 中的一个");
  }

  const existing = await executeQuery(`SELECT id FROM ${cfg.table} WHERE id = ?`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError(type === "category" ? "分类" : "标签", String(id));
  }

  if (slug !== undefined && !isValidSlug(slug)) {
    throw new ValidationError("slug 格式无效");
  }

  // slug 唯一性（排除自身）
  if (slug !== undefined) {
    const conflict = await executeQuery(
      `SELECT id FROM ${cfg.table} WHERE slug = ? AND id != ?`, [slug, id]
    );
    if (conflict.rows.length > 0) {
      throw new ConflictError("slug 已存在");
    }
  }

  const sets = [];
  const args = [];
  if (name !== undefined) { sets.push("name = ?"); args.push(name); }
  if (slug !== undefined) { sets.push("slug = ?"); args.push(slug); }
  args.push(id);

  await executeQuery(`UPDATE ${cfg.table} SET ${sets.join(", ")} WHERE id = ?`, args);

  const updated = await executeQuery(`SELECT * FROM ${cfg.table} WHERE id = ?`, [id]);
  log.info(`${cfg.table} 更新成功`, { id });
  return updated.rows[0];
}

// ── 删除 ─────────────────────────────────────────

export async function deleteTaxonomy(type, id) {
  const cfg = resolveType(type);

  const existing = await executeQuery(`SELECT id FROM ${cfg.table} WHERE id = ?`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError(type === "category" ? "分类" : "标签", String(id));
  }

  // 检查关联文章数
  const countResult = await executeQuery(
    `SELECT COUNT(*) AS post_count FROM ${cfg.junction} WHERE ${cfg.fk} = ?`, [id]
  );
  const postCount = countResult.rows[0]?.post_count || 0;

  if (postCount > 0) {
    const typeName = type === "category" ? "分类" : "标签";
    throw new ConflictError(`该${typeName}下有 ${postCount} 篇文章，无法删除`);
  }

  await executeQuery(`DELETE FROM ${cfg.table} WHERE id = ?`, [id]);
  log.info(`${cfg.table} 已删除`, { id });
}
