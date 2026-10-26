import { useCallback } from 'react';
import { useSession } from '../data/SessionContext';
import type { DownloadDraft } from '../models/download';

export function useRecordDownload(): (draft: DownloadDraft) => void {
  const session = useSession();

  return useCallback(
    (draft: DownloadDraft) => {
      if (session.status !== 'signed-in') {
        return;
      }

      void session.recordDownload(draft);
    },
    [session],
  );
}
