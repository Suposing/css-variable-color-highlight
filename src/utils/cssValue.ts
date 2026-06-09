/**
 * @description 查找 CSS 值中的外层 `var()` 调用，支持 fallback 中包含括号。
 * @description 遇到不完整的 `var()` 会停止继续扫描，避免用错误范围污染装饰和 hover。
 * @param value CSS 值文本。
 * @returns 每个合法外层 `var()` 调用的文本、源码偏移范围、变量名和 fallback。
 */
export function findVarFunctions(value: string): Array<{ text: string; start: number; end: number; name: string; fallback?: string }> {
  const matches: Array<{ text: string; start: number; end: number; name: string; fallback?: string }> = [];
  let index = 0;

  while (index < value.length) {
    const start = value.indexOf('var(', index);
    if (start === -1) {
      break;
    }

    let depth = 0;
    let end = -1;
    for (let cursor = start; cursor < value.length; cursor += 1) {
      const char = value[cursor];
      if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          end = cursor + 1;
          break;
        }
      }
    }

    if (end === -1) {
      break;
    }

    const text = value.slice(start, end);
    const parsed = parseVarFunction(text);
    if (parsed) {
      matches.push({
        text,
        start,
        end,
        name: parsed.name,
        fallback: parsed.fallback,
      });
    }

    index = end;
  }

  return matches;
}

/**
 * @description 解析单个 `var()` 调用中的变量名和 fallback。
 * @param value 完整 `var()` 文本。
 * @returns 变量名和 fallback；文本不是完整 `var()` 或变量名不合法时返回 undefined。
 */
export function parseVarFunction(value: string): { name: string; fallback?: string } | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith('var(') || !trimmed.endsWith(')')) {
    return undefined;
  }

  const content = trimmed.slice(4, -1).trim();
  const separator = findTopLevelComma(content);
  const name = (separator === -1 ? content : content.slice(0, separator)).trim();
  const fallback = separator === -1 ? undefined : content.slice(separator + 1).trim();

  if (!/^--[\w-]+$/.test(name)) {
    return undefined;
  }

  return {
    name,
    fallback: fallback || undefined,
  };
}

/**
 * @description 查找字符串中第一个顶层逗号，用于拆分 `var()` fallback。
 * @description 括号内部的逗号会被忽略，以支持 `var(--a, rgb(1, 2, 3))` 这类 fallback。
 * @param value CSS 函数参数文本。
 * @returns 顶层逗号位置；不存在时返回 -1。
 */
function findTopLevelComma(value: string): number {
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (char === ',' && depth === 0) {
      return index;
    }
  }

  return -1;
}
