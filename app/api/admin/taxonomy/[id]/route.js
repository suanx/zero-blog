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

// ── PUT: 更新分类/标签 ────────────────────────────
export async function PUT(request, { params }) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const cfg = resolveType(type);
    if (!cfg) {
      return NextResponse.json(
        { error: "type 参数必填，可选值: category | tag" },
        { status: 400 }
      );
    }

    const t = cfg.table;
    const body = await request.json();
    const { name, slug } = body;

    // 至少提供一个字段
    if (name === undefined && slug === undefined) {
      return NextResponse.json(
        { error: "至少需要提供 name 或 slug 中的一个" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existing = await executeQuery(
      `SELECT id FROM ${t} WHERE id = ?`,
      [id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "分类/标签不存在" },
        { status: 404 }
      );
    }

    // slug 格式校验
    if (slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "slug 格式无效，仅允许小写字母、数字和连字符，且不能以连字符开头或结尾" },
        { status: 400 }
      );
    }

    // slug 唯一性校验（排除自身）
    if (slug !== undefined) {
      const slugConflict = await executeQuery(
        `SELECT id FROM ${t} WHERE slug = ? AND id != ?`,
        [slug, id]
      );
      if (slugConflict.rows.length > 0) {
        return NextResponse.json(
          { error: "slug 已存在" },
          { status: 409 }
        );
      }
    }

    // 动态构建 SET 子句
    const sets = [];
    const args = [];
    if (name !== undefined) {
      sets.push("name = ?");
      args.push(name);
    }
    if (slug !== undefined) {
      sets.push("slug = ?");
      args.push(slug);
    }
    args.push(id);

    await executeQuery(
      `UPDATE ${t} SET ${sets.join(", ")} WHERE id = ?`,
      args
    );

    // 返回更新后的完整记录
    const updated = await executeQuery(`SELECT * FROM ${t} WHERE id = ?`, [id]);
    return NextResponse.json(updated.rows[0]);
  } catch (error) {
    return errorResponse(error, "更新分类/标签失败");
  }
}

// ── DELETE: 删除分类/标签（有文章关联则拒绝） ────
export async function DELETE(request, { params }) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const cfg = resolveType(type);
    if (!cfg) {
      return NextResponse.json(
        { error: "type 参数必填，可选值: category | tag" },
        { status: 400 }
      );
    }

    const t = cfg.table;
    const j = cfg.junction;
    const fk = cfg.fk;

    // 检查记录是否存在
    const existing = await executeQuery(
      `SELECT id FROM ${t} WHERE id = ?`,
      [id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "分类/标签不存在" },
        { status: 404 }
      );
    }

    // 检查关联文章数
    const countResult = await executeQuery(
      `SELECT COUNT(*) AS post_count FROM ${j} WHERE ${fk} = ?`,
      [id]
    );
    const post_count = countResult.rows[0]?.post_count || 0;

    if (post_count > 0) {
      const typeName = type === "category" ? "分类" : "标签";
      return NextResponse.json(
        {
          error: `该${typeName}下有 ${post_count} 篇文章，无法删除`,
          post_count,
        },
        { status: 409 }
      );
    }

    await executeQuery(`DELETE FROM ${t} WHERE id = ?`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "删除分类/标签失败");
  }
}
