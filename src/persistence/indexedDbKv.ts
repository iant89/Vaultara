import { createPersistenceError } from './errors';
import type { KvStore } from './kv';

const DB_NAME = 'vaultara-user';
const DB_VERSION = 1;
const STORE = 'kv';

interface KvRow {
  readonly key: string;
  readonly value: unknown;
}

/**
 * IndexedDB-backed key-value store. The database is opened lazily so importing this module
 * has no side effects. Operations fail with `unavailable` when IndexedDB is missing.
 */
export function createIndexedDbKvStore(options: { readonly databaseName?: string } = {}): KvStore {
  const databaseName = options.databaseName ?? DB_NAME;
  let opened: Promise<IDBDatabase> | undefined;

  function database(): Promise<IDBDatabase> {
    opened ??= openDatabase(databaseName);
    return opened;
  }

  return {
    async get(key) {
      const db = await database();
      const row = await requestOf<KvRow | undefined>(
        store(db, 'readonly').get(key) as IDBRequest<KvRow | undefined>,
      );

      return row?.value;
    },
    async set(key, value) {
      const db = await database();
      await requestOf(store(db, 'readwrite').put({ key, value } satisfies KvRow));
    },
    async delete(key) {
      const db = await database();
      await requestOf(store(db, 'readwrite').delete(key));
    },
    async list(prefix) {
      const db = await database();
      const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
      const rows = await requestOf<KvRow[]>(
        store(db, 'readonly').getAll(range) as IDBRequest<KvRow[]>,
      );

      return rows.map((row) => ({ key: row.key, value: row.value }));
    },
  };
}

function openDatabase(name: string): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      createPersistenceError(
        'unavailable',
        'This browser cannot store accounts (IndexedDB is unavailable).',
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(createPersistenceError('unavailable', 'This browser could not open account storage.'));
    };
  });
}

function store(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function requestOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(
        createPersistenceError('unavailable', 'Account storage could not complete that operation.'),
      );
    };
  });
}
