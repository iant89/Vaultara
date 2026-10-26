/**
 * Game Boy engine wrapping `@neil-morrison44/gameboy-emulator`.
 *
 * The library interprets GB opcodes; ROM bytes are never `eval`'d. Sound is left off because
 * it requires SharedArrayBuffer / COEP, which would break Archive.org media.
 */

import { createAppError } from '../../models/errors';
import type { EmulatorButton, EmulatorColor, EmulatorEngine } from './adapter';

const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;

const BUTTON_TO_FLAG: Readonly<Record<EmulatorButton, keyof GameBoyInput>> = {
  up: 'isPressingUp',
  down: 'isPressingDown',
  left: 'isPressingLeft',
  right: 'isPressingRight',
  a: 'isPressingA',
  b: 'isPressingB',
  start: 'isPressingStart',
  select: 'isPressingSelect',
};

interface GameBoyInput {
  isPressingUp: boolean;
  isPressingDown: boolean;
  isPressingLeft: boolean;
  isPressingRight: boolean;
  isPressingA: boolean;
  isPressingB: boolean;
  isPressingStart: boolean;
  isPressingSelect: boolean;
}

interface GameBoyKeyboard {
  up: string;
  down: string;
  left: string;
  right: string;
  a: string;
  b: string;
  start: string;
  select: string;
}

interface GameBoyGpu {
  backgroundPalette?: EmulatorColor[];
  obj0Palette?: EmulatorColor[];
  obj1Palette?: EmulatorColor[];
  windowPalette?: EmulatorColor[];
}

interface GameBoyMachine {
  readonly gpu: GameBoyGpu;
  readonly input: GameBoyInput;
  readonly keyboardManager: GameBoyKeyboard;
  stopped: boolean;
  previousTime: number;
  maxFps: number;
  interval: number;
  loadGame(data: ArrayBuffer): void;
  run(): void;
  stop(): void;
  runFrame(time: number): void;
  onFrameFinished(callback: (screen: ImageData) => void): void;
  getCartridgeSaveRam(): ArrayBuffer | undefined;
  setCartridgeSaveRam(data: ArrayBuffer): void;
}

interface GameBoyConstructor {
  new (options?: { readonly sound?: boolean }): GameBoyMachine;
}

interface GameBoyModule {
  readonly Gameboy?: GameBoyConstructor;
  readonly default?: GameBoyConstructor | { readonly Gameboy?: GameBoyConstructor };
}

function resolveConstructor(mod: GameBoyModule): GameBoyConstructor {
  if (typeof mod.Gameboy === 'function') {
    return mod.Gameboy;
  }

  const fallback = mod.default;

  if (typeof fallback === 'function') {
    return fallback;
  }

  if (typeof fallback === 'object' && fallback !== null && typeof fallback.Gameboy === 'function') {
    return fallback.Gameboy;
  }

  throw createAppError('unsupported-format', 'The Game Boy emulator failed to load.');
}

function applyPalette(gpu: GameBoyGpu, colors: readonly EmulatorColor[]): void {
  const copies = colors.map((color) => ({ ...color }));
  const targets: ReadonlyArray<keyof GameBoyGpu> = [
    'backgroundPalette',
    'obj0Palette',
    'obj1Palette',
    'windowPalette',
  ];

  for (const key of targets) {
    const current = gpu[key];

    if (!Array.isArray(current)) {
      continue;
    }

    for (let index = 0; index < 4; index += 1) {
      const color = copies[index];

      if (color !== undefined) {
        current[index] = color;
      }
    }
  }
}

export async function createGameBoyEngine(): Promise<EmulatorEngine> {
  const mod = (await import('@neil-morrison44/gameboy-emulator')) as GameBoyModule;
  const Gameboy = resolveConstructor(mod);
  const machine = new Gameboy({ sound: false });
  let context: CanvasRenderingContext2D | null = null;
  let started = false;

  const engine: EmulatorEngine = {
    system: 'gb',
    displayWidth: SCREEN_WIDTH,
    displayHeight: SCREEN_HEIGHT,

    attach(canvas) {
      canvas.width = SCREEN_WIDTH;
      canvas.height = SCREEN_HEIGHT;
      context = canvas.getContext('2d');
      machine.onFrameFinished((screen) => {
        context?.putImageData(screen, 0, 0);
      });
    },

    load(rom) {
      const copy = rom.slice().buffer;
      machine.loadGame(copy);
    },

    start() {
      if (started && !machine.stopped) {
        return;
      }

      if (started && machine.stopped) {
        engine.resume();
        return;
      }

      started = true;
      machine.stopped = false;
      machine.run();
    },

    pause() {
      machine.stop();
    },

    resume() {
      if (!machine.stopped) {
        return;
      }

      machine.stopped = false;
      machine.previousTime = 0;
      requestAnimationFrame((time) => {
        machine.runFrame(time);
      });
    },

    setButton(button, pressed) {
      machine.input[BUTTON_TO_FLAG[button]] = pressed;
    },

    setPalette(colors) {
      applyPalette(machine.gpu, colors);
    },

    setKeyBinding(button, code) {
      machine.keyboardManager[button] = code;
    },

    setFrameRate(fps) {
      const rate = fps <= 30 ? 30 : 60;
      machine.maxFps = rate;
      machine.interval = 1000 / rate;
    },

    getSaveRam() {
      try {
        const ram = machine.getCartridgeSaveRam();

        if (ram === undefined || ram.byteLength === 0) {
          return undefined;
        }

        return new Uint8Array(ram.slice(0));
      } catch {
        return undefined;
      }
    },

    setSaveRam(data) {
      try {
        machine.setCartridgeSaveRam(data.slice().buffer);
        return true;
      } catch {
        return false;
      }
    },

    dispose() {
      machine.stop();
      machine.onFrameFinished(() => undefined);
      context = null;
      started = false;

      for (const button of Object.keys(BUTTON_TO_FLAG) as EmulatorButton[]) {
        machine.input[BUTTON_TO_FLAG[button]] = false;
      }
    },
  };

  return engine;
}
