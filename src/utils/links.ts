/**
 * Route path builders (design spec section 22).
 *
 * Centralised so that provider ids and item ids are always encoded consistently. Item ids
 * from real providers routinely contain characters that must be escaped in a path segment,
 * and providers may expose the same id, so the provider id is always part of the path.
 */

import type { ContentIdentity } from '../models/identity';

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export function buildHomePath(): string {
  return '/';
}

export function buildProviderPath(providerId: string): string {
  return `/provider/${encodeSegment(providerId)}`;
}

export function buildCategoryPath(categoryId: string): string {
  return `/category/${encodeSegment(categoryId)}`;
}

export function buildCollectionPath(providerId: string, collectionId: string): string {
  return `/collection/${encodeSegment(providerId)}/${encodeSegment(collectionId)}`;
}

export function buildItemPath(identity: ContentIdentity): string {
  return `/item/${encodeSegment(identity.providerId)}/${encodeSegment(identity.itemId)}`;
}

export function buildViewerPath(identity: ContentIdentity): string {
  return `/viewer/${encodeSegment(identity.providerId)}/${encodeSegment(identity.itemId)}`;
}

export function buildSearchPath(query?: string): string {
  const trimmed = query?.trim();

  if (trimmed === undefined || trimmed.length === 0) {
    return '/search';
  }

  return `/search?q=${encodeSegment(trimmed)}`;
}

export function buildFavoritesPath(): string {
  return '/favorites';
}

export function buildHistoryPath(): string {
  return '/history';
}

export function buildDownloadsPath(): string {
  return '/downloads';
}

export function buildSettingsPath(): string {
  return '/settings';
}
