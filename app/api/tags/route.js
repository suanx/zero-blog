import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT t.id, t.name, t.slug,
              COUNT(pt.post_id) AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON t.id = pt.tag_id
       GROUP BY t.id
       ORDER BY t.name ASC`
    );
    const response = NextResponse.json({ tags: result.rows });
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  } catch (error) {
    console.error("[GET /api/tags]", error);
    return NextResponse.json({ error: "获取标签失败" }, { status: 500 });
  }
}
