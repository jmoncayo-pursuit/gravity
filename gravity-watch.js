import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';

const WATCH_DIR = process.cwd();
const API_URL = 'http://localhost:3456/api/analyze';
const IGNORE_PATHS = [/node_modules/, /\.git/, /public/];

console.log('📡 GRAVITY AUDITOR 3.0: Deep Surveillance & Claims Verification Active.');

/**
 * Get context from terminal and filesystem to verify claims.
 */
const getGroundingContext = () => {
    let terminal = "";
    try {
        terminal = execSync('tail -n 10 ~/.zsh_history | cut -d";" -f2-').toString();
    } catch (e) { terminal = "Terminal unavailable."; }

    const claims = fs.existsSync('AGENT_CLAIMS.md') ? fs.readFileSync('AGENT_CLAIMS.md', 'utf-8') : 'No claims ledger.';
    const status = execSync('git status --short', { encoding: 'utf-8' });
    
    return `
TERMINAL RECENT:
${terminal}

WORKER CLAIMS:
${claims}

GIT STATUS:
${status}
    `.trim();
};

const analyzeChange = async (filePath) => {
    const filename = path.basename(filePath);
    console.log(`🔍 Auditing activity in: ${filename}...`);
    
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').substring(0, 2000) : 'File deleted.';
    const context = getGroundingContext();

    const payload = JSON.stringify({
        content: content,
        type: 'autonomous_audit',
        context: context,
        originalRequest: 'Verify Worker Claims vs Filesystem Reality (Rule #12).'
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = http.request(API_URL, options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            try {
                const data = JSON.parse(responseData);
                if (data.flags && data.flags.length > 0) {
                    console.log(`⚠️  FLAGS RAISED: ${data.flags.length} for ${filename}`);
                } else {
                    console.log(`✅ ${filename} Grounded.`);
                }
            } catch (e) {
                console.log('❌ Audit relay failure.');
            }
        });
    });

    req.on('error', (e) => console.error('Auditor Connection Error:', e.message));
    req.write(payload);
    req.end();
};

// Debounce to prevent flooding
let timeout;
const watcher = chokidar.watch(WATCH_DIR, { 
    ignored: IGNORE_PATHS,
    persistent: true,
    ignoreInitial: true
});

watcher.on('change', (filePath) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => analyzeChange(filePath), 15000); 
});

watcher.on('add', (filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.md')) {
        analyzeChange(filePath);
    }
});
