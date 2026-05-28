/**
 * 文章翻译 Service
 */

import { executeQuery } from "@/src/lib/db";
import { NotFoundError, ValidationError } from "@/src/lib/utils/errors";
import { createLogger } from "@/src/lib/utils/logger";

const log = createLogger("translationService");

const VALID_LOCALES = ["en", "zh", "ja", "ko", "fr", "de", "es"];

// ── 获取文章所有翻译 ─────────────────────────────

export async function getTranslations(postId) {
  const result = await executeQuery(
    "SELECT * FROM post_translations WHERE post_id = ? ORDER BY locale",
    [postId]
  );
  return result.rows;
}

// ── 获取指定翻译 ─────────────────────────────────

export async function getTranslation(postId, locale) {
  const result = await executeQuery(
    "SELECT * FROM post_translations WHERE post_id = ? AND locale = ?",
    [postId, locale]
  );
  return result.rows[0] || null;
}

// ── 创建或更新翻译 ───────────────────────────────

export async function upsertTranslation(postId, locale, { title, content, excerpt }) {
  if (!VALID_LOCALES.includes(locale)) {
    throw new ValidationError(`locale 值无效，允许: ${VALID_LOCALES.join(", ")}`);
  }

  if (!title) {
    throw new ValidationError("title 为必填字段");
  }

  // 检查文章是否存在
  const post = await executeQuery("SELECT id FROM posts WHERE id = ?", [postId]);
  if (post.rows.length === 0) {
    throw new NotFoundError("文章", String(postId));
  }

  // 尝试更新
  const updateResult = await executeQuery(
    `UPDATE post_translations SET title = ?, content = ?, excerpt = ?
     WHERE post_id = ? AND locale = ?`,
    [title, content ?? "", excerpt ?? "", postId, locale]
  );

  if (updateResult.rowsAffected === 0) {
    // 不存在则插入
    await executeQuery(
      `INSERT INTO post_translations (post_id, locale, title, content, excerpt)
       VALUES (?, ?, ?, ?, ?)`,
      [postId, locale, title, content ?? "", excerpt ?? ""]
    );
  }

  log.info("翻译已保存", { postId, locale });

  // 返回最新数据
  return getTranslation(postId, locale);
}
