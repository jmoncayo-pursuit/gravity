import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initFirebase, db } from './src/firebase.js';
import { analyzeWithGemini } from './src/gemini.js';
import { loadRules, syncRulesToFirebase, saveRules } from './src/rules.js';
import { logFlag, logDoubleCheck, getHistory } from './src/history.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3456;
const RULES_FILE = join(process.cwd(), 'GRAVITY_RULES.md');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

// ─── Save Rules ──────────────────────────────────────────────────
app.post('/api/rules', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }
    await saveRules(content);
    res.json({ success: true, message: 'Rules updated and synced' });
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

/**
 * GET /api/rules-metadata
 * Returns the last modified time of the rules file.
 */
app.get('/api/rules-metadata', (req, res) => {
    try {
        const stats = statSync(RULES_FILE);
        res.json({ mtime: stats.mtime });
    } catch (e) {
        res.status(500).json({ error: 'Failed to read rules metadata' });
    }
});

// ─── Analyze Artifact ────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  try {
    const { content, type, context, originalRequest, terminalOutput, history } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const rules = loadRules();
    const result = await analyzeWithGemini({
      content,
      type: type || 'artifact',
      context: context || '',
      originalRequest: originalRequest || '',
      terminalOutput: terminalOutput || '',
      rules,
      history: history || [],
    });

    if (result.flags && result.flags.length > 0) {
      for (const flag of result.flags) {
        await logFlag(flag);
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Double Check ────────────────────────────────────────────────
app.post('/api/double-check', async (req, res) => {
  try {
    const { content, context, originalRequest, terminalOutput } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const rules = loadRules();
    const history = await getHistory(10);
    const result = await analyzeWithGemini({
      content,
      type: 'double_check',
      context: context || '',
      originalRequest: originalRequest || '',
      terminalOutput: terminalOutput || '',
      rules,
      history,
    });

    res.json(result);
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
    res.status(500).json({ error: err.message });
  }
});

// ─── Record User Decision ───────────────────────────────────────
app.post('/api/decision', async (req, res) => {
  try {
    const { doubleCheckId, decision, correctionNotes } = req.body;
    await logDoubleCheck({
      doubleCheckId,
      decision,
      correctionNotes: correctionNotes || '',
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get History ────────────────────────────────────────────────
app.get('/api/history', async (req, res) => {
  try {
    const limitCount = parseInt(req.query.limit) || 50;
    const history = await getHistory(limitCount);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/claims
 * Returns the content of AGENT_CLAIMS.md for the oversight panel.
 */
app.get('/api/claims', (req, res) => {
  try {
    if (existsSync(join(process.cwd(), 'AGENT_CLAIMS.md'))) {
      const claims = readFileSync(join(process.cwd(), 'AGENT_CLAIMS.md'), 'utf-8');
      res.json({ claims });
    } else {
      res.json({ claims: 'No active ledger found.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read claims ledger' });
  }
});

/**
 * POST /api/audit
 * Triggers a manual system-wide audit.
 */
app.post('/api/audit', async (req, res) => {
  try {
    const auditFlag = {
      type: 'manual_audit',
      message: 'USER-TRIGGERED DEEP AUDIT INITIATED',
      severity: 'HIGH',
      why: ['User requested manual verification of Worker claims.', 'Activating Deep Investigation protocol.'],
      timestamp: new Date().toISOString(),
    };
    await logFlag(auditFlag);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger audit' });
  }
});

// ─── Start Server ────────────────────────────────────────────────
async function start() {
  try {
    await initFirebase();
    console.log('🔗 Firebase connected');
  } catch (err) {
    console.warn('⚠️  Firebase not configured — running in local mode');
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
