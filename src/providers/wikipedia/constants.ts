/**
 * Wikipedia provider constants.
 *
 * English Wikipedia is the in-app edition. Other language editions are offered as links to
 * the original article on that wiki rather than as extra adapters.
 */

export const WIKIPEDIA_PROVIDER_ID = 'wikipedia';

export const DEFAULT_WIKIPEDIA_HOST = 'https://en.wikipedia.org';

/** Synthetic file the article reader matches on. Not a downloadable binary. */
export const WIKIPEDIA_ARTICLE_FILE_ID = 'article';

/**
 * Private MIME type so the book reader and generic HTML handling cannot claim a Wikipedia
 * article. Only the Wikipedia viewer matches this type, and only on this provider.
 */
export const WIKIPEDIA_ARTICLE_MIME = 'application/vnd.vaultara.wikipedia+html';

/** CC BY-SA 4.0, the licence Wikipedia text is published under. */
export const WIKIPEDIA_LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

export const WIKIPEDIA_RIGHTS_STATEMENT =
  'Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply.';

/** Parse and search payloads larger than this are refused rather than decoded. */
export const WIKIPEDIA_MAX_BYTES = 4 * 1024 * 1024;

/** MediaWiki anonymous search limit. */
export const WIKIPEDIA_SEARCH_LIMIT = 50;
