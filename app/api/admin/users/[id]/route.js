import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, errorResponse } from "@/lib/api-helpers";

// ── PUT /api/admin/users/[id] ────────────────────
// Body: { name, role, password }  — password 可选
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
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { name, role, password } = body;
  const allowedRoles = ["admin", "editor", "viewer"];

  if (role && !allowedRoles.includes(role)) {
    return NextResponse.json(
      { error: `role 只允许 ${allowedRoles.join("/")}` },
      { status: 400 }
    );
  }

  try {
    // 确认用户存在
    const existing = await executeQuery("SELECT id FROM users WHERE id = ?", [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const setClauses = [];
    const values = [];

    if (name !== undefined) {
      setClauses.push("name = ?");
      values.push(name);
    }
    if (role !== undefined) {
      setClauses.push("role = ?");
      values.push(role);
    }
    if (password !== undefined) {
      // TODO: 后续应使用 bcrypt.hash(password) 替换明文存储
      setClauses.push("password_hash = ?");
      values.push(password);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "未提供任何可更新字段" }, { status: 400 });
    }

    values.push(id);
    await executeQuery(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ message: "用户更新成功", id: Number(id) });
  } catch (error) {
    return errorResponse(error, "更新用户失败");
  }
}

// ── DELETE /api/admin/users/[id] ─────────────────
// 如果目标是 admin，先查 admin 总数，仅剩 1 个则拒绝
export async function DELETE(_request, { params }) {
  const auth = verifyAdmin(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;

  try {
    // 确认用户存在
    const existing = await executeQuery("SELECT id, role FROM users WHERE id = ?", [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const targetRole = existing.rows[0].role;

    // 防止删除最后一个管理员
    if (targetRole === "admin") {
      const countResult = await executeQuery(
        "SELECT COUNT(*) AS total FROM users WHERE role = ?",
        ["admin"]
      );
      const adminCount = countResult.rows[0]?.total || 0;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "不能删除最后一个管理员" },
          { status: 400 }
        );
      }
    }

    await executeQuery("DELETE FROM users WHERE id = ?", [id]);
    return NextResponse.json({ message: "用户已删除", id: Number(id) });
  } catch (error) {
    return errorResponse(error, "删除用户失败");
  }
}
