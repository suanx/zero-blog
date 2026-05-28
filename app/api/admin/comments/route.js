import { NextResponse } from "next/server";
import { verifyAdmin, adminPaginatedQuery, errorResponse } from "@/lib/api-helpers";

// ── GET /api/admin/comments ─────────────────────────
// ?status=pending|approved|spam  → 按状态筛选
// ?post_id=数字                  → 按文章筛选
// ?page=1&pageSize=20            → 分页
export async function GET(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const postId = searchParams.get("post_id");
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("pageSize") || "20";

  try {
    const where = [];
    const params = [];

    if (status) {
      const validStatuses = ["pending", "approved", "spam"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `无效的 status 值，允许: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      where.push("c.status = ?");
      params.push(status);
    }

    if (postId) {
      const id = parseInt(postId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: "post_id 必须是数字" }, { status: 400 });
      }
      where.push("c.post_id = ?");
      params.push(id);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await adminPaginatedQuery({
      selectCols: "c.*, p.title AS post_title",
      fromClause: "comments c LEFT JOIN posts p ON c.post_id = p.id",
      whereClause,
      params,
      page,
      pageSize,
      orderBy: "c.created_at DESC",
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "获取评论列表失败");
  }
}
