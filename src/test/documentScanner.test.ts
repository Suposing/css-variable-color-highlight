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

  it('scans CSS custom properties inside SCSS text', () => {
    const result = scanDocument(`
:root {
  --color-primary: #1677ff;
}

.button {
  &:hover {
    color: var(--color-primary);
  }
}
`, 'file:///button.scss');

    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0]).toMatchObject({
      name: '--color-primary',
      value: '#1677ff',
      sourceUri: 'file:///button.scss',
    });
    expect(result.occurrences.find((item) => item.kind === 'variable')).toMatchObject({
      variableName: '--color-primary',
      text: 'var(--color-primary)',
    });
  });

  it('scans CSS custom properties and fallback colors inside Less text', () => {
    const result = scanDocument(`
:root {
  --color-danger: #ff4d4f;
}

.alert() {
  border-color: var(--missing-danger, #f00);
}
`, 'file:///alert.less');
    const variableOccurrences = result.occurrences.filter((item) => item.kind === 'variable');

    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0]).toMatchObject({
      name: '--color-danger',
      value: '#ff4d4f',
      sourceUri: 'file:///alert.less',
    });
    expect(variableOccurrences).toHaveLength(1);
    expect(variableOccurrences[0]).toMatchObject({
      variableName: '--missing-danger',
      fallback: '#f00',
      colors: ['#f00'],
    });
  });

  it('scans Sass variable definitions and usages', () => {
    const result = scanDocument(`
$brand-primary: #1677ff;
$brand-shadow: 0 8px 24px rgba(22, 119, 255, 0.24);
$brand-accent: rebeccapurple

.button {
  color: $brand-primary;
  box-shadow: $brand-shadow;
  border-color: $brand-accent;
}
`, 'file:///button.scss');
    const variableOccurrences = result.occurrences.filter((item) => item.kind === 'preprocessorVariable');

    expect(result.definitions.filter((item) => item.syntax === 'sass')).toEqual([
      expect.objectContaining({
        name: '$brand-primary',
        value: '#1677ff',
        sourceUri: 'file:///button.scss',
      }),
      expect.objectContaining({
        name: '$brand-shadow',
        value: '0 8px 24px rgba(22, 119, 255, 0.24)',
        sourceUri: 'file:///button.scss',
      }),
      expect.objectContaining({
        name: '$brand-accent',
        value: 'rebeccapurple',
        sourceUri: 'file:///button.scss',
      }),
    ]);
    expect(variableOccurrences).toEqual([
      expect.objectContaining({
        variableName: '$brand-primary',
        variableSyntax: 'sass',
      }),
      expect.objectContaining({
        variableName: '$brand-shadow',
        variableSyntax: 'sass',
      }),
      expect.objectContaining({
        variableName: '$brand-accent',
        variableSyntax: 'sass',
      }),
    ]);
  });

  it('scans Less variable definitions and usages without treating at-rules as variables', () => {
    const result = scanDocument(`
@import "theme.less";
@media (min-width: 768px) {
  @brand-primary: #1677ff;

  .button {
    color: @brand-primary;
  }
}
`, 'file:///button.less');
    const variableOccurrences = result.occurrences.filter((item) => item.kind === 'preprocessorVariable');

    expect(result.definitions.filter((item) => item.syntax === 'less')).toEqual([
      expect.objectContaining({
        name: '@brand-primary',
        value: '#1677ff',
        sourceUri: 'file:///button.less',
      }),
    ]);
    expect(variableOccurrences).toEqual([
      expect.objectContaining({
        variableName: '@brand-primary',
        variableSyntax: 'less',
      }),
    ]);
  });
});
