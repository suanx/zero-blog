/**
 * Webhook 异步推送服务
 *
 * 从数据库查询匹配事件的 Webhook，异步 POST 推送。
 * 支持指数退避重试（最多 3 次）。
 *
 * 使用 setTimeout 异步执行，兼容 EdgeOne Pages 环境。
 */

import { executeQuery } from "../db.js";
import { createLogger } from "../utils/logger.js";
import crypto from "crypto";

const log = createLogger("webhook");

// ── CRUD ──────────────────────────────────────────

/**
 * 注册 Webhook
 */
export async function registerWebhook({ url, events, secret }) {
  if (!url || !events || !Array.isArray(events) || events.length === 0) {
    throw new Error("url 和 events 为必填项");
  }

  const result = await executeQuery(
    `INSERT INTO webhooks (url, events, secret, active) VALUES (?, ?, ?, 1)`,
    [url, JSON.stringify(events), secret || null]
  );

  log.info("Webhook 注册成功", { id: result.lastInsertRowid, url });
  return { id: result.lastInsertRowid, url, events, active: true };
}

/**
 * 删除 Webhook
 */
export async function removeWebhook(id) {
  const existing = await executeQuery("SELECT id FROM webhooks WHERE id = ?", [id]);
  if (existing.rows.length === 0) {
    throw new Error("Webhook 不存在");
  }

  await executeQuery("DELETE FROM webhooks WHERE id = ?", [id]);
  log.info("Webhook 已删除", { id });
}

/**
 * 列出所有 Webhook
 */
export async function listWebhooks() {
  const result = await executeQuery("SELECT * FROM webhooks ORDER BY id DESC");
  return result.rows.map((row) => ({
    ...row,
    events: JSON.parse(row.events || "[]"),
    active: Boolean(row.active),
  }));
}

/**
 * 更新 Webhook
 */
export async function updateWebhook(id, data) {
  const existing = await executeQuery("SELECT id FROM webhooks WHERE id = ?", [id]);
  if (existing.rows.length === 0) {
    throw new Error("Webhook 不存在");
  }

  const sets = [];
  const args = [];

  if (data.url !== undefined) { sets.push("url = ?"); args.push(data.url); }
  if (data.events !== undefined) { sets.push("events = ?"); args.push(JSON.stringify(data.events)); }
  if (data.secret !== undefined) { sets.push("secret = ?"); args.push(data.secret); }
  if (data.active !== undefined) { sets.push("active = ?"); args.push(data.active ? 1 : 0); }

  if (sets.length === 0) return;

  args.push(id);
  await executeQuery(`UPDATE webhooks SET ${sets.join(", ")} WHERE id = ?`, args);
  log.info("Webhook 已更新", { id });
}

// ── 投递 ──────────────────────────────────────────

/**
 * 生成 Webhook 签名
 */
function generateSignature(payload, secret) {
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * 异步投递单个 Webhook
 */
async function deliverWebhook(webhook, event, payload) {
  const body = JSON.stringify({
    event,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  const headers = {
    "Content-Type": "application/json",
    "X-Webhook-Event": event,
  };

  if (webhook.secret) {
    headers["X-Webhook-Signature"] = generateSignature(body, webhook.secret);
  }

  // 记录投递
  const deliveryResult = await executeQuery(
    `INSERT INTO webhook_deliveries (webhook_id, event, payload, status, attempts) VALUES (?, ?, ?, 'pending', 0)`,
    [webhook.id, event, body]
  );
  const deliveryId = deliveryResult.lastInsertRowid;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      await executeQuery(
        `UPDATE webhook_deliveries SET status = 'success', attempts = attempts + 1 WHERE id = ?`,
        [deliveryId]
      );
      log.info("Webhook 投递成功", { webhookId: webhook.id, event, deliveryId });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    log.error("Webhook 投递失败", { webhookId: webhook.id, event, error: error.message });

    await executeQuery(
      `UPDATE webhook_deliveries SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?`,
      [error.message, deliveryId]
    );

    // 安排重试
    scheduleRetry(deliveryId, webhook, event, body, 1);
  }
}

/**
 * 指数退避重试
 */
function scheduleRetry(deliveryId, webhook, event, body, attempt) {
  const maxRetries = parseInt(process.env.WEBHOOK_MAX_RETRIES, 10) || 3;
  if (attempt > maxRetries) {
    log.warn("Webhook 重试次数用尽", { deliveryId, webhookId: webhook.id });
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // 最大 30s

  setTimeout(async () => {
    const headers = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event,
    };
    if (webhook.secret) {
      headers["X-Webhook-Signature"] = generateSignature(body, webhook.secret);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        await executeQuery(
          `UPDATE webhook_deliveries SET status = 'success', attempts = attempts + 1 WHERE id = ?`,
          [deliveryId]
        );
        log.info("Webhook 重试成功", { deliveryId, attempt });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      await executeQuery(
        `UPDATE webhook_deliveries SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [error.message, deliveryId]
      );
      scheduleRetry(deliveryId, webhook, event, body, attempt + 1);
    }
  }, delay);
}

/**
 * 分发事件到匹配的 Webhook
 * @param {string} event - 事件名（如 "post.published"）
 * @param {*} payload - 事件数据
 */
export async function dispatchWebhook(event, payload) {
  try {
    // 查询所有活跃的 webhook，且 events 包含当前事件名
    const allHooks = await executeQuery(
      `SELECT * FROM webhooks WHERE active = 1`
    );

    const matchingHooks = allHooks.rows.filter((hook) => {
      try {
        const events = JSON.parse(hook.events || "[]");
        return events.includes(event) || events.includes("*");
      } catch {
        return false;
      }
    });

    if (matchingHooks.length === 0) return;

    log.info(`分发事件 "${event}" 到 ${matchingHooks.length} 个 Webhook`);

    // 异步投递（不阻塞主流程）
    for (const hook of matchingHooks) {
      // 使用 setTimeout 异步执行，兼容 EdgeOne Pages
      setTimeout(() => {
        deliverWebhook(hook, event, payload).catch((err) => {
          log.error("Webhook 投递异常", { error: err.message });
        });
      }, 0);
    }
  } catch (error) {
    log.error("Webhook 分发失败", { event, error: error.message });
  }
}

/**
 * 重试指定投递记录
 */
export async function retryDelivery(deliveryId) {
  const result = await executeQuery(
    `SELECT d.*, w.url, w.secret FROM webhook_deliveries d
     JOIN webhooks w ON d.webhook_id = w.id
     WHERE d.id = ? AND d.status = 'failed'`,
    [deliveryId]
  );

  if (result.rows.length === 0) {
    throw new Error("投递记录不存在或已成功");
  }

  const delivery = result.rows[0];
  const webhook = { id: delivery.webhook_id, url: delivery.url, secret: delivery.secret };

  // 重置状态
  await executeQuery(
    `UPDATE webhook_deliveries SET status = 'pending', attempts = 0, last_error = NULL WHERE id = ?`,
    [deliveryId]
  );

  await deliverWebhook(webhook, delivery.event, delivery.payload);
}
