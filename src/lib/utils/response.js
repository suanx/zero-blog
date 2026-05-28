/**
 * 统一 API 响应格式
 *
 * 成功: { status: "success", data, message, meta }
 * 错误: { status: "error", message, code, detail }
 */

import { NextResponse } from "next/server";

/**
 * 成功响应
 * @param {*} data - 响应数据
 * @param {string} [message] - 可选消息
 * @param {object} [meta] - 分页等元数据 { page, pageSize, total, totalPages }
 * @param {number} [statusCode=200]
 * @returns {NextResponse}
 */
export function successResponse(data, message, meta, statusCode = 200) {
  const body = { status: "success", data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status: statusCode });
}

/**
 * 错误响应
 * @param {string} message - 用户友好消息
 * @param {string} [code] - 机器可读错误码
 * @param {string|object} [detail] - 开发调试信息（仅 dev 环境）
 * @param {number} [statusCode=500]
 * @returns {NextResponse}
 */
export function errorResponse(message, code, detail, statusCode = 500) {
  const body = { status: "error", message, code: code || "INTERNAL_ERROR" };
  if (detail && process.env.NODE_ENV === "development") {
    body.detail = typeof detail === "string" ? detail : detail.message;
  }
  return NextResponse.json(body, { status: statusCode });
}

/**
 * 分页成功响应
 * @param {Array} data - 数据列表
 * @param {object} pagination - { page, pageSize, total, totalPages }
 * @param {string} [message]
 * @returns {NextResponse}
 */
export function paginatedResponse(data, pagination, message) {
  return successResponse(data, message, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
  });
}

/**
 * 创建成功响应 (201)
 */
export function createdResponse(data, message) {
  return successResponse(data, message, undefined, 201);
}

/**
 * 无内容响应 (204)
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}
