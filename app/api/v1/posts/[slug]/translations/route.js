/**
 * /api/v1/posts/[slug]/translations — 文章翻译
 *
 * GET  — 获取文章所有翻译（公开）
 * POST — 创建或更新翻译（需要 admin/editor 角色）
 * PUT  — 更新翻译（需要 admin/editor 角色）
 */

import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse, createdResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { ValidationError } from "@/src/lib/utils/errors";
import { createLogger } from "@/src/lib/utils/logger";
import * as postService from "@/src/lib/services/postservice";
import * as translationService from "@/src/lib/services/translationservice";

const log = createLogger("v1:posts/[slug]/translations");

// ── GET /api/v1/posts/[slug]/translations ─────────────

/**
 * 获取文章的所有翻译（公开接口）。
 *
 * 先通过 slug 找到文章 ID，再查询翻译列表。
 *
 * @param {Request} request
 * @param {{ params: Promise<{ slug: string }> }} context
 */
export async function GET(request, context) {
  try {
    const { slug } = await context.params;

    // 1. 通过 slug 获取文章（不存在则抛 404）
    const post = await postService.getPostBySlug(slug);

    // 2. 获取翻译列表
    const translations = await translationService.getTranslations(post.id);

    log.info("翻译查询成功", { slug, postId: post.id, count: translations.length });

    return successResponse(translations);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取翻译失败", { slug: context?.params?.slug, error: error.message });
    return errorResponse("获取翻译失败");
  }
}

// ── POST /api/v1/posts/[slug]/translations ────────────

/**
 * 创建或更新文章翻译（需要 admin / editor 角色）。
 *
 * 如果该语言的翻译已存在则更新，否则创建新记录。
 *
 * @param {Request} request
 * @param {{ params: Promise<{ slug: string }> }} context
 */
export async function POST(request, context) {
  try {
    const { slug } = await context.params;

    // 1. 鉴权
    const authFn = requireAuth("admin", "editor");
    authFn(request);

    // 2. 解析请求体
    const body = await parseBody(request);

    // 3. 验证必填字段
    if (!body.locale) {
      throw new ValidationError("locale 为必填字段");
    }
    if (!body.title) {
      throw new ValidationError("title 为必填字段");
    }

    // 4. 通过 slug 获取文章 ID
    const post = await postService.getPostBySlug(slug);

    // 5. 创建或更新翻译
    const translation = await translationService.upsertTranslation(post.id, body.locale, {
      title: body.title,
      content: body.content || "",
      excerpt: body.excerpt || "",
    });

    log.info("翻译保存成功", { slug, postId: post.id, locale: body.locale });

    return createdResponse(translation, "翻译保存成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("保存翻译失败", { slug: context?.params?.slug, error: error.message });
    return errorResponse("保存翻译失败");
  }
}

// ── PUT /api/v1/posts/[slug]/translations ─────────────

/**
 * 更新文章翻译（需要 admin / editor 角色）。
 *
 * 逻辑与 POST 相同，使用 upsert 语义。
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

    // 3. 验证必填字段
    if (!body.locale) {
      throw new ValidationError("locale 为必填字段");
    }
    if (!body.title) {
      throw new ValidationError("title 为必填字段");
    }

    // 4. 通过 slug 获取文章 ID
    const post = await postService.getPostBySlug(slug);

    // 5. 创建或更新翻译
    const translation = await translationService.upsertTranslation(post.id, body.locale, {
      title: body.title,
      content: body.content || "",
      excerpt: body.excerpt || "",
    });

    log.info("翻译更新成功", { slug, postId: post.id, locale: body.locale });

    return successResponse(translation, "翻译更新成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("更新翻译失败", { slug: context?.params?.slug, error: error.message });
    return errorResponse("更新翻译失败");
  }
}
