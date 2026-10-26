// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Colour contrast regression suite.
 *
 * Parses the real token file rather than duplicating hex values, so editing a colour without
 * re-checking accessibility fails the build. Thresholds follow WCAG 2.2 AA: 4.5:1 for body
 * text, 3:1 for large text (>= 24px, or >= 18.66px bold) and non-text UI boundaries such as
 * focus indicators.
 */

const TOKENS_PATH = fileURLToPath(new URL('./tokens.css', import.meta.url));
const CSS = readFileSync(TOKENS_PATH, 'utf8');

function readToken(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(CSS);
  const value = match?.[1]?.trim();

  if (value === undefined) {
    throw new Error(`Token --${name} is not defined in tokens.css`);
  }

  return value;
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function parseHex(value: string): Rgb {
  const hex = value.replace('#', '').trim();

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Expected a 6-digit hex colour, received ${JSON.stringify(value)}`);
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

/** WCAG relative luminance. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number): number => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(parseHex(foreground));
  const b = relativeLuminance(parseHex(background));
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}

const SURFACES = [
  'color-bg',
  'color-bg-elevated',
  'color-surface',
  'color-surface-raised',
] as const;

const BODY_TEXT = ['color-text', 'color-text-muted'] as const;
const SUBTLE_TEXT = ['color-text-subtle'] as const;

function tokenPair(foreground: string, background: string): readonly [string, number] {
  return [
    `${foreground} on ${background}`,
    contrastRatio(readToken(foreground), readToken(background)),
  ];
}

describe('token parsing', () => {
  it('finds the token file and reads known values', () => {
    expect(readToken('color-text')).toBe('#f2f4f7');
  });

  it('rejects a missing token instead of silently passing', () => {
    expect(() => readToken('color-does-not-exist')).toThrow(/not defined/);
  });
});

describe('body text contrast (>= 4.5:1)', () => {
  const cases = BODY_TEXT.flatMap((text) => SURFACES.map((surface) => tokenPair(text, surface)));

  it.each(cases)('%s', (_label, ratio) => {
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('secondary text contrast (>= 4.5:1)', () => {
  const cases = SUBTLE_TEXT.flatMap((text) => SURFACES.map((surface) => tokenPair(text, surface)));

  // Subtle text is used for metadata at small sizes, so it must still clear AA for body text.
  it.each(cases)('%s', (_label, ratio) => {
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('accent and status text contrast', () => {
  it.each([
    tokenPair('color-accent', 'color-bg'),
    tokenPair('color-accent', 'color-surface'),
    tokenPair('color-accent-strong', 'color-surface-raised'),
    tokenPair('color-danger', 'color-surface'),
    tokenPair('color-success', 'color-surface'),
    tokenPair('color-warning', 'color-surface'),
  ])('%s', (_label, ratio) => {
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps text on the accent fill readable', () => {
    expect(
      contrastRatio(readToken('color-accent-contrast'), readToken('color-accent')),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe('non-text contrast (>= 3:1)', () => {
  it.each([
    tokenPair('color-focus', 'color-bg'),
    tokenPair('color-focus', 'color-surface'),
    tokenPair('color-focus', 'color-surface-raised'),
    // Control boundaries (button and input borders) must stay distinguishable wherever a
    // control can be placed, including inside a hovered surface.
    tokenPair('color-border-strong', 'color-bg'),
    tokenPair('color-border-strong', 'color-bg-elevated'),
    tokenPair('color-border-strong', 'color-surface'),
    tokenPair('color-border-strong', 'color-surface-raised'),
    tokenPair('color-border-strong', 'color-surface-hover'),
  ])('%s', (_label, ratio) => {
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});

describe('interactive target size', () => {
  it('meets the 44px minimum touch target (design spec 4.3)', () => {
    const touchTarget = readToken('touch-target');
    const remMatch = /^([\d.]+)rem$/.exec(touchTarget);

    expect(remMatch).not.toBeNull();
    const rem = Number(remMatch?.[1]);
    expect(rem * 16).toBeGreaterThanOrEqual(44);
  });
});
