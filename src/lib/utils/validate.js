/**
 * 请求验证引擎
 *
 * 基于 models.js 的元数据定义，对请求数据进行验证。
 * 支持字段级验证、必填校验、类型校验、长度校验、正则校验、枚举校验。
 */

import { models, FieldTypes } from "../models.js";
import { ValidationError } from "./errors.js";

/**
 * 验证单个字段
 * @param {*} value - 字段值
 * @param {object} rule - 字段定义规则
 * @param {string} fieldName - 字段名
 * @returns {string|null} 错误消息或 null
 */
function validateField(value, rule, fieldName) {
  // 必填校验
  if (rule.required && (value === undefined || value === null || value === "")) {
    return `${fieldName} 为必填字段`;
  }

  // 可选字段跳过后续校验（如果值未提供）
  if (value === undefined || value === null) return null;

  // 类型校验
  switch (rule.type) {
    case FieldTypes.INTEGER:
      if (!Number.isInteger(Number(value))) {
        return `${fieldName} 必须是整数`;
      }
      break;
    case FieldTypes.BOOLEAN:
      if (typeof value !== "boolean" && value !== 0 && value !== 1) {
        return `${fieldName} 必须是布尔值`;
      }
      break;
    case FieldTypes.STRING:
    case FieldTypes.TEXT:
      if (typeof value !== "string") {
        return `${fieldName} 必须是字符串`;
      }
      // 最大长度校验
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${fieldName} 长度不能超过 ${rule.maxLength} 个字符`;
      }
      // 正则校验
      if (rule.pattern && !rule.pattern.test(value)) {
        return `${fieldName} 格式无效`;
      }
      break;
  }

  // 枚举校验
  if (rule.enum && !rule.enum.includes(value)) {
    return `${fieldName} 值无效，允许: ${rule.enum.join(", ")}`;
  }

  return null;
}

/**
 * 验证请求数据
 *
 * @param {string} modelName - 模型名称（如 "posts", "users"）
 * @param {object} data - 待验证的数据
 * @param {object} [options] - 验证选项
 * @param {string[]} [options.requiredFields] - 额外必填字段（如创建时）
 * @param {string[]} [options.optionalOverride] - 覆盖为可选的字段
 * @param {string[]} [options.allowExtra] - 允许的额外字段（不校验）
 * @throws {ValidationError} 验证失败时抛出
 */
export function validate(modelName, data, options = {}) {
  const model = models[modelName];
  if (!model) {
    throw new Error(`未知模型: ${modelName}`);
  }

  const { requiredFields = [], optionalOverride = [] } = options;
  const errors = {};

  for (const [fieldName, rule] of Object.entries(model.fields)) {
    // 跳过主键和自增字段
    if (rule.primary || rule.autoIncrement) continue;

    // 构建校验规则（合并必填覆盖）
    const effectiveRule = { ...rule };
    if (requiredFields.includes(fieldName)) {
      effectiveRule.required = true;
    }
    if (optionalOverride.includes(fieldName)) {
      effectiveRule.required = false;
    }

    const error = validateField(data[fieldName], effectiveRule, fieldName);
    if (error) {
      errors[fieldName] = error;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("请求数据验证失败", errors);
  }

  return true;
}

/**
 * 简化的 slug 格式校验
 */
export function isValidSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * 安全解析 JSON body
 */
export async function parseBody(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      throw new ValidationError("请求体必须是 JSON 对象");
    }
    return body;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("请求体格式错误或不是有效的 JSON");
  }
}
