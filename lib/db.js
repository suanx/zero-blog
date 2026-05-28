/**
 * 数据库客户端 — @libsql/client/web
 *
 * 用法:
 *   import db, { executeQuery } from "@/lib/db";
 *
 *   // 直接使用 client
 *   const result = await db.execute("SELECT * FROM posts");
 *
 *   // 使用辅助函数（自动参数化 + 错误处理）
 *   const rows = await executeQuery("SELECT * FROM posts WHERE id = ?", [1]);
 */

import { createClient } from "@libsql/client/web";

// ── 环境变量 ──────────────────────────────────────
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// ── 懒初始化客户端 ─────────────────────────────────
// 避免模块导入时（含 build 阶段）立即连接数据库
let _client = null;

function getClient() {
  if (_client) return _client;

  if (!url) {
    console.warn(
      "[db] ⚠ TURSO_DATABASE_URL 未设置，部分功能不可用"
    );
  }

  _client = createClient({
    url: url ?? "libsql://localhost",
    authToken: authToken || undefined,
  });

  return _client;
}

// ── 辅助函数 ──────────────────────────────────────

/**
 * 执行 SQL 查询并返回标准化结果。
 *
 * @param {string}         sql    - SQL 语句，参数用 ? 占位
 * @param {Array|Object}  [params] - 绑定参数（数组或命名对象）
 * @returns {Promise<{ rows: Array, columns: string[], rowsAffected: number }>}
 */
export async function executeQuery(sql, params) {
  const client = getClient();
  try {
    const result = await client.execute(sql, params);
    return {
      rows: result.rows,
      columns: result.columns,
      rowsAffected: result.rowsAffected,
      lastInsertRowid: result.lastInsertRowid,
    };
  } catch (error) {
    console.error("[db] 查询执行失败:", {
      sql,
      params,
      code: error.code,
      message: error.message,
    });
    throw Object.assign(error, {
      _sql: sql,
      _params: params,
      _context: "executeQuery failed",
    });
  }
}

/**
 * 批量执行多条 SQL（事务）。
 *
 * @param {Array<string|{sql: string, args?: Array}>} statements
 * @param {"deferred"|"write"|"read"} [mode="write"]
 * @returns {Promise<Array>}
 */
export async function executeBatch(statements, mode = "write") {
  const client = getClient();
  try {
    const results = await client.batch(statements, mode);
    return results;
  } catch (error) {
    console.error("[db] 批量执行失败:", error.message);
    throw error;
  }
}

// 导出惰性代理：调用时才真正解析到实际 client
const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

export default db;
