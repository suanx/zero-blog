/**
 * AI 辅助插件
 *
 * 骨架实现，提供以下钩子：
 * - post.created: 自动为新文章生成摘要、建议标签
 * - post.updated: 可选的 SEO 优化建议
 *
 * TODO: 接入实际 AI API（OpenAI / Claude / 通义千问）
 */

import { createLogger } from "../utils/logger.js";
import { executeQuery } from "../db.js";

const log = createLogger("ai-plugin");

/**
 * 模拟 AI 生成摘要
 * 从文章内容中提取前 160 个字符作为摘要
 */
function generateExcerpt(content, maxLength = 160) {
  if (!content) return "";

  // 移除 Markdown 标记
  const plain = content
    .replace(/#{1,6}\s/g, "")     // 标题
    .replace(/\*\*(.*?)\*\*/g, "$1") // 粗体
    .replace(/\*(.*?)\*/g, "$1")     // 斜体
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // 代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 链接
    .replace(/\n+/g, " ")            // 换行
    .trim();

  return plain.length > maxLength ? plain.slice(0, maxLength) + "..." : plain;
}

/**
 * 模拟 AI 建议标签
 * 基于内容关键词分析（简化版）
 */
function suggestTags(content, title) {
  const text = `${title || ""} ${content || ""}`.toLowerCase();
  const suggestions = [];

  const keywordMap = {
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "vue": "Vue",
    "node": "Node.js",
    "node.js": "Node.js",
    "python": "Python",
    "css": "CSS",
    "html": "HTML",
    "database": "数据库",
    "sql": "SQL",
    "turso": "Turso",
    "sqlite": "SQLite",
    "docker": "Docker",
    "api": "API",
    "前端": "前端",
    "后端": "后端",
    "性能": "性能优化",
    "security": "安全",
  };

  for (const [keyword, tag] of Object.entries(keywordMap)) {
    if (text.includes(keyword) && !suggestions.includes(tag)) {
      suggestions.push(tag);
    }
  }

  return suggestions.slice(0, 5); // 最多 5 个标签
}

/**
 * AI 插件定义
 */
export const aiPlugin = {
  name: "ai-assistant",

  init() {
    log.info("AI 辅助插件已加载");
  },

  hooks: {
    /**
     * 文章创建后自动处理
     */
    "post.created": async (payload) => {
      const { id, slug, title, content, excerpt } = payload;

      log.info(`AI 处理新文章: ${slug}`);

      const updates = {};

      // 如果 excerpt 为空，自动生成
      if (!excerpt && content) {
        updates.excerpt = generateExcerpt(content);
        log.info(`自动生成摘要`, { slug, excerptLength: updates.excerpt.length });
      }

      // TODO: 建议标签并自动关联
      // const suggestedTags = suggestTags(content, title);
      // if (suggestedTags.length > 0) {
      //   await autoAssociateTags(id, suggestedTags);
      // }

      // 如果有更新，写入数据库
      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map((k) => `${k} = ?`);
        const values = Object.values(updates);
        values.push(id);

        await executeQuery(
          `UPDATE posts SET ${setClauses.join(", ")} WHERE id = ?`,
          values
        );
      }

      return payload;
    },

    /**
     * 文章更新后可选的 SEO 处理
     */
    "post.updated": async (payload) => {
      log.debug(`AI 检查文章更新: ${payload.slug}`);
      // TODO: 生成 SEO 建议、检查内容质量
      return payload;
    },
  },
};

export default aiPlugin;
