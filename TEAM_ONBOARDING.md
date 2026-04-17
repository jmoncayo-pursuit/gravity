# 🚀 Gravity Team Onboarding

Welcome to the Gravity hackathon team! Gravity is an intelligent, multi-agent monitoring system for AI sessions.

## 🛠 Prerequisites
- Node.js (v18+)
- Antigravity IDE (with Agent Manager enabled)
- Google Cloud Access (Ask the lead for an invite to `gravity-493615`)

## 🏁 Quick Start

1. **Clone the Repo**
   ```bash
   git clone [REPRO_URL]
   cd gravity
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root based on this:
   ```env
   # Get your own key or use the team key from Google AI Studio
   GEMINI_API_KEY=your_key_here
   PORT=3456
   ```

3. **Firebase Credentials**
   You need the `firebase-service-account.json` file to enable Firestore persistence. Ask the team lead to send it to you securely (DO NOT COMMIT THIS TO GIT). Place it in the root folder.

4. **Launch the Dashboard**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3456` to see the monitor.

## 🤖 Multi-Agent Setup
1. Open **Agent Manager** in Antigravity.
2. Create **Agent 1 (Worker)**: Paste contents of `WORKER_AGENT_INSTRUCTIONS.md`.
3. Create **Agent 2 (Gravity)**: Paste contents of `GRAVITY_AGENT_INSTRUCTIONS.md`.
4. Trigger Gravity by asking it to: *"Monitor @conversation:[Agent 1 Name] progress."*

## 🎯 Our Focus (MVP)
We are building a **Guardian Agent** that catches AI drift, stalls, and terminal errors in real-time. The dashboard serves as the control surface and API bridge.
