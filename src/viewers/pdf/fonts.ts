/**
 * Map a PDF font name onto a web-safe family so replaced text can keep the original's style.
 *
 * PDF font ids are often subset names (`ABCDEF+TimesNewRomanPSMT`). Matching is therefore
 * substring-based, and unknown names fall back to Helvetica rather than the app UI font.
 */

export function mapPdfFont(fontName: string): string {
  const name = fontName.toLowerCase();

  if (name.includes('courier') || name.includes('mono') || name.includes('consolas')) {
    return 'Courier New, Courier, ui-monospace, monospace';
  }

  if (
    name.includes('times') ||
    name.includes('georgia') ||
    name.includes('garamond') ||
    name.includes('palatino') ||
    (name.includes('serif') && !name.includes('sans'))
  ) {
    return 'Times New Roman, Times, Georgia, serif';
  }

  return 'Helvetica, Arial, sans-serif';
}
