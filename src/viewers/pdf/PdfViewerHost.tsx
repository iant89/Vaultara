import { useCallback } from 'react';
import { EmptyState } from '../../components/feedback/EmptyState';
import type { ContentViewerProps } from '../../models/viewer';
import { PdfViewer } from './PdfViewer';
import { canReadPdf, selectPdfFile } from './isPdfFile';

/**
 * Adapts the existing PDF reader to the shared viewer contract.
 *
 * File switching is owned by the shared container, so this host passes a single file into
 * `PdfViewer` and keeps the specialized layout/translation toolbar as-is.
 */
export function PdfViewerHost({
  item,
  files,
  activeFileId,
  onSelectFile,
  onProgressChange,
}: ContentViewerProps) {
  const pdfFiles = files.filter(canReadPdf);
  const selected = selectPdfFile(pdfFiles, activeFileId);

  const handleProgress = useCallback(
    (page: number) => {
      onProgressChange?.({
        kind: 'pdf',
        page,
        updatedAt: new Date().toISOString(),
      });
    },
    [onProgressChange],
  );

  if (selected === undefined) {
    return (
      <EmptyState
        title="No PDF this app can read"
        description="The PDF reader opens a downloadable PDF from this item."
      />
    );
  }

  return (
    <PdfViewer
      item={item}
      file={selected}
      pdfFiles={[selected]}
      onSelectFile={onSelectFile}
      onProgress={handleProgress}
    />
  );
}
