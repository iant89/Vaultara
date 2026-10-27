import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom has no canvas or media engine. Viewers still call `getContext('2d')` and
 * `HTMLMediaElement.pause()` during render and RTL cleanup; without these stubs
 * jsdom prints "Not implemented" on stderr. Pixel output and real playback are
 * covered in Playwright, not here. Do not install the native `canvas` package
 * for this.
 */
function stub2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return {
    canvas,
    fillStyle: '#000000',
    setTransform() {},
    clearRect() {},
    fillRect() {},
    getImageData() {
      return {
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
        colorSpace: 'srgb',
      } as ImageData;
    },
  } as unknown as CanvasRenderingContext2D;
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    id: string,
  ) {
    return id === '2d' ? stub2dContext(this) : null;
  } as HTMLCanvasElement['getContext'];
}

if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.pause = function pause() {
    /* jsdom has no media engine */
  };

  HTMLMediaElement.prototype.play = async function play() {
    /* jsdom has no media engine */
  };
}

// Vitest runs without globals, so React Testing Library cannot register its own
// automatic cleanup. Do it explicitly to keep tests independent of execution order.
afterEach(() => {
  cleanup();
});
