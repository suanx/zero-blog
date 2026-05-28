import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, errorResponse } from "@/lib/api-helpers";

// ── GET /api/admin/settings ────────────────────────
// 获取所有设置，返回 { settings: { site_name: "...", ... } } 格式
export async function GET(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const rows = await executeQuery("SELECT * FROM settings");

    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return errorResponse(error, "获取设置失败");
  }
}

// ── PUT /api/admin/settings ────────────────────────
// 批量更新设置，Body: { site_name: "新名称", ... }
export async function PUT(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请求体必须是一个对象" },
        { status: 400 }
      );
    }

    const entries = Object.entries(body);
    if (entries.length === 0) {
      return NextResponse.json(
        { error: "请求体不能为空" },
        { status: 400 }
      );
    }

    for (const [key, value] of entries) {
      await executeQuery(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [key, String(value)]
      );
    }

    return NextResponse.json({ message: "设置已更新" });
  } catch (error) {
    return errorResponse(error, "更新设置失败");
  }
}
