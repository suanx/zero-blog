/**
 * 鉴权与权限控制
 *
 * 从请求中提取用户信息（Admin-Token 或 JWT），
 * 提供 requireAuth 中间件进行角色校验。
 *
 * RBAC 简化方案：
 * - 当前仅用 Admin-Token（兼容旧系统），从 JWT 解析 role
 * - role 值: admin > editor > viewer
 */

import { AuthError, ForbiddenError } from "./errors.js";
import { createLogger } from "./logger.js";

const log = createLogger("auth");

// 角色优先级（数字越大权限越高）
const ROLE_HIERARCHY = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

// ── 从 Admin-Token 提取用户信息 ────────────────────

/**
 * 从请求中提取用户上下文。
 *
 * 当前实现：从 Admin-Token 头部验证管理员身份。
 * 后续可扩展为 JWT 解析。
 *
 * @param {Request} request
 * @returns {{ id: number, role: string, name: string } | null}
 */
export function extractUser(request) {
  const token = request.headers.get("admin-token");
  const expected = process.env.ADMIN_TOKEN;

  if (!token || !expected) return null;

  // 简单 token 比对（后续替换为 JWT 解析）
  if (typeof token === "string" && typeof expected === "string") {
    const { timingSafeEqual } = require("crypto");
    const bufA = Buffer.from(token, "utf-8");
    const bufB = Buffer.from(expected, "utf-8");
    if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
      // Token 匹配 — 默认为 admin 角色
      return {
        id: 1, // 默认 admin ID，后续从 JWT/数据库获取
        role: "admin",
        name: "Admin",
      };
    }
  }

  return null;
}

/**
 * 鉴权中间件 — 要求用户已登录且具有指定角色之一。
 *
 * @param {...string} allowedRoles - 允许的角色列表
 * @returns {Function} 中间件函数 (request) => user
 * @throws {AuthError} 未认证
 * @throws {ForbiddenError} 无权限
 */
export function requireAuth(...allowedRoles) {
  return (request) => {
    const user = extractUser(request);

    if (!user) {
      throw new AuthError("未授权：缺少有效凭证");
    }

    if (allowedRoles.length > 0) {
      const userLevel = ROLE_HIERARCHY[user.role] || 0;
      const hasPermission = allowedRoles.some(
        (role) => ROLE_HIERARCHY[role] >= userLevel
      );

      if (!hasPermission) {
        log.warn("权限不足", { user: user.id, role: user.role, required: allowedRoles });
        throw new ForbiddenError(
          `需要 ${allowedRoles.join("/")} 角色，当前角色: ${user.role}`
        );
      }
    }

    return user;
  };
}

/**
 * 可选鉴权 — 如果有 token 则解析，没有则返回 null（不抛错）。
 */
export function optionalAuth(request) {
  return extractUser(request);
}
