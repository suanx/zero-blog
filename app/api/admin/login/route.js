import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

// ── POST /api/admin/login ──────────────────────────
// Body: { email, password }
// Returns: { token, user } on success
export async function POST(request) {
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

  try {
    const users = await executeQuery(
      "SELECT id, email, name, role, password_hash FROM users WHERE email = ?",
      [email]
    );

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
  } catch (error) {
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}
