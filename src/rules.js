import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb, isFirebaseReady } from './firebase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '..', 'GRAVITY_RULES.md');

/**
 * Load rules from the local GRAVITY_RULES.md file.
 */
function loadRules() {
  try {
    return readFileSync(RULES_PATH, 'utf-8');
  } catch (err) {
    console.error('Could not load GRAVITY_RULES.md:', err.message);
    return 'No rules file found. Use default monitoring behavior.';
  }
}

/**
 * Sync rules to Firebase (Firestore) for persistence and iteration.
 */
async function syncRulesToFirebase(rulesContent) {
  if (!isFirebaseReady()) {
    console.warn('Firebase not ready — skipping rules sync');
    return;
  }

  const db = getDb();
  await db.collection('gravity-rules').doc('current').set({
    content: rulesContent,
    updatedAt: new Date().toISOString(),
    version: 'mvp-1.0',
  });
}

/**
 * Fetch rules from Firebase (fallback if local file is missing).
 */
async function fetchRulesFromFirebase() {
  if (!isFirebaseReady()) return null;

  const db = getDb();
  const doc = await db.collection('gravity-rules').doc('current').get();
  if (doc.exists) {
    return doc.data().content;
  }
  return null;
}

async function saveRules(content) {
  try {
    const { writeFileSync } = await import('fs');
    writeFileSync(RULES_PATH, content, 'utf-8');
    await syncRulesToFirebase(content);
    return true;
  } catch (err) {
    console.error('Could not save GRAVITY_RULES.md:', err.message);
    throw err;
  }
}

export { loadRules, syncRulesToFirebase, fetchRulesFromFirebase, saveRules };

