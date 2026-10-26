import { describe, expect, it } from 'vitest';
import { decodeSaveRam, encodeSaveRam } from './saveState';

describe('save RAM codec', () => {
  it('round-trips battery RAM and rejects garbage', () => {
    const ram = Uint8Array.from([1, 2, 3, 4, 255, 0, 16]);
    const encoded = encodeSaveRam(ram);

    expect(encoded).toEqual(expect.any(String));
    expect(decodeSaveRam(encoded ?? '')).toEqual(ram);
    expect(decodeSaveRam('!!!!')).toBeUndefined();
    expect(decodeSaveRam('')).toBeUndefined();
    expect(encodeSaveRam(new Uint8Array(0))).toBeUndefined();
  });
});
