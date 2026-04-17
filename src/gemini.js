import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Build the system prompt for Gravity based on rules and analysis type.
 */
function buildSystemPrompt(rules, type) {
  const base = `You are GRAVITY — an AI monitor agent. Your job is to watch another AI agent's output and flag problems.

Your personality: Short. Direct. No fluff. You speak with authority like a flight controller.

RULES TO ENFORCE:
${rules}

RESPONSE FORMAT (strict JSON only, no markdown fences):
`;

  if (type === 'double_check') {
    return base + `{
  "verdict": "GO" or "NO-GO",
  "reason": "One sentence explaining the verdict",
  "flags": [
    {
      "type": "drift|stall|terminal_issue|scope_expansion|overpromise|busywork",
      "message": "Short, direct flag message",
      "severity": "HIGH|MEDIUM|LOW",
      "why": ["bullet 1", "bullet 2", "bullet 3"]
    }
  ],
  "suggestion": "Optional: one-sentence corrective action if NO-GO"
}`;
  }

  if (type === 'correct') {
    return base + `{
  "correctedContent": "The full corrected version of the code or artifact",
  "changesMade": "One sentence summary of what was fixed",
  "flags": [] 
}`;
  }

  return base + `{
  "flags": [
    {
      "type": "drift|stall|terminal_issue|scope_expansion|overpromise|busywork",
      "message": "Short, direct flag message",
      "severity": "HIGH|MEDIUM|LOW",
      "why": ["bullet 1", "bullet 2", "bullet 3"]
    }
  ],
  "summary": "One sentence overall assessment"
}

If no issues found, return: { "flags": [], "summary": "Clean. No issues detected." }`;
}

/**
 * Build the user prompt based on the analysis request.
 */
function buildUserPrompt({ content, type, context, originalRequest, terminalOutput }) {
  let prompt = '';

  if (originalRequest) {
    prompt += `ORIGINAL USER REQUEST:\n${originalRequest}\n\n`;
  }

  if (context) {
    prompt += `CURRENT CONTEXT:\n${context}\n\n`;
  }

  switch (type) {
    case 'double_check':
      prompt += `PROPOSED CODE CHANGE TO REVIEW:\n${content}\n`;
      if (terminalOutput) {
        prompt += `\nTERMINAL OUTPUT:\n${terminalOutput}\n`;
      }
      prompt += `\nReview this against the rules. Give GO or NO-GO with reason.`;
      break;

    case 'terminal':
      prompt += `TERMINAL OUTPUT TO ANALYZE:\n${content}\n`;
      prompt += `\nCheck for errors, stalls, or unexpected behavior.`;
      break;

    case 'correct':
      prompt += `ORIGINAL CONTENT:\n${content}\n`;
      if (context) {
        prompt += `\nSPECIFIC FEEDBACK/CORRECTION NOTES:\n${context}\n`;
      }
      prompt += `\nPlease generate a corrected version of the ORIGINAL CONTENT that adheres to the rules and addresses the feedback.`;
      break;

    case 'artifact':
    default:
      prompt += `ARTIFACT CONTENT TO ANALYZE:\n${content}\n`;
      prompt += `\nCheck for drift, scope expansion, stalls, overpromises, or busywork.`;
      break;
  }

  return prompt;
}

/**
 * Call Gemini API to analyze content against Gravity rules.
 */
async function analyzeWithGemini({ content, type, context, originalRequest, terminalOutput, rules, history }) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
    // Return a mock response when no API key is configured
    return {
      flags: [],
      summary: 'Gemini API key not configured. Running in demo mode.',
      verdict: type === 'double_check' ? 'GO' : undefined,
      reason: type === 'double_check' ? 'Demo mode — no real analysis performed.' : undefined,
    };
  }

  const systemPrompt = buildSystemPrompt(rules, type);
  const userPrompt = buildUserPrompt({ content, type, context, originalRequest, terminalOutput });

  // Add history context if available
  let historyContext = '';
  if (history && history.length > 0) {
    historyContext = '\n\nRECENT FLAG HISTORY (for pattern detection):\n' +
      history.slice(0, 5).map(h =>
        `- [${h.type}] ${h.message || h.verdict || ''} (${h.timestamp || ''})`
      ).join('\n');
  }

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt + historyContext + '\n\n' + userPrompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    }
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    let cleaned = text.trim();

    // Extract JSON using a more robust method
    try {
      // Find the first occurrence of { or [ and the last occurrence of } or ]
      const firstCurly = cleaned.indexOf('{');
      const firstSquare = cleaned.indexOf('[');
      const lastCurly = cleaned.lastIndexOf('}');
      const lastSquare = cleaned.lastIndexOf(']');

      let start = -1;
      let end = -1;

      if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        start = firstCurly;
        end = lastCurly;
      } else if (firstSquare !== -1) {
        start = firstSquare;
        end = lastSquare;
      }

      if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.substring(start, end + 1);
      }

      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch (parseErr) {
      console.error('Cleaned text for parsing:', cleaned);
      console.error('Raw Gemini response:', text);
      throw new Error(`JSON parse failed: ${parseErr.message}`);
    }
  } catch (err) {
    console.error('Gemini analysis error:', err.message);
    return {
      flags: [{
        type: 'terminal_issue',
        message: `Gravity analysis error: ${err.message}`,
        severity: 'LOW',
        why: ['Gemini API call failed', 'Check API key and connectivity', 'System will retry on next analysis']
      }],
      summary: 'Analysis encountered an error.',
      verdict: type === 'double_check' ? 'GO' : undefined,
      reason: type === 'double_check' ? 'Could not complete analysis — defaulting to GO with caution.' : undefined,
    };
  }
}

export { analyzeWithGemini };
