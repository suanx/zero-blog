/**
 * 系统设置 Service
 */

import { executeQuery, executeBatch } from "@/src/lib/db";
import { createLogger } from "@/src/lib/utils/logger";

const log = createLogger("settingsService");

// ── 获取所有设置 ─────────────────────────────────

export async function getAllSettings() {
  const result = await executeQuery("SELECT * FROM settings");
  const settings = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// ── 批量更新设置 ─────────────────────────────────

export async function updateSettings(data) {
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    throw new Error("请求体不能为空");
  }

  const batch = Object.entries(data).map(([key, value]) => ({
    sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, String(value)],
  }));

  await executeBatch(batch);
  log.info("设置已更新", { keys: Object.keys(data) });
}
