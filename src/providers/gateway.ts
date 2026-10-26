/**
 * Provider gateway (design specification 10.4, 10.5, 25).
 *
 * The gateway is the only place application code talks to a provider. Every call goes through
 * the same four steps, which is what makes failures behave consistently:
 *
 *   1. Resolve the provider and refuse to call a disabled or failing one.
 *   2. Refuse a call the provider has not declared a capability for, instead of discovering
 *      that through a crash halfway through rendering.
 *   3. Execute under the shared request policy (timeout, cancellation, retries, rate limits).
 *   4. Validate the response, then record the outcome so the registry's health is real.
 *
 * No adapter is imported here. Adding a provider never touches this file.
 */

import type {
  ContentCategory,
  ContentCollection,
  ContentFile,
  ContentItem,
} from '../models/content';
import { attachProviderId, createAppError, toAppError } from '../models/errors';
import type { PaginatedResult } from '../models/pagination';
import type {
  BrowseOptions,
  ContentProvider,
  ProviderCapabilityKey,
  ProviderRequestOptions,
  SearchOptions,
} from '../models/provider';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_RETRY_POLICY,
  executeWithPolicy,
  type ExecutionContext,
  type RetryPolicy,
} from './reliability';
import type { ProviderRegistry } from './registry';
import {
  validateContentCategories,
  validateContentCollection,
  validateContentFiles,
  validateContentItem,
  validateDownloadUrl,
  validatePaginatedResult,
} from './validate';

export interface ProviderGatewayOptions {
  /** Applied when a call does not specify its own timeout. */
  readonly defaultTimeoutMs?: number;
  readonly retry?: RetryPolicy;
  /** Injectable for tests. */
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  readonly random?: () => number;
}

interface Invocation<T> {
  readonly provider: ContentProvider;
  readonly capability: ProviderCapabilityKey;
  readonly options?: ProviderRequestOptions;
  readonly call: (context: ExecutionContext) => Promise<unknown>;
  readonly validate: (value: unknown, providerId: string) => T;
}

export class ProviderGateway {
  private readonly registry: ProviderRegistry;
  private readonly defaultTimeoutMs: number;
  private readonly retry: RetryPolicy;
  private readonly sleep: ((ms: number, signal?: AbortSignal) => Promise<void>) | undefined;
  private readonly random: (() => number) | undefined;

  constructor(registry: ProviderRegistry, options: ProviderGatewayOptions = {}) {
    this.registry = registry;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.retry = options.retry ?? DEFAULT_RETRY_POLICY;
    this.sleep = options.sleep;
    this.random = options.random;
  }

  async search(
    providerId: string,
    query: string,
    options: SearchOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    const provider = this.registry.require(providerId);
    const trimmed = query.trim();

    return this.invoke({
      provider,
      capability: 'search',
      options,
      call: (context) => provider.search(trimmed, { ...options, signal: context.signal }),
      validate: (value, id) => validatePaginatedResult(value, id, validateContentItem),
    });
  }

  async getCategories(
    providerId: string,
    options: ProviderRequestOptions = {},
  ): Promise<readonly ContentCategory[]> {
    const provider = this.registry.require(providerId);

    return this.invoke({
      provider,
      capability: 'categories',
      options,
      call: (context) => provider.getCategories({ ...options, signal: context.signal }),
      validate: validateContentCategories,
    });
  }

