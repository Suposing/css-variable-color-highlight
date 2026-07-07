import type {
  ColorOccurrence,
  CssVariableDefinition,
  DocumentScanResult,
  StyleVariableSyntax,
} from '../types/colorHighlight';
import { COLOR_PATTERNS, extractColors, isColorValue } from '../utils/color';
import { findVarFunctions } from '../utils/cssValue';
import { createSourceRange } from '../utils/range';

/**
 * @description 匹配简单 CSS 变量定义，例如 `--color-primary: #1677ff;`。
 * @description 当前实现不做完整 CSS AST 解析，不跨越 `{}`，也不处理缺失分号的定义。
 */
const CSS_VARIABLE_DEFINITION_PATTERN = /(--[\w-]+)\s*:\s*([^;{}]+);/g;

/**
 * @description 匹配 Sass/SCSS 变量定义，例如 `$color-primary: #1677ff;`。
 * @description 支持 SCSS 的分号结尾和 Sass 缩进语法的行尾结尾，不执行 Sass 表达式或模块系统。
 */
const SASS_VARIABLE_DEFINITION_PATTERN = /(\$[\w-]+)\s*:\s*([^;\r\n{}]+)(?:;|$)/gm;

/**
 * @description 匹配 Less 变量定义，例如 `@color-primary: #1677ff;`。
 * @description 要求变量名后出现冒号且定义值不跨行，避免把模板事件 `@update:model-value` 跨行误识别为变量定义。
 */
const LESS_VARIABLE_DEFINITION_PATTERN = /(@[\w-]+)\s*:\s*([^;\r\n{}]+);/g;

/**
 * @description 匹配 Sass/SCSS 变量使用位置。
 */
const SASS_VARIABLE_OCCURRENCE_PATTERN = /\$[\w-]+/g;

/**
 * @description 匹配 Less 变量使用位置。
 */
const LESS_VARIABLE_OCCURRENCE_PATTERN = /@[\w-]+/g;

/**
 * @description Less 变量扫描需要跳过的 CSS/Less at-rule 名称，避免把语法关键字当作变量使用。
 */
const IGNORED_LESS_AT_RULE_NAMES = new Set([
  '@charset',
  '@container',
  '@document',
  '@font-face',
  '@import',
  '@keyframes',
  '@layer',
  '@media',
  '@namespace',
  '@page',
  '@property',
  '@supports',
]);

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
    ...scanPreprocessorVariableOccurrences(text, definitions),
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
  return [
    ...scanDefinitionsByPattern(text, sourceUri, CSS_VARIABLE_DEFINITION_PATTERN, 'css'),
    ...scanDefinitionsByPattern(text, sourceUri, SASS_VARIABLE_DEFINITION_PATTERN, 'sass'),
    ...scanDefinitionsByPattern(text, sourceUri, LESS_VARIABLE_DEFINITION_PATTERN, 'less'),
  ].sort((a, b) => a.range.start - b.range.start);
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
 * @description 按指定语法正则扫描变量定义，并记录值范围和来源。
 * @param text 文档完整文本。
 * @param sourceUri 文档 URI 字符串；当前文档临时扫描时可省略。
 * @param pattern 变量定义匹配正则，必须捕获变量名和值。
 * @param syntax 变量语法来源。
 * @returns 指定语法的变量定义列表。
 */
function scanDefinitionsByPattern(
  text: string,
  sourceUri: string | undefined,
  pattern: RegExp,
  syntax: StyleVariableSyntax,
): CssVariableDefinition[] {
  const definitions: CssVariableDefinition[] = [];

  for (const match of text.matchAll(pattern)) {
    if (typeof match.index !== 'number') {
      continue;
    }

    const name = match[1];
    const value = match[2].trim();
    const valueStart = match.index + match[0].indexOf(match[2]);
    const valueEnd = valueStart + match[2].length;

    definitions.push({
      name,
      syntax,
      value,
      range: createSourceRange(text, match.index, match.index + match[0].length),
      valueRange: createSourceRange(text, valueStart, valueEnd),
      sourceUri,
    });
  }

  return definitions;
}

