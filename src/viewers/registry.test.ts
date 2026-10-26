import { describe, expect, it } from 'vitest';
import { makeFile, makeItem } from '../test/fakeProvider';
import { ViewerRegistry } from './registry';
import type { ViewerModule } from './types';

function stubViewer(id: string, overrides: Partial<ViewerModule> = {}): ViewerModule {
  return {
    descriptor: {
      id,
      name: `${id} viewer`,
      supportedContentTypes: ['image'],
      supportedMimeTypes: ['image/jpeg'],
      supportedExtensions: ['jpg'],
      supportsFullscreen: true,
      supportsProgress: false,
      supportsOffline: false,
    },
    match: () => 10,
    load: async () => ({ default: () => null }),
    ...overrides,
  };
}

describe('ViewerRegistry', () => {
  it('registers a viewer and lists its descriptor fields', () => {
    const registry = new ViewerRegistry();
    const viewer = stubViewer('image');
    registry.register(viewer);

    expect(registry.has('image')).toBe(true);
    expect(registry.get('image')).toBe(viewer);
    expect(registry.require('image').descriptor.supportedMimeTypes).toEqual(['image/jpeg']);
    expect(registry.require('image').descriptor.supportedExtensions).toEqual(['jpg']);
    expect(registry.require('image').descriptor.supportsFullscreen).toBe(true);
    expect(registry.ids()).toEqual(['image']);
  });

  it('rejects a duplicate id rather than replacing the first viewer', () => {
    const registry = new ViewerRegistry();
    registry.register(stubViewer('pdf'));

    expect(() => registry.register(stubViewer('pdf'))).toThrow(/already registered/);
    expect(registry.list()).toHaveLength(1);
  });

  it('rejects a malformed id or missing declarations', () => {
    const registry = new ViewerRegistry();

    expect(() => registry.register(stubViewer('PDF'))).toThrow(TypeError);
    expect(() =>
      registry.register(
        stubViewer('ok', {
          descriptor: {
            ...stubViewer('ok').descriptor,
            name: '  ',
          },
        }),
      ),
    ).toThrow(/display name/);
  });

  it('scores files through the registered match function', () => {
    const registry = new ViewerRegistry();
    registry.register(
      stubViewer('image', {
        match: (file) => (file.mimeType === 'image/jpeg' ? 80 : 0),
      }),
    );

    const viewer = registry.require('image');
    const item = makeItem({ type: 'image' });

    expect(viewer.match(makeFile({ mimeType: 'image/jpeg', name: 'a.jpg' }), item)).toBe(80);
    expect(viewer.match(makeFile({ mimeType: 'video/mp4', name: 'a.mp4' }), item)).toBe(0);
  });
});
