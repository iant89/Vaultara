/**
 * Viewer registry (design specification 17.1–17.3, roadmap 11.1).
 *
 * Owns which viewers exist and what they declare. It does not render, fetch, or choose a file;
 * selection lives in `select.ts` so matching can be tested without React.
 */

import { createAppError } from '../models/errors';
import type { ViewerModule } from './types';

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export class ViewerRegistry {
  private readonly viewers = new Map<string, ViewerModule>();

  /**
   * Register a viewer.
   *
   * Throws for a malformed or duplicate viewer rather than returning a boolean: both are
   * programming errors that would otherwise surface as a missing Read/View control.
   */
  register(viewer: ViewerModule): void {
    if (typeof viewer !== 'object' || viewer === null) {
      throw new TypeError('A viewer must be an object.');
    }

    const { descriptor } = viewer;

    if (typeof descriptor !== 'object' || descriptor === null) {
      throw new TypeError('A viewer must declare a descriptor.');
    }

    const { id } = descriptor;

    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new TypeError(
        `Invalid viewer id ${JSON.stringify(id)}: expected lowercase letters, digits, and hyphens.`,
      );
    }

    if (typeof descriptor.name !== 'string' || descriptor.name.trim() === '') {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must have a display name.`);
    }

    if (!Array.isArray(descriptor.supportedContentTypes)) {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must declare supported content types.`);
    }

    if (!Array.isArray(descriptor.supportedMimeTypes)) {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must declare supported MIME types.`);
    }

    if (!Array.isArray(descriptor.supportedExtensions)) {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must declare supported extensions.`);
    }

    if (typeof descriptor.supportsFullscreen !== 'boolean') {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must declare fullscreen support.`);
    }

    if (typeof descriptor.supportsProgress !== 'boolean') {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must declare progress support.`);
    }

    if (typeof descriptor.supportsOffline !== 'boolean') {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must declare offline support.`);
    }

    if (typeof viewer.match !== 'function') {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must implement match().`);
    }

    if (typeof viewer.load !== 'function') {
      throw new TypeError(`Viewer ${JSON.stringify(id)} must implement load().`);
    }

    if (this.viewers.has(id)) {
      throw new TypeError(`Viewer ${JSON.stringify(id)} is already registered.`);
    }

    this.viewers.set(id, viewer);
  }

  has(id: string): boolean {
    return this.viewers.has(id);
  }

  get(id: string): ViewerModule | undefined {
    return this.viewers.get(id);
  }

  require(id: string): ViewerModule {
    const viewer = this.viewers.get(id);

    if (viewer === undefined) {
      throw createAppError('not-found', `Viewer ${JSON.stringify(id)} is not registered.`);
    }

    return viewer;
  }

  list(): readonly ViewerModule[] {
    return [...this.viewers.values()];
  }

  ids(): readonly string[] {
    return [...this.viewers.keys()];
  }
}