  async getCollections(
    providerId: string,
    categoryId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentCollection>> {
    const provider = this.registry.require(providerId);

    return this.invoke({
      provider,
      capability: 'collections',
      options,
      call: (context) =>
        provider.getCollections(categoryId, { ...options, signal: context.signal }),
      validate: (value, id) => validatePaginatedResult(value, id, validateContentCollection),
    });
  }

  async getCollection(
    providerId: string,
    collectionId: string,
    options: ProviderRequestOptions = {},
  ): Promise<ContentCollection> {
    const provider = this.registry.require(providerId);

    return this.invoke({
      provider,
      capability: 'collections',
      options,
      call: (context) =>
        provider.getCollection(collectionId, { ...options, signal: context.signal }),
      validate: validateContentCollection,
    });
  }

  async getCollectionItems(
    providerId: string,
    collectionId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    const provider = this.registry.require(providerId);

    return this.invoke({
      provider,
      capability: 'collections',
      options,
      call: (context) =>
        provider.getCollectionItems(collectionId, { ...options, signal: context.signal }),
      validate: (value, id) => validatePaginatedResult(value, id, validateContentItem),
    });
  }

  async getItem(
    providerId: string,
    itemId: string,
    options: ProviderRequestOptions = {},
  ): Promise<ContentItem> {
    const provider = this.registry.require(providerId);

    return this.invoke({
      provider,
      capability: 'itemDetails',
      options,
      call: (context) => provider.getItem(itemId, { ...options, signal: context.signal }),
      validate: validateContentItem,
    });
  }

  async getSubcollections(
    providerId: string,
    collectionId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentCollection>> {
    const provider = this.registry.require(providerId);
    const getSubcollections = provider.getSubcollections;

    if (getSubcollections === undefined) {
      throw createAppError(
        'unsupported-capability',
        `Provider ${JSON.stringify(providerId)} does not implement getSubcollections.`,
        { providerId },
      );
    }

    return this.invoke({
      provider,
      capability: 'subcollections',
      options,
      call: (context) =>
        getSubcollections.call(provider, collectionId, { ...options, signal: context.signal }),
      validate: (value, id) => validatePaginatedResult(value, id, validateContentCollection),
    });
  }

  async getRelatedItems(
    providerId: string,
    itemId: string,
    options: BrowseOptions = {},
  ): Promise<PaginatedResult<ContentItem>> {
    const provider = this.registry.require(providerId);

    return this.invoke({
      provider,
      capability: 'relatedContent',
      options,
      call: (context) => provider.getRelatedItems(itemId, { ...options, signal: context.signal }),
      validate: (value, id) => validatePaginatedResult(value, id, validateContentItem),
    });
  }

  async getAvailableFiles(
    providerId: string,
    itemId: string,
    options: ProviderRequestOptions = {},
  ): Promise<readonly ContentFile[]> {
    const provider = this.registry.require(providerId);
    const getFiles = provider.getAvailableFiles;

    if (getFiles === undefined) {
      throw createAppError(
        'unsupported-capability',
        `Provider ${JSON.stringify(providerId)} does not implement getAvailableFiles.`,
        { providerId },
      );
    }

    return this.invoke({
      provider,
      capability: 'downloadableFiles',
      options,
      call: (context) => getFiles.call(provider, itemId, { ...options, signal: context.signal }),
      validate: validateContentFiles,
    });
  }

  async getDownloadUrl(
    providerId: string,
    itemId: string,
    fileId: string,
    options: ProviderRequestOptions = {},
  ): Promise<string | null> {
    const provider = this.registry.require(providerId);
    const resolveUrl = provider.getDownloadUrl;

    if (resolveUrl === undefined) {
      throw createAppError(
        'unsupported-capability',
        `Provider ${JSON.stringify(providerId)} does not implement getDownloadUrl.`,
        { providerId },
      );
    }

    return this.invoke({
      provider,
      capability: 'downloadableFiles',
      options,
      call: (context) =>
        resolveUrl.call(provider, itemId, fileId, { ...options, signal: context.signal }),
      validate: validateDownloadUrl,
    });
  }

  private async invoke<T>(invocation: Invocation<T>): Promise<T> {
    const { provider, capability } = invocation;
    const options: ProviderRequestOptions = invocation.options ?? {};
    const { id } = provider;

    const capabilities = this.registry.getCapabilities(id);

    if (!capabilities[capability]) {
      throw createAppError(
        'unsupported-capability',
        `Provider ${JSON.stringify(id)} does not support ${capability}.`,
        { providerId: id },
      );
    }

    const health = this.registry.getHealth(id);

    if (!health.enabled) {
      throw createAppError('provider-unavailable', `Provider ${JSON.stringify(id)} is disabled.`, {
        providerId: id,
        ...(health.lastError !== undefined ? { cause: health.lastError } : {}),
      });
    }

    if (!health.available) {
      throw createAppError(
        'provider-unavailable',
        `Provider ${JSON.stringify(id)} is temporarily unavailable after ${health.consecutiveFailures} failed requests.`,
        { providerId: id, ...(health.lastError !== undefined ? { cause: health.lastError } : {}) },
      );
    }

    try {
      const value = await executeWithPolicy(
        async (context) => invocation.validate(await invocation.call(context), id),
        {
          providerId: id,
          ...(options.signal !== undefined ? { signal: options.signal } : {}),
          timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
          retry: this.retry,
          ...(this.sleep !== undefined ? { sleep: this.sleep } : {}),
          ...(this.random !== undefined ? { random: this.random } : {}),
        },
      );

      this.registry.recordSuccess(id);

      return value;
    } catch (error) {
      const appError = toAppError(error);

      // Cancellation is the caller's doing. Recording it as a failure would let an impatient
      // user trip the availability threshold and hide a perfectly healthy provider.
      if (appError.kind === 'cancelled') {
        throw attachProviderId(appError, id);
      }

      const attributed = attachProviderId(appError, id);
      this.registry.recordFailure(id, attributed);
      throw attributed;
    }
  }
}
