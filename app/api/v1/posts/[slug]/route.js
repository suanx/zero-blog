/**
 * /api/v1/posts/[slug] — 单篇文章详情、更新、删除
 *
 * GET    — 获取单篇文章（公开）
 * PUT    — 更新文章（需要 admin/editor 角色）
 * DELETE — 删除文章（需要 admin 角色）
 */

import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse, noContentResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as postService from "@/src/lib/services/postservice";

const log = createLogger("v1:posts/[slug]");

// ── GET /api/v1/posts/[slug] ──────────────────────────

/**
 * 获取单篇文章详情（公开接口）。
 *
 * @param {Request} request
 * @param {{ params: Promise<{ slug: string }> }} context
 */
export async function GET(request, context) {
  try {
    const { slug } = await context.params;

    const post = await postService.getPostBySlug(slug);

    log.info("文章查询成功", { slug, id: post.id });

    return successResponse(post);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取文章详情失败", { slug: context?.params?.slug, error: error.message });
    return errorResponse("获取文章详情失败");
  }
}

// ── PUT /api/v1/posts/[slug] ──────────────────────────

/**
 * 更新文章（需要 admin / editor 角色）。
 *
 * @param {Request} request
 * @param {{ params: Promise<{ slug: string }> }} context
 */
export async function PUT(request, context) {
  try {
    const { slug } = await context.params;

    // 1. 鉴权
    const authFn = requireAuth("admin", "editor");
    authFn(request);

    // 2. 解析请求体
    const body = await parseBody(request);

    // 3. 更新文章
    const post = await postService.updatePost(slug, body);

    log.info("文章更新成功", { slug, id: post.id });

    return successResponse(post, "文章更新成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("更新文章失败", { slug: context?.params?.slug, error: error.message });
    return errorResponse("更新文章失败");
  }
}

// ── DELETE /api/v1/posts/[slug] ───────────────────────

/**
 * 删除文章（需要 admin 角色）。
 *
 * @param {Request} request
 * @param {{ params: Promise<{ slug: string }> }} context
 */
export async function DELETE(request, context) {
  try {
    const { slug } = await context.params;

    // 1. 鉴权（仅管理员）
    const authFn = requireAuth("admin");
    authFn(request);

    // 2. 删除文章
    await postService.deletePost(slug);

    log.info("文章删除成功", { slug });

    return noContentResponse();
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("删除文章失败", { slug: context?.params?.slug, error: error.message });
    return errorResponse("删除文章失败");
  }
}
