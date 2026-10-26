import { describe, expect, it } from 'vitest';
import {
  canonicalIdsEqual,
  createContentIdentity,
  formatCanonicalId,
  isValidProviderId,
  parseCanonicalId,
} from './identity';

describe('createContentIdentity', () => {
  it('trims surrounding whitespace', () => {
    expect(createContentIdentity('  archive  ', '  item-1 ')).toEqual({
      providerId: 'archive',
      itemId: 'item-1',
    });
  });

  it('rejects an empty item id', () => {
    expect(() => createContentIdentity('archive', '   ')).toThrow(TypeError);
  });

  it.each(['', 'Archive', 'arch ive', 'archive:mirror', '-archive'])(
    'rejects the invalid provider id %j',
    (providerId) => {
      expect(() => createContentIdentity(providerId, 'item-1')).toThrow(TypeError);
    },
  );
});

describe('isValidProviderId', () => {
  it.each(['archive', 'wikipedia', 'adult', 'a1', 'open-library'])('accepts %j', (value) => {
    expect(isValidProviderId(value)).toBe(true);
  });

  it.each(['', 'Archive', ' open-library', 'open_library', 'open/library'])(
    'rejects %j',
    (value) => {
      expect(isValidProviderId(value)).toBe(false);
    },
  );
});

describe('formatCanonicalId', () => {
  it('serializes provider and item with the canonical separator', () => {
    expect(formatCanonicalId({ providerId: 'archive', itemId: 'night_of_the_living_dead' })).toBe(
      'archive:night_of_the_living_dead',
    );
  });
});

describe('parseCanonicalId', () => {
  it('round-trips a canonical id', () => {
    const identity = { providerId: 'wikipedia', itemId: 'Ada_Lovelace' };
    expect(parseCanonicalId(formatCanonicalId(identity))).toEqual(identity);
  });

  it('keeps additional separators as part of the item id', () => {
    expect(parseCanonicalId('archive:folder:sub:file.txt')).toEqual({
      providerId: 'archive',
      itemId: 'folder:sub:file.txt',
    });
  });

  it.each(['', 'archive', ':item', 'archive:', 'Archive:item', 'arch ive:item'])(
    'returns null for the malformed id %j',
    (value) => {
      expect(parseCanonicalId(value)).toBeNull();
    },
  );
});

describe('canonicalIdsEqual', () => {
  it('treats identical identities as equal', () => {
    expect(
      canonicalIdsEqual(
        { providerId: 'archive', itemId: 'shared-id' },
        { providerId: 'archive', itemId: 'shared-id' },
      ),
    ).toBe(true);
  });

  // Regression guard for design spec 9.5: item ids are not globally unique.
  it('keeps colliding item ids from different providers distinct', () => {
    expect(
      canonicalIdsEqual(
        { providerId: 'archive', itemId: 'shared-id' },
        { providerId: 'wikipedia', itemId: 'shared-id' },
      ),
    ).toBe(false);
  });
});
