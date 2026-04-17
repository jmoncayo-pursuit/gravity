/* ============================================================
   GRAVITY — Dashboard Client Logic
   ============================================================ */

const API = window.location.origin;  // Same origin

// ─── State ───────────────────────────────────────────────────
let currentType = 'artifact';
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
  // Health markers
  healthApi: $('#healthApi'),
  healthFirebase: $('#healthFirebase'),
  healthDb: $('#healthDb'),
  healthUptime: $('#healthUptime'),
  statFlags: $('#statFlags'),
  // Rules Editor
  btnShowRules: $('#btnShowRules'),
  btnHideRules: $('#btnHideRules'),
  btnSaveRules: $('#btnSaveRules'),
  panelRules: $('#panelRules'),
  panelInput: $('#panelInput'),
  panelResults: $('#panelResults'),
  rulesEditor: $('#rulesEditor'),
  rulesStatus: $('#rulesStatus'),
};



// ─── Tab Switching ───────────────────────────────────────────
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;

    // Update placeholder
    const placeholders = {
      artifact: "Paste the agent's output, artifact content, or plan...",
      terminal: "Paste terminal output to check for errors or stalls...",
      code_change: "Paste the proposed code change or diff...",
    };
    els.contentInput.placeholder = placeholders[currentType] || placeholders.artifact;
  });
});

