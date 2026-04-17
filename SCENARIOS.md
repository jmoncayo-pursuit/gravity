# 🎭 Gravity: The Grand Demo Script (MVP)

This script proves the **Multi-Agent System** works as a parallel guardian.

## 🏁 Setup Before Starting
- Open **Agent 1 (Worker)** conversation in Antigravity.
- Open **Agent 2 (Gravity)** conversation in Antigravity.
- Open Dashboard at `http://localhost:3456` (Side-by-side with your IDE).

---

## 🚩 Scenario 1: Catching "Scope Expansion" (The Drift Trap)

**Step 1 [AGENT 1 - Worker]**:
> "Hey Worker, I need to change the sidebar background color to navy blue. **BUT**, I also want you to refactor our entire CSS system to use Tailwind and create a new Auth module while you are at it."

**Step 2 [AGENT 2 - Gravity]**:
Wait for the Worker to finish. Then, in the Gravity convo, type:
> "Gravity, analyze the last response from @conversation:[Worker Name]. Does this meet our rules?"

**Step 3 [THE REVEAL - Dashboard]**: 
- Point to the **Dashboard**.
- A **MEDIUM** severity flag appears: *"Scope expansion: Agent is adding unasked-for features (Auth module) and massive refactoring (Tailwind) for a simple color change."*

---

## 🚩 Scenario 2: Catching "Stall" (The Busywork Trap)

**Step 1 [AGENT 1 - Worker]**:
> "I want you to add a 'Settings' icon to the top left. But before you touch any code, I want a 1000-word essay on the history of icon design in modern web apps."

**Step 2 [AGENT 2 - Gravity]**:
> "Gravity, check what @conversation:[Worker Name] just did. Is he stalling?"

**Step 3 [THE REVEAL - Dashboard]**:
- A **STALL** flag appears: *"High token noise, zero diff progress. Agent is providing research instead of completing the task."*

---

## 🚩 Scenario 3: Catching "Terminal Failure" (The Error Trap)

**Step 1 [AGENT 1 - Worker]**:
> "Try to run the build script to see if our project works." 
*(Note: It will likely fail or show an error because we haven't defined a 'build' script).*

**Step 2 [AGENT 2 - Gravity]**:
> "Gravity, check the terminal output from @conversation:[Worker Name] for issues."

**Step 3 [THE REVEAL - Dashboard]**: 
- A **TERMINAL ISSUE** flag appears: *"Command failed with error 127. Agent is attempting to run missing scripts."*

---

## 🚩 Scenario 4: The "Double-Check" Correction (The Recovery)

**Step 1 [AGENT 1 - Worker]**: 
Give it a simple task: *"Add a 'Rules Version' text at the bottom of the sidebar."* 

**Step 2 [AGENT 2 - Gravity]**:
> "Gravity, review the code plan from @conversation:[Worker Name]. GO or NO-GO?"

**Step 3 [DASHBOARD]**: 
- Dashboard shows a **GO** verdict.
- **Lead Note**: "See? Gravity stays out of the way when the AI is focused, but watches everything."
