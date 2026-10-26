import { describe, expect, it } from 'vitest';
import { groupRunsIntoLines, rgbFromPixel } from './text';

describe('groupRunsIntoLines', () => {
  it('joins runs that share a baseline and keeps separate lines apart', () => {
    const lines = groupRunsIntoLines([
      { text: 'Hello', x: 10, y: 40, width: 40, height: 12, fontName: 'Times-Roman' },
      { text: 'world', x: 55, y: 41, width: 40, height: 12, fontName: 'Times-Roman' },
      { text: 'Next', x: 10, y: 70, width: 30, height: 12, fontName: 'Times-Roman' },
    ]);

    expect(lines).toHaveLength(2);
    expect(lines[0]?.text).toBe('Hello world');
    expect(lines[1]?.text).toBe('Next');
    expect(lines[0]?.width).toBe(85);
  });

  it('drops empty runs', () => {
    expect(
      groupRunsIntoLines([
        { text: '   ', x: 0, y: 0, width: 10, height: 10, fontName: 'Helvetica' },
      ]),
    ).toEqual([]);
  });
});

describe('rgbFromPixel', () => {
  it('formats a canvas pixel as CSS rgb', () => {
    expect(rgbFromPixel(new Uint8ClampedArray([12, 34, 56, 255]), 0)).toBe('rgb(12 34 56)');
  });
});
