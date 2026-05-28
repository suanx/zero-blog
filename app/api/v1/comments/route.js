/**
 * /api/v1/comments — 公开评论提交
 *
 * POST — 提交评论（无需鉴权，需验证必填字段）
 */

import { errorResponse, createdResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { ValidationError } from "@/src/lib/utils/errors";
import { createLogger } from "@/src/lib/utils/logger";
import * as commentService from "@/src/lib/services/commentservice";

const log = createLogger("v1:comments");

// ── POST /api/v1/comments ─────────────────────────────

/**
 * 公开提交评论。
 *
 * 无需鉴权，但必须提供 post_id、author_name、content。
 * 提交后默认状态为 pending（待审核）。
 *
 * Body:
 *   post_id      — 文章 ID（必填）
 *   author_name  — 评论者名称（必填）
 *   author_email — 评论者邮箱（选填）
 *   content      — 评论内容（必填）
 */
export async function POST(request) {
  try {
    // 1. 解析请求体
    const body = await parseBody(request);

    // 2. 必填字段验证
    const requiredFields = ["post_id", "author_name", "content"];
    const missing = requiredFields.filter(
      (field) => body[field] === undefined || body[field] === null || body[field] === ""
    );

    if (missing.length > 0) {
      throw new ValidationError(`缺少必填字段: ${missing.join(", ")}`);
    }

    // 3. 创建评论
    const comment = await commentService.createComment({
      post_id: body.post_id,
      author_name: body.author_name,
      author_email: body.author_email || "",
      content: body.content,
    });

    log.info("评论提交成功", { id: comment.id, postId: body.post_id });

    return createdResponse(comment, "评论提交成功，等待审核");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("提交评论失败", { error: error.message });
    return errorResponse("提交评论失败");
  }
}
