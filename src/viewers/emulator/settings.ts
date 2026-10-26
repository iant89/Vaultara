/**
 * Device-local Game Boy viewer settings (roadmap 14.2, 14.3).
 *
 * These are not account preferences. A bad JSON blob is dropped rather than applied.
 */

import { EMULATOR_BUTTONS, type EmulatorButton, type EmulatorColor } from './adapter';

export const EMULATOR_SETTINGS_KEY = 'vaultara.emulator.gb.settings';

export const PALETTE_IDS = ['greyscale', 'lcd-green', 'high-contrast'] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export type EmulatorKeyMap = Readonly<Record<EmulatorButton, string>>;

export interface EmulatorSettings {
  readonly palette: PaletteId;
  readonly frameRate: 30 | 60;
  readonly keys: EmulatorKeyMap;
}

export const DEFAULT_EMULATOR_KEYS: EmulatorKeyMap = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  a: 'KeyX',
  b: 'KeyZ',
  start: 'Enter',
  select: 'ShiftRight',
};

export const DEFAULT_EMULATOR_SETTINGS: EmulatorSettings = {
  palette: 'greyscale',
  frameRate: 60,
  keys: DEFAULT_EMULATOR_KEYS,
};

const PALETTES: Readonly<Record<PaletteId, readonly EmulatorColor[]>> = {
  greyscale: [
    { red: 255, green: 255, blue: 255 },
    { red: 192, green: 192, blue: 192 },
    { red: 96, green: 96, blue: 96 },
    { red: 0, green: 0, blue: 0 },
  ],
  'lcd-green': [
    { red: 155, green: 188, blue: 15 },
    { red: 139, green: 172, blue: 15 },
    { red: 48, green: 98, blue: 48 },
    { red: 15, green: 56, blue: 15 },
  ],
  'high-contrast': [
    { red: 255, green: 255, blue: 255 },
    { red: 220, green: 220, blue: 220 },
    { red: 32, green: 32, blue: 32 },
    { red: 0, green: 0, blue: 0 },
  ],
};

const KEY_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

export function paletteColors(id: PaletteId): readonly EmulatorColor[] {
  return PALETTES[id];
}

function asKeyCode(value: unknown): string | undefined {
  return typeof value === 'string' && KEY_CODE_PATTERN.test(value) ? value : undefined;
}

export function normalizeEmulatorSettings(value: unknown): EmulatorSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_EMULATOR_SETTINGS;
  }

  const record = value as Record<string, unknown>;
  const palette =
    typeof record['palette'] === 'string' &&
    (PALETTE_IDS as readonly string[]).includes(record['palette'])
      ? (record['palette'] as PaletteId)
      : DEFAULT_EMULATOR_SETTINGS.palette;
  const frameRate =
    record['frameRate'] === 30 || record['frameRate'] === 60 ? record['frameRate'] : 60;
  const rawKeys =
    typeof record['keys'] === 'object' && record['keys'] !== null
      ? (record['keys'] as Record<string, unknown>)
      : {};
  const keys = { ...DEFAULT_EMULATOR_KEYS };

  for (const button of EMULATOR_BUTTONS) {
    const code = asKeyCode(rawKeys[button]);

    if (code !== undefined) {
      keys[button] = code;
    }
  }

  return { palette, frameRate, keys };
}

export function readEmulatorSettings(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): EmulatorSettings {
  if (storage === undefined) {
    return DEFAULT_EMULATOR_SETTINGS;
  }

  try {
    const raw = storage.getItem(EMULATOR_SETTINGS_KEY);

    if (raw === null || raw.trim() === '') {
      return DEFAULT_EMULATOR_SETTINGS;
    }

    return normalizeEmulatorSettings(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_EMULATOR_SETTINGS;
  }
}

export function writeEmulatorSettings(
  settings: EmulatorSettings,
  storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
): void {
  if (storage === undefined) {
    return;
  }

  try {
    storage.setItem(EMULATOR_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Quota or private-mode failures must not break play.
  }
}

export function buttonLabel(button: EmulatorButton): string {
  switch (button) {
    case 'up':
      return 'Up';
    case 'down':
      return 'Down';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
    case 'a':
      return 'A';
    case 'b':
      return 'B';
    case 'start':
      return 'Start';
    case 'select':
      return 'Select';
  }
}
