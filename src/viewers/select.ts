/**
 * Viewer selection (design specification 17.4, roadmap 11.2).
 *
 * Scores every (file, viewer) pair, honours an explicit `?file=` id, and falls back to the
 * generic viewer when nothing specialized matches. MIME types and extensions are untrusted.
 */

import type { ContentFile, ContentItem } from '../models/content';
import type { ViewerRegistry } from './registry';
import type { ViewerModule } from './types';

export interface ViewerSelection {
  readonly viewer: ViewerModule;
  readonly file: ContentFile;
  /** Files this viewer can open, in provider order. */
  readonly files: readonly ContentFile[];
}

interface Candidate {
  readonly viewer: ViewerModule;
  readonly file: ContentFile;
  readonly score: number;
}

export function selectViewer(
  registry: ViewerRegistry,
  item: ContentItem,
  files: readonly ContentFile[],
  requestedFileId?: string,
): ViewerSelection | undefined {
  const viewers = registry.list();

  if (viewers.length === 0 || files.length === 0) {
    return undefined;
  }

  if (requestedFileId !== undefined && requestedFileId.length > 0) {
    const requested = files.find((file) => file.id === requestedFileId);

    if (requested !== undefined) {
      const match = bestCandidate(viewers, item, requested);

      if (match !== undefined) {
        return toSelection(match, item, files);
      }
    }
  }

  const ranked: Candidate[] = [];

  for (const file of files) {
    const match = bestCandidate(viewers, item, file);

    if (match !== undefined) {
      ranked.push(match);
    }
  }

  ranked.sort((left, right) => compareCandidates(left, right, item));

  const winner = ranked[0];

  return winner === undefined ? undefined : toSelection(winner, item, files);
}

function bestCandidate(
  viewers: readonly ViewerModule[],
  item: ContentItem,
  file: ContentFile,
): Candidate | undefined {
  let best: Candidate | undefined;

  for (const viewer of viewers) {
    const score = viewer.match(file, item);

    if (score <= 0) {
      continue;
    }

    const next: Candidate = { viewer, file, score };

    if (best === undefined || compareCandidates(next, best, item) < 0) {
      best = next;
    }
  }

  return best;
}

function compareCandidates(left: Candidate, right: Candidate, item: ContentItem): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  const leftGeneric = left.viewer.descriptor.id === 'generic' ? 1 : 0;
  const rightGeneric = right.viewer.descriptor.id === 'generic' ? 1 : 0;

  if (leftGeneric !== rightGeneric) {
    return leftGeneric - rightGeneric;
  }

  const leftType = left.viewer.descriptor.supportedContentTypes.includes(item.type) ? 1 : 0;
  const rightType = right.viewer.descriptor.supportedContentTypes.includes(item.type) ? 1 : 0;

  return rightType - leftType;
}

function toSelection(
  candidate: Candidate,
  item: ContentItem,
  files: readonly ContentFile[],
): ViewerSelection {
  return {
    viewer: candidate.viewer,
    file: candidate.file,
    files: files.filter((file) => candidate.viewer.match(file, item) > 0),
  };
}
