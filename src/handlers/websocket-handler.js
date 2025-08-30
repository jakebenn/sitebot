const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand,
  UpdateCommand,
  DeleteCommand 
} = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const configManager = require('../utils/config-manager');
const PerplexityService = require('../services/perplexity-service');
const SessionManager = require('../services/session-manager');
const SecurityManager = require('../utils/security');
const logger = require('../utils/logger');

// Initialize clients outside handler for reuse
let dynamoClient, docClient, perplexityService, sessionManager;

const initializeServices = () => {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({ 
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: 3
    });
    docClient = DynamoDBDocumentClient.from(dynamoClient);
    perplexityService = new PerplexityService(configManager.get('perplexityApiKey'));
    sessionManager = new SessionManager(docClient, configManager.get('dynamoDbTable'));
  }
};

exports.handler = async (event, context) => {
  try {
    initializeServices();
    configManager.validateConfig();
    
    const { routeKey, connectionId } = event.requestContext;
    const stage = event.requestContext.stage;
    const endpoint = `https://${event.requestContext.domainName}/${stage}`;
    
    logger.info('WebSocket event received', { routeKey, connectionId });

    switch (routeKey) {
      case '$connect':
        return await handleConnection(connectionId, event);
      case '$disconnect':
        return await handleDisconnection(connectionId);
      case '$default':
      case 'sendMessage':
        return await handleMessage(connectionId, event, endpoint);
      default:
        logger.warn('Unknown route', { routeKey });
        return { statusCode: 400 };
    }
  } catch (error) {
    logger.error('Handler error', { error: error.message, stack: error.stack });
    return { statusCode: 500 };
  }
};

async function handleConnection(connectionId, event) {
  try {
    // Extract company ID from query parameters or headers
    const companyId = event.queryStringParameters?.company || 
                      event.headers?.['x-company-id'] || 
                      configManager.get('defaultCompany');
    
    const validatedCompanyId = SecurityManager.validateCompanyId(companyId);
    const companyConfig = configManager.getCompanyConfig(validatedCompanyId);
    
    // Store connection with company context
    await sessionManager.createConnection(connectionId, {
      companyId: validatedCompanyId,
      companyConfig,
      connectedAt: new Date().toISOString(),
      conversationHistory: []
    });

    logger.info('Connection established', { connectionId, companyId: validatedCompanyId });
    return { statusCode: 200 };
  } catch (error) {
    logger.error('Connection error', { error: error.message, connectionId });
    return { statusCode: 500 };
  }
}

async function handleDisconnection(connectionId) {
  try {
    await sessionManager.removeConnection(connectionId);
    logger.info('Connection closed', { connectionId });
    return { statusCode: 200 };
  } catch (error) {
    logger.error('Disconnection error', { error: error.message });
    return { statusCode: 200 }; // Return success even on error to avoid reconnection loops
  }
}

async function handleMessage(connectionId, event, endpoint) {
  try {
    const message = JSON.parse(event.body);
    
    // Validate and sanitize message
    const validatedMessage = SecurityManager.validateMessage(message);
    const { text, sessionId } = validatedMessage;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      await sendErrorMessage(connectionId, endpoint, 'Please provide a valid message');
      return { statusCode: 400 };
    }

    // Get session data with company context
    const sessionData = await sessionManager.getSession(connectionId, sessionId);
    if (!sessionData) {
      await sendErrorMessage(connectionId, endpoint, 'Session not found. Please refresh and try again.');
      return { statusCode: 404 };
    }

    const { companyConfig, conversationHistory = [] } = sessionData;
    
    // Debug logging to see what's in the session data
    logger.debug('Session data retrieved', { 
      connectionId, 
      sessionId: sessionData.SessionId,
      hasCompanyConfig: !!companyConfig,
      hasConversationHistory: !!conversationHistory,
      sessionKeys: Object.keys(sessionData)
    });
    
    // Validate that company configuration exists
    if (!companyConfig) {
      await sendErrorMessage(connectionId, endpoint, 'Session configuration error. Please refresh and try again.');
      return { statusCode: 500 };
    }
    
    // Generate AI response using company-specific configuration
    const aiResponse = await perplexityService.generateResponse(
      text, 
      conversationHistory, 
      companyConfig
    );

    // Update conversation history
    const updatedHistory = [
      ...conversationHistory.slice(-8), // Keep last 8 exchanges
      {
        user: text,
        assistant: aiResponse,
        timestamp: new Date().toISOString()
      }
    ];

    // Save updated session using the actual session ID from the retrieved session
    await sessionManager.updateSession(connectionId, sessionData.SessionId, {
      conversationHistory: updatedHistory,
      lastActivity: new Date().toISOString()
    });

    // Send response to client
    await sendMessage(connectionId, endpoint, {
      type: 'response',
      message: aiResponse,
      timestamp: new Date().toISOString(),
      companyName: companyConfig.name
    });

    return { statusCode: 200 };
  } catch (error) {
    logger.error('Message handling error', { error: error.message, connectionId });
    await sendErrorMessage(connectionId, endpoint, 'Sorry, I encountered an error processing your message. Please try again.');
    return { statusCode: 500 };
  }
}

async function sendMessage(connectionId, endpoint, data) {
  const apiGw = new ApiGatewayManagementApiClient({ endpoint });
  
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    });
    
    await apiGw.send(command);
  } catch (error) {
    if (error.statusCode === 410) {
      logger.info('Connection gone, cleaning up', { connectionId });
      await sessionManager.removeConnection(connectionId);
    } else {
      logger.error('Send message error', { error: error.message, connectionId });
      throw error;
    }
  }
}

async function sendErrorMessage(connectionId, endpoint, errorMessage) {
  await sendMessage(connectionId, endpoint, {
    type: 'error',
    message: errorMessage,
    timestamp: new Date().toISOString()
  });
}
