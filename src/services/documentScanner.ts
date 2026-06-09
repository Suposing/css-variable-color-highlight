import type { ColorOccurrence, CssVariableDefinition, DocumentScanResult } from '../types/colorHighlight';
import { COLOR_PATTERNS, extractColors, isColorValue } from '../utils/color';
import { findVarFunctions } from '../utils/cssValue';
import { createSourceRange } from '../utils/range';

/**
 * @description 匹配简单 CSS 变量定义，例如 `--color-primary: #1677ff;`。
 * @description 当前实现不做完整 CSS AST 解析，不跨越 `{}`，也不处理缺失分号的定义。
 */
const CSS_VARIABLE_DEFINITION_PATTERN = /(--[\w-]+)\s*:\s*([^;{}]+);/g;

/**
 * @description 扫描单个文档中的 CSS 变量定义和可高亮颜色出现位置。
 * @description 该函数只处理传入文本，不依赖 VS Code 文档对象，也不触发工作区扫描。
 * @param text 文档完整文本。
 * @param sourceUri 文档 URI 字符串；会写入变量定义来源，便于 hover 展示。
 * @returns 文档扫描结果，出现位置按源码偏移量升序排列。
 */
export function scanDocument(text: string, sourceUri?: string): DocumentScanResult {
  const definitions = scanVariableDefinitions(text, sourceUri);
  const occurrences = [
    ...scanPlainColors(text),
    ...scanVariableOccurrences(text),
  ].sort((a, b) => a.range.start - b.range.start);

  return {
    definitions,
    occurrences,
  };
}

/**
 * @description 扫描 CSS 变量定义，并记录定义整体范围和值范围。
 * @description 该扫描是静态近似解析，适合样式文件和前端组件文本，不计算 CSS 级联或作用域命中。
 * @param text 文档完整文本。
 * @param sourceUri 文档 URI 字符串；当前文档临时扫描时可省略。
 * @returns 变量定义列表；不合法或不完整的定义会被跳过。
 */
export function scanVariableDefinitions(text: string, sourceUri?: string): CssVariableDefinition[] {
  const definitions: CssVariableDefinition[] = [];

  for (const match of text.matchAll(CSS_VARIABLE_DEFINITION_PATTERN)) {
    if (typeof match.index !== 'number') {
      continue;
    }

    const name = match[1];
    const value = match[2].trim();
    const valueStart = match.index + match[0].indexOf(match[2]);
    const valueEnd = valueStart + match[2].length;

    definitions.push({
      name,
      value,
      range: createSourceRange(text, match.index, match.index + match[0].length),
      valueRange: createSourceRange(text, valueStart, valueEnd),
      sourceUri,
    });
  }

  return definitions;
}

/**
 * @description 扫描普通颜色值，包括十六进制、RGB/HSL 函数和 CSS 颜色关键字。
 * @description 该函数不解析 `var()`，变量调用由 `scanVariableOccurrences` 单独处理。
 * @param text 文档完整文本。
 * @returns 普通颜色出现位置；每个结果都包含可直接展示的颜色列表。
 */
function scanPlainColors(text: string): ColorOccurrence[] {
  const occurrences: ColorOccurrence[] = [];

  for (const match of text.matchAll(COLOR_PATTERNS.hex)) {
    if (typeof match.index === 'number') {
      occurrences.push(createColorOccurrence(text, match[0], match.index));
    }
  }

  for (const match of text.matchAll(COLOR_PATTERNS.function)) {
    if (typeof match.index === 'number') {
      occurrences.push(createColorOccurrence(text, match[0], match.index));
    }
  }

  for (const match of text.matchAll(COLOR_PATTERNS.keyword)) {
    if (typeof match.index === 'number') {
      occurrences.push(createColorOccurrence(text, match[0], match.index));
    }
  }

  return occurrences;
}

/**
 * @description 扫描 `var()` 调用，并提取 fallback 中可直接识别的颜色。
 * @description 此阶段不解析变量定义，只为后续 resolver 保留变量名、fallback 和源码范围。
 * @param text 文档完整文本。
 * @returns CSS 变量出现位置；语法不完整的 `var()` 会被跳过。
 */
function scanVariableOccurrences(text: string): ColorOccurrence[] {
  return findVarFunctions(text).map((match) => ({
    kind: 'variable',
    text: match.text,
    variableName: match.name,
    fallback: match.fallback,
    colors: match.fallback ? extractColors(match.fallback) : [],
    range: createSourceRange(text, match.start, match.end),
  }));
}

/**
 * @description 创建普通颜色出现位置对象，并为函数色值或复合匹配补齐颜色列表。
 * @param text 文档完整文本。
 * @param color 颜色文本。
 * @param start 颜色起始偏移量。
 * @returns 颜色出现位置对象，范围使用零基行列坐标。
 */
function createColorOccurrence(text: string, color: string, start: number): ColorOccurrence {
  const colors = isColorValue(color) ? [color] : extractColors(color);

  return {
    kind: 'color',
    text: color,
    range: createSourceRange(text, start, start + color.length),
    colors,
  };
}
