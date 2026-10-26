/** Tiny multi-page PDF used by the reader end-to-end test. ASCII-only so byte offsets match. */

function escapePdfText(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

export function buildMinimalPdf(pageTexts: readonly string[]): Uint8Array {
  const pageCount = pageTexts.length;
  const offsets: number[] = [0];
  let body = '%PDF-1.4\n';

  function addObject(id: number, content: string) {
    offsets[id] = body.length;
    body += `${String(id)} 0 obj\n${content}\nendobj\n`;
  }

  const pagesId = 2;
  const fontId = 3 + pageCount * 2;
  addObject(1, `<< /Type /Catalog /Pages ${String(pagesId)} 0 R >>`);

  const pageIds = pageTexts.map((_, index) => 3 + index * 2);
  const contentIds = pageTexts.map((_, index) => 4 + index * 2);
  addObject(
    pagesId,
    `<< /Type /Pages /Count ${String(pageCount)} /Kids [${pageIds.map((id) => `${String(id)} 0 R`).join(' ')}] >>`,
  );

  pageTexts.forEach((text, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];

    if (pageId === undefined || contentId === undefined) {
      return;
    }

    addObject(
      pageId,
      `<< /Type /Page /Parent ${String(pagesId)} 0 R /MediaBox [0 0 300 420] /Contents ${String(contentId)} 0 R /Resources << /Font << /F1 ${String(fontId)} 0 R >> >> >>`,
    );
    const stream = `BT /F1 18 Tf 36 380 Td (${escapePdfText(text)}) Tj ET`;
    addObject(contentId, `<< /Length ${String(stream.length)} >>\nstream\n${stream}\nendstream`);
  });

  addObject(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>');

  const xrefStart = body.length;
  const maxId = fontId;
  let xref = `xref\n0 ${String(maxId + 1)}\n0000000000 65535 f \n`;

  for (let id = 1; id <= maxId; id += 1) {
    xref += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`;
  }

  body += xref;
  body += `trailer\n<< /Size ${String(maxId + 1)} /Root 1 0 R >>\nstartxref\n${String(xrefStart)}\n%%EOF\n`;

  return new TextEncoder().encode(body);
}
