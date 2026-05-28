import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, adminPaginatedQuery, errorResponse } from "@/lib/api-helpers";

// ── GET /api/admin/users ─────────────────────────
// ?role=admin|editor|viewer  → 按角色筛选
// ?page=&pageSize=           → 分页
export async function GET(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || 1;
  const pageSize = searchParams.get("pageSize") || 20;
  const role = searchParams.get("role");

  try {
    const whereParts = [];
    const params = [];

    if (role && ["admin", "editor", "viewer"].includes(role)) {
      whereParts.push("role = ?");
      params.push(role);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const result = await adminPaginatedQuery({
      selectCols: "id, email, name, role, created_at",
      fromClause: "users",
      whereClause,
      params,
      page,
      pageSize,
      orderBy: "id DESC",
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "获取用户列表失败");
  }
}

// ── POST /api/admin/users ────────────────────────
// Body: { email, name, password, role }
export async function POST(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { email, name, password, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "email 和 password 为必填项" }, { status: 400 });
  }

  const allowedRoles = ["admin", "editor", "viewer"];
  const userRole = allowedRoles.includes(role) ? role : "viewer";

  try {
    const result = await executeQuery(
      `INSERT INTO users (email, password_hash, name, role, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      // TODO: 后续应使用 bcrypt.hash(password) 替换明文存储
      [email, password, name || "", userRole]
    );

    return NextResponse.json(
      { message: "用户创建成功", id: result.rows[0]?.id },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: `邮箱 "${email}" 已被注册` }, { status: 409 });
    }
    return errorResponse(error, "创建用户失败");
  }
}
