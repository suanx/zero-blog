import { NextResponse } from "next/server";

// ── POST /api/admin/login ──────────────────────────
// Body: { email, password }
// Returns: { token, user } on success
export async function POST(request) {
  // 1. Parse body safely
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  // 2. Lazy-import db (avoids crash during module init if env is missing)
  let executeQuery;
  try {
    const db = await import("@/lib/db");
    executeQuery = db.executeQuery;
  } catch (err) {
    console.error("[login] db module load failed:", err.message);
    return NextResponse.json(
      { error: "数据库模块加载失败，请检查环境变量" },
      { status: 500 }
    );
  }

  // 3. Query user
  let users;
  try {
    users = await executeQuery(
      "SELECT id, email, name, role, password_hash FROM users WHERE email = ?",
      [email]
    );
  } catch (err) {
    console.error("[login] query failed:", err.message);
    // If table doesn't exist, give a clear message
    const msg = String(err.message || "").includes("no such table")
      ? "用户表不存在，请先执行 schema.sql 初始化数据库"
      : "数据库查询失败，请稍后重试";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const user = users[0];

  // TODO: replace with bcrypt.compare when password hashing is implemented
  if (user.password_hash !== password) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  // Check admin/editor role
  if (!["admin", "editor"].includes(user.role)) {
    return NextResponse.json(
      { error: "权限不足，仅管理员和编辑可登录" },
      { status: 403 }
    );
  }

  // Return the admin token (from env) for subsequent API calls
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "服务配置错误" }, { status: 500 });
  }

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
