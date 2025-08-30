#!/usr/bin/env node

/**
 * Test Runner for Generic Enterprise Chatbot
 * Runs all tests in sequence
 */

const { testConnectivity } = require('./connectivity.test');
const { WebSocketTester } = require('./websocket.test');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
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

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log(`🧪 ${message}`, 'magenta');
  log(`${'='.repeat(60)}`, 'magenta');
}

async function runConnectivityTest() {
  logHeader('CONNECTIVITY TEST');
  try {
    const success = await testConnectivity();
    if (success) {
      logSuccess('Connectivity test passed!');
      return true;
    } else {
      logError('Connectivity test failed!');
      return false;
    }
  } catch (error) {
    logError(`Connectivity test error: ${error.message}`);
    return false;
  }
}

async function runWebSocketTest() {
  logHeader('WEBSOCKET FUNCTIONALITY TEST');
  
  const tester = new WebSocketTester();
  const testMessages = [
    "Hello, can you tell me about Vanguard's investment philosophy?",
    "What are the benefits of low-cost investing?"
  ];

  try {
    logInfo('Starting WebSocket functionality test...');
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
    
    logInfo('\n=== WebSocket Test Results ===');
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
      logSuccess('WebSocket functionality test passed!');
      return true;
    } else {
      logError('WebSocket functionality test failed!');
      if (results.errors.length > 0) {
        logError(`Failed due to ${results.errors.length} error(s)`);
      }
      return false;
    }

  } catch (error) {
    logError(`WebSocket test error: ${error.message}`);
    tester.disconnect();
    return false;
  }
}

async function runAllTests() {
  logHeader('STARTING ALL TESTS');
  logInfo('Running comprehensive test suite for Generic Enterprise Chatbot...');
  
  const results = {
    connectivity: false,
    websocket: false,
    total: 0,
    passed: 0,
    failed: 0
  };

  // Test 1: Connectivity
  results.connectivity = await runConnectivityTest();
  results.total++;
  if (results.connectivity) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 2: WebSocket Functionality
  results.websocket = await runWebSocketTest();
  results.total++;
  if (results.websocket) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Summary
  logHeader('TEST SUMMARY');
  logInfo(`Total tests: ${results.total}`);
  logInfo(`Passed: ${results.passed}`);
  logInfo(`Failed: ${results.failed}`);
  
  if (results.connectivity) {
    logSuccess('✅ Connectivity test: PASSED');
  } else {
    logError('❌ Connectivity test: FAILED');
  }
  
  if (results.websocket) {
    logSuccess('✅ WebSocket functionality test: PASSED');
  } else {
    logError('❌ WebSocket functionality test: FAILED');
  }

  if (results.failed === 0) {
    logSuccess('\n🎉 ALL TESTS PASSED! The chatbot is working correctly.');
    process.exit(0);
  } else {
    logError(`\n💥 ${results.failed} test(s) failed. Please check the issues above.`);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logWarning('\nTest suite interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logWarning('\nTest suite terminated');
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Test suite error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAllTests, runConnectivityTest, runWebSocketTest };
