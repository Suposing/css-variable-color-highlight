import { describe, expect, it } from 'vitest';
import {
  normalizeHighlightMode,
  shouldDisplayOccurrenceForHighlightMode,
} from '../utils/highlightMode';

describe('highlightMode', () => {
  it('keeps all occurrence kinds visible by default', () => {
    expect(shouldDisplayOccurrenceForHighlightMode('color', 'all')).toBe(true);
    expect(shouldDisplayOccurrenceForHighlightMode('variable', 'all')).toBe(true);
    expect(shouldDisplayOccurrenceForHighlightMode('preprocessorVariable', 'all')).toBe(true);
  });

  it('supports variable-only mode for color-highlight coexistence', () => {
    expect(shouldDisplayOccurrenceForHighlightMode('color', 'variables')).toBe(false);
    expect(shouldDisplayOccurrenceForHighlightMode('variable', 'variables')).toBe(true);
    expect(shouldDisplayOccurrenceForHighlightMode('preprocessorVariable', 'variables')).toBe(true);
  });

  it('supports color-only mode', () => {
    expect(shouldDisplayOccurrenceForHighlightMode('color', 'colors')).toBe(true);
    expect(shouldDisplayOccurrenceForHighlightMode('variable', 'colors')).toBe(false);
    expect(shouldDisplayOccurrenceForHighlightMode('preprocessorVariable', 'colors')).toBe(false);
  });

  it('falls back to all when configuration value is invalid', () => {
    expect(normalizeHighlightMode('variables')).toBe('variables');
    expect(normalizeHighlightMode('unexpected')).toBe('all');
  });
});
