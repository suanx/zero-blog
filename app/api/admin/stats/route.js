import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, errorResponse } from "@/lib/api-helpers";

// ── GET /api/admin/stats ───────────────────────────
// 返回聚合统计数据
export async function GET(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
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

    // 补全近 7 天缺失日期（count 为 0）
    const trendMap = new Map();
    for (const row of trend) {
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

    const stats = {
      total_posts: postsRow[0]?.total_posts ?? 0,
      total_comments: commentsRow[0]?.total_comments ?? 0,
      total_users: usersRow[0]?.total_users ?? 0,
      total_categories: categoriesRow[0]?.total_categories ?? 0,
      total_tags: tagsRow[0]?.total_tags ?? 0,
      trend: filledTrend,
      recent_comments,
      popular_posts,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    return errorResponse(error, "获取统计数据失败");
  }
}
