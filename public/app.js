/* ============================================================
   GRAVITY — Dashboard Client Logic (MVC Refactor)
   ============================================================ */

const API = window.location.origin; // Dynamically get origin to avoid CORS/IP issues

// ─── Model ───────────────────────────────────────────────────
class GravityModel {
    constructor() {
        this.currentType = 'artifact';
        this.flagCount = 0;
        this.checkCount = 0;
        this.startTime = Date.now();
        this.placeholders = {
            artifact: "Paste the agent's output, artifact content, or plan...",
            terminal: "Paste terminal output to check for errors or stalls...",
            code_change: "Paste the proposed code change or diff...",
        };
    }

    getUptime() {
        const diff = Math.floor((Date.now() - this.startTime) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    async analyze(data) {
        const res = await fetch(`${API}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return result;
    }

    async doubleCheck(data) {
        const res = await fetch(`${API}/api/double-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return result;
    }

    async recordDecision(data) {
        const res = await fetch(`${API}/api/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return result;
    }

    async generateCorrection(data) {
        const res = await fetch(`${API}/api/correct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        return result;
    }

    async fetchHealth() {
        const res = await fetch(`${API}/api/health`);
        return await res.json();
    }
}

// ─── View ───────────────────────────────────────────────────
class GravityView {
    constructor() {
        this.$ = (sel) => document.querySelector(sel);
        this.$$ = (sel) => document.querySelectorAll(sel);

        this.els = {
            originalRequest: this.$('#originalRequest'),
            contentInput: this.$('#contentInput'),
            contextInput: this.$('#contextInput'),
            btnAnalyze: this.$('#btnAnalyze'),
            btnDoubleCheck: this.$('#btnDoubleCheck'),
            flagCount: this.$('#flagCount'),
            checkCount: this.$('#checkCount'),
            resultsBody: this.$('#resultsBody'),
            emptyState: this.$('#emptyState'),
            verdictCard: this.$('#verdictCard'),
            verdictBadge: this.$('#verdictBadge'),
            verdictReason: this.$('#verdictReason'),
            verdictSuggestion: this.$('#verdictSuggestion'),
            verdictActions: this.$('#verdictActions'),
            flagsList: this.$('#flagsList'),
            summaryCard: this.$('#summaryCard'),
            summaryText: this.$('#summaryText'),
            feedScroll: this.$('#feedScroll'),
            feedEmpty: this.$('#feedEmpty'),
            toastContainer: this.$('#toastContainer'),
            loaderOverlay: this.$('#loaderOverlay'),
            btnAccept: this.$('#btnAccept'),
            btnReject: this.$('#btnReject'),
            btnCorrect: this.$('#btnCorrect'),
            btnClearFeed: this.$('#btnClearFeed'),
            // Health markers
            healthApi: this.$('#healthApi'),
            healthFirebase: this.$('#healthFirebase'),
            healthDb: this.$('#healthDb'),
            healthUptime: this.$('#healthUptime'),
            statFlags: this.$('#statFlags'),
        };
    }

    bindTabSwitch(handler) {
        this.$$('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.$$('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                handler(tab.dataset.type);
            });
        });
    }

    updatePlaceholder(text) {
        this.els.contentInput.placeholder = text;
    }

    showLoader(show) {
        this.els.loaderOverlay.classList.toggle('hidden', !show);
    }

    clearResults() {
        this.els.emptyState.classList.remove('hidden');
        this.els.verdictCard.classList.add('hidden');
        this.els.summaryCard.classList.add('hidden');
        this.els.flagsList.innerHTML = '';
    }

    displayAnalysis(data, onFlagAdded) {
        this.clearResults();
        this.els.emptyState.classList.add('hidden');

        if (data.flags && data.flags.length > 0) {
            data.flags.forEach(flag => {
                this.addFlagCard(flag);
                if (typeof onFlagAdded === 'function') {
                    onFlagAdded(flag.message, flag.severity);
                }
            });
        }

        if (data.summary && (!data.flags || data.flags.length === 0)) {
            this.els.summaryCard.classList.remove('hidden');
            this.els.summaryText.textContent = data.summary;
        } else if (!data.flags || data.flags.length === 0) {
            this.els.summaryCard.classList.remove('hidden');
            this.els.summaryText.textContent = '✓ Clean. No issues detected.';
        }
    }

    displayDoubleCheck(data, onFlagAdded) {
        this.els.emptyState.classList.add('hidden');
        const isGo = data.verdict === 'GO';

        this.els.verdictCard.classList.remove('hidden', 'go', 'nogo');
        this.els.verdictCard.classList.add(isGo ? 'go' : 'nogo');
        this.els.verdictBadge.textContent = data.verdict || 'GO';
        this.els.verdictReason.textContent = data.reason || '';

        if (data.suggestion) {
            this.els.verdictSuggestion.textContent = data.suggestion;
            this.els.verdictSuggestion.classList.remove('hidden');
        } else {
            this.els.verdictSuggestion.classList.add('hidden');
        }

        this.els.verdictActions.classList.remove('hidden');

        if (data.flags && data.flags.length > 0) {
            data.flags.forEach(flag => {
                this.addFlagCard(flag);
                onFlagAdded(flag.message, flag.severity);
            });
        }
    }

    addFlagCard(flag) {
        const card = document.createElement('div');
        card.className = `flag-card severity-${flag.severity || 'MEDIUM'}`;
        const whyItems = (flag.why || []).map(w => `<li>${this.escapeHtml(w)}</li>`).join('');

        card.innerHTML = `
            <div class="flag-header">
                <span class="flag-type">${this.escapeHtml(flag.type || 'unknown')}</span>
                <span class="flag-severity">${flag.severity || 'MEDIUM'}</span>
            </div>
            <div class="flag-message">${this.escapeHtml(flag.message || '')}</div>
            ${whyItems ? `
                <div class="flag-why">
                    <ul>${whyItems}</ul>
                </div>
                <div class="flag-expand-hint">Click for details</div>
            ` : ''}
        `;

        card.addEventListener('click', () => {
            const why = card.querySelector('.flag-why');
            const hint = card.querySelector('.flag-expand-hint');
            if (why) {
                why.classList.toggle('expanded');
                if (hint) hint.textContent = why.classList.contains('expanded') ? 'Click to collapse' : 'Click for details';
            }
        });

        this.els.flagsList.appendChild(card);
    }

    addFeedItem(message, severity) {
        this.els.feedEmpty.classList.add('hidden');
        const item = document.createElement('div');
        item.className = 'feed-item';
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        item.innerHTML = `
            <div class="feed-dot ${severity}"></div>
            <span class="feed-text">${this.escapeHtml(message)}</span>
            <span class="feed-time">${time}</span>
        `;

        this.els.feedScroll.insertBefore(item, this.els.feedScroll.firstChild);
    }

    showToast(message, severity = 'MEDIUM') {
        const toast = document.createElement('div');
        toast.className = `toast severity-${severity}`;

        toast.innerHTML = `
            <div class="toast-dot"></div>
            <span class="toast-text">${this.escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close toast">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        });

        this.els.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    updateStats(flags, checks) {
        if (this.els.flagCount) this.els.flagCount.textContent = flags;
        if (this.els.statFlags) this.els.statFlags.textContent = flags;
        if (this.els.checkCount) this.els.checkCount.textContent = checks;
    }

    updateUptime(text) {
        if (this.els.healthUptime) this.els.healthUptime.textContent = text;
    }

    updateStatusIndicator(indicator, ok, text) {
        const el = this.els[indicator];
        if (!el) return;
        
        // Handle new sidebar-panel indicators (classes on indicator itself) vs old chips
        if (el.classList.contains('status-indicator')) {
          el.classList.remove('online', 'offline', 'standby');
          el.classList.add(ok ? 'online' : 'offline');
          const valEl = el.nextElementSibling ? el.nextElementSibling.querySelector('.status-val') : null;
          if (valEl) valEl.textContent = text;
        } else {
          el.classList.remove('status-online', 'status-offline');
          el.classList.add(ok ? 'status-online' : 'status-offline');
          const span = el.querySelector('span');
          if (span) span.textContent = text;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ─── Controller ──────────────────────────────────────────────
class GravityController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        this.init();
    }

    init() {
        // Global Error Catcher for Windows debugging
        window.addEventListener('error', (e) => {
            console.error('Gravity System Error:', e.error);
            this.view.showToast(`System Error: ${e.message}`, 'HIGH');
        });

        // Tab switching
        this.view.bindTabSwitch((type) => {
            this.model.currentType = type;
            this.view.updatePlaceholder(this.model.placeholders[type]);
        });

        // Analyze button
        this.view.els.btnAnalyze.addEventListener('click', () => this.handleAnalyze());

        // Double-check button
        this.view.els.btnDoubleCheck.addEventListener('click', () => this.handleDoubleCheck());

        // Decision buttons
        this.view.els.btnAccept.addEventListener('click', () => this.handleDecision('accept'));
        this.view.els.btnReject.addEventListener('click', () => this.handleDecision('reject'));
        this.view.els.btnCorrect.addEventListener('click', () => this.handleDecision('correct'));

        // Clear feed
        this.view.els.btnClearFeed.addEventListener('click', () => {
            this.view.els.feedScroll.innerHTML = `
                <div class="feed-empty" id="feedEmpty">
                    <span>No flags yet. Gravity is watching.</span>
                </div>
            `;
            this.view.els.feedEmpty = this.view.$('#feedEmpty');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleAnalyze();
            }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                this.handleDoubleCheck();
            }
        });

        // Initial Loops
        setInterval(() => this.view.updateUptime(this.model.getUptime()), 1000);
        setInterval(() => this.checkHealth(), 30000);
        this.checkHealth();
    }

    async handleAnalyze() {
        const content = this.view.els.contentInput.value.trim();
        if (!content) {
            this.view.showToast('Paste something to analyze first.', 'LOW');
            return;
        }

        this.view.showLoader(true);
        this.view.clearResults();

        try {
            const data = await this.model.analyze({
                content,
                type: this.model.currentType,
                context: this.view.els.contextInput.value.trim(),
                originalRequest: this.view.els.originalRequest.value.trim(),
            });

            this.view.displayAnalysis(data, (msg, sev) => this.registerFlag(msg, sev));
        } catch (err) {
            this.view.showToast(`Analysis failed: ${err.message}`, 'HIGH');
        } finally {
            this.view.showLoader(false);
        }
    }

    async handleDoubleCheck() {
        const content = this.view.els.contentInput.value.trim();
        if (!content) {
            this.view.showToast('Paste the proposed change to double-check.', 'LOW');
            return;
        }

        this.view.showLoader(true);
        this.view.clearResults();

        try {
            const data = await this.model.doubleCheck({
                codeChange: content,
                originalRequest: this.view.els.originalRequest.value.trim(),
                context: this.view.els.contextInput.value.trim(),
                terminalOutput: '',
            });

            this.model.checkCount++;
            this.view.updateStats(this.model.flagCount, this.model.checkCount);
            this.view.displayDoubleCheck(data, (msg, sev) => this.registerFlag(msg, sev));

            const verdictSev = data.verdict === 'GO' ? 'GO' : 'NOGO';
            this.view.addFeedItem(`Double-check: ${data.verdict} — ${data.reason}`, verdictSev);
            this.view.showToast(`${data.verdict}: ${data.reason}`, data.verdict === 'GO' ? 'GO' : 'HIGH');
        } catch (err) {
            this.view.showToast(`Double-check failed: ${err.message}`, 'HIGH');
        } finally {
            this.view.showLoader(false);
        }
    }

    async handleDecision(decision) {
        let correctionNotes = '';

        if (decision === 'correct') {
            correctionNotes = prompt('What should Gravity focus on for the correction? (Optional)');
            if (correctionNotes === null) return;

            this.view.showLoader(true);
            try {
                const data = await this.model.generateCorrection({
                    content: this.view.els.contentInput.value.trim(),
                    correctionNotes,
                    originalRequest: this.view.els.originalRequest.value.trim(),
                });

                if (data.correctedContent) {
                    this.view.els.contentInput.value = data.correctedContent;
                    this.view.showToast('Gravity has updated the content with a corrected version.', 'GO');
                    this.view.addFeedItem(`Correction generated: ${data.changesMade || 'Fixed rules violations'}`, 'GO');
                }
            } catch (err) {
                this.view.showToast(`Correction failed: ${err.message}`, 'HIGH');
            } finally {
                this.view.showLoader(false);
            }
        }

        try {
            await this.model.recordDecision({ decision, correctionNotes });
            const labels = { accept: 'Accepted', reject: 'Rejected', correct: 'Fix requested' };
            const sev = decision === 'accept' ? 'GO' : 'NOGO';
            this.view.addFeedItem(`Decision: ${labels[decision]}`, sev);
            this.view.showToast(`Decision recorded: ${labels[decision]}`, decision === 'accept' ? 'GO' : 'MEDIUM');

            if (decision !== 'correct') {
                this.view.els.verdictActions.classList.add('hidden');
            }
        } catch (err) {
            this.view.showToast(`Failed to record decision: ${err.message}`, 'HIGH');
        }
    }

    registerFlag(message, severity) {
        this.model.flagCount++;
        this.view.updateStats(this.model.flagCount, this.model.checkCount);
        this.view.addFeedItem(message, severity);
        this.view.showToast(message, severity);
    }

    async checkHealth() {
        try {
            const data = await this.model.fetchHealth();
            if (data.status === 'ok') {
                this.view.updateStatusIndicator('healthApi', true, 'Operational');
                this.view.updateStatusIndicator('healthFirebase', true, 'Connected');
                this.view.updateStatusIndicator('healthDb', true, 'Ready');
            } else {
                this.view.updateStatusIndicator('healthApi', false, 'Error');
            }
        } catch (err) {
            this.view.updateStatusIndicator('healthApi', false, 'Offline');
            this.view.updateStatusIndicator('healthFirebase', false, 'Disconnected');
            this.view.updateStatusIndicator('healthDb', false, 'Unavailable');
        }
    }
}

// ─── App Bootstrap ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const model = new GravityModel();
    const view = new GravityView();
    new GravityController(model, view);
});
