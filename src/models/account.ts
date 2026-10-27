/**
 * Account, session, and preference records (design spec 6, 20, 21).
 *
 * Production account functionality is specified as a backend service. This GitHub Pages
 * build stores those records in IndexedDB on the current device. Cross-device sync is not
 * implied by a successful sign-in.
 */

export interface AccountRecord {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly createdAt: string;
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly userId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface UserPreferences {
  readonly selectedCategoryIds: readonly string[];
  readonly disabledProviderIds: readonly string[];
  readonly historyTrackingEnabled: boolean;
  /** When true, ordinary discovery hides explored items that are not liked or favorited. */
  readonly hideExploredFromDiscovery: boolean;
  /** After skip or continue, the category-selection screen is not shown again. */
  readonly onboardingCompleted: boolean;
  /**
   * Local confirmation that the account holder is of legal age for adult content where they
   * are. This is not identity verification; the application has no backend that could perform
   * one (design spec 13.3).
   */
  readonly adultAgeConfirmed: boolean;
  /** Explicit Adult-provider opt-in. Ignored unless `adultAgeConfirmed` is also true. */
  readonly adultOptIn: boolean;
  /** When true, Adult identities stay out of favorites and history lists. */
  readonly hideAdultInSharedLists: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  selectedCategoryIds: [],
  disabledProviderIds: [],
  historyTrackingEnabled: true,
  hideExploredFromDiscovery: true,
  onboardingCompleted: false,
  adultAgeConfirmed: false,
  adultOptIn: false,
  hideAdultInSharedLists: true,
};

export function normalizePreferences(value: unknown): UserPreferences {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_PREFERENCES;
  }

  const record = value as Record<string, unknown>;

  return {
    selectedCategoryIds: asStringList(record['selectedCategoryIds']),
    disabledProviderIds: asStringList(record['disabledProviderIds']),
    historyTrackingEnabled: record['historyTrackingEnabled'] !== false,
    hideExploredFromDiscovery: record['hideExploredFromDiscovery'] !== false,
    onboardingCompleted: record['onboardingCompleted'] === true,
    adultAgeConfirmed: record['adultAgeConfirmed'] === true,
    adultOptIn: record['adultOptIn'] === true,
    hideAdultInSharedLists: record['hideAdultInSharedLists'] !== false,
  };
}

function asStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export interface CreateAccountInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}
