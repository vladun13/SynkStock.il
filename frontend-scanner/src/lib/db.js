import { openDB } from 'idb';

const DB_NAME = 'syncstock-scanner';
const STORE = 'pending-actions';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'actionId' });
      }
    },
  });
}

export async function enqueueAction(action) {
  const db = await getDB();
  await db.put(STORE, action);
}

export async function getPendingActions() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function removeAction(actionId) {
  const db = await getDB();
  await db.delete(STORE, actionId);
}
