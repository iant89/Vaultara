/**
 * Password hashing with Web Crypto PBKDF2.
 *
 * The password itself is never written to storage. Only salt, iteration count, and derived
 * bits are kept, and those live in IndexedDB rather than localStorage (design spec 21.2).
 */

export interface PasswordVerifier {
  readonly salt: string;
  readonly hash: string;
  readonly iterations: number;
}

export const DEFAULT_PBKDF2_ITERATIONS = 100_000;

const encoder = new TextEncoder();

export async function hashPassword(
  password: string,
  options: { readonly iterations?: number; readonly salt?: Uint8Array } = {},
): Promise<PasswordVerifier> {
  const iterations = options.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    key,
    256,
  );

  return {
    salt: toHex(salt),
    hash: toHex(new Uint8Array(bits)),
    iterations,
  };
}

export async function verifyPassword(
  password: string,
  verifier: PasswordVerifier,
): Promise<boolean> {
  const computed = await hashPassword(password, {
    iterations: verifier.iterations,
    salt: fromHex(verifier.salt),
  });

  return timingSafeEqual(computed.hash, verifier.hash);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function fromHex(value: string): Uint8Array {
  if (value.length % 2 !== 0 || /[^0-9a-f]/i.test(value)) {
    throw new TypeError('Invalid hex string.');
  }

  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}
