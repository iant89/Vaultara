/**
 * Raw Internet Archive API shapes.
 *
 * Every field is `unknown` on purpose. The Archive APIs are unversioned, return numbers as
 * strings, return either a string or an array for repeatable fields, and include fields that are
 * not documented. Typing these as their apparent types would move a lie into the type system;
 * the mapping layer validates and normalizes instead.
 *
 * Endpoint reference (verified against the Archive's developer documentation, 2026-10):
 *
 * - `GET /advancedsearch.php?q=…&fl[]=…&rows=…&page=…&output=json`
 *   → `{ response: { docs: [...], numFound, start }, responseHeader: {...} }`
 *   Capped by the Archive at 10,000 results.
 * - `GET /metadata/<identifier>` → `{ metadata: {...}, files: [...], … }`
 *   An unknown identifier answers `200` with an empty object rather than `404`.
 */

export interface ArchiveSearchResponse {
  readonly response?: {
    readonly docs?: unknown;
    readonly numFound?: unknown;
    readonly start?: unknown;
  };
}

export interface ArchiveMetadataResponse {
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly files?: unknown;
  readonly files_count?: unknown;
  readonly item_size?: unknown;
  readonly is_dark?: unknown;
  readonly nodownload?: unknown;
  readonly dir?: unknown;
}

/** One entry of the `files` array in a metadata response. */
export interface ArchiveFileEntry {
  readonly name?: unknown;
  readonly source?: unknown;
  readonly format?: unknown;
  readonly size?: unknown;
  readonly md5?: unknown;
  readonly sha1?: unknown;
  readonly crc32?: unknown;
  readonly private?: unknown;
  readonly length?: unknown;
  readonly height?: unknown;
  readonly width?: unknown;
  readonly mtime?: unknown;
}
