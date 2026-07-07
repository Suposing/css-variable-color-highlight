import type { ColorOccurrence, CssVariableDefinition } from '../types/colorHighlight';
import { scanDocument } from './documentScanner';
import { CssVariableResolver } from './cssVariableResolver';
import { isLikelyColorVariableUsage } from '../utils/cssValue';

/**
 * @description 分析单个文档内可用于装饰和 hover 的颜色信息。
 */
export interface ColorHighlightAnalysis {
  /**
   * @description 文档中所有可高亮的颜色或变量调用，变量项会尽量补充解析结果。
   */
  occurrences: ColorOccurrence[];
  /**
   * @description 文档中扫描出的 CSS 变量定义，供当前文档优先解析使用。
   */
  definitions: CssVariableDefinition[];
}

/**
 * @description 生成单个文档的颜色高亮分析结果，先扫描源码，再把变量调用解析成可展示颜色。
 * @param text 文档完整文本。
 * @param sourceUri 文档 URI 字符串。
 * @param workspaceDefinitions 工作区变量定义快照；不会在本函数内触发全工作区扫描。
 * @param resolveFallback 是否在变量缺失时解析 `var()` fallback。
 * @returns 可用于装饰和 hover 的分析结果；变量解析失败时通过 occurrence.error 表达。
 */
export function analyzeDocumentColors(
  text: string,
  sourceUri: string,
  workspaceDefinitions: CssVariableDefinition[],
  resolveFallback: boolean,
): ColorHighlightAnalysis {
  const scanResult = scanDocument(text, sourceUri);
  const resolver = new CssVariableResolver({
    resolveFallback,
  });

  const occurrences = scanResult.occurrences.map((occurrence) => {
    if (occurrence.kind === 'color') {
      return occurrence;
    }

    const resolved = occurrence.kind === 'preprocessorVariable' && occurrence.variableName && occurrence.variableSyntax
      ? resolver.resolvePreprocessorVariable(
        occurrence.variableName,
        occurrence.variableSyntax,
        scanResult.definitions,
        workspaceDefinitions,
      )
      : resolver.resolveVarCall(
        occurrence.text,
        scanResult.definitions,
        workspaceDefinitions,
      );

    const resolvedOccurrence = {
      ...occurrence,
      colors: resolved.colors,
      fallback: resolved.fallback,
      definition: resolved.definition,
      error: resolved.error,
    };

    if (
      resolvedOccurrence.colors.length === 0
      && !isLikelyColorVariableUsage(text, resolvedOccurrence.range.start, resolvedOccurrence.variableName)
    ) {
      return undefined;
    }

    return resolvedOccurrence;
  }).filter((occurrence): occurrence is ColorOccurrence => Boolean(occurrence));

  return {
    occurrences,
    definitions: scanResult.definitions,
  };
}
