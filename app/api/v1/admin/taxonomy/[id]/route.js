import { requireAuth } from "@/src/lib/utils/auth";
import { successResponse, errorResponse } from "@/src/lib/utils/response";
import { parseBody } from "@/src/lib/utils/validate";
import { createLogger } from "@/src/lib/utils/logger";
import * as taxonomyService from "@/src/lib/services/taxonomyservice";

const log = createLogger("v1-admin-taxonomy-id");

// ── PUT /api/v1/admin/taxonomy/[id] ────────────────────
// ?type=category|tag   → 类型（必填）
// Body: { name?, slug? }
export async function PUT(request, { params }) {
  try {
    const user = requireAuth("admin")(request);
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["category", "tag"].includes(type)) {
      return errorResponse("type 参数必填，可选值: category, tag", "VALIDATION_ERROR", null, 400);
    }

    log.info("更新分类/标签", { id, type, operator: user.id });

    const data = await parseBody(request);
    const result = await taxonomyService.updateTaxonomy(type, Number(id), data);

    return successResponse(result, "分类/标签更新成功");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("更新分类/标签失败", { error: error.message });
    return errorResponse("更新分类/标签失败");
  }
}

// ── DELETE /api/v1/admin/taxonomy/[id] ──────────────────
// ?type=category|tag   → 类型（必填）
export async function DELETE(request, { params }) {
  try {
    const user = requireAuth("admin")(request);
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["category", "tag"].includes(type)) {
      return errorResponse("type 参数必填，可选值: category, tag", "VALIDATION_ERROR", null, 400);
    }

    log.info("删除分类/标签", { id, type, operator: user.id });

    await taxonomyService.deleteTaxonomy(type, Number(id));

    return successResponse({ id: Number(id) }, "分类/标签已删除");
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(error.message, error.code, error, error.statusCode);
    }
    log.error("删除分类/标签失败", { error: error.message });
    return errorResponse("删除分类/标签失败");
  }
}
