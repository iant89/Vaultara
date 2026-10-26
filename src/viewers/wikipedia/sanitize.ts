/**
 * Wikipedia parse HTML → a document fragment this app will insert.
 *
 * Scripts, event handlers, and non-http(s) URLs are dropped. Internal `/wiki/` links become
 * in-app item routes. Images are kept only from Wikimedia hosts. The result is still untrusted
 * markup — it is inserted via `dangerouslySetInnerHTML` only after this pass.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'blockquote',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'br',
  'hr',
  'sup',
  'sub',
  'figure',
  'figcaption',
  'div',
  'span',
  'dl',
  'dt',
  'dd',
  'code',
  'pre',
  'abbr',
  'cite',
  'section',
  'small',
  'mark',
  'wbr',
]);

const ALLOWED_ATTRS: Readonly<Record<string, readonly string[]>> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'width', 'height'],
  '*': ['id'],
};

const WIKIMEDIA_HOSTS = new Set([
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'en.wikipedia.org',
  'wikipedia.org',
]);

const ID_PATTERN = /^[A-Za-z][\w:.-]*$/;
const ARTICLE_PATH = '/item/wikipedia/';

function isWikimediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (WIKIMEDIA_HOSTS.has(host)) {
    return true;
  }

  return host.endsWith('.wikipedia.org') || host.endsWith('.wikimedia.org');
}

function rewriteHref(raw: string): string | undefined {
  const trimmed = raw.trim();

  if (trimmed === '' || trimmed.startsWith('#')) {
    return trimmed === '' ? undefined : trimmed;
  }

  let url: URL;

  try {
    url = new URL(trimmed, 'https://en.wikipedia.org/wiki/');
  } catch {
    return undefined;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return undefined;
  }

  if (url.pathname.startsWith('/wiki/') && isWikimediaHost(url.hostname)) {
    if (url.searchParams.has('redlink')) {
      return undefined;
    }

    const title = url.pathname.slice('/wiki/'.length);

    if (title.length === 0) {
      return undefined;
    }

    return `${ARTICLE_PATH}${title}${url.hash}`;
  }

  return url.href;
}

function rewriteSrc(raw: string): string | undefined {
  let url: URL;

  try {
    url = new URL(raw.trim(), 'https://en.wikipedia.org/');
  } catch {
    return undefined;
  }

  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !isWikimediaHost(url.hostname)) {
    return undefined;
  }

  if (url.protocol === 'http:') {
    url.protocol = 'https:';
  }

  return url.href;
}

function copyAttribute(source: Element, target: Element, name: string): void {
  const value = source.getAttribute(name);

  if (value === null) {
    return;
  }

  if (name === 'id') {
    if (ID_PATTERN.test(value)) {
      target.setAttribute('id', value);
    }

    return;
  }

  if (name === 'href') {
    const href = rewriteHref(value);

    if (href !== undefined) {
      target.setAttribute('href', href);

      if (!href.startsWith('#') && !href.startsWith(ARTICLE_PATH)) {
        target.setAttribute('target', '_blank');
        target.setAttribute('rel', 'noopener noreferrer');
      }
    }

    return;
  }

  if (name === 'src') {
    const src = rewriteSrc(value);

    if (src !== undefined) {
      target.setAttribute('src', src);
    }

    return;
  }

  if (name === 'width' || name === 'height') {
    if (/^\d+$/.test(value)) {
      target.setAttribute(name, value);
    }

    return;
  }

  if (name === 'alt' || name === 'title') {
    target.setAttribute(name, value);
  }
}

function allowedAttributes(tag: string): readonly string[] {
  const specific = ALLOWED_ATTRS[tag] ?? [];
  const shared = ALLOWED_ATTRS['*'] ?? [];

  return [...specific, ...shared];
}

function sanitizeNode(node: Node, out: ParentNode, documentRef: Document): void {
  if (node.nodeType === Node.TEXT_NODE) {
    out.appendChild(documentRef.createTextNode(node.textContent ?? ''));
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  if (
    tag === 'script' ||
    tag === 'style' ||
    tag === 'iframe' ||
    tag === 'object' ||
    tag === 'embed'
  ) {
    return;
  }

  if (tag === 'span' && element.classList.contains('mw-editsection')) {
    return;
  }

  if (tag === 'a' && element.classList.contains('new')) {
    for (const child of Array.from(element.childNodes)) {
      sanitizeNode(child, out, documentRef);
    }

    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    for (const child of Array.from(element.childNodes)) {
      sanitizeNode(child, out, documentRef);
    }

    return;
  }

  const copy = documentRef.createElement(tag);

  for (const name of allowedAttributes(tag)) {
    copyAttribute(element, copy, name);
  }

  if (tag === 'a' && !copy.hasAttribute('href')) {
    for (const child of Array.from(element.childNodes)) {
      sanitizeNode(child, copy, documentRef);
    }

    for (const child of Array.from(copy.childNodes)) {
      out.appendChild(child);
    }

    return;
  }

  if (tag === 'img' && !copy.hasAttribute('src')) {
    return;
  }

  for (const child of Array.from(element.childNodes)) {
    sanitizeNode(child, copy, documentRef);
  }

  out.appendChild(copy);
}

export function sanitizeWikipediaHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const output = parsed.createElement('div');

  for (const child of Array.from(parsed.body.childNodes)) {
    sanitizeNode(child, output, parsed);
  }

  return output.innerHTML;
}
