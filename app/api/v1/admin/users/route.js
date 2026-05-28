import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse, paginatedResponse, createdResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as userService from "@/src/lib/services/userservice";

const log = createLogger("v1-admin-users");

// ── GET /api/v1/admin/users ─────────────────────────
// ?role=admin|editor|viewer  → 按角色筛选
// ?page=&pageSize=           → 分页
export async function GET(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("获取用户列表", { operator: user.id });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page"), 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize"), 10) || 20;
    const role = searchParams.get("role");

    const { rows, meta } = await userService.listUsers({ page, pageSize, role });

    return paginatedResponse(rows, meta);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取用户列表失败", { error: error.message });
    return errorResponse("获取用户列表失败");
  }
}

// ── POST /api/v1/admin/users ────────────────────────
// Body: { email, password_hash, name?, role? }
export async function POST(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("创建用户", { operator: user.id });

    const data = await parseBody(request);
    const result = await userService.createUser(data);

    return createdResponse(result, "用户创建成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("创建用户失败", { error: error.message });
    return errorResponse("创建用户失败");
  }
}
