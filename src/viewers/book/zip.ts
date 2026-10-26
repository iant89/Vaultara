/**
 * ZIP reader for EPUB packages.
 *
 * Only Store and Deflate entries are accepted. Path traversal (`..`, absolute paths) is
 * rejected. CRC is not treated as a trust signal.
 */

import { createAppError } from '../../models/errors';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

function readU16(view: DataView, offset: number): number {
  if (offset < 0 || offset + 2 > view.byteLength) {
    throw createAppError('invalid-response', 'This EPUB archive is truncated.');
  }

  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  if (offset < 0 || offset + 4 > view.byteLength) {
    throw createAppError('invalid-response', 'This EPUB archive is truncated.');
  }

  return view.getUint32(offset, true);
}

function findEocd(view: DataView): number {
  const maxComment = Math.min(65_535, view.byteLength - 22);

  for (let comment = 0; comment <= maxComment; comment += 1) {
    const offset = view.byteLength - 22 - comment;

    if (readU32(view, offset) === EOCD_SIGNATURE && readU16(view, offset + 20) === comment) {
      return offset;
    }
  }

  throw createAppError('invalid-response', 'This file is not a readable EPUB archive.');
}

function decodeName(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function safeEntryName(name: string): string | undefined {
  const normalized = name.replaceAll('\\', '/');

  if (normalized.length === 0 || normalized.startsWith('/') || normalized.includes('..')) {
    return undefined;
  }

  return normalized;
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'function') {
    throw createAppError('unsupported-format', 'This browser cannot decompress the EPUB archive.');
  }

  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  await writer.write(toArrayBuffer(data));
  await writer.close();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];

  for (;;) {
    const next = await reader.read();

    if (next.done) {
      break;
    }

    chunks.push(next.value);
  }

  return concat(chunks);
}

export async function unzip(
  source: ArrayBuffer | Uint8Array,
): Promise<ReadonlyMap<string, Uint8Array>> {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  const buffer = toArrayBuffer(bytes);
  const view = new DataView(buffer);
  const eocd = findEocd(view);
  const count = readU16(view, eocd + 10);
  let offset = readU32(view, eocd + 16);
  const files = new Map<string, Uint8Array>();

  for (let index = 0; index < count; index += 1) {
    if (readU32(view, offset) !== CENTRAL_SIGNATURE) {
      throw createAppError('invalid-response', 'This EPUB archive directory is damaged.');
    }

    const method = readU16(view, offset + 10);
    const compressedSize = readU32(view, offset + 20);
    const nameLength = readU16(view, offset + 28);
    const extraLength = readU16(view, offset + 30);
    const commentLength = readU16(view, offset + 32);
    const localOffset = readU32(view, offset + 42);
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    const name = safeEntryName(decodeName(nameBytes));
    offset += 46 + nameLength + extraLength + commentLength;

    if (name === undefined || name.endsWith('/')) {
      continue;
    }

    if (readU32(view, localOffset) !== LOCAL_SIGNATURE) {
      throw createAppError('invalid-response', `The EPUB entry “${name}” is damaged.`);
    }

    const localNameLength = readU16(view, localOffset + 26);
    const localExtraLength = readU16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const payload = bytes.subarray(dataStart, dataStart + compressedSize);

    if (method === METHOD_STORE) {
      files.set(name, payload.slice());
    } else if (method === METHOD_DEFLATE) {
      files.set(name, await inflateRaw(payload));
    } else {
      throw createAppError(
        'unsupported-format',
        `The EPUB uses compression this reader does not support (${String(method)}).`,
      );
    }
  }

  return files;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffff_ffff;

  for (const byte of data) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      const take = crc & 1;
      crc >>>= 1;
      if (take === 1) {
        crc ^= 0xedb8_8320;
      }
    }
  }

  return (crc ^ 0xffff_ffff) >>> 0;
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

/** Build an uncompressed ZIP. Intended for tests and e2e fixtures. */
export function buildStoredZip(entries: Readonly<Record<string, string | Uint8Array>>): Uint8Array {
  const encoder = new TextEncoder();
  const files = Object.entries(entries).map(([name, body]) => ({
    name,
    nameBytes: encoder.encode(name),
    data: typeof body === 'string' ? encoder.encode(body) : body,
  }));
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + file.nameBytes.length + file.data.length);
    writeU32(local, 0, LOCAL_SIGNATURE);
    writeU16(local, 4, 20);
    writeU16(local, 26, file.nameBytes.length);
    writeU32(local, 14, crc);
    writeU32(local, 18, file.data.length);
    writeU32(local, 22, file.data.length);
    local.set(file.nameBytes, 30);
    local.set(file.data, 30 + file.nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + file.nameBytes.length);
    writeU32(central, 0, CENTRAL_SIGNATURE);
    writeU16(central, 4, 20);
    writeU16(central, 6, 20);
    writeU16(central, 28, file.nameBytes.length);
    writeU32(central, 16, crc);
    writeU32(central, 20, file.data.length);
    writeU32(central, 24, file.data.length);
    writeU32(central, 42, localOffset);
    central.set(file.nameBytes, 46);
    centrals.push(central);
    localOffset += local.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  writeU32(eocd, 0, EOCD_SIGNATURE);
  writeU16(eocd, 8, files.length);
  writeU16(eocd, 10, files.length);
  writeU32(eocd, 12, centralSize);
  writeU32(eocd, 16, localOffset);

  return concat([...locals, ...centrals, eocd]);
}
