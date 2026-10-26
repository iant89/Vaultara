import { useEffect, useRef, useState } from 'react';
import { cx } from '../../utils/cx';
import type { PdfDocumentHandle } from './types';
import { mapPdfFont } from './fonts';
import { computeScale, type ScaleMode } from './layout';
import type { OverlayLine } from './text';
import { groupRunsIntoLines, sampleLineColors } from './text';
import type { TranslatorPort } from './translation';
import { translateLines } from './translation';
import { useElementSize } from './useElementSize';
import styles from './PdfViewer.module.css';

interface PdfPageViewProps {
  readonly document: PdfDocumentHandle;
  readonly pageNumber: number;
  readonly scaleMode: ScaleMode;
  readonly translator?: TranslatorPort;
  readonly turning?: boolean;
  readonly onActivate?: () => void;
}

export function PdfPageView({
  document,
  pageNumber,
  scaleMode,
  translator,
  turning = false,
  onActivate,
}: PdfPageViewProps) {
  const cellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cell = useElementSize(cellRef);
  const [pageSize, setPageSize] = useState({ width: 1, height: 1.5 });
  const [overlay, setOverlay] = useState<readonly OverlayLine[]>([]);
  const [pageText, setPageText] = useState('');

  const scale = computeScale(pageSize, cell, scaleMode);

  useEffect(() => {
    let cancelled = false;

    void document.pageSize(pageNumber).then((size) => {
      if (!cancelled) {
        setPageSize(size);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [document, pageNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null || scale <= 0) {
      return;
    }

    let cancelled = false;

    void document
      .render(pageNumber, canvas, scale)
      .then(async () => {
        if (cancelled) {
          return;
        }

        const runs = await document.textRuns(pageNumber);

        if (cancelled) {
          return;
        }

        const lines = groupRunsIntoLines(runs);
        setPageText(lines.map((line) => line.text).join(' '));

        if (translator === undefined) {
          setOverlay([]);
          return;
        }

        const translated = await translateLines(lines, translator);

        if (cancelled) {
          return;
        }

        const context = canvas.getContext('2d');
        const ratio = globalThis.devicePixelRatio > 0 ? globalThis.devicePixelRatio : 1;
        const painted: OverlayLine[] = translated.map((line) => {
          const colors =
            context === null
              ? { color: 'rgb(20 20 20)', background: 'rgb(255 255 255)' }
              : sampleLineColors(context, line, scale, ratio);

          return {
            ...line,
            ...colors,
            fontFamily: mapPdfFont(line.fontName),
            fontSize: Math.max(line.height * 0.9, 6),
          };
        });

        setOverlay(painted);
      })
      .catch(() => {
        if (!cancelled) {
          setOverlay([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [document, pageNumber, scale, translator]);

  const paper = (
    <div
      className={cx(styles.paper, turning && styles.turning)}
      style={{
        width: `${String(pageSize.width * scale)}px`,
        height: `${String(pageSize.height * scale)}px`,
      }}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      {overlay.length > 0 ? (
        <div className={styles.overlay} aria-hidden="true">
          {overlay.map((line, index) => (
            <span
              key={`${line.x}:${line.y}:${String(index)}`}
              className={styles.replacedLine}
              style={{
                left: `${String(line.x * scale)}px`,
                top: `${String(line.y * scale)}px`,
                width: `${String(Math.max(line.width * scale, 1))}px`,
                height: `${String(Math.max(line.height * scale, 1))}px`,
                fontSize: `${String(line.fontSize * scale)}px`,
                fontFamily: line.fontFamily,
                color: line.color,
                backgroundColor: line.background,
              }}
            >
              {line.text}
            </span>
          ))}
        </div>
      ) : null}
      {overlay.length > 0 ? (
        <p className="sr-only">{overlay.map((line) => line.text).join(' ')}</p>
      ) : pageText.length > 0 ? (
        <p className="sr-only">{pageText}</p>
      ) : null}
    </div>
  );

  if (onActivate !== undefined) {
    return (
      <button
        type="button"
        className={styles.pageButton}
        onClick={onActivate}
        aria-label={`Page ${String(pageNumber)}, open full screen`}
      >
        <div ref={cellRef} className={styles.cell}>
          {paper}
        </div>
      </button>
    );
  }

  return (
    <div ref={cellRef} className={styles.cell}>
      {paper}
    </div>
  );
}
