/**
 * @description 表示源码中的字符范围，使用 VS Code 兼容的零基行列坐标。
 */
export interface SourceRange {
  /**
   * @description 范围起始字符偏移量，包含该位置。
   */
  start: number;
  /**
   * @description 范围结束字符偏移量，通常为命中文本后一位。
   */
  end: number;
  /**
   * @description 起始零基行号。
   */
  startLine: number;
  /**
   * @description 起始零基列号。
   */
  startCharacter: number;
  /**
   * @description 结束零基行号。
   */
  endLine: number;
  /**
   * @description 结束零基列号。
   */
  endCharacter: number;
}

/**
 * @description 可被静态解析的样式变量语法来源。
 */
export type StyleVariableSyntax = 'css' | 'sass' | 'less';

/**
 * @description 样式变量定义在源码中的位置与原始值。
 */
export interface CssVariableDefinition {
  /**
   * @description 变量名，CSS 变量包含 `--` 前缀，Sass 变量包含 `$` 前缀，Less 变量包含 `@` 前缀。
   */
  name: string;
  /**
   * @description 变量语法来源；未设置时按 CSS 自定义属性处理，以兼容旧调用方。
   */
  syntax?: StyleVariableSyntax;
  /**
   * @description 变量冒号后的原始值，已去除首尾空白。
   */
  value: string;
  /**
   * @description 整个变量定义在源码中的范围。
   */
  range: SourceRange;
  /**
   * @description 变量值部分在源码中的范围，用于后续定位或 hover 展示。
   */
  valueRange: SourceRange;
  /**
   * @description 变量定义来源文档 URI；当前文档临时扫描时可能为空。
   */
  sourceUri?: string;
}

/**
 * @description 文档中识别出的普通颜色、变量调用或复合颜色片段。
 */
export interface ColorOccurrence {
  /**
   * @description 出现位置类型：`color` 表示普通颜色；`variable` 表示 `var()` 调用；`preprocessorVariable` 表示 Sass/Less 变量。
   */
  kind: 'color' | 'variable' | 'preprocessorVariable';
  /**
   * @description 源码中的原始命中文本。
   */
  text: string;
  /**
   * @description 命中文本在源码中的范围。
   */
  range: SourceRange;
  /**
   * @description 已解析出的可展示颜色；无法解析或变量值不是颜色时为空数组。
   */
  colors: string[];
  /**
   * @description 当 `kind` 为 `variable` 或 `preprocessorVariable` 时的变量名。
   */
  variableName?: string;
  /**
   * @description 当 `kind` 为 `preprocessorVariable` 时的 Sass/Less 变量语法来源。
   */
  variableSyntax?: StyleVariableSyntax;
  /**
   * @description `var()` 调用中的 fallback 原始文本；没有 fallback 时为空。
   */
  fallback?: string;
  /**
   * @description 当前命中变量最终采用的定义来源。
   */
  definition?: CssVariableDefinition;
  /**
   * @description 变量无法解析为颜色时的结构化错误说明，用于 hover 或未解析装饰。
   */
  error?: string;
}

/**
 * @description 扫描单个文档后得到的颜色出现位置和变量定义。
 */
export interface DocumentScanResult {
  /**
   * @description 文档中所有普通颜色、`var()` 调用和 Sass/Less 变量使用，按源码出现顺序排列。
   */
  occurrences: ColorOccurrence[];
  /**
   * @description 文档中扫描到的 CSS/Sass/Less 变量定义。
   */
  definitions: CssVariableDefinition[];
}

/**
 * @description 解析 CSS 变量时使用的选项。
 */
export interface ResolveOptions {
  /**
   * @description 变量定义缺失时是否继续解析 `var()` fallback。
   */
  resolveFallback: boolean;
  /**
   * @description 变量递归解析最大深度，用于避免过深嵌套拖慢编辑器。
   */
  maxDepth: number;
}

/**
 * @description CSS 变量解析成功或失败后的结构化结果。
 */
export interface VariableResolveResult {
  /**
   * @description 被解析的 CSS 变量名，包含 `--` 前缀；语法无效时可能为空字符串。
   */
  variableName: string;
  /**
   * @description 原始 `var()` 调用文本或递归解析时的变量引用文本。
   */
  raw: string;
  /**
   * @description 从变量定义、嵌套变量或 fallback 中解析出的颜色列表。
   */
  colors: string[];
  /**
   * @description 最终参与解析的变量值或 fallback；无法得到可展示颜色时为空。
   */
  resolvedValue?: string;
  /**
   * @description `var()` fallback 原始文本。
   */
  fallback?: string;
  /**
   * @description 命中的变量定义；变量缺失或仅使用 fallback 时为空。
   */
  definition?: CssVariableDefinition;
  /**
   * @description 解析失败原因；解析成功时为空。
   */
  error?: string;
}
