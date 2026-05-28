/**
 * /api/v1/posts — 文章列表 & 创建（公开路由）
 *
 * GET  — 文章分页列表（公开 / 管理员模式）
 * POST — 创建文章（需要 admin/editor 角色）
 */

import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse, paginatedResponse, createdResponse } from "@/src/lib/utils/response";
import { parseBody, validate } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as postService from "@/src/lib/services/postservice";

const log = createLogger("v1:posts");

// ── GET /api/v1/posts ─────────────────────────────────

/**
 * 获取文章分页列表。
 *
 * 公开模式（默认）：仅返回已发布文章。
 * 管理模式（admin=true + 鉴权）：返回全部文章含 published 状态。
 *
 * Query params:
 *   page     — 页码，默认 1
 *   pageSize — 每页条数，默认 10
 *   category — 分类 ID
 *   tag      — 标签 ID
 *   admin    — "true" 时进入管理员模式（需鉴权）
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize")) || 10));
    const category = searchParams.get("category") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const adminMode = searchParams.get("admin") === "true";

    let published = undefined;

    if (adminMode) {
      // 管理员模式需要鉴权
      const authFn = requireAuth("admin", "editor");
      authFn(request); // 抛出即代表鉴权失败
      // admin 模式不过滤 published，返回全部
    } else {
      // 公开模式只返回已发布
      published = true;
    }

    const { rows, meta } = await postService.listPosts({
      page,
      pageSize,
      category,
      tag,
      published,
    });

    log.info("文章列表查询成功", { page, pageSize, total: meta.total });

    return paginatedResponse(rows, meta);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取文章列表失败", { error: error.message });
    return errorResponse("获取文章列表失败");
  }
}

// ── POST /api/v1/posts ────────────────────────────────

/**
 * 创建文章（需要 admin / editor 角色）。
 *
 * Body:
 *   title       — 文章标题（必填）
 *   slug        — URL slug（必填）
 *   content     — 正文内容
 *   excerpt     — 摘要
 *   cover_image — 封面图片 URL
 *   published   — 是否发布（布尔值）
 *   categoryIds — 分类 ID 数组
 *   tagIds      — 标签 ID 数组
 */
export async function POST(request) {
  try {
    // 1. 鉴权
    const authFn = requireAuth("admin", "editor");
    const user = authFn(request);

    // 2. 解析请求体
    const body = await parseBody(request);

    // 3. 设置作者为当前登录用户
    const data = {
      ...body,
      author_id: user.id,
    };

    // 4. 创建文章
    const post = await postService.createPost(data);

    log.info("文章创建成功", { id: post.id, slug: post.slug });

    return createdResponse(post, "文章创建成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("创建文章失败", { error: error.message });
    return errorResponse("创建文章失败");
  }
}
