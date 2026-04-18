import chokidar from 'chokidar';
import fs from 'fs';
import { analyzeWithGemini } from './src/gemini.js';
import { loadRules } from './src/rules.js';
import { logFlag } from './src/history.js';
import { initFirebase } from './src/firebase.js';

const WATCH_DIR = process.cwd();
const IGNORE_PATHS = [/node_modules/, /\.git/, /public/];

console.log('🛡️ GRAVITY SECURITY SPECIALIST: Breach Defense Active.');

const auditSecurity = async (filePath, content) => {
    const rules = loadRules();
    
    // Security-specific system instructions
    const securityPrompt = `
    You are the GRAVITY SECURITY AGENT. 
    Your ONLY job is to find Rule #4 (Security) and Rule #14 (Directory Policy) violations.
    
    CRITICAL: 
    - Flag any API keys, secrets, or passwords.
    - Flag any code that attempts to access files outside the current project root.
    - Flag any insecure protocol usage (http where https should be).
    
    RESPONSE: 
    Return a 'fidelity_breach' or 'terminal_issue' flag if found. 
    Severity is ALWAYS CRITICAL for security breaches.
    `;

    try {
        const result = await analyzeWithGemini({
            content,
            type: 'security_audit',
            context: `Security Audit: ${filePath}`,
            rules: rules + '\n' + securityPrompt,
            history: [] // Stateless security audit
        });

        if (result.flags && result.flags.length > 0) {
            console.log(`❌ SECURITY BREACH DETECTED in ${filePath}`);
            for (const flag of result.flags) {
                await logFlag({ ...flag, type: 'security_breach', severity: 'CRITICAL' });
            }
        }
    } catch (e) {
        // Fail silently to console to avoid loop
    }
};

await initFirebase();

const watcher = chokidar.watch(WATCH_DIR, { 
    ignored: IGNORE_PATHS,
    persistent: true,
    ignoreInitial: true
});

watcher.on('change', (filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.env') || filePath.endsWith('.json')) {
        const content = fs.readFileSync(filePath, 'utf8').substring(0, 2000);
        auditSecurity(filePath, content);
    }
});
