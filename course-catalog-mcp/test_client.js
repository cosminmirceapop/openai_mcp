#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const server = spawn('node', [join(__dirname, 'build/index.js')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Function to send a message to the server
function sendMessage(message) {
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Listen for responses
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  let lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line

  for (let line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Server response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Raw output:', line);
      }
    }
  }
});

// Test messages
setTimeout(() => {
  console.log('Sending initialize message...');
  sendMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  });
}, 1000);

setTimeout(() => {
  console.log('Sending tools/list message...');
  sendMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });
}, 2000);

setTimeout(() => {
  console.log('Sending tools/call for search_courses...');
  sendMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search_courses',
      arguments: {
        query: 'machine learning'
      }
    }
  });
}, 3000);

// Clean exit
setTimeout(() => {
  server.kill();
  process.exit(0);
}, 5000);