/**
 * Shapes used internally by the Wikipedia adapter.
 *
 * MediaWiki payloads are `unknown` at the HTTP boundary. These types describe the fields we
 * read after a runtime check, not a guarantee the live service honours them.
 */

export interface WikipediaSearchHit {
  readonly title: string;
  readonly pageid?: number;
  readonly extract?: string;
  readonly thumbnailUrl?: string;
  readonly canonicalUrl?: string;
  readonly description?: string;
  readonly categories?: readonly string[];
}

export interface WikipediaParseResult {
  readonly title: string;
  readonly displayTitle?: string;
  readonly html: string;
  readonly sections: readonly WikipediaSection[];
}

export interface WikipediaSection {
  readonly level: number;
  readonly line: string;
  readonly anchor: string;
}

export interface WikipediaLangLink {
  readonly lang: string;
  readonly title: string;
  readonly url: string;
}
