import { describe, expect, it } from 'vitest';
import type { AppError } from '../models/errors';
import { createProviderCapabilities } from '../models/provider';
import { makeCategory, makeCollection, makeFile, makeItem } from '../test/fakeProvider';
import {
  validateContentCategories,
  validateContentCollection,
  validateContentFiles,
  validateContentItem,
  validateContentItems,
  validateDownloadUrl,
  validatePaginatedResult,
  validateProviderCapabilities,
} from './validate';

const PROVIDER = 'fake';

function expectInvalidResponse(run: () => unknown): void {
  try {
    run();
  } catch (error) {
    expect((error as AppError).kind).toBe('invalid-response');
    return;
  }

  throw new Error('Expected validation to fail.');
}

describe('validateContentItem', () => {
  it('accepts a well-formed item', () => {
    const item = makeItem();

    expect(validateContentItem(item, PROVIDER)).toBe(item);
  });

  it.each([[null], [undefined], ['item'], [[]]])('rejects the non-object %j', (value) => {
    expectInvalidResponse(() => validateContentItem(value, PROVIDER));
  });

  it('rejects an item with no id', () => {
    expectInvalidResponse(() => validateContentItem({ ...makeItem(), id: '  ' }, PROVIDER));
  });

  it('rejects an item attributed to another provider', () => {
    expectInvalidResponse(() =>
      validateContentItem({ ...makeItem(), providerId: 'wikipedia' }, PROVIDER),
    );
  });

  it('rejects an item with a missing title', () => {
    expectInvalidResponse(() => validateContentItem({ ...makeItem(), title: undefined }, PROVIDER));
  });

  it('rejects malformed category or tag lists', () => {
    expectInvalidResponse(() =>
      validateContentItem({ ...makeItem(), tags: 'not-a-list' }, PROVIDER),
    );
  });

  it('rejects malformed metadata', () => {
    expectInvalidResponse(() =>
      validateContentItem({ ...makeItem(), metadata: ['array'] }, PROVIDER),
    );
  });
});

describe('validateContentItems', () => {
  it('rejects a non-array', () => {
    expectInvalidResponse(() => validateContentItems({ items: [] }, PROVIDER));
  });

  it('validates every entry', () => {
    expect(validateContentItems([makeItem()], PROVIDER)).toHaveLength(1);
    expectInvalidResponse(() => validateContentItems([makeItem(), {}], PROVIDER));
  });
});

describe('validateContentCollection', () => {
  it('accepts a well-formed collection', () => {
    expect(validateContentCollection(makeCollection(), PROVIDER)).toBeDefined();
  });

  it('rejects a collection without an id', () => {
    expectInvalidResponse(() => validateContentCollection({ providerId: PROVIDER }, PROVIDER));
  });

  it('rejects a collection attributed to another provider', () => {
    expectInvalidResponse(() =>
      validateContentCollection({ ...makeCollection(), providerId: 'wikipedia' }, PROVIDER),
    );
  });
});

describe('validateContentFiles', () => {
  it('accepts files from the expected provider', () => {
    expect(validateContentFiles([makeFile()], PROVIDER)).toHaveLength(1);
  });

  it('rejects a file without a name', () => {
    expectInvalidResponse(() => validateContentFiles([{ providerId: PROVIDER }], PROVIDER));
  });

  it('rejects a non-array', () => {
    expectInvalidResponse(() => validateContentFiles(null, PROVIDER));
  });
});

describe('validateContentCategories', () => {
  it('accepts categories', () => {
    expect(validateContentCategories([makeCategory()], PROVIDER)).toHaveLength(1);
  });

  it('rejects a category without an id', () => {
    expectInvalidResponse(() => validateContentCategories([{ name: 'Nameless' }], PROVIDER));
  });
});

