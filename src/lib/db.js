/**
 * 数据库客户端 — @libsql/client/web（增强版）
 *
 * 从 lib/db.js 迁移，增加事务辅助函数。
 * 用法:
 *   import db, { executeQuery, executeBatch, transaction } from "@/src/lib/db";
 */

import { createClient } from "@libsql/client/web";

// ── 环境变量 ──────────────────────────────────────
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// ── 懒初始化客户端 ─────────────────────────────────
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

/**
 * 事务辅助函数 — 在回调中执行多条语句，失败自动回滚。
 *
 * @param {Function} fn - async 回调，接收 { executeQuery, executeBatch }
 * @returns {Promise<*>} 回调返回值
 */
export async function transaction(fn) {
  const client = getClient();
  const tx = await client.transaction("write");
  try {
    const result = await fn({
      executeQuery: async (sql, params) => {
        return tx.execute(sql, params);
      },
      executeBatch: async (statements) => {
        return tx.batch(statements);
      },
    });
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
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
