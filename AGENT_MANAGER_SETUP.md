# Gravity — Agent Manager Setup

This project uses **Antigravity Agent Manager** to run two agents side-by-side:

## Agent 1: Main Worker Agent
- **Name**: `Worker`
- **Role**: Executes the user's coding tasks
- **Instructions**: Follow user requests. Write code, run commands, debug, iterate.
- **Workspace**: Same workspace as Gravity

## Agent 2: Gravity (Monitor Agent)  
- **Name**: `Gravity`
- **Role**: Monitors the Worker agent for drift, stalls, scope creep, and terminal issues
- **Instructions**: See `GRAVITY_AGENT_INSTRUCTIONS.md`
- **Key Behaviors**:
  - Watch Worker's artifacts and terminal output
  - Post flags when rules are violated
  - Trigger double-check before accepting significant changes
  - Log everything to Firebase for iterative improvement

## How to Set Up in Agent Manager

1. Open the Antigravity **Agent Manager**
2. Create Agent 1 — paste contents from `WORKER_AGENT_INSTRUCTIONS.md`  
3. Create Agent 2 — paste contents from `GRAVITY_AGENT_INSTRUCTIONS.md`
4. Start both agents
5. Give your task to the Worker agent
6. Gravity will monitor and post flags
