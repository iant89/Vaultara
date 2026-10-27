/**
 * Route path builders (design spec section 22).
 *
 * Centralised so that provider ids and item ids are always encoded consistently. Item ids
 * from real providers routinely contain characters that must be escaped in a path segment,
 * and providers may expose the same id, so the provider id is always part of the path.
 */

import { PRIMARY_PROVIDER_ID } from '../config/discovery';
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

/**
 * Archive categories live at `/category/:id`. Other providers have no entry in that
 * Archive-rooted route, so their categories open as collections instead.
 */
export function buildCategoryBrowsePath(categoryId: string, providerId?: string): string {
  if (providerId !== undefined && providerId !== PRIMARY_PROVIDER_ID) {
    return buildCollectionPath(providerId, categoryId);
  }

  return buildCategoryPath(categoryId);
}

export function buildCollectionPath(providerId: string, collectionId: string): string {
  return `/collection/${encodeSegment(providerId)}/${encodeSegment(collectionId)}`;
}

export function buildItemPath(identity: ContentIdentity): string {
  return `/item/${encodeSegment(identity.providerId)}/${encodeSegment(identity.itemId)}`;
}

/**
 * Collections are items in the Archive's index, but they have their own route. A card or hero
 * that received a collection-typed result must not send the reader to `/item/...`.
 */
export function buildDiscoverablePath(item: {
  readonly providerId: string;
  readonly id: string;
  readonly type: string;
}): string {
  if (item.type === 'collection') {
    return buildCollectionPath(item.providerId, item.id);
  }

  return buildItemPath({ providerId: item.providerId, itemId: item.id });
}

export function buildViewerPath(identity: ContentIdentity, fileId?: string): string {
  const path = `/viewer/${encodeSegment(identity.providerId)}/${encodeSegment(identity.itemId)}`;

  if (fileId === undefined || fileId.length === 0) {
    return path;
  }

  return `${path}?file=${encodeSegment(fileId)}`;
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

export function buildSettingsPath(section?: string): string {
  if (section === undefined || section.trim() === '') {
    return '/settings';
  }

  return `/settings/${encodeSegment(section)}`;
}

export function buildOnboardingPath(): string {
  return '/onboarding';
}
