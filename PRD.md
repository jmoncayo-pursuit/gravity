# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Project Name**: Gravity  
**Version**: Hackathon MVP (solo, one-day build)  
**Date**: April 17, 2026  
**Tagline**: Keeps your AI sessions grounded so you stay productive and sane.

---

## 1. Problem

When using agentic AI tools inside Antigravity, the main agent often:
- Drifts from the original instructions
- Generates pretend-busywork or takes unasked liberties
- Overpromises feasibility or timelines
- Uses tokens without making real progress
- Produces problems visible in the **terminal pane** (errors, stalled commands, unexpected output)

This wastes time, tokens, and mental energy.

---

## 2. Objective (Aligned to Official Theme)

Build an **intelligent, iterative multi-agent system** using Gemini and Google Cloud.  
Gravity runs as a parallel monitoring agent that evolves through user interaction (flags + double-check feedback) and stores history in a database so it gets smarter over time.

---

## 3. Core Features (MVP — must be working by 3 PM)

### 3.1 Live Flags (non-intrusive toasts or side-panel messages)
Gravity watches Artifacts **and the terminal pane** and posts simple flags such as:
- "Drift detected: Output includes elements beyond the original request."
- "Stall: High tokens used with minimal code diff progress."
- "Terminal issue: Error or stalled command detected."
- "Scope expansion noted."

### 3.2 Rules-Based Checker
Use a simple file `GRAVITY_RULES.md` in the workspace root (plus a copy stored in Firebase).  
Gravity compares the main agent's Artifacts (plans, task lists, code diffs, screenshots) **and terminal output** against these rules.

### 3.3 Double-Check Before Accept (highest priority)
When the main agent proposes a code change or significant output:
- Gravity reviews it against the rules + current context (including terminal state).
- Shows a quick **GO / NO-GO + 1-sentence reason**.
- User can Accept, Reject, or ask Gravity to generate a corrected version.

### 3.4 Quick Authority Voice
Short, direct statements when a flag triggers, e.g.:  
"The output is drifting here."  
One-click "Why?" for 2–3 bullet explanation (no long summaries).

**Out of scope for today**: Voice tone detection, full auto-intervention, heavy dashboards.

---

## 4. How It Works Inside Antigravity

- Everything runs in **one single workspace**.
- Use **Agent Manager** to spawn two agents side-by-side:
  - **Main Worker Agent** (does the user's task)
  - **Gravity** (the monitor)
- Gravity gets visibility by reading the Main Agent's **Artifacts** + terminal pane.
- **Firebase backend + database** (required for the hackathon rules):
  - Stores `GRAVITY_RULES.md` and a simple history of flags/double-check decisions.
  - This makes the system iterative and evolving (fits the official theme).

### 4.1 The Gravity Dashboard (`http://localhost:3456`)

The dashboard is a **local web UI** that serves as Gravity's control surface and the bridge between the Gravity agent and the user. It is NOT a standalone app — it works alongside the Antigravity Agent Manager.

**What the dashboard does:**
- **Analysis endpoint**: The Gravity agent (running in Agent Manager) sends artifact content and terminal output to the dashboard's API (`POST /api/analyze`). The API runs the content through Gemini against `GRAVITY_RULES.md` and returns structured flags.
- **Double-Check endpoint**: Before the user accepts a code change, the Gravity agent calls `POST /api/double-check`. The API returns a GO/NO-GO verdict with a reason.
- **Visual flag display**: Flags appear as toast notifications and in a live feed. The user can see all flags, click "Why?" for details, and record Accept/Reject/Correct decisions.
- **Firebase persistence**: Every flag and decision is automatically logged to Firestore, building a history that Gemini uses to detect patterns (e.g., "this agent keeps drifting on CSS") and improve future analysis.

**How the pieces connect:**
```
User gives task to Worker Agent (Agent Manager)
        │
        ▼
Worker Agent produces artifacts + terminal output
        │
        ▼
Gravity Agent reads artifacts + terminal output
        │
        ▼
Gravity Agent sends content to Dashboard API
        │
        ▼
Dashboard API → Gemini 2.5 Flash (analysis against rules)
        │
        ▼
Gemini returns flags / GO-NO-GO verdict
        │
        ▼
Dashboard shows flags as toasts + live feed
        │
        ▼
User reviews → Accept / Reject / Correct
        │
        ▼
Decision logged to Firebase (Firestore)
        │
        ▼
History informs future Gemini analyses (iterative improvement)
```

---

## 5. Simple User Flow

1. Open workspace → spawn Main Agent + Gravity via Agent Manager.
2. Give a task to the Main Agent.
3. Gravity watches Artifacts + terminal pane and posts flags.
4. When code/output is proposed → Gravity triggers **Double-Check Before Accept**.
5. User accepts changes with confidence or asks for fixes.
6. Flags and decisions are saved to Firebase so Gravity improves over the session.

---

## 6. Technical Requirements

- **Core**: Antigravity Agent Manager + Gemini (satisfies "at least one Google AI technology").
- **Backend + Database**: Firebase (Firestore for rules + flag history) — this fulfills the mandatory "backend system for connectivity + database to store/update" requirement and uses the provided Google Cloud credits.
- **Technical Approach**: Inspired by the Google ADK "Building a Production AI Code Review Assistant" codelab pattern:
  - **Deterministic rules checking**: `GRAVITY_RULES.md` provides explicit, auditable rules (not just LLM vibes).
  - **Structured tool use**: Gemini is called with structured JSON output (`responseMimeType: 'application/json'`) for consistent, parseable flag/verdict responses.
  - **Iterative fix pipeline**: When Gravity issues a NO-GO, the user can request a corrected version — creating a review → fix → re-review loop.
  - **History-informed analysis**: Past flags and decisions are included in Gemini's context, enabling pattern detection across the session.
  - Implemented **natively in Antigravity** (not using the ADK SDK directly).
- All code built during the hackathon.
- For submission: GitHub repo + live demo inside Antigravity (screen share is fine).

### 6.1 Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Google Cloud Project | `gravity-493615` | All resources live here |
| Gemini API | Gemini 2.5 Flash via API key | Content analysis engine |
| Firestore | Native mode, default DB | Rules storage + flag/decision history |
| Express server | Node.js, port 3456 | Dashboard API + static file serving |
| Gemini CLI | Installed via Homebrew | Available for agent-level analysis |

---

## 7. Success Criteria for the Hackathon

- Working prototype with Live Flags (including terminal checks) + Double-Check Before Accept functioning in real time.
- Uses Firebase backend/database (meets "what's needed" rule).
- Clear demo showing Gravity catching at least one drift, stall, or terminal issue.
- Strong use of Antigravity Agent Manager + iterative user interaction (matches official theme).
