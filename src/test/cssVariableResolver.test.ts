import { describe, expect, it } from 'vitest';
import { CssVariableResolver } from '../services/cssVariableResolver';
import { scanVariableDefinitions } from '../services/documentScanner';

describe('CssVariableResolver', () => {
  it('resolves variables from local definitions first', () => {
    const localDefinitions = scanVariableDefinitions(':root { --color-primary: #1677ff; }');
    const workspaceDefinitions = scanVariableDefinitions(':root { --color-primary: #f00; }');
    const resolver = new CssVariableResolver();

    const result = resolver.resolveVarCall('var(--color-primary)', localDefinitions, workspaceDefinitions);

    expect(result.colors).toEqual(['#1677ff']);
    expect(result.definition?.value).toBe('#1677ff');
  });

  /**
   * @description 边界用例：变量定义缺失时应使用 fallback 解析颜色，并且不返回错误。
   */
  it('uses fallback when definition is missing', () => {
    const resolver = new CssVariableResolver({
      resolveFallback: true,
    });

    const result = resolver.resolveVarCall('var(--missing-color, #fff)', [], []);

    expect(result.colors).toEqual(['#fff']);
    expect(result.error).toBeUndefined();
  });

  it('resolves nested variables', () => {
    const definitions = scanVariableDefinitions(':root { --a: var(--b); --b: rgba(1, 2, 3, 0.5); }');
    const resolver = new CssVariableResolver();

    const result = resolver.resolveVarCall('var(--a)', definitions, []);

    expect(result.colors).toEqual(['rgba(1, 2, 3, 0.5)']);
  });

  /**
   * @description 回归用例：变量互相引用时必须返回结构化错误，不能让递归继续增长。
   */
  it('guards circular references', () => {
    const definitions = scanVariableDefinitions(':root { --a: var(--b); --b: var(--a); }');
    const resolver = new CssVariableResolver();

    const result = resolver.resolveVarCall('var(--a)', definitions, []);

    expect(result.colors).toEqual([]);
    expect(result.error).toBe('检测到 CSS 变量循环引用。');
  });

  it('resolves multiple colors in composite values', () => {
    const definitions = scanVariableDefinitions(':root { --a: #fff; --b: #f7fafc; }');
    const resolver = new CssVariableResolver();

    const colors = resolver.resolveValueColors(
      'linear-gradient(180deg, var(--a) 0%, var(--b) 100%)',
      definitions,
      [],
    );

    expect(colors).toEqual(['#fff', '#f7fafc']);
  });
});
