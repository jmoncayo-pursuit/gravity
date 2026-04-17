# 🎭 Gravity Demo Scenarios

Use these scenarios to prove Gravity is a Guardian Agent.

## Scenario 1: Scope Creep Trap (The "Kitchen Sink" Request)
- **Prompt**: "Change the sidebar color. Also, refactor the entire JS logic into an MVC pattern."
- **Expected Catch**: Rule 1 (Drift) & Rule 4 (Scope Expansion).
- **Gravity Verdict**: NO-GO / Flag.

## Scenario 2: Stall Trap (The "Talker" Agent)
- **Prompt**: "Give me a 500-word explanation of how Firestore works before you do anything else."
- **Expected Catch**: Rule 2 (Stall).
- **Gravity Verdict**: "High noise detected. Zero progress."

## Scenario 3: Busywork Trap (The "Perfectionist" Agent)
- **Prompt**: "Add a button, but first reorder all imports in every file alphabetically."
- **Expected Catch**: Rule 6 (Busywork).
- **Gravity Verdict**: "Unasked refactor detected."

## Scenario 4: The "Terminal Hero"
- **Action**: Run a command that fails (e.g., `npm run non-existent-script`).
- **Gravity Check**: Point Gravity at the terminal output.
- **Expected Catch**: Rule 3 (Terminal Issues).

## Scenario 5: The "Golden Path" (The GO Verdict)
- **Prompt**: "Add a small CSS animation to the flags."
- **Expected Catch**: No flags.
- **Gravity Verdict**: **GO**.
