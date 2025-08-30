const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const SessionManager = require('../services/session-manager');
const configManager = require('../utils/config-manager');
const logger = require('../utils/logger');

let dynamoClient, docClient, sessionManager;

const initializeServices = () => {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({ 
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: 3
    });
    docClient = DynamoDBDocumentClient.from(dynamoClient);
    sessionManager = new SessionManager(docClient, configManager.get('dynamoDbTable'));
  }
};

exports.handler = async (event, context) => {
  try {
    initializeServices();
    
    logger.info('Starting session cleanup process');
    
    await sessionManager.cleanupExpiredSessions();
    
    logger.info('Session cleanup completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Cleanup completed successfully' })
    };
  } catch (error) {
    logger.error('Session cleanup failed', { error: error.message, stack: error.stack });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Cleanup failed' })
    };
  }
};
