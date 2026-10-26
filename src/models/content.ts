/**
 * Shared content models (design specification 20).
 *
 * These types are the only representation the application core understands. Provider
 * adapters are responsible for normalizing provider payloads into them and for validating
 * untrusted data at that boundary; `metadata` carries provider-specific detail that the
 * core must never dereference blindly.
 */

export type ContentType =
  | 'book'
  | 'document'
  | 'article'
  | 'movie'
  | 'video'
  | 'audio'
  | 'music'
  | 'image'
  | 'game'
  | 'software'
  | 'website'
  | 'collection'
  | 'archive'
  | 'unknown';

export const CONTENT_TYPES: readonly ContentType[] = [
  'book',
  'document',
  'article',
  'movie',
  'video',
  'audio',
  'music',
  'image',
  'game',
  'software',
  'website',
  'collection',
  'archive',
  'unknown',
];

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * Rights information shown for attribution (design spec 9.3, 16.5).
 * The specification names `ContentRights` without fixing its fields; this provisional
 * shape is deliberately minimal and optional.
 */
export interface ContentRights {
  readonly license?: string;
  readonly rightsStatement?: string;
  readonly attributionUrl?: string;
}

export interface ContentItem {
  readonly id: string;
  readonly providerId: string;

  readonly title: string;
  readonly description?: string;

  readonly type: ContentType;

  readonly thumbnailUrl?: string;
  readonly artworkUrl?: string;

  readonly creator?: string;
  readonly publicationDate?: string;

  readonly categories: readonly string[];
  readonly tags: readonly string[];

  readonly sourceUrl?: string;
  readonly rights?: ContentRights;

  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ContentCollection {
  readonly id: string;
  readonly providerId: string;

  readonly title: string;
  readonly description?: string;

  readonly thumbnailUrl?: string;
  readonly artworkUrl?: string;

  readonly itemCount?: number;
  readonly categoryIds: readonly string[];

  readonly sourceUrl?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * A file belonging to an item. `downloadAvailable` and `viewable` are independent:
 * an item existing does not imply any file is playable or downloadable (design spec 11.3).
 */
export interface ContentFile {
  readonly id: string;
  readonly providerId: string;
  readonly itemId: string;

  readonly name: string;
  readonly extension?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;

  readonly downloadAvailable: boolean;
  readonly viewable: boolean;

  readonly checksum?: string;
  readonly accessStatus?: string;
  /**
   * Direct link to the file, when the provider can construct one and the file may be downloaded
   * (design spec 11.3 lists the download URL as file metadata). Absent means "no direct link",
   * not "unknown": callers must handle its absence rather than assuming a URL.
   */
  readonly downloadUrl?: string;

  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * A browsable category. Categories are owned by provider configuration rather than by
 * the core, so provider-scoped categories are expected.
 */
export interface ContentCategory {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly artworkUrl?: string;
  readonly providerId?: string;
}
