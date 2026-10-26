/**
 * Battery save RAM for the Game Boy viewer.
 *
 * Treated as untrusted data (design spec 18.6). Full CPU snapshots are not offered by the
 * core we wrap, so progress is cartridge SRAM when the cart has a battery.
 */

const SAVE_RAM_MAX_BYTES = 128 * 1024;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export function encodeSaveRam(bytes: Uint8Array): string | undefined {
  if (bytes.byteLength === 0 || bytes.byteLength > SAVE_RAM_MAX_BYTES) {
    return undefined;
  }

  let binary = '';
  const chunk = 0x8000;

  for (let offset = 0; offset < bytes.byteLength; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }

  return btoa(binary);
}

export function decodeSaveRam(value: string): Uint8Array | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > SAVE_RAM_MAX_BYTES * 2) {
    return undefined;
  }

  if (trimmed.length % 4 !== 0 || !BASE64_PATTERN.test(trimmed)) {
    return undefined;
  }

  try {
    const binary = atob(trimmed);

    if (binary.length === 0 || binary.length > SAVE_RAM_MAX_BYTES) {
      return undefined;
    }

    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return undefined;
  }
}
