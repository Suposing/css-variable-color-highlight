import { describe, expect, it } from 'vitest';
import { analyzeDocumentColors } from '../services/colorHighlightAnalyzer';

describe('analyzeDocumentColors', () => {
  it('hydrates variable occurrences with resolved colors', () => {
    const analysis = analyzeDocumentColors(
      ':root { --brand: #1677ff; }\n.button { color: var(--brand); }',
      'file:///demo.css',
      [],
      true,
    );

    const variable = analysis.occurrences.find((occurrence) => occurrence.kind === 'variable');

    expect(variable?.colors).toEqual(['#1677ff']);
    expect(variable?.definition?.name).toBe('--brand');
  });

  /**
   * @description 回归边界：变量无法解析时仍要保留错误信息，供 hover 和未解析变量装饰展示。
   */
  it('keeps unresolved variable errors for hover', () => {
    const analysis = analyzeDocumentColors(
      '.button { color: var(--missing); }',
      'file:///demo.css',
      [],
      true,
    );

    const variable = analysis.occurrences.find((occurrence) => occurrence.kind === 'variable');

    expect(variable?.colors).toEqual([]);
    expect(variable?.error).toBe('未找到 CSS 变量定义。');
  });

  it('hydrates Sass variable occurrences with resolved colors', () => {
    const analysis = analyzeDocumentColors(
      '$brand: #1677ff;\n.button { color: $brand; }',
      'file:///button.scss',
      [],
      true,
    );

    const variable = analysis.occurrences.find((occurrence) => occurrence.kind === 'preprocessorVariable');

    expect(variable?.colors).toEqual(['#1677ff']);
    expect(variable?.definition?.name).toBe('$brand');
    expect(variable?.definition?.syntax).toBe('sass');
  });

  it('hydrates Less variable occurrences from workspace definitions', () => {
    const workspaceAnalysis = analyzeDocumentColors(
      '@brand: #1677ff;',
      'file:///theme.less',
      [],
      true,
    );
    const analysis = analyzeDocumentColors(
      '.button { color: @brand; }',
      'file:///button.less',
      workspaceAnalysis.definitions,
      true,
    );

    const variable = analysis.occurrences.find((occurrence) => occurrence.kind === 'preprocessorVariable');

    expect(variable?.colors).toEqual(['#1677ff']);
    expect(variable?.definition?.sourceUri).toBe('file:///theme.less');
  });
});
