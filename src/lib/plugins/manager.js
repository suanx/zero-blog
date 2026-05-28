/**
 * 插件管理器骨架
 *
 * 提供插件注册、钩子管理功能。
 * 插件通过 hooks 对象声明式注册事件处理。
 */

import { on } from "../events/emitter.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("plugin-manager");

// 已注册的插件
const registeredPlugins = new Map();

// 钩子回调存储
const hooks = {};

/**
 * 注册插件
 * @param {string} name - 插件唯一名称
 * @param {object} plugin - 插件对象 { name, init?, hooks: { eventName: async fn } }
 */
export function register(name, plugin) {
  if (registeredPlugins.has(name)) {
    log.warn(`插件 "${name}" 已注册，将被覆盖`);
    unregister(name);
  }

  const pluginInstance = { ...plugin, name };

  // 调用 init（如果有）
  if (typeof pluginInstance.init === "function") {
    try {
      pluginInstance.init();
      log.info(`插件 "${name}" 初始化完成`);
    } catch (err) {
      log.error(`插件 "${name}" 初始化失败`, { error: err.message });
      return;
    }
  }

  // 注册钩子到事件发射器
  if (pluginInstance.hooks && typeof pluginInstance.hooks === "object") {
    for (const [eventName, handler] of Object.entries(pluginInstance.hooks)) {
      if (typeof handler !== "function") continue;

      if (!hooks[eventName]) hooks[eventName] = [];
      hooks[eventName].push({ pluginName: name, handler });

      // 注册到事件发射器
      on(eventName, (payload) => {
        try {
          handler(payload);
        } catch (err) {
          log.error(`插件 "${name}" 钩子 "${eventName}" 执行出错`, { error: err.message });
        }
      });
    }
  }

  registeredPlugins.set(name, pluginInstance);
  log.info(`插件 "${name}" 注册成功`);
}

/**
 * 注销插件
 */
export function unregister(name) {
  if (!registeredPlugins.has(name)) return;
  registeredPlugins.delete(name);

  // 移除钩子
  for (const [eventName, hookList] of Object.entries(hooks)) {
    hooks[eventName] = hookList.filter((h) => h.pluginName !== name);
    if (hooks[eventName].length === 0) {
      delete hooks[eventName];
    }
  }

  log.info(`插件 "${name}" 已注销`);
}

/**
 * 执行钩子链（依次执行所有注册的钩子）
 * @param {string} hookName - 钩子名
 * @param {*} payload - 钩子数据
 */
export async function runHook(hookName, payload) {
  const hookList = hooks[hookName] || [];
  if (hookList.length === 0) return payload;

  let result = payload;
  for (const { pluginName, handler } of hookList) {
    try {
      result = (await handler(result)) || result;
    } catch (err) {
      log.error(`钩子 "${hookName}" 在插件 "${pluginName}" 中执行出错`, { error: err.message });
    }
  }
  return result;
}

/**
 * 列出已注册的插件
 */
export function listPlugins() {
  return Array.from(registeredPlugins.keys());
}

/**
 * 检查插件是否已注册
 */
export function hasPlugin(name) {
  return registeredPlugins.has(name);
}

export const pluginManager = {
  register,
  unregister,
  runHook,
  listPlugins,
  hasPlugin,
};

export default pluginManager;
