/**
 * Wikipedia article detection.
 *
 * MIME type and provider id are untrusted metadata. Only this provider's synthetic article
 * file is offered as Read — Archive HTML dumps must not open in the Wikipedia reader.
 */

export const WIKIPEDIA_ARTICLE_MIME = 'application/vnd.vaultara.wikipedia+html';

export interface WikipediaFileLike {
  readonly id?: string;
  readonly providerId?: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly downloadAvailable: boolean;
  readonly downloadUrl?: string;
}

export function isWikipediaArticle(file: WikipediaFileLike): boolean {
  if (file.providerId !== 'wikipedia') {
    return false;
  }

  if (file.mimeType === WIKIPEDIA_ARTICLE_MIME) {
    return true;
  }

  return file.id === 'article';
}

export function canReadWikipedia(file: WikipediaFileLike): boolean {
  return isWikipediaArticle(file) && file.downloadAvailable && file.downloadUrl !== undefined;
}
