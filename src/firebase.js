import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = join(__dirname, '..', 'firebase-service-account.json');

let db = null;
let firebaseInitialized = false;

async function initFirebase() {
  if (firebaseInitialized) return db;

  // Prefer the JSON key file
  if (existsSync(SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    firebaseInitialized = true;
    return db;
  }

  // Fallback to env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey ||
      projectId === 'your-project-id') {
    throw new Error('Firebase credentials not configured');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  db = admin.firestore();
  firebaseInitialized = true;
  return db;
}

function getDb() {
  return db;
}

function isFirebaseReady() {
  return firebaseInitialized && db !== null;
}

export { initFirebase, db, getDb, isFirebaseReady };
