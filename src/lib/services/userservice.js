/**
 * 用户 Service — CRUD + 角色管理
 */

import { executeQuery } from "@/src/lib/db";
import { NotFoundError, ValidationError, ConflictError } from "@/src/lib/utils/errors";
import { createLogger } from "@/src/lib/utils/logger";

const log = createLogger("userService");

const ALLOWED_ROLES = ["admin", "editor", "viewer"];

// ── 分页列表 ─────────────────────────────────────

export async function listUsers({ page = 1, pageSize = 20, role } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || 20), 100);
  const offset = (safePage - 1) * safePageSize;

  const where = [];
  const params = [];

  if (role && ALLOWED_ROLES.includes(role)) {
    where.push("role = ?");
    params.push(role);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countResult, dataResult] = await Promise.all([
    executeQuery(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params),
    executeQuery(
      `SELECT id, email, name, role, created_at FROM users ${whereClause}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
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

// ── 创建用户 ─────────────────────────────────────

export async function createUser({ email, name, password, role }) {
  if (!email || !password) {
    throw new ValidationError("email 和 password 为必填项");
  }

  const userRole = ALLOWED_ROLES.includes(role) ? role : "viewer";

  try {
    // TODO: 使用 bcrypt.hash(password) 替换明文存储
    const result = await executeQuery(
      `INSERT INTO users (email, password_hash, name, role, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [email, password, name || "", userRole]
    );

    log.info("用户创建成功", { email, role: userRole });
    return { id: result.lastInsertRowid, email, role: userRole };
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || error.message?.includes("UNIQUE")) {
      throw new ConflictError(`邮箱 "${email}" 已被注册`);
    }
    throw error;
  }
}

// ── 更新用户 ─────────────────────────────────────

export async function updateUser(id, { name, role, password }) {
  if (role && !ALLOWED_ROLES.includes(role)) {
    throw new ValidationError(`role 只允许 ${ALLOWED_ROLES.join("/")}`);
  }

  const existing = await executeQuery("SELECT id FROM users WHERE id = ?", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("用户", String(id));
  }

  const setClauses = [];
  const values = [];

  if (name !== undefined)     { setClauses.push("name = ?");     values.push(name); }
  if (role !== undefined)     { setClauses.push("role = ?");     values.push(role); }
  if (password !== undefined) { setClauses.push("password_hash = ?"); values.push(password); }

  if (setClauses.length === 0) {
    throw new ValidationError("未提供任何可更新字段");
  }

  values.push(id);
  await executeQuery(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`, values);
  log.info("用户更新成功", { id });
}

// ── 删除用户 ─────────────────────────────────────

export async function deleteUser(id) {
  const existing = await executeQuery("SELECT id, role FROM users WHERE id = ?", [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError("用户", String(id));
  }

  // 防止删除最后一个管理员
  if (existing.rows[0].role === "admin") {
    const countResult = await executeQuery(
      "SELECT COUNT(*) AS total FROM users WHERE role = ?", ["admin"]
    );
    if ((countResult.rows[0]?.total || 0) <= 1) {
      throw new ValidationError("不能删除最后一个管理员");
    }
  }

  await executeQuery("DELETE FROM users WHERE id = ?", [id]);
  log.info("用户已删除", { id });
}