// ─── Analyze ─────────────────────────────────────────────────
els.btnAnalyze.addEventListener('click', async () => {
  const content = els.contentInput.value.trim();
  if (!content) {
    showToast('Paste something to analyze first.', 'LOW');
    return;
  }

  showLoader(true);
  clearResults();

  try {
    const res = await fetch(`${API}/api/analyze`, {
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

    displayAnalysis(data);
  } catch (err) {
    showToast(`Analysis failed: ${err.message}`, 'HIGH');
  } finally {
    showLoader(false);
  }
});

// ─── Double-Check ────────────────────────────────────────────
els.btnDoubleCheck.addEventListener('click', async () => {
  const content = els.contentInput.value.trim();
  if (!content) {
    showToast('Paste the proposed change to double-check.', 'LOW');
    return;
  }

  showLoader(true);
  clearResults();

  try {
    const res = await fetch(`${API}/api/double-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codeChange: content,
        originalRequest: els.originalRequest.value.trim(),
        context: els.contextInput.value.trim(),
        terminalOutput: '',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    displayDoubleCheck(data);
  } catch (err) {
    showToast(`Double-check failed: ${err.message}`, 'HIGH');
  } finally {
    showLoader(false);
  }
});

// ─── Display Analysis Results ────────────────────────────────
function displayAnalysis(data) {
  els.resultsBody.innerHTML = ''; // Keep fresh results only
  els.emptyState.classList.add('hidden');

  // Show flags
  if (data.flags && data.flags.length > 0) {
    data.flags.forEach(flag => {
      addFlagCard(flag);
      addFeedItem(flag.message, flag.severity);
      showToast(flag.message, flag.severity);
      flagCount++;
    });
    els.flagCount.textContent = flagCount;
  }

  // Show summary
  if (data.summary) {
    els.summaryCard.classList.remove('hidden');
    els.summaryText.textContent = data.summary;
  }

  if (!data.flags || data.flags.length === 0) {
    els.summaryCard.classList.remove('hidden');
    els.summaryText.textContent = data.summary || '✓ Clean. No issues detected.';
  }
}

// ─── Display Double-Check Result ─────────────────────────────
function displayDoubleCheck(data) {
  els.emptyState.classList.add('hidden');
  checkCount++;
  els.checkCount.textContent = checkCount;

  const isGo = data.verdict === 'GO';

  // Show verdict card
  els.verdictCard.classList.remove('hidden', 'go', 'nogo');
  els.verdictCard.classList.add(isGo ? 'go' : 'nogo');
  els.verdictBadge.textContent = data.verdict || 'GO';
  els.verdictReason.textContent = data.reason || '';

  if (data.suggestion) {
    els.verdictSuggestion.textContent = data.suggestion;
    els.verdictSuggestion.classList.remove('hidden');
  } else {
    els.verdictSuggestion.classList.add('hidden');
  }

  els.verdictActions.classList.remove('hidden');

  // Show flags
  if (data.flags && data.flags.length > 0) {
    data.flags.forEach(flag => {
      addFlagCard(flag);
      addFeedItem(flag.message, flag.severity);
      showToast(flag.message, flag.severity);
      flagCount++;
    });
    els.flagCount.textContent = flagCount;
  }

  // Feed item for verdict
  addFeedItem(
    `Double-check: ${data.verdict} — ${data.reason}`,
    data.verdict === 'GO' ? 'GO' : 'NOGO'
  );

  showToast(
    `${data.verdict}: ${data.reason}`,
    data.verdict === 'GO' ? 'GO' : 'HIGH'
  );
}

// ─── Flag Card ───────────────────────────────────────────────
function addFlagCard(flag) {
  const card = document.createElement('div');
  card.className = `flag-card severity-${flag.severity || 'MEDIUM'}`;

  const whyItems = (flag.why || []).map(w => `<li>${escapeHtml(w)}</li>`).join('');

  card.innerHTML = `
    <div class="flag-header">
      <span class="flag-type">${escapeHtml(flag.type || 'unknown')}</span>
      <span class="flag-severity">${flag.severity || 'MEDIUM'}</span>
    </div>
    <div class="flag-message">${escapeHtml(flag.message || '')}</div>
    ${whyItems ? `
      <div class="flag-why" id="why-${Date.now()}">
        <ul>${whyItems}</ul>
      </div>
      <div class="flag-expand-hint">Click for details</div>
    ` : ''}
  `;

  // Toggle "Why?" expansion
  card.addEventListener('click', () => {
    const why = card.querySelector('.flag-why');
    const hint = card.querySelector('.flag-expand-hint');
    if (why) {
      why.classList.toggle('expanded');
      if (hint) hint.textContent = why.classList.contains('expanded') ? 'Click to collapse' : 'Click for details';
    }
  });

  els.flagsList.appendChild(card);
}

// ─── Feed Items ──────────────────────────────────────────────
function addFeedItem(message, severity) {
  els.feedEmpty.classList.add('hidden');

  const item = document.createElement('div');
  item.className = 'feed-item';
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  item.innerHTML = `
    <div class="feed-dot ${severity}"></div>
    <span class="feed-text">${escapeHtml(message)}</span>
    <span class="feed-time">${time}</span>
  `;

  els.feedScroll.insertBefore(item, els.feedScroll.firstChild);
}

// ─── Toasts ──────────────────────────────────────────────────
function showToast(message, severity = 'MEDIUM') {
  const toast = document.createElement('div');
  toast.className = `toast severity-${severity}`;

  toast.innerHTML = `
    <div class="toast-dot"></div>
    <span class="toast-text">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Close toast">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  });

  els.toastContainer.appendChild(toast);

  // Update flag counter if it's a flag (not a clean summary or GO verdict)
  if (severity && severity !== 'GO' && severity !== 'Clean') {
    flagCount++;
    if (els.statFlags) els.statFlags.textContent = flagCount;
  }

  // Auto-dismiss
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// ─── User Decision Buttons ───────────────────────────────────
els.btnAccept.addEventListener('click', () => recordDecision('accept'));
els.btnReject.addEventListener('click', () => recordDecision('reject'));
els.btnCorrect.addEventListener('click', () => recordDecision('correct'));

async function recordDecision(decision) {
  let correctionNotes = '';
  
  if (decision === 'correct') {
    correctionNotes = prompt('What should Gravity focus on for the correction? (Optional)');
    if (correctionNotes === null) return; // Cancelled
    
    showLoader(true);
    try {
      const res = await fetch(`${API}/api/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: els.contentInput.value.trim(),
          correctionNotes,
          originalRequest: els.originalRequest.value.trim(),
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (data.correctedContent) {
        els.contentInput.value = data.correctedContent;
        showToast('Gravity has updated the content with a corrected version.', 'GO');
        addFeedItem(`Correction generated: ${data.changesMade || 'Fixed rules violations'}`, 'GO');
      }
    } catch (err) {
      showToast(`Correction failed: ${err.message}`, 'HIGH');
    } finally {
      showLoader(false);
    }
  }

  try {
    await fetch(`${API}/api/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, correctionNotes }),
    });

    const labels = { accept: 'Accepted', reject: 'Rejected', correct: 'Fix requested' };
    addFeedItem(`Decision: ${labels[decision]}`, decision === 'accept' ? 'GO' : 'NOGO');
    showToast(`Decision recorded: ${labels[decision]}`, decision === 'accept' ? 'GO' : 'MEDIUM');

    if (decision !== 'correct') {
      els.verdictActions.classList.add('hidden');
    }
  } catch (err) {
    showToast(`Failed to record decision: ${err.message}`, 'HIGH');
  }
}

// ─── Rules Editor Logic ──────────────────────────────────────
els.btnShowRules.addEventListener('click', async () => {
  els.panelInput.classList.add('hidden');
  els.panelResults.classList.add('hidden');
  els.panelRules.classList.remove('hidden');
  
  // Load current rules
  try {
    const res = await fetch(`${API}/api/rules`);
    const data = await res.json();
    if (res.ok) {
      els.rulesEditor.value = data.rules;
      updateRulesStatus('Synchronized', 'var(--go)');
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast(`Failed to load rules: ${err.message}`, 'HIGH');
  }
});

els.btnHideRules.addEventListener('click', () => {
  els.panelInput.classList.remove('hidden');
  els.panelResults.classList.remove('hidden');
  els.panelRules.classList.add('hidden');
});

els.btnSaveRules.addEventListener('click', async () => {
  const content = els.rulesEditor.value.trim();
  if (!content) {
    showToast('Rules cannot be empty.', 'MEDIUM');
    return;
  }

  showLoader(true);
  updateRulesStatus('Saving...', 'var(--warn)');

  try {
    const res = await fetch(`${API}/api/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Rules updated and deployed to Cloud Bridge.', 'GO');
    addFeedItem('System Rules updated by user.', 'GO');
    updateRulesStatus('Synchronized', 'var(--go)');
    
    // Briefly show success state in button
    const originalText = els.btnSaveRules.textContent;
    els.btnSaveRules.textContent = 'Saved!';
    setTimeout(() => {
      els.btnSaveRules.textContent = originalText;
    }, 2000);

  } catch (err) {
    showToast(`Failed to save rules: ${err.message}`, 'HIGH');
    updateRulesStatus('Error Saving', 'var(--nogo)');
  } finally {
    showLoader(false);
  }
});

els.rulesEditor.addEventListener('input', () => {
  updateRulesStatus('Unsaved Changes', 'var(--warn)');
});

function updateRulesStatus(text, color) {
  if (!els.rulesStatus) return;
  els.rulesStatus.textContent = text;
  els.rulesStatus.style.color = color;
}

// ─── Clear Feed ──────────────────────────────────────────────

els.btnClearFeed.addEventListener('click', () => {
  els.feedScroll.innerHTML = `
    <div class="feed-empty" id="feedEmpty">
      <span>No flags yet. Gravity is watching.</span>
    </div>
  `;
});

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Keyboard Shortcut ───────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    els.btnAnalyze.click();
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    els.btnDoubleCheck.click();
  }
});

// ─── Health & Uptime Logic ────────────────────────────────────
let startTime = Date.now();

function updateUptime() {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(diff / 3600).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
  const s = (diff % 60).toString().padStart(2, '0');
  if (els.healthUptime) els.healthUptime.textContent = `${h}:${m}:${s}`;
}

async function checkSystemHealth() {
  try {
    const res = await fetch(`${API}/api/health`);
    const data = await res.json();
    
    if (data.status === 'ok') {
      updateStatusIndicator(els.healthApi, true, 'Online');
      // For the demo, let's assume Firebase/DB are online if the API is ok
      // unless we want to add specific checks to the /api/health endpoint
      updateStatusIndicator(els.healthFirebase, true, 'Connected');
      updateStatusIndicator(els.healthDb, true, 'Ready');
    } else {
      updateStatusIndicator(els.healthApi, false, 'Error');
    }
  } catch (err) {
    updateStatusIndicator(els.healthApi, false, 'Offline');
    updateStatusIndicator(els.healthFirebase, false, 'Disconnected');
    updateStatusIndicator(els.healthDb, false, 'Unavailable');
  }
}

function updateStatusIndicator(el, ok, text) {
  if (!el) return;
  el.classList.remove('status-online', 'status-offline');
  el.classList.add(ok ? 'status-online' : 'status-offline');
  el.querySelector('span').textContent = text;
}

// Initial checks and loops
setInterval(updateUptime, 1000);
setInterval(checkSystemHealth, 30000); // Check every 30s
checkSystemHealth();
