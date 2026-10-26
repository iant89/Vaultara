/**
 * Fetch and sanitise a Wikipedia article.
 *
 * Parse JSON is requested with `origin=*`. Markup is never inserted until `sanitizeWikipediaHtml`
 * has stripped scripts and dangerous URLs. The original page remains available as a download.
 */

import { createAppError } from '../../models/errors';
import { WikipediaApi } from '../../providers/wikipedia/api';
import { WIKIPEDIA_MAX_BYTES } from '../../providers/wikipedia/constants';
import { itemIdToTitle, readParseResult } from '../../providers/wikipedia/map';
import type { WikipediaSection } from '../../providers/wikipedia/types';
import { sanitizeWikipediaHtml } from './sanitize';

export interface LoadedArticle {
  readonly title: string;
  readonly displayTitle: string;
  readonly html: string;
  readonly sections: readonly WikipediaSection[];
}

export function describeArticleLoadFailure(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'kind' in error) {
    const kind = (error as { kind: string }).kind;

    if (kind === 'not-found') {
      return 'Wikipedia has no article with that title.';
    }

    if (kind === 'network' || kind === 'timeout' || kind === 'provider-unavailable') {
      return 'The article could not be fetched. Wikipedia may be unreachable, or the request was blocked.';
    }
  }

  return 'This article could not be opened.';
}

export async function loadArticle(
  itemId: string,
  signal: AbortSignal,
  api: WikipediaApi = new WikipediaApi(),
): Promise<LoadedArticle> {
  const payload = await api.parse(itemIdToTitle(itemId), { signal });
  const parsed = readParseResult(payload);

  if (parsed === undefined) {
    throw createAppError('invalid-response', 'Wikipedia did not return article HTML.');
  }

  if (parsed.html.length > WIKIPEDIA_MAX_BYTES) {
    throw createAppError('invalid-response', 'This article is larger than this app will download.');
  }

  return {
    title: parsed.title,
    displayTitle: parsed.displayTitle ?? parsed.title,
    html: sanitizeWikipediaHtml(parsed.html),
    sections: parsed.sections,
  };
}
