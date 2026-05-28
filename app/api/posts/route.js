import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { verifyAdmin, syncAssociations, validatePost, errorResponse, paginatedQuery, getPostAssociations } from "@/lib/api-helpers";

// ── GET /api/posts ─────────────────────────────────
// ?admin=true      → 全部文章（含草稿），需 Admin-Token
// ?category=slug   → 按分类筛选
// ?tag=slug        → 按标签筛选
// ?page=1          → 页码（默认 1）
// ?pageSize=10     → 每页条数（默认 10，最大 100）
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get("admin") === "true";
  const categorySlug = searchParams.get("category");
  const tagSlug = searchParams.get("tag");
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("pageSize") || "10";

  if (isAdmin) {
    const auth = verifyAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
  }

  try {
    const where = [];
    const params = [];

    if (!isAdmin) where.push("p.published = 1");

    if (categorySlug) {
      where.push(`EXISTS (SELECT 1 FROM post_categories pc
        JOIN categories c ON pc.category_id = c.id
        WHERE pc.post_id = p.id AND c.slug = ?)`);
      params.push(categorySlug);
    }
    if (tagSlug) {
      where.push(`EXISTS (SELECT 1 FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id = p.id AND t.slug = ?)`);
      params.push(tagSlug);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const cols = isAdmin
      ? `p.id, p.title, p.slug, p.excerpt, p.cover_image,
         p.published, p.created_at, p.updated_at, u.name AS author`
      : `p.id, p.title, p.slug, p.excerpt, p.cover_image, p.created_at, u.name AS author`;

    const fromClause = `posts p LEFT JOIN users u ON p.author_id = u.id`;

    const { posts, total, page: currentPage, pageSize: currentPageSize, totalPages } = await paginatedQuery({
      selectCols: cols,
      fromClause,
      whereClause,
      params,
      page,
      pageSize,
    });

    const postIds = posts.map((r) => r.id);
    const assoc = await getPostAssociations(postIds);
    const enrichedPosts = posts.map((r) => ({
      ...r,
      categories: assoc[r.id]?.categories || [],
      tags: assoc[r.id]?.tags || [],
    }));

    const response = NextResponse.json({
      posts: enrichedPosts,
      total,
      page: currentPage,
      pageSize: currentPageSize,
      totalPages,
    });
    response.headers.set("Cache-Control", "private, no-cache");
    return response;
  } catch (error) {
    return errorResponse(error, "获取文章列表失败");
  }
}

// ── POST /api/posts ────────────────────────────────
export async function POST(request) {
  const auth = verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const validation = validatePost(body, { required: true });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message, ...(validation.required ? { required: validation.required } : {}) }, { status: validation.status });
  }

  const { title, slug, content, excerpt, cover_image, published, category_ids, tag_ids } = body;

  try {
    const result = await executeQuery(
      `INSERT INTO posts (title, slug, content, excerpt, cover_image, published, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, content ?? "", excerpt ?? "", cover_image ?? "", published ? 1 : 0, 1]
    );
    const postId = result.lastInsertRowid;
    await syncAssociations(postId, category_ids, tag_ids);

    return NextResponse.json({ message: "文章创建成功", id: postId, slug }, { status: 201 });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT" || error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: `slug "${slug}" 已存在` }, { status: 409 });
    }
    return errorResponse(error, "创建文章失败");
  }
}
