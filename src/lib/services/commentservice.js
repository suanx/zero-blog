/**
 * 评论 Service — CRUD + 状态管理
 */

import { executeQuery } from "@/src/lib/db";
import { NotFoundError, ValidationError } from "@/src/lib/utils/errors";
import { createLogger } from "@/src/lib/utils/logger";

const log = createLogger("commentService");

const VALID_STATUSES = ["pending", "approved", "spam"];

// ── 分页列表（管理员） ───────────────────────────

export async function listComments({ page = 1, pageSize = 20, status, postId } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 20), 100);
  const offset = (safePage - 1) * safePageSize;

  const where = [];
  const params = [];

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError(`无效的 status 值，允许: ${VALID_STATUSES.join(", ")}`);
    }
    where.push("c.status = ?");
    params.push(status);
  }

  if (postId) {
    where.push("c.post_id = ?");
    params.push(parseInt(postId, 10));
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countResult, dataResult] = await Promise.all([
    executeQuery(`SELECT COUNT(*) AS total FROM comments c ${whereClause}`, params),
    executeQuery(
      `SELECT c.*, p.title AS post_title
       FROM comments c LEFT JOIN posts p ON c.post_id = p.id
       ${whereClause}
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset]
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

// ── 创建评论（公开） ─────────────────────────────

export async function createComment({ post_id, author_name, author_email, content }) {
  if (!post_id || !author_name || !content) {
    throw new ValidationError("post_id, author_name, content 为必填字段");
  }

  // 检查文章是否存在
  const post = await executeQuery("SELECT id FROM posts WHERE id = ?", [post_id]);
  if (post.rows.length === 0) {
    throw new NotFoundError("文章", String(post_id));
  }

  const result = await executeQuery(
    `INSERT INTO comments (post_id, author_name, author_email, content, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [post_id, author_name, author_email || "", content]
  );

  log.info("评论创建成功", { id: result.lastInsertRowid, post_id });
  return { id: result.lastInsertRowid, status: "pending" };
}

// ── 更新评论状态 ─────────────────────────────────

export async function updateCommentStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new ValidationError(`无效的 status 值，允许: ${VALID_STATUSES.join(", ")}`);
  }

  const existing = await executeQuery("SELECT id FROM comments WHERE id = ?", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("评论", String(id));
  }

  await executeQuery("UPDATE comments SET status = ? WHERE id = ?", [status, id]);
  log.info("评论状态已更新", { id, status });
}

// ── 删除评论 ─────────────────────────────────────

export async function deleteComment(id) {
  const existing = await executeQuery("SELECT id FROM comments WHERE id = ?", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("评论", String(id));
  }

  await executeQuery("DELETE FROM comments WHERE id = ?", [id]);
  log.info("评论已删除", { id });
}
