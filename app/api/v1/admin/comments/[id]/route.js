import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as commentService from "@/src/lib/services/commentservice";

const log = createLogger("v1-admin-comments-id");

// ── PUT /api/v1/admin/comments/[id] ────────────────────
// 更新评论状态: { status: "pending" | "approved" | "spam" }
export async function PUT(request, { params }) {
  try {
    const user = requireAuth("admin")(request);
    const { id } = await params;
    log.info("更新评论状态", { id, operator: user.id });

    const data = await parseBody(request);
    const { status } = data;

    if (!status) {
      return errorResponse("status 为必填字段", "VALIDATION_ERROR", null, 400);
    }

    const result = await commentService.updateCommentStatus(Number(id), status);

    return successResponse(result, "评论状态已更新");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("更新评论状态失败", { error: error.message });
    return errorResponse("更新评论状态失败");
  }
}

// ── DELETE /api/v1/admin/comments/[id] ──────────────────
export async function DELETE(request, { params }) {
  try {
    const user = requireAuth("admin")(request);
    const { id } = await params;
    log.info("删除评论", { id, operator: user.id });

    await commentService.deleteComment(Number(id));

    return successResponse({ id: Number(id) }, "评论已删除");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("删除评论失败", { error: error.message });
    return errorResponse("删除评论失败");
  }
}
