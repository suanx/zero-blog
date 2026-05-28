import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT c.id, c.name, c.slug,
              COUNT(pc.post_id) AS post_count
       FROM categories c
       LEFT JOIN post_categories pc ON c.id = pc.category_id
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
    const response = NextResponse.json({ categories: result.rows });
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return NextResponse.json({ error: "获取分类失败" }, { status: 500 });
  }
}
