import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as settingsService from "@/src/lib/services/settingsservice";

const log = createLogger("v1-admin-settings");

// ── GET /api/v1/admin/settings ────────────────────────
// 获取所有设置
export async function GET(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("获取系统设置", { operator: user.id });

    const settings = await settingsService.getAllSettings();

    return successResponse(settings);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取系统设置失败", { error: error.message });
    return errorResponse("获取系统设置失败");
  }
}

// ── PUT /api/v1/admin/settings ────────────────────────
// 批量更新设置，Body: { site_name: "新名称", ... }
export async function PUT(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("更新系统设置", { operator: user.id });

    const data = await parseBody(request);
    const settings = await settingsService.updateSettings(data);

    return successResponse(settings, "设置已更新");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("更新系统设置失败", { error: error.message });
    return errorResponse("更新系统设置失败");
  }
}
