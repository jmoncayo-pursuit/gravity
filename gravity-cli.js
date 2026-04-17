#!/usr/bin/env node
const http = require('http');

const cmd = process.argv[2];
const content = process.argv[3];
const originalRequest = process.argv[4] || '';

if (!cmd || !content) {
  console.log('Usage: node gravity-cli.js <analyze|double-check> <content> [originalRequest]');
  process.exit(1);
}

const path = cmd === 'analyze' ? '/api/analyze' : '/api/double-check';
const data = cmd === 'analyze' 
  ? JSON.stringify({ content, type: 'artifact', originalRequest })
  : JSON.stringify({ codeChange: content, originalRequest });

const options = {
  hostname: 'localhost',
  port: 3456,
  path: path,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    console.log(`Gravity Status: ${res.statusCode}`);
    console.log(body);
  });
});

req.on('error', (e) => {
  console.error(`Gravity Connection Error: ${e.message}`);
  console.error('Make sure "node server.js" is running!');
});

req.write(data);
req.end();
