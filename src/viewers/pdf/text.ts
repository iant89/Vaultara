/**
 * Group PDF.js text runs into visual lines so translation can replace a line in one box.
 */

export interface PdfTextRun {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontName: string;
}

export interface PdfTextLine {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontName: string;
}

export interface OverlayLine extends PdfTextLine {
  readonly color: string;
  readonly background: string;
  readonly fontFamily: string;
  readonly fontSize: number;
}

export function groupRunsIntoLines(runs: readonly PdfTextRun[]): readonly PdfTextLine[] {
  const usable = runs.filter((run) => run.text.trim().length > 0);
  const sorted = [...usable].sort((left, right) => left.y - right.y || left.x - right.x);
  const buckets: PdfTextRun[][] = [];

  for (const run of sorted) {
    const current = buckets[buckets.length - 1];
    const first = current?.[0];

    if (
      current !== undefined &&
      first !== undefined &&
      Math.abs(first.y - run.y) <= Math.max(first.height, run.height, 1) * 0.6
    ) {
      current.push(run);
    } else {
      buckets.push([run]);
    }
  }

  return buckets.map(mergeLine);
}

function mergeLine(runs: readonly PdfTextRun[]): PdfTextLine {
  const first = runs[0];

  if (first === undefined) {
    return { text: '', x: 0, y: 0, width: 0, height: 0, fontName: 'Helvetica' };
  }

  let minX = first.x;
  let minY = first.y;
  let maxRight = first.x + first.width;
  let maxBottom = first.y + first.height;

  for (const run of runs) {
    minX = Math.min(minX, run.x);
    minY = Math.min(minY, run.y);
    maxRight = Math.max(maxRight, run.x + run.width);
    maxBottom = Math.max(maxBottom, run.y + run.height);
  }

  return {
    text: runs.map((run) => run.text).join(' '),
    x: minX,
    y: minY,
    width: Math.max(0, maxRight - minX),
    height: Math.max(0, maxBottom - minY),
    fontName: first.fontName,
  };
}

export function rgbFromPixel(data: ArrayLike<number>, offset = 0): string {
  const red = data[offset] ?? 0;
  const green = data[offset + 1] ?? 0;
  const blue = data[offset + 2] ?? 0;

  return `rgb(${String(red)} ${String(green)} ${String(blue)})`;
}

export function sampleLineColors(
  ctx: CanvasRenderingContext2D,
  line: PdfTextLine,
  scale: number,
  devicePixelRatio: number,
): { readonly color: string; readonly background: string } {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const x = Math.round((line.x + Math.min(2, line.width / 2)) * scale * ratio);
  const midY = Math.round((line.y + line.height * 0.45) * scale * ratio);
  const backgroundY = Math.round((line.y - Math.max(1, line.height * 0.2)) * scale * ratio);

  return {
    color: readRgb(ctx, x, midY) ?? 'rgb(20 20 20)',
    background: readRgb(ctx, x, Math.max(0, backgroundY)) ?? 'rgb(255 255 255)',
  };
}

function readRgb(ctx: CanvasRenderingContext2D, x: number, y: number): string | undefined {
  try {
    const { width, height } = ctx.canvas;

    if (x < 0 || y < 0 || x >= width || y >= height) {
      return undefined;
    }

    return rgbFromPixel(ctx.getImageData(x, y, 1, 1).data, 0);
  } catch {
    return undefined;
  }
}
