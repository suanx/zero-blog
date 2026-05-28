import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, errorResponse } from "@/lib/api-helpers";

// ── 表名映射 ───────────────────────────────────────
const TABLES = {
  category: { table: "categories", junction: "post_categories", fk: "category_id" },
  tag:      { table: "tags",       junction: "post_tags",       fk: "tag_id" },
};

function resolveType(type) {
  return TABLES[type] || null;
}

// ── GET: 获取分类/标签列表（分页 + 关联文章数） ────
export async function GET(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const cfg = resolveType(type);
    if (!cfg) {
      return NextResponse.json(
        { error: "type 参数必填，可选值: category | tag" },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get("pageSize"), 10) || 20), 100);
    const offset = (page - 1) * pageSize;

    const t = cfg.table;      // categories | tags
    const j = cfg.junction;   // post_categories | post_tags
    const fk = cfg.fk;        // category_id | tag_id

    // 总数（直接查主表，无需 JOIN）
    const countResult = await executeQuery(
      `SELECT COUNT(*) AS total FROM ${t}`,
      []
    );
    const total = countResult.rows[0]?.total || 0;

    // 数据（LEFT JOIN 获取关联文章数）
    const dataResult = await executeQuery(
      `SELECT t.*, COUNT(j.post_id) AS post_count
       FROM ${t} t
       LEFT JOIN ${j} j ON t.id = j.${fk}
       GROUP BY t.id
       ORDER BY t.name ASC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    return NextResponse.json({
      rows: dataResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return errorResponse(error, "获取分类/标签列表失败");
  }
}

// ── POST: 创建分类/标签 ───────────────────────────
export async function POST(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const cfg = resolveType(type);
    if (!cfg) {
      return NextResponse.json(
        { error: "type 参数必填，可选值: category | tag" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, slug } = body;

    // 必填校验
    if (!name || !slug) {
      return NextResponse.json(
        { error: "name 和 slug 为必填字段" },
        { status: 400 }
      );
    }

    // slug 格式校验
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "slug 格式无效，仅允许小写字母、数字和连字符，且不能以连字符开头或结尾" },
        { status: 400 }
      );
    }

    // slug 唯一性校验
    const t = cfg.table;
    const existing = await executeQuery(
      `SELECT id FROM ${t} WHERE slug = ?`,
      [slug]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "slug 已存在" },
        { status: 409 }
      );
    }

    const result = await executeQuery(
      `INSERT INTO ${t} (name, slug) VALUES (?, ?)`,
      [name, slug]
    );

    return NextResponse.json(
      { id: result.lastInsertRowid, name, slug },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, "创建分类/标签失败");
  }
}
