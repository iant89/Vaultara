/**
 * Wikipedia payloads → shared content models.
 *
 * Mapping is pure. MediaWiki returns pages as objects or arrays depending on formatversion,
 * extracts as wikitext or HTML, and omits optional fields. Unusable values are dropped.
 */

import type {
  ContentCollection,
  ContentFile,
  ContentItem,
  ContentRights,
} from '../../models/content';
import {
  normalizeContentCollection,
  normalizeContentFile,
  normalizeContentItem,
  normalizeDescription,
  normalizeOptionalText,
  normalizeText,
} from '../normalize';
import {
  WIKIPEDIA_ARTICLE_FILE_ID,
  WIKIPEDIA_ARTICLE_MIME,
  WIKIPEDIA_LICENSE_URL,
  WIKIPEDIA_PROVIDER_ID,
  WIKIPEDIA_RIGHTS_STATEMENT,
} from './constants';
import type { WikipediaLangLink, WikipediaSearchHit, WikipediaSection } from './types';

export function titleToItemId(title: string): string {
  return title.trim().replace(/ /g, '_');
}

export function itemIdToTitle(itemId: string): string {
  return itemId.replace(/_/g, ' ').replace(/^Category:/i, '');
}

export function categoryTitle(value: string): string {
  return value
    .replace(/^Category:/i, '')
    .trim()
    .replace(/ /g, '_');
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asList(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];

  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function wikipediaRights(articleUrl: string): ContentRights {
  return {
    license: WIKIPEDIA_LICENSE_URL,
    rightsStatement: WIKIPEDIA_RIGHTS_STATEMENT,
    attributionUrl: articleUrl,
  };
}

export function mapSearchHit(
  hit: WikipediaSearchHit,
  urls: { articleUrl(title: string): string },
): ContentItem {
  const title = normalizeText(hit.title);
  const id = titleToItemId(title);
  const sourceUrl = hit.canonicalUrl ?? urls.articleUrl(id);
  const categories = (hit.categories ?? [])
    .map((entry) => categoryTitle(entry))
    .filter((entry) => entry.length > 0);

  return normalizeContentItem(
    {
      id,
      providerId: WIKIPEDIA_PROVIDER_ID,
      title,
      type: 'article',
      ...(hit.extract !== undefined ? { description: normalizeDescription(hit.extract) } : {}),
      ...(hit.thumbnailUrl !== undefined ? { thumbnailUrl: hit.thumbnailUrl } : {}),
      creator: 'Wikipedia contributors',
      categories,
      tags: categories,
      sourceUrl,
      rights: wikipediaRights(sourceUrl),
      metadata: {
        ...(hit.pageid !== undefined ? { pageid: hit.pageid } : {}),
        ...(hit.description !== undefined ? { shortDescription: hit.description } : {}),
      },
    },
    WIKIPEDIA_PROVIDER_ID,
  );
}

export function mapArticleFile(item: ContentItem): ContentFile {
  return normalizeContentFile(
    {
      id: WIKIPEDIA_ARTICLE_FILE_ID,
      providerId: WIKIPEDIA_PROVIDER_ID,
      itemId: item.id,
      name: item.title,
      mimeType: WIKIPEDIA_ARTICLE_MIME,
      downloadAvailable: true,
      viewable: true,
      ...(item.sourceUrl !== undefined ? { downloadUrl: item.sourceUrl } : {}),
      metadata: { kind: 'wikipedia-article' },
    },
    WIKIPEDIA_PROVIDER_ID,
    item.id,
  );
}

export function mapCollectionFromTitle(
  title: string,
  options: {
    readonly sourceUrl: string;
    readonly description?: string;
    readonly itemCount?: number;
    readonly categoryIds?: readonly string[];
  },
): ContentCollection {
  const id = categoryTitle(title);

  return normalizeContentCollection(
    {
      id,
      providerId: WIKIPEDIA_PROVIDER_ID,
      title: itemIdToTitle(id),
      ...(options.description !== undefined
        ? { description: normalizeDescription(options.description) }
        : {}),
      ...(options.itemCount !== undefined ? { itemCount: options.itemCount } : {}),
      categoryIds: options.categoryIds ?? [],
      sourceUrl: options.sourceUrl,
      metadata: { wikipediaCategory: `Category:${id}` },
    },
    WIKIPEDIA_PROVIDER_ID,
  );
}

export function readQueryPages(
  payload: Record<string, unknown>,
): readonly Record<string, unknown>[] {
  const query = asRecord(payload['query']);

  if (query === undefined) {
    return [];
  }

  return asList(query['pages'])
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== undefined);
}

export function readSearchHits(
  payload: Record<string, unknown>,
  urls: { articleUrl(title: string): string },
): {
  readonly items: readonly ContentItem[];
  readonly total?: number;
} {
  const query = asRecord(payload['query']);
  const pages = readQueryPages(payload);
  const items = pages
    .filter((page) => page['missing'] !== true)
    .map((page) => mapPageRecord(page, urls));

  const searchinfo = asRecord(query?.['searchinfo']);
  const total =
    typeof searchinfo?.['totalhits'] === 'number' && Number.isFinite(searchinfo['totalhits'])
      ? Math.max(0, Math.trunc(searchinfo['totalhits']))
      : undefined;

  return { items, ...(total !== undefined ? { total } : {}) };
}

