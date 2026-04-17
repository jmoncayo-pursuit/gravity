import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initFirebase, db } from './src/firebase.js';
import { analyzeWithGemini } from './src/gemini.js';
import { loadRules, syncRulesToFirebase } from './src/rules.js';
import { logFlag, logDoubleCheck, getHistory } from './src/history.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Get Rules ───────────────────────────────────────────────────
app.get('/api/rules', async (req, res) => {
  try {
    const rules = loadRules();
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Sync Rules to Firebase ─────────────────────────────────────
app.post('/api/rules/sync', async (req, res) => {
  try {
    const rules = loadRules();
    await syncRulesToFirebase(rules);
    res.json({ success: true, message: 'Rules synced to Firebase' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Analyze Artifact ────────────────────────────────────────────
// Gravity's core: send artifact/terminal content for rule-checking
app.post('/api/analyze', async (req, res) => {
  try {
    const { content, type, context, originalRequest } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const rules = loadRules();
    const history = await getHistory(10);

    const analysis = await analyzeWithGemini({
      content,
      type: type || 'artifact',        // 'artifact' | 'terminal' | 'code_change'
      context: context || '',
      originalRequest: originalRequest || '',
      rules,
      history,
    });

    // Log any flags
    if (analysis.flags && analysis.flags.length > 0) {
      for (const flag of analysis.flags) {
        await logFlag(flag);
      }
    }

    res.json(analysis);
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Double-Check Before Accept ──────────────────────────────────
app.post('/api/double-check', async (req, res) => {
  try {
    const { codeChange, originalRequest, context, terminalOutput } = req.body;
    if (!codeChange) {
      return res.status(400).json({ error: 'codeChange is required' });
    }

    const rules = loadRules();
    const history = await getHistory(10);

    const review = await analyzeWithGemini({
      content: codeChange,
      type: 'double_check',
      context: context || '',
      originalRequest: originalRequest || '',
      terminalOutput: terminalOutput || '',
      rules,
      history,
    });

    // Log the double-check
    await logDoubleCheck({
      verdict: review.verdict,
      reason: review.reason,
      flags: review.flags || [],
      timestamp: new Date().toISOString(),
    });

    res.json(review);
  } catch (err) {
    console.error('Double-check error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Request Correction ──────────────────────────────────────────
app.post('/api/correct', async (req, res) => {
  try {
    const { content, correctionNotes, originalRequest } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const rules = loadRules();
    const history = await getHistory(10);

    const correction = await analyzeWithGemini({
      content,
      type: 'correct',
      context: correctionNotes || '',
      originalRequest: originalRequest || '',
      rules,
      history,
    });

    res.json(correction);
  } catch (err) {
    console.error('Correction error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Record User Decision (Accept/Reject/Correct) ───────────────
app.post('/api/decision', async (req, res) => {
  try {
    const { doubleCheckId, decision, correctionNotes } = req.body;
    await logDoubleCheck({
      doubleCheckId,
      decision,       // 'accept' | 'reject' | 'correct'
      correctionNotes: correctionNotes || '',
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Flag/Decision History ───────────────────────────────────
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await getHistory(limit);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ────────────────────────────────────────────────
async function start() {
  try {
    await initFirebase();
    console.log('🔗 Firebase connected');
  } catch (err) {
    console.warn('⚠️  Firebase not configured — running in local-only mode');
    console.warn('   Set up .env with Firebase credentials to enable persistence.');
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│                                             │');
    console.log('│   🌍 GRAVITY is running                     │');
    console.log(`│   📡 http://localhost:${PORT}                  │`);
    console.log('│   🎯 Dashboard: open in browser             │');
    console.log('│                                             │');
    console.log('└─────────────────────────────────────────────┘');
    console.log('');
  });
}

start();
