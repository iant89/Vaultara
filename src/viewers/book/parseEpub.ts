/**
 * EPUB package → chapters of plain text.
 *
 * XHTML is parsed only to take `textContent` after dropping script and style. Nothing from the
 * archive is inserted as HTML (design spec 26, AGENTS.md 10.2).
 */

import { createAppError } from '../../models/errors';

export interface BookChapter {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly text: string;
}

export interface ParsedBook {
  readonly title: string;
  readonly chapters: readonly BookChapter[];
}

function firstByLocalName(root: Document | Element, name: string): Element | undefined {
  const matches = root.getElementsByTagName('*');

  for (let index = 0; index < matches.length; index += 1) {
    const element = matches.item(index);

    if (element?.localName === name) {
      return element;
    }
  }

  return undefined;
}

function allByLocalName(root: Document | Element, name: string): Element[] {
  const found: Element[] = [];
  const matches = root.getElementsByTagName('*');

  for (let index = 0; index < matches.length; index += 1) {
    const element = matches.item(index);

    if (element?.localName === name) {
      found.push(element);
    }
  }

  return found;
}

function parseXml(source: string): Document {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  const err = firstByLocalName(document, 'parsererror');

  if (err !== undefined) {
    throw createAppError('invalid-response', 'The EPUB package XML could not be parsed.');
  }

  return document;
}

function decode(bytes: Uint8Array | undefined): string | undefined {
  if (bytes === undefined) {
    return undefined;
  }

  let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  return text;
}

function joinHref(base: string, href: string): string {
  const clean = href.split('#')[0] ?? href;

  if (clean.startsWith('/')) {
    return clean.replace(/^\/+/, '');
  }

  const slash = base.lastIndexOf('/');
  const dir = slash === -1 ? '' : base.slice(0, slash + 1);
  const combined = `${dir}${clean}`;
  const parts: string[] = [];

  for (const part of combined.split('/')) {
    if (part === '' || part === '.') {
      continue;
    }

    if (part === '..') {
      parts.pop();
      continue;
    }

    parts.push(part);
  }

  return parts.join('/');
}

function htmlToText(markup: string): string {
  const xhtml = new DOMParser().parseFromString(markup, 'application/xhtml+xml');
  const parsed =
    firstByLocalName(xhtml, 'parsererror') === undefined
      ? xhtml
      : new DOMParser().parseFromString(markup, 'text/html');

  for (const node of [...parsed.querySelectorAll('script, style')]) {
    node.remove();
  }

  parsed.querySelector('h1, h2')?.remove();

  const root = parsed.body ?? parsed.documentElement;
  return (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function headingTitle(markup: string, fallback: string): string {
  const xhtml = new DOMParser().parseFromString(markup, 'application/xhtml+xml');
  const parsed =
    firstByLocalName(xhtml, 'parsererror') === undefined
      ? xhtml
      : new DOMParser().parseFromString(markup, 'text/html');
  const heading = parsed.querySelector('h1, h2, title');
  const title = heading?.textContent?.replace(/\s+/g, ' ').trim();

  return title !== undefined && title.length > 0 ? title : fallback;
}

function readNavTitles(nav: string, opfPath: string): Map<string, string> {
  const titles = new Map<string, string>();
  const document = new DOMParser().parseFromString(nav, 'application/xhtml+xml');
  const parsed =
    firstByLocalName(document, 'parsererror') === undefined
      ? document
      : new DOMParser().parseFromString(nav, 'text/html');

  for (const link of parsed.querySelectorAll('a[href]')) {
    const href = joinHref(opfPath, link.getAttribute('href') ?? '');
    const label = link.textContent?.replace(/\s+/g, ' ').trim();

    if (href.length > 0 && label !== undefined && label.length > 0) {
      titles.set(href, label);
    }
  }

  return titles;
}

function readNcxTitles(ncx: string, opfPath: string): Map<string, string> {
  const titles = new Map<string, string>();
  const document = parseXml(ncx);

  for (const point of allByLocalName(document, 'navPoint')) {
    const label = firstByLocalName(point, 'text')?.textContent?.replace(/\s+/g, ' ').trim();
    const src = firstByLocalName(point, 'content')?.getAttribute('src') ?? '';
    const href = joinHref(opfPath, src);

    if (href.length > 0 && label !== undefined && label.length > 0) {
      titles.set(href, label);
    }
  }

  return titles;
}

export function parseEpub(files: ReadonlyMap<string, Uint8Array>): ParsedBook {
  const container = decode(files.get('META-INF/container.xml'));

  if (container === undefined) {
    throw createAppError('invalid-response', 'This EPUB has no container.xml.');
  }

  const containerDoc = parseXml(container);
  const rootfile = firstByLocalName(containerDoc, 'rootfile')?.getAttribute('full-path');

  if (rootfile === null || rootfile === undefined || rootfile.length === 0) {
    throw createAppError('invalid-response', 'This EPUB does not name its package file.');
  }

  const opfPath = rootfile.replaceAll('\\', '/');
  const opf = decode(files.get(opfPath));

  if (opf === undefined) {
    throw createAppError('invalid-response', `The EPUB package “${opfPath}” is missing.`);
  }

  const opfDoc = parseXml(opf);
  const title =
    firstByLocalName(opfDoc, 'title')?.textContent?.replace(/\s+/g, ' ').trim() || 'Untitled book';
  const manifest = new Map<string, { href: string; properties: string }>();

  for (const item of allByLocalName(opfDoc, 'item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');

    if (id === null || href === null) {
      continue;
    }

    manifest.set(id, {
      href: joinHref(opfPath, href),
      properties: item.getAttribute('properties') ?? '',
    });
  }

  let tocTitles = new Map<string, string>();
  const navItem = [...manifest.values()].find((item) =>
    item.properties.split(/\s+/).includes('nav'),
  );
  if (navItem !== undefined) {
    const nav = decode(files.get(navItem.href));

    if (nav !== undefined) {
      tocTitles = readNavTitles(nav, navItem.href);
    }
  } else {
    const ncxItem = [...manifest.values()].find((item) => item.href.toLowerCase().endsWith('.ncx'));

    if (ncxItem !== undefined) {
      const ncx = decode(files.get(ncxItem.href));

      if (ncx !== undefined) {
        tocTitles = readNcxTitles(ncx, ncxItem.href);
      }
    }
  }

  const chapters: BookChapter[] = [];

  for (const itemref of allByLocalName(opfDoc, 'itemref')) {
    const idref = itemref.getAttribute('idref');

    if (idref === null) {
      continue;
    }

    const item = manifest.get(idref);

    if (item === undefined) {
      continue;
    }

    const markup = decode(files.get(item.href));

    if (markup === undefined) {
      continue;
    }

    const text = htmlToText(markup);

    if (text.length === 0) {
      continue;
    }

    chapters.push({
      id: idref,
      href: item.href,
      title:
        tocTitles.get(item.href) ?? headingTitle(markup, `Chapter ${String(chapters.length + 1)}`),
      text,
    });
  }

  if (chapters.length === 0) {
    throw createAppError('invalid-response', 'This EPUB has no readable text chapters.');
  }

  return { title, chapters };
}

export function parsePlainText(source: string, title: string): ParsedBook {
  const text = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (text.length === 0) {
    throw createAppError('invalid-response', 'This text file is empty.');
  }

  return {
    title,
    chapters: [{ id: 'text', title, href: title, text }],
  };
}