export function mapPageRecord(
  page: Record<string, unknown>,
  urls: { articleUrl(title: string): string },
): ContentItem {
  const title = normalizeText(page['title']);
  const thumbnail = asRecord(page['thumbnail']);
  const thumbnailUrl = readString(thumbnail ?? {}, 'source');
  const categories = asList(page['categories'])
    .map((entry) => {
      const record = asRecord(entry);
      const raw = record === undefined ? entry : record['title'];

      return typeof raw === 'string' ? categoryTitle(raw) : '';
    })
    .filter((entry) => entry.length > 0);

  return mapSearchHit(
    {
      title,
      ...(typeof page['pageid'] === 'number' ? { pageid: page['pageid'] } : {}),
      ...(readString(page, 'extract') !== undefined
        ? { extract: readString(page, 'extract') }
        : {}),
      ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
      ...(readString(page, 'fullurl') !== undefined
        ? { canonicalUrl: readString(page, 'fullurl') }
        : {}),
      ...(readString(page, 'description') !== undefined
        ? { description: readString(page, 'description') }
        : {}),
      categories,
    },
    urls,
  );
}

export function readMostViewedTitles(payload: Record<string, unknown>): readonly string[] {
  const query = asRecord(payload['query']);

  if (query === undefined) {
    return [];
  }

  return asList(query['mostviewed'])
    .map((entry) => {
      const record = asRecord(entry);
      const title = record === undefined ? undefined : record['title'];
      const ns = record === undefined ? undefined : record['ns'];

      if (typeof title !== 'string' || title.trim() === '') {
        return undefined;
      }

      if (ns !== undefined && ns !== 0) {
        return undefined;
      }

      return title;
    })
    .filter((title): title is string => title !== undefined);
}

export function readCategoryMembers(
  payload: Record<string, unknown>,
  type: 'page' | 'subcat',
): readonly string[] {
  const query = asRecord(payload['query']);

  if (query === undefined) {
    return [];
  }

  return asList(query['categorymembers'])
    .map((entry) => {
      const record = asRecord(entry);
      const title = record === undefined ? undefined : record['title'];
      const ns = record === undefined ? undefined : record['ns'];

      if (typeof title !== 'string' || title.trim() === '') {
        return undefined;
      }

      if (type === 'subcat' && ns !== 14) {
        return categoryTitle(title);
      }

      if (type === 'page' && ns !== undefined && ns !== 0) {
        return undefined;
      }

      return type === 'subcat' ? categoryTitle(title) : title;
    })
    .filter((title): title is string => title !== undefined);
}

export function readContinueToken(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const cont = asRecord(payload['continue']);
  const value = cont?.[key];

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

export function readSearchTotal(payload: Record<string, unknown>): number | undefined {
  const query = asRecord(payload['query']);
  const searchinfo = asRecord(query?.['searchinfo']);
  const total = searchinfo?.['totalhits'];

  return typeof total === 'number' && Number.isFinite(total)
    ? Math.max(0, Math.trunc(total))
    : undefined;
}

export function readLangLinks(
  page: Record<string, unknown>,
  urls: { languageArticleUrl(lang: string, title: string): string },
): readonly WikipediaLangLink[] {
  return asList(page['langlinks'])
    .map((entry) => {
      const record = asRecord(entry);

      if (record === undefined) {
        return undefined;
      }

      const lang = readString(record, 'lang');
      const title = readString(record, 'title') ?? readString(record, '*');

      if (lang === undefined || title === undefined) {
        return undefined;
      }

      const url = readString(record, 'url') ?? urls.languageArticleUrl(lang, title);

      return { lang, title, url };
    })
    .filter((entry): entry is WikipediaLangLink => entry !== undefined);
}

export function readParseResult(payload: Record<string, unknown>):
  | {
      readonly title: string;
      readonly displayTitle?: string;
      readonly html: string;
      readonly sections: readonly WikipediaSection[];
    }
  | undefined {
  const parse = asRecord(payload['parse']);

  if (parse === undefined) {
    return undefined;
  }

  const title = normalizeOptionalText(parse['title']);
  const html = typeof parse['text'] === 'string' ? parse['text'] : undefined;

  if (title === undefined || html === undefined) {
    return undefined;
  }

  const displayTitle = normalizeOptionalText(parse['displaytitle']);
  const sections = asList(parse['sections'])
    .map((entry) => {
      const record = asRecord(entry);
      const line = record === undefined ? undefined : normalizeOptionalText(record['line']);
      const anchor = record === undefined ? undefined : normalizeOptionalText(record['anchor']);
      const levelRaw = record === undefined ? undefined : record['toclevel'];
      const level = typeof levelRaw === 'number' ? Math.trunc(levelRaw) : 1;

      if (line === undefined || anchor === undefined) {
        return undefined;
      }

      return { level: Math.max(1, level), line, anchor };
    })
    .filter((entry): entry is WikipediaSection => entry !== undefined);

  return {
    title,
    ...(displayTitle !== undefined ? { displayTitle } : {}),
    html,
    sections,
  };
}

export function isMissingPage(payload: Record<string, unknown>): boolean {
  const pages = readQueryPages(payload);

  return pages.length === 1 && pages[0]?.['missing'] === true;
}
