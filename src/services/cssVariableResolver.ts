import type {
  CssVariableDefinition,
  ResolveOptions,
  VariableResolveResult,
} from '../types/colorHighlight';
import { extractColors } from '../utils/color';
import { findVarFunctions, parseVarFunction } from '../utils/cssValue';

/**
 * @description CSS 变量解析默认选项，限制递归深度以保护编辑器输入体验。
 */
const DEFAULT_OPTIONS: ResolveOptions = {
  resolveFallback: true,
  maxDepth: 12,
};

/**
 * @description CSS 变量解析器，负责从当前文档和工作区变量定义中解析最终颜色。
 * @description 解析失败会返回结构化错误，不向 provider 抛出未捕获异常。
 */
export class CssVariableResolver {
  /**
   * @description 当前解析实例使用的不可变选项。
   */
  private readonly options: ResolveOptions;

  /**
   * @description 创建 CSS 变量解析器，并用默认选项补齐调用方传入的局部选项。
   * @param options 解析行为选项；未传字段使用默认值。
   */
  public constructor(options: Partial<ResolveOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * @description 解析单个完整 `var()` 表达式，支持 fallback 和嵌套变量。
   * @param rawVarCall 完整 `var()` 文本。
   * @param localDefinitions 当前文档中的变量定义。
   * @param workspaceDefinitions 工作区索引中的变量定义快照。
   * @returns CSS 变量解析结果；语法无效、定义缺失或无法解析为颜色时通过 `error` 说明原因。
   */
  public resolveVarCall(
    rawVarCall: string,
    localDefinitions: CssVariableDefinition[],
    workspaceDefinitions: CssVariableDefinition[],
  ): VariableResolveResult {
    const parsed = parseVarFunction(rawVarCall);

    if (!parsed) {
      return {
        variableName: '',
        raw: rawVarCall,
        colors: [],
        error: '不是有效的 var() 表达式。',
      };
    }

    return this.resolveVariable(parsed.name, localDefinitions, workspaceDefinitions, {
      raw: rawVarCall,
      fallback: parsed.fallback,
      depth: 0,
      visited: new Set<string>(),
    });
  }

  /**
   * @description 解析 CSS 值中的直接颜色和全部 `var()` 调用，并合并其中的颜色结果。
   * @param value CSS 属性值或变量值。
   * @param localDefinitions 当前文档中的变量定义。
   * @param workspaceDefinitions 工作区索引中的变量定义快照。
   * @returns CSS 值中能静态解析出的全部颜色；无法解析的变量不会中断其他颜色提取。
   */
  public resolveValueColors(
    value: string,
    localDefinitions: CssVariableDefinition[],
    workspaceDefinitions: CssVariableDefinition[],
  ): string[] {
    const directColors = extractColors(value);
    const variableColors = findVarFunctions(value).flatMap((match) => (
      this.resolveVarCall(match.text, localDefinitions, workspaceDefinitions).colors
    ));

    return [...directColors, ...variableColors];
  }

  /**
   * @description 递归解析变量名对应的定义，优先使用当前文档定义，再回退到工作区索引。
   * @param variableName CSS 变量名，必须包含 `--` 前缀。
   * @param localDefinitions 当前文档中的变量定义。
   * @param workspaceDefinitions 工作区索引中的变量定义快照。
   * @param state 递归解析状态，用于保留原始表达式、fallback、深度和循环引用检测集合。
   * @returns CSS 变量解析结果；超出深度、循环引用、缺失定义或非颜色值都会通过 `error` 表达。
   */
  private resolveVariable(
    variableName: string,
    localDefinitions: CssVariableDefinition[],
    workspaceDefinitions: CssVariableDefinition[],
    state: {
      raw: string;
      fallback?: string;
      depth: number;
      visited: Set<string>;
    },
  ): VariableResolveResult {
    if (state.depth > this.options.maxDepth) {
      return {
        variableName,
        raw: state.raw,
        fallback: state.fallback,
        colors: [],
        error: '变量嵌套过深，已停止解析。',
      };
    }

    if (state.visited.has(variableName)) {
      return {
        variableName,
        raw: state.raw,
        fallback: state.fallback,
        colors: [],
        error: '检测到 CSS 变量循环引用。',
      };
    }

    const definition = this.findDefinition(variableName, localDefinitions, workspaceDefinitions);
    if (!definition) {
      const fallbackColors = this.options.resolveFallback && state.fallback
        ? this.resolveFallbackColors(state.fallback, localDefinitions, workspaceDefinitions, state.depth)
        : [];

      return {
        variableName,
        raw: state.raw,
        fallback: state.fallback,
        colors: fallbackColors,
        resolvedValue: fallbackColors.length > 0 ? state.fallback : undefined,
        error: fallbackColors.length > 0 ? undefined : '未找到 CSS 变量定义。',
      };
    }

    const directColors = extractColors(definition.value);
    const nestedVariables = findVarFunctions(definition.value);
    const visited = new Set(state.visited);
    visited.add(variableName);

    const nestedResults = nestedVariables.map((match) => (
      this.resolveVariable(match.name, localDefinitions, workspaceDefinitions, {
        raw: match.text,
        fallback: match.fallback,
        depth: state.depth + 1,
        visited,
      })
    ));
    const nestedColors = nestedResults.flatMap((result) => result.colors);

    const colors = [...directColors, ...nestedColors];
    const nestedError = nestedResults.find((result) => result.error)?.error;

    return {
      variableName,
      raw: state.raw,
      fallback: state.fallback,
      colors,
      resolvedValue: colors.length > 0 ? definition.value : undefined,
      definition,
      error: colors.length > 0 ? undefined : nestedError ?? '变量值无法解析为颜色。',
    };
  }

  /**
   * @description 从当前文档和工作区定义中查找变量定义。
   * @description 当前文档内同名变量取最后一个定义，以近似匹配 CSS 后定义覆盖前定义的常见写法。
   * @param variableName CSS 变量名。
   * @param localDefinitions 当前文档中的变量定义。
   * @param workspaceDefinitions 工作区索引中的变量定义快照。
   * @returns 最优先的变量定义；未找到时返回 undefined。
   */
  private findDefinition(
    variableName: string,
    localDefinitions: CssVariableDefinition[],
    workspaceDefinitions: CssVariableDefinition[],
  ): CssVariableDefinition | undefined {
    const localDefinition = [...localDefinitions].reverse().find((definition) => definition.name === variableName);
    if (localDefinition) {
      return localDefinition;
    }

    return workspaceDefinitions.find((definition) => definition.name === variableName);
  }

  /**
   * @description 解析 `var()` fallback 中的直接颜色和嵌套变量颜色。
   * @param fallback fallback 原始文本。
   * @param localDefinitions 当前文档中的变量定义。
   * @param workspaceDefinitions 工作区索引中的变量定义快照。
   * @param depth 当前递归深度，用于继续套用最大深度保护。
   * @returns fallback 中解析出的颜色；无法解析的嵌套变量会被忽略。
   */
  private resolveFallbackColors(
    fallback: string,
    localDefinitions: CssVariableDefinition[],
    workspaceDefinitions: CssVariableDefinition[],
    depth: number,
  ): string[] {
    const directColors = extractColors(fallback);
    const variableColors = findVarFunctions(fallback).flatMap((match) => (
      this.resolveVariable(match.name, localDefinitions, workspaceDefinitions, {
        raw: match.text,
        fallback: match.fallback,
        depth: depth + 1,
        visited: new Set<string>(),
      }).colors
    ));

    return [...directColors, ...variableColors];
  }
}
