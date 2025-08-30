# Test Suite for Generic Enterprise Chatbot

This folder contains comprehensive tests for the Generic Enterprise Chatbot WebSocket API.

## Test Files

### `connectivity.test.js`
Simple connectivity test that verifies the WebSocket endpoint is accessible.

**Usage:**
```bash
npm run test:connectivity
```

### `websocket.test.js`
Full WebSocket functionality test that tests message sending and receiving.

**Usage:**
```bash
# Automated test (recommended)
npm run test:websocket:automated

# Interactive test (manual testing)
npm run test:websocket:interactive

# Direct usage
node tests/websocket.test.js --automated
node tests/websocket.test.js --interactive
```

### `run-all.js`
Test runner that executes all tests in sequence and provides a comprehensive report.

**Usage:**
```bash
npm test
npm run test:all
```

## Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (connectivity + WebSocket functionality) |
| `npm run test:all` | Same as `npm test` |
| `npm run test:connectivity` | Run only connectivity test |
| `npm run test:websocket` | Run WebSocket test with help |
| `npm run test:websocket:automated` | Run automated WebSocket test |
| `npm run test:websocket:interactive` | Run interactive WebSocket test |

## Test Configuration

### Environment Variables

- `WEBSOCKET_URL`: Override the default WebSocket endpoint
  ```bash
  WEBSOCKET_URL=wss://your-endpoint.com/dev npm test
  ```

### Default Configuration

- **Endpoint**: `wss://2971zcb154.execute-api.us-east-1.amazonaws.com/dev`
- **Company**: `vanguard`
- **Session**: Auto-generated with timestamp

## Test Results

### Success Criteria

✅ **Connectivity Test**: WebSocket connection can be established
✅ **WebSocket Test**: Messages can be sent and responses received

### Sample Output

```
============================================================
🧪 STARTING ALL TESTS
============================================================
ℹ️  Running comprehensive test suite for Generic Enterprise Chatbot...

============================================================
🧪 CONNECTIVITY TEST
============================================================
✅ WebSocket connection opened successfully!
✅ Connectivity test passed!

============================================================
🧪 WEBSOCKET FUNCTIONALITY TEST
============================================================
✅ WebSocket connection established
✅ Responses received
✅ WebSocket functionality test passed!

============================================================
🧪 TEST SUMMARY
============================================================
ℹ️  Total tests: 2
ℹ️  Passed: 2
ℹ️  Failed: 0
🎉 ALL TESTS PASSED! The chatbot is working correctly.
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**: Check if the WebSocket endpoint is correct and accessible
2. **Authentication Errors**: Verify AWS credentials and permissions
3. **Message Errors**: Check if the Lambda functions are deployed and working

### Debug Mode

For detailed debugging, you can run individual tests with verbose output:

```bash
# Check connectivity only
npm run test:connectivity

# Interactive testing for manual verification
npm run test:websocket:interactive
```

## Adding New Tests

To add a new test:

1. Create a new test file in the `tests/` folder
2. Export your test function
3. Add it to `run-all.js`
4. Add a new npm script in `package.json`

Example:
```javascript
// tests/my-new-test.js
async function myNewTest() {
  // Your test logic here
  return true; // or false
}

module.exports = { myNewTest };
```