/**
 * @description 扫描 Sass/Less 变量使用位置，并跳过变量定义自身。
 * @param text 文档完整文本。
 * @param definitions 当前文档变量定义，用于排除定义名范围。
 * @returns Sass/Less 变量使用位置；此阶段只提取直接颜色，最终解析由 resolver 完成。
 */
function scanPreprocessorVariableOccurrences(
  text: string,
  definitions: CssVariableDefinition[],
): ColorOccurrence[] {
  return [
    ...scanPreprocessorVariableOccurrencesByPattern(text, definitions, SASS_VARIABLE_OCCURRENCE_PATTERN, 'sass'),
    ...scanPreprocessorVariableOccurrencesByPattern(text, definitions, LESS_VARIABLE_OCCURRENCE_PATTERN, 'less'),
  ];
}

/**
 * @description 按指定语法扫描预处理器变量使用位置。
 * @param text 文档完整文本。
 * @param definitions 当前文档变量定义，用于排除定义名范围。
 * @param pattern 变量使用匹配正则。
 * @param syntax 变量语法来源。
 * @returns 预处理器变量使用位置列表。
 */
function scanPreprocessorVariableOccurrencesByPattern(
  text: string,
  definitions: CssVariableDefinition[],
  pattern: RegExp,
  syntax: StyleVariableSyntax,
): ColorOccurrence[] {
  const occurrences: ColorOccurrence[] = [];

  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (
      typeof start !== 'number'
      || isDefinitionNameMatch(start, definitions)
      || isIgnoredPreprocessorVariable(match[0], syntax)
      || isTemplateEventBindingMatch(text, start, start + match[0].length, syntax)
    ) {
      continue;
    }

    occurrences.push({
      kind: 'preprocessorVariable',
      text: match[0],
      variableName: match[0],
      variableSyntax: syntax,
      colors: [],
      range: createSourceRange(text, start, start + match[0].length),
    });
  }

  return occurrences;
}

/**
 * @description 判断当前匹配是否落在变量定义名范围内，避免定义处被当作使用处重复装饰。
 * @param start 匹配起始偏移量。
 * @param definitions 当前文档变量定义列表。
 * @returns 匹配属于定义名时返回 true。
 */
function isDefinitionNameMatch(start: number, definitions: CssVariableDefinition[]): boolean {
  return definitions.some((definition) => (
    start >= definition.range.start
    && start < definition.valueRange.start
  ));
}

/**
 * @description 判断预处理器变量命中是否属于应忽略的语法关键字。
 * @param name 命中的变量或 at-rule 文本。
 * @param syntax 变量语法来源。
 * @returns 当前命中应被忽略时返回 true。
 */
function isIgnoredPreprocessorVariable(name: string, syntax: StyleVariableSyntax): boolean {
  return syntax === 'less' && IGNORED_LESS_AT_RULE_NAMES.has(name.toLowerCase());
}

/**
 * @description 判断 Less 变量命中是否实际是模板里的事件绑定简写，例如 `@click` 或 `@update:model-value`。
 * @description 只在打开标签属性区间内过滤，避免误伤 Less 表达式和 guard 中的变量比较。
 * @param text 文档完整文本。
 * @param start 命中起始偏移量。
 * @param end 命中结束偏移量。
 * @param syntax 当前变量语法来源。
 * @returns 命中属于模板事件绑定属性名时返回 true。
 */
function isTemplateEventBindingMatch(
  text: string,
  start: number,
  end: number,
  syntax: StyleVariableSyntax,
): boolean {
  if (syntax !== 'less' || !isInsideOpeningTag(text, start)) {
    return false;
  }

  const rest = text.slice(end);
  return /^(?:(?::[\w-]+)|(?:\.[\w-]+))*\s*=/.test(rest);
}

/**
 * @description 判断指定偏移量是否位于模板打开标签内，用于区分 HTML/Vue 属性和样式语法。
 * @param text 文档完整文本。
 * @param offset 需要判断的字符偏移量。
 * @returns 最近的 `<` 出现在最近的 `>` 之后时返回 true。
 */
function isInsideOpeningTag(text: string, offset: number): boolean {
  const previousOpenTag = text.lastIndexOf('<', offset);
  const previousCloseTag = text.lastIndexOf('>', offset);

  return previousOpenTag > previousCloseTag;
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
