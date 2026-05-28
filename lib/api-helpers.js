/**
 * API 公共模块 — Token 验证、关联同步、校验、错误处理、分页
 *
 * 用法:
 *   import { verifyAdmin, syncAssociations, validatePost, errorResponse, paginatedQuery } from "@/lib/api-helpers";
 */

import { NextResponse } from "next/server";
import { executeQuery, executeBatch } from "@/lib/db";
import crypto from "crypto";

// ── Token 安全比较（防时序攻击） ──────────────────
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ── Token 验证 ────────────────────────────────────
export function verifyAdmin(request) {
  const token = request.headers.get("admin-token");
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    return { ok: false, status: 500, message: "ADMIN_TOKEN 未配置" };
  }
  if (!token) {
    return { ok: false, status: 401, message: "未授权：缺少 Admin-Token" };
  }
  if (!safeEqual(token, expected)) {
    return { ok: false, status: 401, message: "未授权：Admin-Token 无效" };
  }
  return { ok: true };
}

// ── 批量获取文章的分类和标签 ──────────────────────
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

// ── 获取单篇文章的分类和标签 ──────────────────────
export async function getAssociations(postId) {
  const [catRes, tagRes] = await Promise.all([
    executeQuery(
      `SELECT c.id, c.name, c.slug FROM post_categories pc
       JOIN categories c ON pc.category_id = c.id WHERE pc.post_id = ?`, [postId]
    ),
    executeQuery(
      `SELECT t.id, t.name, t.slug FROM post_tags pt
       JOIN tags t ON pt.tag_id = t.id WHERE pt.post_id = ?`, [postId]
    ),
  ]);
  return { categories: catRes.rows, tags: tagRes.rows };
}

// ── 同步关联表（使用 batch 批量操作） ─────────────
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

// ── 校验文章字段 ──────────────────────────────────
export function validatePost(body, { required = false } = {}) {
  const { title, slug, content } = body;

  if (required) {
    if (!title || !slug) {
      return { ok: false, status: 400, message: "缺少必填字段", required: ["title", "slug"] };
    }
  }

  if (slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, status: 400, message: "slug 格式无效，仅允许小写字母、数字和连字符" };
  }

  if (title !== undefined && title.length > 200) {
    return { ok: false, status: 400, message: "标题长度不能超过 200 个字符" };
  }

  if (content !== undefined && content.length > 1_000_000) {
    return { ok: false, status: 400, message: "内容长度不能超过 1,000,000 个字符" };
  }

  return { ok: true };
}

// ── 错误响应（生产模式不泄露内部错误） ────────────
export function errorResponse(error, userMessage) {
  console.error("[API]", error);
  const isDev = process.env.NODE_ENV === "development";
  return NextResponse.json(
    { error: userMessage, ...(isDev ? { detail: error.message } : {}) },
    { status: 500 }
  );
}

// ── 分页查询 ──────────────────────────────────────
export async function paginatedQuery({ selectCols, fromClause, whereClause, params = [], page = 1, pageSize = 10 }) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 10), 100);
  const offset = (safePage - 1) * safePageSize;

  // 查询总数
  const countResult = await executeQuery(
    `SELECT COUNT(*) AS total FROM ${fromClause} ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.total || 0;

  // 查询数据
  const dataResult = await executeQuery(
    `SELECT ${selectCols} FROM ${fromClause} ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  return {
    posts: dataResult.rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
  };
}

// ── 通用管理后台分页查询 ──────────────────────────
export async function adminPaginatedQuery({
  selectCols,
  fromClause,
  whereClause = "",
  params = [],
  page = 1,
  pageSize = 20,
  orderBy = "id DESC",
}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 20), 100);
  const offset = (safePage - 1) * safePageSize;

  const countResult = await executeQuery(
    `SELECT COUNT(*) AS total FROM ${fromClause} ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.total || 0;

  const dataResult = await executeQuery(
    `SELECT ${selectCols} FROM ${fromClause} ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  return {
    rows: dataResult.rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
  };
}
