import { describe, expect, it } from 'vitest';
import { scanDocument, scanVariableDefinitions } from '../services/documentScanner';

describe('documentScanner', () => {
  it('scans CSS variable definitions', () => {
    const definitions = scanVariableDefinitions(':root { --color-primary: #1677ff; }', 'file:///theme.css');

    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toMatchObject({
      name: '--color-primary',
      value: '#1677ff',
      sourceUri: 'file:///theme.css',
    });
  });

  it('scans plain colors and variable calls', () => {
    const result = scanDocument(`
.button {
  color: #fff;
  background: var(--color-primary, rgb(1, 2, 3));
}
`);

    expect(result.occurrences.map((item) => item.kind)).toEqual(['color', 'variable', 'color']);
    expect(result.occurrences.find((item) => item.kind === 'variable')).toMatchObject({
      variableName: '--color-primary',
      fallback: 'rgb(1, 2, 3)',
      colors: ['rgb(1, 2, 3)'],
    });
  });

  it('scans CSS color keywords', () => {
    const result = scanDocument('.button { color: rebeccapurple; border-color: transparent; }');

    expect(result.occurrences.filter((item) => item.kind === 'color').map((item) => item.text)).toEqual([
      'rebeccapurple',
      'transparent',
    ]);
  });
});
