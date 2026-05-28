/**
 * 环境变量统一管理
 *
 * 所有环境变量在此处读取和校验，其他模块通过 import config from "@/src/lib/config" 使用。
 * 构建时不会报错（懒求值），运行时首次访问时校验。
 */

// ── 懒初始化 ────────────────────────────────────────
let _config = null;

function loadConfig() {
  if (_config) return _config;

  _config = {
    // 数据库
    tursoUrl: process.env.TURSO_DATABASE_URL || "",
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || "",

    // 鉴权
    adminToken: process.env.ADMIN_TOKEN || "",


    // 应用
    nodeEnv: process.env.NODE_ENV || "development",
    isDev: process.env.NODE_ENV !== "production",

    // AI 插件（可选）
    aiApiKey: process.env.AI_API_KEY || "",
    aiBaseUrl: process.env.AI_BASE_URL || "",

    // Webhook
    webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT_MS, 10) || 10000,
    webhookRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES, 10) || 3,
  };

  return _config;
}

// 使用 Proxy 实现惰性求值
const config = new Proxy(
  {},
  {
    get(_target, prop) {
      const cfg = loadConfig();
      return cfg[prop];
    },
  }
);

export default config;
