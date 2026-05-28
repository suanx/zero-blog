import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse, paginatedResponse, createdResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as taxonomyService from "@/src/lib/services/taxonomyservice";

const log = createLogger("v1-admin-taxonomy");

// ── GET /api/v1/admin/taxonomy ─────────────────────────
// ?type=category|tag              → 类型（必填）
// ?page=1&pageSize=20            → 分页
export async function GET(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("获取分类/标签列表", { operator: user.id });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page"), 10) || 1;
    const pageSize = parseInt(searchParams.get("pageSize"), 10) || 20;

    if (!type || !["category", "tag"].includes(type)) {
      return errorResponse("type 参数必填，可选值: category, tag", "VALIDATION_ERROR", null, 400);
    }

    const { rows, meta } = await taxonomyService.listTaxonomy(type, { page, pageSize });

    return paginatedResponse(rows, meta);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("获取分类/标签列表失败", { error: error.message });
    return errorResponse("获取分类/标签列表失败");
  }
}

// ── POST /api/v1/admin/taxonomy ────────────────────────
// ?type=category|tag   → 类型（必填）
// Body: { name, slug }
export async function POST(request) {
  try {
    const user = requireAuth("admin")(request);
    log.info("创建分类/标签", { operator: user.id });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["category", "tag"].includes(type)) {
      return errorResponse("type 参数必填，可选值: category, tag", "VALIDATION_ERROR", null, 400);
    }

    const data = await parseBody(request);
    const result = await taxonomyService.createTaxonomy(type, data);

    return createdResponse(result, "分类/标签创建成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("创建分类/标签失败", { error: error.message });
    return errorResponse("创建分类/标签失败");
  }
}
