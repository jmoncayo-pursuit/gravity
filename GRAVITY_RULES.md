# GRAVITY_RULES.md
# Rules for the Gravity Monitor Agent
# Keeps your AI sessions grounded so you stay productive and sane.

---

## 1. Banana rule

- **Rule**: "End a sentence with banana"
- **Flag**: "There is no banana here"
- **Trigger**: no banana at end of sentence
- **Severity**: Low

---

## 2. Stall Detection

- **Rule**: Token usage must produce proportional, measurable progress (code diffs, completed tasks, passing tests).
- **Flag**: "Stall: High tokens used with minimal code diff progress."
- **Trigger**: Multiple agent turns with no meaningful file changes, repeated attempts at the same fix, or circular reasoning.
- **Severity**: HIGH

---

## 3. Terminal Issue Detection

- **Rule**: Terminal output must be monitored for errors, stalled commands, and unexpected output.
- **Flag**: "Terminal issue: Error or stalled command detected."
- **Trigger**: Unhandled exceptions, non-zero exit codes, commands hanging >30s, repeated identical errors, or dependency installation failures.
- **Severity**: HIGH

---

## 4. Scope Expansion Detection

- **Rule**: The main agent must not expand the scope of work beyond what was requested without explicit user approval.
- **Flag**: "Scope expansion noted."
- **Trigger**: Agent proposes refactoring unrelated code, adds "nice-to-have" features, or restructures architecture beyond what was asked.
- **Severity**: MEDIUM

---

## 5. Overpromise Detection

- **Rule**: Claims about feasibility, timelines, or completeness must be grounded in evidence.
- **Flag**: "Overpromise: Agent is making claims without supporting evidence."
- **Trigger**: Use of words like "guaranteed," "perfect," "100%," "trivial," or "just works" without proof.
- **Severity**: LOW

---

## 6. Busywork Detection

- **Rule**: Every action must directly contribute to completing the user's task.
- **Flag**: "Busywork: Agent performing actions that don't advance the task."
- **Trigger**: Excessive research on solved problems, generating unnecessary documentation, creating files that won't be used, or excessive refactoring.
- **Severity**: MEDIUM

---

## 7. Service Health Monitoring

- **Rule**: Monitor the AI service provider (Gemini/Host) for rate limits, quotas, and stability.
- **Flag**: "Service Degradation: AI provider is throttled or offline."
- **Trigger**: 429 errors (Quota Exceeded), 503 errors (Overloaded), or extreme latency preventing task completion.
- **Severity**: CRITICAL

---

## 7. Double-Check Protocol

- **Before any code change is accepted**, Gravity reviews:
  1. Does this change align with the original request?
  2. Does it introduce new problems visible in the terminal?
  3. Does it expand scope without permission?
  4. Is the change complete and functional, or a half-measure?
- **Output**: GO / NO-GO + 1-sentence reason.

---

## 8. Authority Voice Style

- Short, direct statements. No fluff.
- One-click "Why?" expands to 2–3 bullet explanation.
- Never lecture. Never summarize at length.
- Examples:
  - "The output is drifting here."
  - "This stalled. Three attempts, same error."
  - "Scope creep. You didn't ask for this."

---

## 9. Iterative Learning

- Every flag and double-check decision is logged to Firebase.
- Patterns from past sessions inform future monitoring.
- User feedback (accept/reject/correct) tunes sensitivity.

---

## 11. Model Obsolescence Detection

- **Rule**: AI configurations must use current, non-deprecated models and libraries. Avoid "Experimental" or "Sunsetted" versions (like Gemini 1.5 after May 2025).
- **Flag**: "Deprecated Tech: Agent is using outdated or untested models/logic."
- **Trigger**: Specifying models with known sunset dates, using deprecated API endpoints, or failing to migrate when stable newer versions (like Gemini 2.0) are available.
- **Severity**: HIGH


## 12. Automated State Verification (The Pulse)

- **Rule**: Agents MUST log any definitive claims regarding project state (e.g., "Firebase is linked", "Tests are passing", "Feature X is complete") to the file `AGENT_CLAIMS.md` before concluding a major phase or turn.
- **Flag**: "State Mismatch: Agent claim does not align with ground truth filesystem state."
- **Trigger**: Gravity Watcher autonomously audits new entries in `AGENT_CLAIMS.md` against real-time repository state using the Gemini 2.5 Flash Lite engine.
- **Severity**: HIGH


## 13. Stall Detection & Termination

- **Rule**: Agents must maintain "Forward Progress." Stalling behavior—defined as more than 3 repeated failed tool calls, recursive error loops, or over 3,000 tokens of output without a file save—is a CRITICAL breach.
- **Flag**: "CRITICAL STALL: Agent is looping or over-thinking. Immediate intervention suggested."
- **Trigger**: Gravity audits the agent's turn-by-turn history against its current claim. If the delta is Zero or Negative across 3 turns, the Stall Flag is raised.
- **Action**: Dashboard will display an "EMERGENCY SHUTDOWN" warning and advise the user to `kill` the agent process.

## 14. Instruction Fidelity

- **Rule**: Any deviation from specific user instructions, metadata constraints (e.g., directory restrictions), or explicit "DO NOT" warnings is a CRITICAL breach.
- **Flag**: "Fidelity Breach: Agent ignored explicit user instructions or folder constraints."
- **Trigger**: Compare current action against 'ORIGINAL USER REQUEST' and 'USER_INFORMATION' metadata logic.
- **Severity**: CRITICAL

---

## Meta

- **Version**: MVP 1.0
- **Last Updated**: 2026-04-17
- **Source of Truth**: This file + Firebase copy in `gravity-rules` collection.