describe('validatePaginatedResult', () => {
  it('keeps a well-formed page', () => {
    const page = { items: [makeItem()], page: 2, pageSize: 24, total: 30, hasMore: true };

    const validated = validatePaginatedResult(page, PROVIDER, validateContentItem);

    expect(validated).toMatchObject({ page: 2, pageSize: 24, total: 30, hasMore: true });
    expect(validated.items).toHaveLength(1);
  });

  it('repairs cosmetic pagination defects instead of rejecting valid content', () => {
    const validated = validatePaginatedResult(
      { items: [], page: 0, pageSize: -5, total: -1 },
      PROVIDER,
      validateContentItem,
    );

    expect(validated.page).toBe(1);
    expect(validated.pageSize).toBe(0);
    expect(validated.total).toBe(0);
    expect(validated.hasMore).toBe(false);
  });

  it('only reports more pages when the provider says so', () => {
    expect(validatePaginatedResult({ items: [] }, PROVIDER, validateContentItem).hasMore).toBe(
      false,
    );
  });

  it('keeps a non-empty cursor and drops an empty one', () => {
    expect(
      validatePaginatedResult({ items: [], nextCursor: 'abc' }, PROVIDER, validateContentItem)
        .nextCursor,
    ).toBe('abc');
    expect(
      validatePaginatedResult({ items: [], nextCursor: '  ' }, PROVIDER, validateContentItem)
        .nextCursor,
    ).toBeUndefined();
  });

  it('rejects a result that is not an object', () => {
    expectInvalidResponse(() =>
      validatePaginatedResult([makeItem()], PROVIDER, validateContentItem),
    );
  });

  it('rejects a result with no items array', () => {
    expectInvalidResponse(() =>
      validatePaginatedResult({ page: 1 }, PROVIDER, validateContentItem),
    );
  });

  it('rejects a page containing a malformed item', () => {
    expectInvalidResponse(() =>
      validatePaginatedResult({ items: [{}] }, PROVIDER, validateContentItem),
    );
  });
});

describe('validateDownloadUrl', () => {
  it('passes through an absolute http(s) URL', () => {
    expect(validateDownloadUrl('https://archive.org/file.pdf', PROVIDER)).toBe(
      'https://archive.org/file.pdf',
    );
  });

  it('treats null as "no direct URL", not as a failure', () => {
    expect(validateDownloadUrl(null, PROVIDER)).toBeNull();
    expect(validateDownloadUrl(undefined, PROVIDER)).toBeNull();
  });

  it.each(['javascript:alert(1)', 'file:///etc/passwd', '/relative/path'])(
    'rejects the unusable URL %s',
    (url) => {
      expectInvalidResponse(() => validateDownloadUrl(url, PROVIDER));
    },
  );
});

describe('validateProviderCapabilities', () => {
  it('accepts a complete declaration', () => {
    const validated = validateProviderCapabilities(
      createProviderCapabilities({ search: true, contentTypes: ['movie', 'book'] }),
      PROVIDER,
    );

    expect(validated.search).toBe(true);
    expect(validated.contentTypes).toEqual(['movie', 'book']);
  });

  it('rejects a non-boolean flag rather than guessing', () => {
    expectInvalidResponse(() =>
      validateProviderCapabilities({ ...createProviderCapabilities(), search: 'yes' }, PROVIDER),
    );
  });

  it('rejects a missing content type list', () => {
    expectInvalidResponse(() =>
      validateProviderCapabilities(
        { ...createProviderCapabilities(), contentTypes: undefined },
        PROVIDER,
      ),
    );
  });

  it('drops content types that are not in the shared vocabulary', () => {
    const validated = validateProviderCapabilities(
      { ...createProviderCapabilities(), contentTypes: ['movie', 'hologram'] },
      PROVIDER,
    );

    expect(validated.contentTypes).toEqual(['movie']);
  });

  it('rejects a non-object declaration', () => {
    expectInvalidResponse(() => validateProviderCapabilities(null, PROVIDER));
  });
});
