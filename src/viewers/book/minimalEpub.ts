import { buildStoredZip } from './zip';

/** Stored-compression EPUB fixture for tests. Not a complete publication. */
export function buildMinimalEpub(): Uint8Array {
  return buildStoredZip({
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
  });
}

/** ArrayBuffer body for `Response` in tests (Uint8Array is not a `BodyInit` under this TS lib). */
export function buildMinimalEpubBody(): ArrayBuffer {
  const bytes = buildMinimalEpub();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
