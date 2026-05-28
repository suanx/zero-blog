/**
 * 仪表盘统计 Service
 */

import { executeQuery } from "@/src/lib/db";
import { createLogger } from "@/src/lib/utils/logger";

const log = createLogger("statsService");

export async function getStats() {
  const [
    postsRow,
    commentsRow,
    usersRow,
    categoriesRow,
    tagsRow,
    trend,
    recent_comments,
    popular_posts,
  ] = await Promise.all([
    executeQuery("SELECT COUNT(*) AS total_posts FROM posts"),
    executeQuery("SELECT COUNT(*) AS total_comments FROM comments"),
    executeQuery("SELECT COUNT(*) AS total_users FROM users"),
    executeQuery("SELECT COUNT(*) AS total_categories FROM categories"),
    executeQuery("SELECT COUNT(*) AS total_tags FROM tags"),
    executeQuery(
      "SELECT date(created_at) AS day, COUNT(*) AS count FROM posts WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at) ORDER BY day"
    ),
    executeQuery(
      "SELECT c.*, p.title AS post_title FROM comments c LEFT JOIN posts p ON c.post_id = p.id ORDER BY c.created_at DESC LIMIT 5"
    ),
    executeQuery(
      "SELECT id, title, slug, views, created_at FROM posts ORDER BY views DESC LIMIT 5"
    ),
  ]);

  // 补全近 7 天缺失日期
  const trendMap = new Map();
  for (const row of trend.rows) {
    trendMap.set(row.day, row.count);
  }

  const filledTrend = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    filledTrend.push({ day: dayStr, count: trendMap.get(dayStr) || 0 });
  }

  return {
    total_posts: postsRow.rows[0]?.total_posts ?? 0,
    total_comments: commentsRow.rows[0]?.total_comments ?? 0,
    total_users: usersRow.rows[0]?.total_users ?? 0,
    total_categories: categoriesRow.rows[0]?.total_categories ?? 0,
    total_tags: tagsRow.rows[0]?.total_tags ?? 0,
    trend: filledTrend,
    recent_comments: recent_comments.rows,
    popular_posts: popular_posts.rows,
  };
}
