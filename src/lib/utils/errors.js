/**
 * 自定义错误类
 *
 * 统一错误处理，每个错误类携带 HTTP 状态码和机器可读 code。
 * Service 层抛出这些错误，Controller 层捕获并转换为 errorResponse。
 */

// ── 基础错误类 ──────────────────────────────────────

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ── 400 请求验证错误 ────────────────────────────────

export class ValidationError extends AppError {
  constructor(message, errors) {
    super(message, 400, "VALIDATION_ERROR");
    this.errors = errors; // 详细字段级错误 { fieldName: "..." }
  }
}

// ── 401 未认证 ──────────────────────────────────────

export class AuthError extends AppError {
  constructor(message = "未授权") {
    super(message, 401, "AUTH_ERROR");
  }
}

// ── 403 无权限 ──────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = "无权限执行此操作") {
    super(message, 403, "FORBIDDEN");
  }
}

// ── 404 未找到 ──────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource, identifier) {
    const msg = identifier
      ? `${resource} "${identifier}" 不存在`
      : `${resource} 不存在`;
    super(msg, 404, "NOT_FOUND");
    this.resource = resource;
    this.identifier = identifier;
  }
}

// ── 409 冲突 ────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

// ── 429 限流 ────────────────────────────────────────

export class RateLimitError extends AppError {
  constructor(message = "请求过于频繁，请稍后再试") {
    super(message, 429, "RATE_LIMITED");
  }
}
