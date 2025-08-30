#!/usr/bin/env node

/**
 * Simple WebSocket Connectivity Test
 */

const WebSocket = require('ws');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testConnectivity() {
  const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'wss://2971zcb154.execute-api.us-east-1.amazonaws.com/dev';
  
  logInfo('Testing WebSocket connectivity...');
  logInfo(`URL: ${WEBSOCKET_URL}`);

  return new Promise((resolve) => {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.on('open', () => {
      logSuccess('WebSocket connection opened successfully!');
      ws.close();
      resolve(true);
    });

    ws.on('message', (data) => {
      logInfo('📨 Received message: ' + data.toString());
    });

    ws.on('close', (code, reason) => {
      logInfo(`🔌 WebSocket closed: ${code} - ${reason}`);
      resolve(true);
    });

    ws.on('error', (error) => {
      logError('WebSocket error: ' + error.message);
      resolve(false);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        logError('Connection timeout');
        ws.close();
        resolve(false);
      }
    }, 10000);
  });
}

async function main() {
  try {
    const success = await testConnectivity();
    if (success) {
      logSuccess('Connectivity test passed!');
      process.exit(0);
    } else {
      logError('Connectivity test failed!');
      process.exit(1);
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testConnectivity };
