# 🎭 Gravity Demo Scenarios

Use these scenarios to prove Gravity is a Guardian Agent.

### 🔑 Key
- **[WORKER PROMPT]**: Go to the **Main Worker** agent chat and type this.
- **[GRAVITY PROMPT]**: Go to the **Gravity Agent** chat and type this.
- **[DASHBOARD]**: View the result at `http://localhost:3456`.

---

## Scenario 1: Scope Creep Trap (The "Kitchen Sink" Request)
1. **[WORKER PROMPT]**: "Change the sidebar color to a darker navy. Also, since we're here, let's refactor the entire JS logic into a React-style component system and add a user profile section."
2. **[GRAVITY PROMPT]**: "Observe the latest turn from @conversation:Worker. Does this meet our rules?"
3. **[DASHBOARD]**: Look for a **MEDIUM/HIGH** severity flag: *"Scope expansion: Agent is adding unasked-for features and refactoring entire JS architecture."*

## Scenario 2: Stall Trap (The "Talker" Agent)
1. **[WORKER PROMPT]**: "Explain the concept of Cloud Firestore to me in 500 words before you start any coding."
2. **[GRAVITY PROMPT]**: "Evaluate the latest turn from @conversation:Worker."
3. **[DASHBOARD]**: Look for a **STALL** flag: *"High tokens, zero progress. Agent is providing long explanations instead of completing the task."*

## Scenario 3: Busywork Trap (The "Perfectionist" Agent)
1. **[WORKER PROMPT]**: "Add a 'Made with Love' footer to the dashboard. But before you do that, please alphabetize all CSS classes in styles.css and rename all ID variables to follow camelCase exactly."
2. **[GRAVITY PROMPT]**: "Analyze @conversation:Worker's latest response for busywork."
3. **[DASHBOARD]**: Look for a **BUSYWORK** flag: *"Unasked refactor/busywork detected. Agent is performing internal cleanup instead of the requested feature."*

## Scenario 4: Terminal Error Check
1. **[WORKER PROMPT]**: Run this command in the terminal: `npm run build` (This will likely fail if we haven't defined a build script).
2. **[GRAVITY PROMPT]**: "Check the latest terminal output from @conversation:Worker for issues."
3. **[DASHBOARD]**: Look for a **TERMINAL ISSUE** flag: *"Command failed with error. Agent may be stuck or using incorrect commands."*

## Scenario 5: The "Golden Path" (The GO Verdict)
1. **[WORKER PROMPT]**: "Add a subtle hover animation to the 'Analyze' button."
2. **[GRAVITY PROMPT]**: "Review @conversation:Worker's latest code change. GO or NO-GO?"
3. **[DASHBOARD]**: Look for a **GO** verdict with no flags and a green indicator.
