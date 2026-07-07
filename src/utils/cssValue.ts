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
 * @description 明确只接收颜色值的 CSS 属性；未解析变量出现在这些属性中时仍应提供提示。
 */
const COLOR_ONLY_PROPERTIES = new Set([
  'accent-color',
  'border-block-color',
  'border-block-end-color',
  'border-block-start-color',
  'border-bottom-color',
  'border-color',
  'border-inline-color',
  'border-inline-end-color',
  'border-inline-start-color',
  'border-left-color',
  'border-right-color',
  'border-top-color',
  'caret-color',
  'color',
  'column-rule-color',
  'fill',
  'flood-color',
  'lighting-color',
  'outline-color',
  'stop-color',
  'stroke',
  'text-decoration-color',
  'text-emphasis-color',
]);

/**
 * @description 可能包含颜色、图片、长度等混合值的 CSS 属性；需要结合变量名进一步降低误报。
 */
const COLOR_MIXED_PROPERTIES = new Set([
  'background',
  'background-image',
  'border',
  'border-block',
  'border-block-end',
  'border-block-start',
  'border-bottom',
  'border-image',
  'border-image-source',
  'border-inline',
  'border-inline-end',
  'border-inline-start',
  'border-left',
  'border-right',
  'border-top',
  'box-shadow',
  'column-rule',
  'filter',
  'outline',
  'text-decoration',
  'text-emphasis',
  'text-shadow',
]);

/**
 * @description 颜色、渐变、阴影和设计系统语义色常用命名片段，用于判断未解析变量是否仍值得提示。
 */
const COLOR_NAME_HINT_PATTERN = /(?:^|[-_])(?:accent|background|bg|border|brand|color|colour|danger|divider|error|fg|fill|foreground|gradient|info|link|outline|placeholder|primary|ring|secondary|shade|shadow|stroke|success|surface|text|theme|tint|tone|warning)(?:$|[-_\d])/i;

/**
 * @description 判断变量使用位置是否像颜色相关上下文，用于过滤尺寸、间距等非颜色变量误报。
 * @description 该判断是轻量静态启发式，不做完整 CSS 语法树解析；无法确定时会偏向减少未解析提示噪音。
 * @param text 文档完整文本。
 * @param offset 变量命中的起始偏移量。
 * @param variableName 变量名，支持 CSS 自定义属性和 Sass/Less 变量。
 * @returns 当前变量使用应保留为颜色候选时返回 true。
 */
export function isLikelyColorVariableUsage(text: string, offset: number, variableName?: string): boolean {
  const propertyName = findDeclarationPropertyName(text, offset);

  if (propertyName && COLOR_ONLY_PROPERTIES.has(propertyName)) {
    return true;
  }

  if (propertyName?.startsWith('--')) {
    return hasColorNameHint(propertyName) || hasColorNameHint(variableName);
  }

  if (propertyName && COLOR_MIXED_PROPERTIES.has(propertyName)) {
    return hasColorNameHint(propertyName) || hasColorNameHint(variableName);
  }

  return hasColorNameHint(variableName);
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

/**
 * @description 从变量位置向前查找当前 CSS 声明属性名。
 * @description 只识别最近声明片段中的顶层冒号，忽略函数参数和字符串内部的冒号以降低误判。
 * @param text 文档完整文本。
 * @param offset 变量命中的起始偏移量。
 * @returns 找到的属性名；无法确认处于 CSS 声明值中时返回 undefined。
 */
function findDeclarationPropertyName(text: string, offset: number): string | undefined {
  const boundary = Math.max(
    text.lastIndexOf('{', offset),
    text.lastIndexOf(';', offset),
    text.lastIndexOf('}', offset),
  );
  const segment = text.slice(boundary + 1, offset);
  const colonIndex = findTopLevelColon(segment);

  if (colonIndex === -1) {
    return undefined;
  }

  const propertyCandidate = segment.slice(0, colonIndex).trim();
  const propertyMatch = propertyCandidate.match(/(?:^|[\s"'{])((?:--)?[-\w]+)$/);

  return propertyMatch?.[1].toLowerCase();
}

/**
 * @description 查找声明片段中的最后一个顶层冒号，用于区分属性分隔符和函数、字符串中的冒号。
 * @param value CSS 声明片段，通常从 `{` 或 `;` 后开始到变量位置结束。
 * @returns 顶层冒号位置；不存在时返回 -1。
 */
function findTopLevelColon(value: string): number {
  let depth = 0;
  let quote: string | undefined;
  let colonIndex = -1;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previousChar = value[index - 1];

    if (quote) {
      if (char === quote && previousChar !== '\\') {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (char === ':' && depth === 0) {
      colonIndex = index;
    }
  }

  return colonIndex;
}

/**
 * @description 判断变量或属性命名是否带有颜色相关语义。
 * @param name 变量名或属性名；为空时返回 false。
 * @returns 命名包含颜色、渐变、阴影或语义色片段时返回 true。
 */
function hasColorNameHint(name?: string): boolean {
  return Boolean(name && COLOR_NAME_HINT_PATTERN.test(name));
}
