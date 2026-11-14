import { DataProfile, NotebookCell } from '../types/studio';

const DB_NAME = 'amlics_workspace_db';
const DB_VERSION = 1;
const STORE_FILES = 'uploaded_csv_files';
const STORE_STATE = 'workspace_state';

export interface CachedCsvFile {
  slot: 'train' | 'test';
  filename: string;
  content: string;
  sizeBytes: number;
  updatedAt: number;
}

function openWorkspaceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'slot' });
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCsvFileToCache(
  slot: 'train' | 'test',
  filename: string,
  content: string
): Promise<void> {
  try {
    const db = await openWorkspaceDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const record: CachedCsvFile = {
        slot,
        filename,
        content,
        sizeBytes: content.length,
        updatedAt: Date.now(),
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('[AMLICS Cache] Failed to cache CSV in IndexedDB:', err);
  }
}

export async function loadCsvFileFromCache(
  slot: 'train' | 'test'
): Promise<CachedCsvFile | null> {
  try {
    const db = await openWorkspaceDb();
    const result = await new Promise<CachedCsvFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(slot);
      req.onsuccess = () => resolve((req.result as CachedCsvFile) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function removeCsvFileFromCache(slot: 'train' | 'test'): Promise<void> {
  try {
    const db = await openWorkspaceDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.delete(slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function saveWorkspaceStateToCache(
  dataProfile: DataProfile | null,
  cells: NotebookCell[]
): Promise<void> {
  try {
    const db = await openWorkspaceDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readwrite');
      const store = tx.objectStore(STORE_STATE);
      store.put({ key: 'dataProfile', value: dataProfile, updatedAt: Date.now() });
      store.put({ key: 'cells', value: cells, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function loadWorkspaceStateFromCache(): Promise<{
  dataProfile: DataProfile | null;
  cells: NotebookCell[] | null;
}> {
  try {
    const db = await openWorkspaceDb();
    const res = await new Promise<{
      dataProfile: DataProfile | null;
      cells: NotebookCell[] | null;
    }>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readonly');
      const store = tx.objectStore(STORE_STATE);
      const profReq = store.get('dataProfile');
      const cellsReq = store.get('cells');
      tx.oncomplete = () => {
        resolve({
          dataProfile: profReq.result?.value ?? null,
          cells: cellsReq.result?.value ?? null,
        });
      };
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return res;
  } catch {
    return { dataProfile: null, cells: null };
  }
}
