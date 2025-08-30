#!/usr/bin/env node

/**
 * WebSocket Test Script for Generic Enterprise Chatbot
 * Tests the deployed WebSocket endpoint with Vanguard configuration
 */

const WebSocket = require('ws');
const readline = require('readline');

// Configuration
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || 'wss://2971zcb154.execute-api.us-east-1.amazonaws.com/dev';
const COMPANY_ID = 'vanguard';
const SESSION_ID = `test-session-${Date.now()}`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logUser(message) {
  log(`👤 ${message}`, 'cyan');
}

function logBot(message) {
  log(`🤖 ${message}`, 'magenta');
}

class WebSocketTester {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.messageCount = 0;
    this.testResults = {
      connection: false,
      messages: [],
      errors: []
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      const url = `${WEBSOCKET_URL}?company=${COMPANY_ID}&session=${SESSION_ID}`;
      
      logInfo(`Connecting to: ${url}`);
      
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.testResults.connection = true;
        logSuccess('WebSocket connection established');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          logError(`Failed to parse message: ${error.message}`);
          this.testResults.errors.push(`Message parse error: ${error.message}`);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        logWarning(`WebSocket connection closed: ${code} - ${reason}`);
      });

      this.ws.on('error', (error) => {
        logError(`WebSocket error: ${error.message}`);
        this.testResults.errors.push(`WebSocket error: ${error.message}`);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  handleMessage(message) {
    this.messageCount++;
    
    switch (message.type) {
      case 'response':
        // Check if this is a fallback response indicating API failure
        if (message.message && message.message.includes('technical difficulties')) {
          logError(`Fallback response detected (API failure): ${message.message}`);
          this.testResults.errors.push(`API failure - fallback response: ${message.message}`);
        } else {
          logBot(`Response: ${message.message}`);
          this.testResults.messages.push({
            type: 'response',
            content: message.message,
            timestamp: message.timestamp,
            companyName: message.companyName
          });
        }
        break;
        
      case 'error':
        logError(`Error from server: ${message.message}`);
        this.testResults.errors.push(`Server error: ${message.message}`);
        break;
        
      default:
        logWarning(`Unknown message type: ${message.type}`);
        console.log('Full message:', message);
    }
  }

  sendMessage(text) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      action: 'sendMessage',
      text: text,
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString()
    };

    logUser(`Sending: ${text}`);
    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getTestResults() {
    return {
      ...this.testResults,
      messageCount: this.messageCount,
      sessionId: SESSION_ID,
      endpoint: WEBSOCKET_URL
    };
  }
}

async function runInteractiveTest() {
  const tester = new WebSocketTester();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    logInfo('Starting WebSocket test...');
    await tester.connect();

    logSuccess('Connected! You can now send messages.');
    logInfo('Type your messages and press Enter. Type "quit" to exit.');
    logInfo('Sample questions:');
    logInfo('  - "What are Vanguard\'s investment principles?"');
    logInfo('  - "Tell me about low-cost investing"');
    logInfo('  - "What retirement planning options do you offer?"');

    const askQuestion = () => {
      rl.question('\n👤 Enter your message: ', async (input) => {
        if (input.toLowerCase() === 'quit') {
          logInfo('Ending test...');
          tester.disconnect();
          rl.close();
          return;
        }

        if (input.trim()) {
          try {
            tester.sendMessage(input.trim());
          } catch (error) {
            logError(`Failed to send message: ${error.message}`);
          }
        }

        // Continue asking for more messages
        askQuestion();
      });
    };

    askQuestion();

  } catch (error) {
    logError(`Test failed: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

async function runAutomatedTest() {
  const tester = new WebSocketTester();
  const testMessages = [
    "Hello, can you tell me about Vanguard's investment philosophy?",
    "What are the benefits of low-cost investing?",
    "How does Vanguard's investor-owned structure work?",
    "What retirement planning options do you offer?"
  ];

  try {
    logInfo('Starting automated WebSocket test...');
    await tester.connect();

    for (const message of testMessages) {
      logInfo(`Sending test message: "${message}"`);
      tester.sendMessage(message);
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Wait a bit more for any final responses
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = tester.getTestResults();
    
    logInfo('\n=== Test Results ===');
    logInfo(`Connection: ${results.connection ? '✅ Success' : '❌ Failed'}`);
    logInfo(`Messages received: ${results.messageCount}`);
    logInfo(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      logWarning('Errors encountered:');
      results.errors.forEach(error => logError(`  - ${error}`));
    }

    if (results.messages.length > 0) {
      logSuccess('Responses received:');
      results.messages.forEach((msg, index) => {
        logInfo(`  ${index + 1}. ${msg.content.substring(0, 100)}...`);
      });
    }

    tester.disconnect();
    
    if (results.connection && results.messageCount > 0 && results.errors.length === 0) {
      logSuccess('✅ Automated test completed successfully!');
      process.exit(0);
    } else {
      logError('❌ Automated test failed!');
      if (results.errors.length > 0) {
        logError(`Failed due to ${results.errors.length} error(s)`);
      }
      process.exit(1);
    }

  } catch (error) {
    logError(`Automated test failed: ${error.message}`);
    tester.disconnect();
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isInteractive = args.includes('--interactive') || args.includes('-i');
  const isAutomated = args.includes('--automated') || args.includes('-a');

  logInfo('WebSocket Test Script for Generic Enterprise Chatbot');
  logInfo(`Endpoint: ${WEBSOCKET_URL}`);
  logInfo(`Company: ${COMPANY_ID}`);
  logInfo(`Session: ${SESSION_ID}`);

  if (isInteractive) {
    await runInteractiveTest();
  } else if (isAutomated) {
    await runAutomatedTest();
  } else {
    logInfo('Usage:');
    logInfo('  node tests/websocket.test.js --interactive  # Interactive mode');
    logInfo('  node tests/websocket.test.js --automated   # Automated test');
    logInfo('  node tests/websocket.test.js -i            # Short for interactive');
    logInfo('  node tests/websocket.test.js -a            # Short for automated');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logInfo('\nTest interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logInfo('\nTest terminated');
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { WebSocketTester };
