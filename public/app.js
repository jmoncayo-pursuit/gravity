/* ============================================================
   GRAVITY — Dashboard Client Logic
   ============================================================ */

import { 
    getFirestore, collection, query, orderBy, limit, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

const firebaseConfig = { projectId: "gravity-493615" };
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

const API = '';  // Same origin

// ─── State ───────────────────────────────────────────────────
let currentType = 'artifact';
let currentHistory = [];
let flagCount = 0;
let checkCount = 0;

// ─── DOM Refs ────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  originalRequest: $('#originalRequest'),
  contentInput: $('#contentInput'),
  contextInput: $('#contextInput'),
  btnAnalyze: $('#btnAnalyze'),
  btnDoubleCheck: $('#btnDoubleCheck'),
  flagCount: $('#flagCount'),
  checkCount: $('#checkCount'),
  resultsBody: $('#resultsBody'),
  emptyState: $('#emptyState'),
  verdictCard: $('#verdictCard'),
  verdictBadge: $('#verdictBadge'),
  verdictReason: $('#verdictReason'),
  verdictSuggestion: $('#verdictSuggestion'),
  verdictActions: $('#verdictActions'),
  flagsList: $('#flagsList'),
  summaryCard: $('#summaryCard'),
  summaryText: $('#summaryText'),
  feedScroll: $('#feedScroll'),
  feedEmpty: $('#feedEmpty'),
  toastContainer: $('#toastContainer'),
  loaderOverlay: $('#loaderOverlay'),
  btnAccept: $('#btnAccept'),
  btnReject: $('#btnReject'),
  btnCorrect: $('#btnCorrect'),
  btnClearFeed: $('#btnClearFeed'),
  healthApi: $('#healthApi'),
  healthFirebase: $('#healthFirebase'),
  healthDb: $('#healthDb'),
  healthUptime: $('#healthUptime'),
  statFlags: $('#statFlags'),
  rulesLastModified: $('#rulesLastModified')
};

// ─── Real-time ───
function initRealtime() {
    const q = query(collection(db, "gravity-history"), orderBy("timestamp", "desc"), limit(50));
    onSnapshot(q, (snapshot) => {
        const history = [];
        snapshot.forEach((doc) => history.push({ id: doc.id, ...doc.data() }));
        currentHistory = history;
        renderFeed();
        updateGlobalStats(history);
    });
}

function updateGlobalStats(history) {
    const flags = history.filter(h => h.entryType === 'flag');
    if (els.statFlags) els.statFlags.innerText = flags.length;
    if (els.flagCount) els.flagCount.innerText = flags.length;
    
    const isEmergency = history.some(e => (e.severity === 'CRITICAL' || e.type === 'fidelity_breach') && (Date.now() - new Date(e.timestamp).getTime()) < 600000);
    document.body.classList.toggle('emergency-active', isEmergency);
}

function renderFeed() {
    if (!els.feedScroll) return;
    
    if (currentHistory.length === 0) {
        els.feedScroll.innerHTML = `<div class="feed-empty"><span>No flags yet. Gravity is watching.</span></div>`;
        return;
    }

    const html = currentHistory.map(item => {
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const type = item.type || (item.entryType === 'flag' ? 'protocol_breach' : 'verification');
        const severity = item.severity || 'LOW';
        
        return `
            <div class="feed-item ${severity}">
                <div class="feed-item-header">
                    <span class="flag-type">${type.toUpperCase()}</span>
                    <span class="flag-time">${time}</span>
                </div>
                <div class="feed-text">${item.message || 'System verification audit pulse.'}</div>
            </div>
        `;
    }).join('');
    
    els.feedScroll.innerHTML = html;
}

// ─── Tab Switching ───────────────────────────────────────────
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;
    const placeholders = {
      artifact: "Paste the agent's output, artifact content, or plan...",
      terminal: "Paste terminal output to check for errors or stalls...",
      code_change: "Paste the proposed code change or diff...",
    };
    els.contentInput.placeholder = placeholders[currentType] || placeholders.artifact;
  });
});

// ─── Analyze & Double-Check ──────────────────────────────────
els.btnAnalyze.addEventListener('click', () => submitRequest('analyze'));
els.btnDoubleCheck.addEventListener('click', () => submitRequest('double-check'));

async function submitRequest(mode) {
    const content = els.contentInput.value.trim();
    if (!content) {
        showToast('Paste something to analyze first.', 'LOW');
        return;
    }

    showLoader(true);
    clearResults();

    const endpoint = mode === 'analyze' ? '/api/analyze' : '/api/double-check';
    
    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                type: currentType,
                context: els.contextInput.value.trim(),
                originalRequest: els.originalRequest.value.trim(),
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        displayResults(data, mode);
    } catch (err) {
        showToast(`Request failed: ${err.message}`, 'HIGH');
    } finally {
        showLoader(false);
    }
}

function displayResults(data, mode) {
    els.emptyState.classList.add('hidden');
    
    if (mode === 'double-check' || data.verdict) {
        els.verdictCard.classList.remove('hidden');
        els.verdictBadge.innerText = data.verdict || 'GO';
        els.verdictBadge.className = `verdict-badge ${(data.verdict || 'GO').toLowerCase()}`;
        els.verdictReason.innerText = data.reason || 'No major risks detected by grounding engine.';
    }

    if (data.flags && data.flags.length > 0) {
        els.flagsList.innerHTML = data.flags.map(f => `
            <div class="flag-card severity-${f.severity}">
                <div class="flag-header">
                    <span class="flag-type">${f.type}</span>
                    <span class="flag-severity">${f.severity}</span>
                </div>
                <div class="flag-message">${f.message}</div>
            </div>
        `).join('');
    } else if (mode === 'analyze') {
        els.flagsList.innerHTML = '<div class="feed-empty">No flags detected in this snippet.</div>';
    }
}

// ─── Helpers ─────────────────────────────────────────────────
function clearResults() {
    els.emptyState.classList.remove('hidden');
    els.verdictCard.classList.add('hidden');
    els.summaryCard.classList.add('hidden');
    els.flagsList.innerHTML = '';
}

function showLoader(show) {
    els.loaderOverlay.classList.toggle('hidden', !show);
}

function showToast(msg, severity) {
    const toast = document.createElement('div');
    toast.className = `toast severity-${severity}`;
    toast.innerHTML = `<span class="toast-text">${msg}</span>`;
    els.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

async function updateRulesVersion() {
    try {
        const res = await fetch('/api/rules-metadata');
        const data = await res.json();
        if (data.mtime && els.rulesLastModified) {
            const date = new Date(data.mtime);
            els.rulesLastModified.innerText = date.toLocaleString();
        }
    } catch (e) {
        console.error('Failed to sync rules version');
    }
}

// ─── Health ──────────────────────────────────────────────────
async function checkSystemHealth() {
    try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.status === 'ok') {
            updateHealthUI('Api', true, 'Operational');
            updateHealthUI('Firebase', true, 'Connected');
            updateHealthUI('Db', true, 'Ready');
        }
    } catch (e) {
        updateHealthUI('Api', false, 'Offline');
    }
}

function updateHealthUI(type, ok, text) {
    const el = els[`health${type}`];
    if (!el) return;
    el.classList.toggle('online', ok);
    el.classList.toggle('offline', !ok);
}

// ─── Init ────────────────────────────────────────────────────
initRealtime();
updateRulesVersion();
checkSystemHealth();
setInterval(updateRulesVersion, 10000);
setInterval(checkSystemHealth, 30000);
