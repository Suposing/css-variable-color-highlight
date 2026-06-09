import { describe, expect, it } from 'vitest';
import { getReadableTextColor } from '../utils/color';

describe('color utils', () => {
  it('chooses readable text color for light and dark backgrounds', () => {
    expect(getReadableTextColor('#ffffff')).toBe('#000000');
    expect(getReadableTextColor('#000000')).toBe('#ffffff');
    expect(getReadableTextColor('rgb(247, 250, 252)')).toBe('#000000');
    expect(getReadableTextColor('rebeccapurple')).toBe('#ffffff');
  });
});
