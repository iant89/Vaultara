/**
 * Categories offered during onboarding and in Settings (design spec 6.2).
 *
 * Only families the home page can actually fill are listed. Wikipedia, comics, and other
 * sources without an adapter are omitted rather than shown as empty shelves.
 */

import { DISCOVERY_ROWS } from './discovery';

export interface OnboardingCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export const ONBOARDING_CATEGORIES: readonly OnboardingCategory[] = DISCOVERY_ROWS.map((row) => ({
  id: row.categoryId,
  name: row.title,
  description: row.description,
}));

export function onboardingCategoryIds(): readonly string[] {
  return ONBOARDING_CATEGORIES.map((category) => category.id);
}
