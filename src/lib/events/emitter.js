/**
 * 事件发射器（增强版）
 *
 * 内存事件发射器，支持 on/off/once/emit。
 * 用于 Service 层触发领域事件，插件和 Webhook 通过监听事件执行异步操作。
 *
 * 特性：
 * - 同步 emit，异步 listener 需自行处理
 * - emit 时 catch 所有 listener 的错误（避免一个 listener 影响其他）
 * - 支持 once 一次性监听器
 * - debug 日志记录每次 emit
 */

import { createLogger } from "../utils/logger.js";

const log = createLogger("emitter");

const listeners = {};
const onceListeners = {};

/**
 * 注册事件监听
 * @param {string} event - 事件名（如 "post.created"）
 * @param {Function} handler - 回调函数 (payload) => void
 */
export function on(event, handler) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(handler);
}

/**
 * 注册一次性事件监听
 * @param {string} event - 事件名
 * @param {Function} handler - 回调函数
 */
export function once(event, handler) {
  if (!onceListeners[event]) onceListeners[event] = [];
  onceListeners[event].push(handler);
}

/**
 * 移除事件监听
 * @param {string} event - 事件名
 * @param {Function} handler - 要移除的回调函数引用
 */
export function off(event, handler) {
  if (listeners[event]) {
    listeners[event] = listeners[event].filter((h) => h !== handler);
  }
  if (onceListeners[event]) {
    onceListeners[event] = onceListeners[event].filter((h) => h !== handler);
  }
}

/**
 * 触发事件
 * @param {string} event - 事件名
 * @param {*} payload - 事件数据
 */
export function emit(event, payload) {
  log.debug(`触发事件: ${event}`);

  // 执行持久监听器
  const handlers = listeners[event] || [];
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (err) {
      log.error(`事件 "${event}" 监听器执行出错`, { error: err.message });
    }
  }

  // 执行一次性监听器（执行后移除）
  const onceHandlers = onceListeners[event] || [];
  if (onceHandlers.length > 0) {
    onceListeners[event] = [];
    for (const handler of onceHandlers) {
      try {
        handler(payload);
      } catch (err) {
        log.error(`事件 "${event}" 一次性监听器执行出错`, { error: err.message });
      }
    }
  }
}

/**
 * 获取事件的监听器数量（用于调试）
 */
export function listenerCount(event) {
  const regular = listeners[event]?.length || 0;
  const once = onceListeners[event]?.length || 0;
  return regular + once;
}

export const emitter = { on, off, once, emit, listenerCount };
export default emitter;
