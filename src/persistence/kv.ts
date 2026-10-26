/**
 * String-keyed document store used by the local account backend.
 *
 * Memory and IndexedDB both implement this, so account logic is tested without a browser
 * database. Values must be structured-cloneable: the IndexedDB driver stores them as-is.
 */

export interface KvStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<ReadonlyArray<{ readonly key: string; readonly value: unknown }>>;
}
