import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, errorResponse } from "@/lib/api-helpers";

// ── PUT /api/admin/comments/[id] ────────────────────
// 更新评论状态: { status: "approved" | "spam" }
export async function PUT(request, { params }) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const { status } = body;

  if (!status || !["approved", "spam"].includes(status)) {
    return NextResponse.json(
      { error: "无效的 status 值，允许: approved, spam" },
      { status: 400 }
    );
  }

  try {
    const existing = await executeQuery("SELECT id FROM comments WHERE id = ?", [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: `评论 #${id} 不存在` }, { status: 404 });
    }

    await executeQuery("UPDATE comments SET status = ? WHERE id = ?", [status, id]);

    return NextResponse.json({ message: "评论状态已更新", id: Number(id), status });
  } catch (error) {
    return errorResponse(error, "更新评论状态失败");
  }
}

// ── DELETE /api/admin/comments/[id] ──────────────────
export async function DELETE(_request, { params }) {
  const auth = verifyAdmin(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const existing = await executeQuery("SELECT id FROM comments WHERE id = ?", [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: `评论 #${id} 不存在` }, { status: 404 });
    }

    await executeQuery("DELETE FROM comments WHERE id = ?", [id]);

    return NextResponse.json({ message: "评论已删除", id: Number(id) });
  } catch (error) {
    return errorResponse(error, "删除评论失败");
  }
}
