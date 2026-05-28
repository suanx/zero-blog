/**
 * 结构化日志
 *
 * 带 request context 的结构化日志，支持不同级别和模块标识。
 * 格式: [LEVEL] [module] message { metadata }
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || "info"] ?? LOG_LEVELS.info;

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, module, message, meta) {
  const ts = formatTimestamp();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${module}]`;
  if (meta && Object.keys(meta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
  }
  return `${prefix} ${message}`;
}

/**
 * 创建模块化 logger
 * @param {string} moduleName - 模块名（如 "postService", "auth"）
 * @returns {object} logger 实例
 */
export function createLogger(moduleName) {
  return {
    debug(message, meta) {
      if (currentLevel <= LOG_LEVELS.debug) {
        console.debug(formatMessage("debug", moduleName, message, meta));
      }
    },

    info(message, meta) {
      if (currentLevel <= LOG_LEVELS.info) {
        console.log(formatMessage("info", moduleName, message, meta));
      }
    },

    warn(message, meta) {
      if (currentLevel <= LOG_LEVELS.warn) {
        console.warn(formatMessage("warn", moduleName, message, meta));
      }
    },

    error(message, meta) {
      if (currentLevel <= LOG_LEVELS.error) {
        console.error(formatMessage("error", moduleName, message, meta));
      }
    },

    /**
     * 记录请求上下文
     */
    request(method, path, meta) {
      this.info(`${method} ${path}`, meta);
    },

    /**
     * 计时器 — 测量操作耗时
     */
    timer(label) {
      const start = performance.now();
      return () => {
        const elapsed = Math.round(performance.now() - start);
        this.debug(`${label} 完成`, { elapsed: `${elapsed}ms` });
        return elapsed;
      };
    },
  };
}

// 默认 logger
const logger = createLogger("app");
export default logger;
