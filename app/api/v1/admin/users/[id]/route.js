import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as userService from "@/src/lib/services/userservice";

const log = createLogger("v1-admin-users-id");

// ── PUT /api/v1/admin/users/[id] ────────────────────
// Body: { email?, password_hash?, name?, role? }
export async function PUT(request, { params }) {
  try {
    const user = requireAuth("admin")(request);
    const { id } = await params;
    log.info("更新用户", { id, operator: user.id });

    const data = await parseBody(request);
    const result = await userService.updateUser(Number(id), data);

    return successResponse(result, "用户更新成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("更新用户失败", { error: error.message });
    return errorResponse("更新用户失败");
  }
}

// ── DELETE /api/v1/admin/users/[id] ─────────────────
export async function DELETE(request, { params }) {
  try {
    const user = requireAuth("admin")(request);
    const { id } = await params;
    log.info("删除用户", { id, operator: user.id });

    await userService.deleteUser(Number(id));

    return successResponse({ id: Number(id) }, "用户已删除");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("删除用户失败", { error: error.message });
    return errorResponse("删除用户失败");
  }
}
