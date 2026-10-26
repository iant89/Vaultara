import { describe, expect, it } from 'vitest';
import { mapPdfFont } from './fonts';

describe('mapPdfFont', () => {
  it('maps common PDF families onto web-safe equivalents', () => {
    expect(mapPdfFont('ABCDEF+TimesNewRomanPSMT')).toMatch(/Times/i);
    expect(mapPdfFont('Courier')).toMatch(/Courier/i);
    expect(mapPdfFont('Helvetica-Bold')).toMatch(/Helvetica/i);
    expect(mapPdfFont('UnknownFont')).toMatch(/Helvetica/i);
  });
});
