/**
 * Canonical content identity.
 *
 * Design specification 9.5: provider item identifiers are not globally unique, so an
 * item is always addressed by the pair (providerId, itemId). Every favorite, like,
 * history entry, cache key, and route parameter must use this identity rather than a
 * bare item id.
 */

export interface ContentIdentity {
  readonly providerId: string;
  readonly itemId: string;
}

export const CANONICAL_ID_SEPARATOR = ':';

/** Provider ids are stable lowercase slugs, e.g. `archive`, `wikipedia`. */
const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function isValidProviderId(value: string): boolean {
  return PROVIDER_ID_PATTERN.test(value);
}

/**
 * Build a validated identity. Throws a `TypeError` for invalid input, because an
 * invalid identity is a programming error rather than a recoverable runtime state.
 */
export function createContentIdentity(providerId: string, itemId: string): ContentIdentity {
  const normalizedProviderId = providerId.trim();
  const normalizedItemId = itemId.trim();

  if (!isValidProviderId(normalizedProviderId)) {
    throw new TypeError(
      `Invalid provider id ${JSON.stringify(providerId)}: expected lowercase letters, digits, and hyphens.`,
    );
  }

  if (normalizedItemId.length === 0) {
    throw new TypeError('Invalid item id: must not be empty.');
  }

  return { providerId: normalizedProviderId, itemId: normalizedItemId };
}

/** Serialize an identity to the canonical `providerId:itemId` string. */
export function formatCanonicalId(identity: ContentIdentity): string {
  return `${identity.providerId}${CANONICAL_ID_SEPARATOR}${identity.itemId}`;
}

/**
 * Parse a canonical id. Item ids may themselves contain `:` because only the first
 * separator is significant. Returns `null` for malformed input instead of throwing,
 * since this runs on untrusted route parameters.
 */
export function parseCanonicalId(value: string): ContentIdentity | null {
  const separatorIndex = value.indexOf(CANONICAL_ID_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }

  const providerId = value.slice(0, separatorIndex);
  const itemId = value.slice(separatorIndex + 1);

  if (!isValidProviderId(providerId) || itemId.trim().length === 0) {
    return null;
  }

  return { providerId, itemId };
}

export function canonicalIdsEqual(a: ContentIdentity, b: ContentIdentity): boolean {
  return a.providerId === b.providerId && a.itemId === b.itemId;
}
