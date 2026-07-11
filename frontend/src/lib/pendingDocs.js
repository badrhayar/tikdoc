// IndexedDB stash for the doctor's credential FILES during the
// email-confirmation detour. localStorage can hold the form (JSON) but not
// File objects — IndexedDB can. Saved at registration, uploaded automatically
// on the doctor's first login (AppContext resume), then cleared.
const DB = 'tabibo';
const STORE = 'pending_docs';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** files: { docType: File } — stores each Blob under its doc type key. */
export async function savePendingDocs(files) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    st.clear();
    for (const [key, file] of Object.entries(files)) {
      if (file) st.put({ name: file.name, type: file.type, blob: file }, key);
    }
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** → { docType: File } (empty object when nothing is stashed). */
export async function loadPendingDocs() {
  const db = await openDb();
  const out = {};
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const st = tx.objectStore(STORE);
    const keysReq = st.getAllKeys();
    const valsReq = st.getAll();
    tx.oncomplete = () => {
      (keysReq.result || []).forEach((k, i) => {
        const v = valsReq.result[i];
        if (v?.blob) out[k] = new File([v.blob], v.name || `${k}.bin`, { type: v.type || 'application/octet-stream' });
      });
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return out;
}

export async function clearPendingDocs() {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
    db.close();
  } catch (_) { /* best effort */ }
}
