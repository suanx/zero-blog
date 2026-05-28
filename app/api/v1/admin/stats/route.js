import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse } from "@/src/lib/utils/response";
import { createLogger } from "@/src/lib/utils/logger";
import * as statsService from "@/src/lib/services/statsservice";

const log = createLogger("v1-admin-stats");

// ── GET /api/v1/admin/stats ───────────────────────────
// 返回仪表盘统计数据
export async function GET(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("获取仪表盘统计", { operator: user.id });

    const stats = await statsService.getStats();

    return successResponse(stats);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取仪表盘统计失败", { error: error.message });
    return errorResponse("获取仪表盘统计失败");
  }
}
