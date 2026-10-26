/**
 * A stored-compression EPUB so the book reader can extract chapters without a network.
 *
 * Duplicates the ZIP writer used in unit tests because the e2e TypeScript project cannot
 * import application sources.
 */

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

function buildStoredZip(entries: Readonly<Record<string, string>>): Uint8Array {
  const encoder = new TextEncoder();
  const files = Object.entries(entries).map(([name, body]) => ({
    name,
    nameBytes: encoder.encode(name),
    data: encoder.encode(body),
  }));
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + file.nameBytes.length + file.data.length);
    writeU32(local, 0, 0x04034b50);
    writeU16(local, 4, 20);
    writeU16(local, 26, file.nameBytes.length);
    writeU32(local, 14, crc);
    writeU32(local, 18, file.data.length);
    writeU32(local, 22, file.data.length);
    local.set(file.nameBytes, 30);
    local.set(file.data, 30 + file.nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + file.nameBytes.length);
    writeU32(central, 0, 0x02014b50);
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
  writeU32(eocd, 0, 0x06054b50);
  writeU16(eocd, 8, files.length);
  writeU16(eocd, 10, files.length);
  writeU32(eocd, 12, centralSize);
  writeU32(eocd, 16, localOffset);

  return concat([...locals, ...centrals, eocd]);
}

export function buildMinimalEpub(): Buffer {
  return Buffer.from(
    buildStoredZip({
      'META-INF/container.xml': `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      'OEBPS/content.opf': `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>A test book</dc:title>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`,
      'OEBPS/nav.xhtml': `<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <nav>
      <ol>
        <li><a href="c1.xhtml">Chapter one</a></li>
        <li><a href="c2.xhtml">Chapter two</a></li>
      </ol>
    </nav>
  </body>
</html>`,
      'OEBPS/c1.xhtml': `<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Chapter one</h1>
    <p>Once upon a time.</p>
    <script>alert(1)</script>
  </body>
</html>`,
      'OEBPS/c2.xhtml': `<html xmlns="http://www.w3.org/1999/xhtml">
  <body><p>The next morning.</p></body>
</html>`,
    }),
  );
}
