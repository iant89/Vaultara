/**
 * Which pages a PDF layout shows, and how far next/previous should move.
 *
 * Page numbers are 1-based. Book mode pairs consecutive pages (1–2, 3–4, …). On a narrow stage
 * the same mode shows one page so two squeezed columns are not presented as a readable spread.
 */

export type ViewerMode = 'page' | 'book' | 'grid';
export type GridColumns = 2 | 3 | 4;
export type ScaleMode = 'auto' | 'page' | 'width';

export interface ViewerLayout {
  readonly mode: ViewerMode;
  readonly gridColumns?: GridColumns;
}

/** Below this width a two-page spread is smaller than a usable page. */
export const BOOK_TWO_PAGE_MIN_WIDTH = 640;

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

export function bookColumnCount(stageWidth: number): 1 | 2 {
  // An unmeasured stage (width 0) is not a phone; wait to collapse the spread until we know.
  if (stageWidth <= 0) {
    return 2;
  }

  return stageWidth >= BOOK_TWO_PAGE_MIN_WIDTH ? 2 : 1;
}

export function clampPage(page: number, pageCount: number): number {
  if (pageCount < 1) {
    return 1;
  }

  return Math.min(pageCount, Math.max(1, Math.trunc(page)));
}

export function pagesPerTurn(layout: ViewerLayout, bookColumns: 1 | 2): number {
  if (layout.mode === 'grid') {
    const columns = layout.gridColumns ?? 2;
    return columns * columns;
  }

  if (layout.mode === 'book' && bookColumns === 2) {
    return 2;
  }

  return 1;
}

export function visiblePages(
  layout: ViewerLayout,
  pageCount: number,
  startPage: number,
  bookColumns: 1 | 2,
): readonly number[] {
  if (pageCount < 1) {
    return [];
  }

  const current = clampPage(startPage, pageCount);

  if (layout.mode === 'page' || (layout.mode === 'book' && bookColumns === 1)) {
    return [current];
  }

  if (layout.mode === 'book') {
    const left = current % 2 === 0 ? current - 1 : current;
    const right = left + 1;

    return right <= pageCount ? [left, right] : [left];
  }

  const count = pagesPerTurn(layout, bookColumns);
  const gridStart = Math.floor((current - 1) / count) * count + 1;
  const pages: number[] = [];

  for (let page = gridStart; page < gridStart + count && page <= pageCount; page += 1) {
    pages.push(page);
  }

  return pages;
}

export function stepStartPage(
  layout: ViewerLayout,
  pageCount: number,
  startPage: number,
  direction: -1 | 1,
  bookColumns: 1 | 2,
): number {
  const step = pagesPerTurn(layout, bookColumns);
  const current = clampPage(startPage, pageCount);

  if (layout.mode === 'book' && bookColumns === 2) {
    const left = current % 2 === 0 ? current - 1 : current;
    return clampPage(left + direction * step, pageCount);
  }

  if (layout.mode === 'grid') {
    const count = step;
    const gridStart = Math.floor((current - 1) / count) * count + 1;
    return clampPage(gridStart + direction * count, pageCount);
  }

  return clampPage(current + direction * step, pageCount);
}

export function describeVisiblePages(pages: readonly number[], pageCount: number): string {
  if (pages.length === 0) {
    return `No pages of ${pageCount}`;
  }

  const first = pages[0];
  const last = pages[pages.length - 1];

  if (first === undefined || last === undefined) {
    return `No pages of ${pageCount}`;
  }

  if (pages.length === 1) {
    return `Page ${String(first)} of ${String(pageCount)}`;
  }

  return `Pages ${String(first)}–${String(last)} of ${String(pageCount)}`;
}

export function computeScale(
  page: { readonly width: number; readonly height: number },
  cell: { readonly width: number; readonly height: number },
  mode: ScaleMode,
): number {
  if (page.width <= 0 || page.height <= 0 || cell.width <= 0) {
    return 1;
  }

  const widthScale = cell.width / page.width;

  if (mode === 'width') {
    return clampScale(widthScale);
  }

  const heightScale = cell.height > 0 ? cell.height / page.height : widthScale;
  return clampScale(Math.min(widthScale, heightScale));
}

function clampScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) {
    return 1;
  }

  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}
