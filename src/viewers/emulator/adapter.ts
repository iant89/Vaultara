/**
 * Emulator adapter (design spec 18.6, roadmap 14.1 / 14.5).
 *
 * Shared application code talks only to this contract. The Game Boy core lives behind
 * `createGameBoyEngine`. Game Boy Color, NES, and Master System would add engines that
 * implement the same shape — they are not required for the initial viewer.
 *
 * ROM bytes are treated as untrusted machine code for a guest CPU. They are never evaluated
 * as JavaScript. Isolation via Cross-Origin Embedder Policy is not used: it would block
 * Archive.org media that does not send CORP headers.
 */

export const EMULATOR_SYSTEMS = ['gb', 'gbc', 'nes', 'sms'] as const;

export type EmulatorSystemId = (typeof EMULATOR_SYSTEMS)[number];

export const EMULATOR_BUTTONS = [
  'up',
  'down',
  'left',
  'right',
  'a',
  'b',
  'start',
  'select',
] as const;

export type EmulatorButton = (typeof EMULATOR_BUTTONS)[number];

export interface EmulatorColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export interface EmulatorEngine {
  readonly system: EmulatorSystemId;
  readonly displayWidth: number;
  readonly displayHeight: number;

  attach(canvas: HTMLCanvasElement): void;
  load(rom: Uint8Array): void;
  start(): void;
  pause(): void;
  resume(): void;
  setButton(button: EmulatorButton, pressed: boolean): void;
  setPalette(colors: readonly EmulatorColor[]): void;
  setKeyBinding(button: EmulatorButton, code: string): void;
  setFrameRate(fps: number): void;
  getSaveRam(): Uint8Array | undefined;
  setSaveRam(data: Uint8Array): boolean;
  dispose(): void;
}

export function isEmulatorSystemId(value: string): value is EmulatorSystemId {
  return (EMULATOR_SYSTEMS as readonly string[]).includes(value);
}

export function isEmulatorButton(value: string): value is EmulatorButton {
  return (EMULATOR_BUTTONS as readonly string[]).includes(value);
}
