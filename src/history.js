import { getDb, isFirebaseReady } from './firebase.js';

// In-memory fallback when Firebase is not configured
const localHistory = [];

/**
 * Log a flag to Firebase (or local memory).
 */
async function logFlag(flag) {
  const entry = {
    ...flag,
    entryType: 'flag',
    timestamp: new Date().toISOString(),
  };

  if (isFirebaseReady()) {
    const db = getDb();
    await db.collection('gravity-history').add(entry);
  } else {
    localHistory.push(entry);
  }

  return entry;
}

/**
 * Log a double-check result to Firebase (or local memory).
 */
async function logDoubleCheck(check) {
  const entry = {
    ...check,
    entryType: 'double_check',
    timestamp: check.timestamp || new Date().toISOString(),
  };

  if (isFirebaseReady()) {
    const db = getDb();
    await db.collection('gravity-history').add(entry);
  } else {
    localHistory.push(entry);
  }

  return entry;
}

/**
 * Get recent history from Firebase (or local memory).
 */
async function getHistory(limit = 50) {
  if (isFirebaseReady()) {
    const db = getDb();
    const snapshot = await db.collection('gravity-history')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Local fallback
  return localHistory.slice(-limit).reverse();
}

/**
 * Get flag stats for the current session.
 */
async function getFlagStats() {
  const history = await getHistory(100);
  const flags = history.filter(h => h.entryType === 'flag');
  const checks = history.filter(h => h.entryType === 'double_check');

  const stats = {
    totalFlags: flags.length,
    totalChecks: checks.length,
    byType: {},
    bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
    goCount: checks.filter(c => c.verdict === 'GO').length,
    noGoCount: checks.filter(c => c.verdict === 'NO-GO').length,
  };

  for (const flag of flags) {
    stats.byType[flag.type] = (stats.byType[flag.type] || 0) + 1;
    if (flag.severity) {
      stats.bySeverity[flag.severity] = (stats.bySeverity[flag.severity] || 0) + 1;
    }
  }

  return stats;
}

export { logFlag, logDoubleCheck, getHistory, getFlagStats };
