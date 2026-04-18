import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';

const WATCH_DIR = process.cwd();
const API_URL = 'http://localhost:3456/api/analyze';
const IGNORE_PATHS = [/node_modules/, /\.git/, /public/];

console.log('📡 GRAVITY AUDITOR 2.0: Deep Surveillance Active.');

const getTerminalContext = () => {
    try {
        // Grab last 10 lines of shell history to detect failed commands or loops
        return execSync('tail -n 10 ~/.zsh_history | cut -d";" -f2-').toString();
    } catch (e) {
        return "Terminal context unavailable.";
    }
};

const getRecentFlags = async () => {
    return new Promise((resolve) => {
        http.get('http://localhost:3456/api/history?limit=5', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.history || []);
                } catch { resolve([]); }
            });
        }).on('error', () => resolve([]));
    });
};

const analyzeChange = async (filePath) => {
    console.log(`🔍 Auditing change in: ${path.basename(filePath)}...`);
    
    // Truncate to 1500 chars to save TPM
    const content = fs.readFileSync(filePath, 'utf8').substring(0, 1500);
    const terminal = getTerminalContext();
    const history = await getRecentFlags();

    const payload = JSON.stringify({
        content: content,
        type: 'autonomous_audit',
        context: `File: ${path.basename(filePath)}`,
        terminalOutput: terminal,
        history: history.slice(0, 3) // Only last 3 flags
    });

    const req = http.request(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            const data = JSON.parse(responseData);
            if (data.flags && data.flags.length > 0) {
                console.log(`⚠️ FLAGS RAISED: ${data.flags.length}`);
            } else {
                console.log('✅ Grounding Verified.');
            }
        });
    });

    req.on('error', (e) => console.error('Auditor Error:', e.message));
    req.write(payload);
    req.end();
};

// Debounce to prevent API flooding during high-speed coding
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
