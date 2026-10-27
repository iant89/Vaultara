/**
 * Viewer composition root (roadmap 11.1).
 *
 * This is the only place viewers are constructed and registered. Adding a viewer means adding
 * it here — pages must not `new ViewerRegistry()` except in tests. PDF, photographs, audio,
 * video, books, Wikipedia articles, Game Boy ROMs, web archives, and software artifacts are
 * specialized; everything else lands on file details.
 */

import { audioViewer } from './audio/module';
import { bookViewer } from './book/module';
import { emulatorViewer } from './emulator/module';
import { genericViewer } from './generic/module';
import { imageViewer } from './image/module';
import { pdfViewer } from './pdf/module';
import { ViewerRegistry } from './registry';
import type { ViewerModule } from './types';
import { videoViewer } from './video/module';
import { softwareViewer } from './software/module';
import { webArchiveViewer } from './webarchive/module';
import { wikipediaViewer } from './wikipedia/module';

export function defaultViewerModules(): readonly ViewerModule[] {
  return [
    pdfViewer,
    bookViewer,
    imageViewer,
    audioViewer,
    videoViewer,
    wikipediaViewer,
    emulatorViewer,
    webArchiveViewer,
    softwareViewer,
    genericViewer,
  ];
}

export function createViewerRegistry(
  modules: readonly ViewerModule[] = defaultViewerModules(),
): ViewerRegistry {
  const registry = new ViewerRegistry();

  for (const viewer of modules) {
    registry.register(viewer);
  }

  return registry;
}

let sharedRegistry: ViewerRegistry | undefined;

export function getViewerRegistry(): ViewerRegistry {
  sharedRegistry ??= createViewerRegistry();

  return sharedRegistry;
}

/** Drop the shared registry. Intended for tests. */
export function resetViewerRegistry(): void {
  sharedRegistry = undefined;
}
