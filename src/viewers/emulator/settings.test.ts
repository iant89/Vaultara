import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMULATOR_SETTINGS,
  EMULATOR_SETTINGS_KEY,
  normalizeEmulatorSettings,
  readEmulatorSettings,
  writeEmulatorSettings,
} from './settings';

describe('emulator settings', () => {
  it('drops unknown palettes and key codes', () => {
    expect(
      normalizeEmulatorSettings({
        palette: 'neon',
        frameRate: 12,
        keys: { a: '../../etc', up: 'ArrowUp' },
      }),
    ).toEqual({
      ...DEFAULT_EMULATOR_SETTINGS,
      keys: { ...DEFAULT_EMULATOR_SETTINGS.keys, up: 'ArrowUp' },
    });
  });

  it('round-trips through storage', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };

    writeEmulatorSettings(
      { ...DEFAULT_EMULATOR_SETTINGS, palette: 'lcd-green', frameRate: 30 },
      storage,
    );

    expect(memory.get(EMULATOR_SETTINGS_KEY)).toContain('lcd-green');
    expect(readEmulatorSettings(storage)).toMatchObject({ palette: 'lcd-green', frameRate: 30 });
  });
});
