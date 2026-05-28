import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse, paginatedResponse } from "@/src/lib/utils/response";
import { createLogger } from "@/src/lib/utils/logger";
import * as commentService from "@/src/lib/services/commentservice";

const log = createLogger("v1-admin-comments");

// ── GET /api/v1/admin/comments ─────────────────────────
// ?status=pending|approved|spam  → 按状态筛选
// ?postId=数字                   → 按文章筛选
// ?page=1&pageSize=20            → 分页
export async function GET(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("获取评论列表", { operator: user.id });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page"), 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize"), 10) || 20;
    const status = searchParams.get("status");
    const postId = searchParams.get("postId") ? Number(searchParams.get("postId")) : undefined;

    const { rows, meta } = await commentService.listComments({ page, pageSize, status, postId });

    return paginatedResponse(rows, meta);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取评论列表失败", { error: error.message });
    return errorResponse("获取评论列表失败");
  }
}
