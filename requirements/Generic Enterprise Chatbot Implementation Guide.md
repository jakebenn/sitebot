<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Generic Enterprise Chatbot Implementation Guide

## Overview

This implementation guide outlines building a configurable, generic chatbot solution using Node.js, AWS Lambda, API Gateway WebSockets, and DynamoDB. The system is designed to be company-agnostic and highly configurable, allowing any organization to deploy a knowledge-based chatbot powered by the Perplexity AI API.

## Core Architecture

### Technology Stack

- **Runtime**: Node.js 20.x (latest supported Lambda runtime)[^1]
- **Backend**: AWS Lambda with WebSocket API Gateway
- **Database**: DynamoDB for session management and configuration
- **AI Service**: Perplexity AI API for knowledge retrieval
- **Frontend**: Vanilla JavaScript WebSocket client
- **Deployment**: Serverless Framework for infrastructure management[^2]


### Key Features

- **Multi-company configuration support**
- **Strategic priorities integration**
- **Real-time WebSocket communication**
- **Session persistence with conversation history**
- **Scalable serverless architecture**
- **Popup chat widget interface**


## Configuration System Design

### Step 1: Company Configuration Schema

**Company Configuration Structure**:

```javascript
// config/companies/company-config.js
const companyConfigurations = {
  "vanguard": {
    name: "Vanguard",
    description: "Leading investment management company offering mutual funds, ETFs, and financial advisory services",
    urls: [
      "https://investor.vanguard.com",
      "https://corporate.vanguard.com", 
      "https://about.vanguard.com"
    ],
    strategicPriorities: [
      "Low-cost investing philosophy",
      "Long-term wealth building strategies", 
      "Investor-owned structure benefits",
      "Comprehensive retirement planning"
    ],
    brandMessage: "Taking a long-term approach and keeping costs low",
    industry: "Financial Services",
    supportedTopics: [
      "Investment products and services",
      "Account management", 
      "Fees and expenses",
      "Retirement planning",
      "Company history and philosophy"
    ],
    responseStyle: "professional, educational, conservative",
    maxResponseTokens: 800,
    temperature: 0.3
  },
  "microsoft": {
    name: "Microsoft Corporation",
    description: "Global technology company providing cloud computing, productivity software, and business solutions",
    urls: [
      "https://www.microsoft.com",
      "https://docs.microsoft.com",
      "https://azure.microsoft.com",
      "https://support.microsoft.com"
    ],
    strategicPriorities: [
      "Digital transformation acceleration",
      "Hybrid cloud and edge computing",
      "AI-powered productivity solutions",
      "Inclusive and accessible technology"
    ],
    brandMessage: "Empowering every person and organization on the planet to achieve more",
    industry: "Technology",
    supportedTopics: [
      "Cloud services and Azure",
      "Productivity and collaboration tools",
      "Developer resources and documentation", 
      "Enterprise solutions",
      "AI and machine learning services"
    ],
    responseStyle: "innovative, helpful, technical",
    maxResponseTokens: 750,
    temperature: 0.4
  }
};

module.exports = companyConfigurations;
```


### Step 2: Environment Configuration Management

**Configuration Manager Module**:[^3][^4]

```javascript
// utils/config-manager.js
const fs = require('fs');
const path = require('path');

class ConfigurationManager {
  constructor() {
    this.config = null;
    this.loadConfiguration();
  }

  loadConfiguration() {
    try {
      // Load environment-specific configuration
      const environment = process.env.NODE_ENV || 'development';
      const configPath = path.join(__dirname, '../config', `${environment}.json`);
      
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Override with environment variables
      this.config = {
        ...this.config,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        dynamoDbTable: process.env.DYNAMODB_TABLE_NAME,
        websocketApiEndpoint: process.env.WEBSOCKET_API_ENDPOINT,
        defaultCompany: process.env.DEFAULT_COMPANY || 'generic',
        logLevel: process.env.LOG_LEVEL || 'info'
      };
      
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw new Error('Configuration loading failed');
    }
  }

  getCompanyConfig(companyId) {
    const companyConfigurations = require('../config/companies/company-config');
    return companyConfigurations[companyId] || this.getGenericConfig();
  }

  getGenericConfig() {
    return {
      name: "Assistant",
      description: "AI-powered information assistant",
      urls: [],
      strategicPriorities: [
        "Providing accurate information",
        "Delivering helpful responses", 
        "Maintaining professional service"
      ],
      brandMessage: "Here to help with your questions",
      industry: "Technology",
      supportedTopics: ["General inquiries", "Information lookup"],
      responseStyle: "helpful, professional, informative",
      maxResponseTokens: 600,
      temperature: 0.4
    };
  }

  validateConfig() {
    const required = ['perplexityApiKey', 'dynamoDbTable', 'websocketApiEndpoint'];
    const missing = required.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    return true;
  }

  get(key) {
    return this.config[key];
  }
}

module.exports = new ConfigurationManager();
```


## AWS Lambda Implementation

### Step 1: Main Lambda Handler

**Primary Lambda Function**:[^5][^6]

```javascript
// src/handlers/websocket-handler.js
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
const logger = require('../utils/logger');

// Initialize clients outside handler for reuse[^35][^62]
let dynamoClient, docClient, perplexityService, sessionManager;

const initializeServices = () => {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({ 
      region: process.env.AWS_REGION || 'us-east-1'
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
    
    const companyConfig = configManager.getCompanyConfig(companyId);
    
    // Store connection with company context
    await sessionManager.createConnection(connectionId, {
      companyId,
      companyConfig,
      connectedAt: new Date().toISOString(),
      conversationHistory: []
    });

    logger.info('Connection established', { connectionId, companyId });
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
    const { text, sessionId } = message;

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

    // Save updated session
    await sessionManager.updateSession(connectionId, sessionId, {
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
```


### Step 2: Perplexity AI Service Integration

**Perplexity Service Module**:

```javascript
// src/services/perplexity-service.js
const { OpenAI } = require('openai');
const logger = require('../utils/logger');

class PerplexityService {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.perplexity.ai'
    });
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async generateResponse(userMessage, conversationHistory = [], companyConfig) {
    try {
      const systemPrompt = this.buildSystemPrompt(companyConfig);
      const messages = this.buildMessageContext(systemPrompt, conversationHistory, userMessage);

      const response = await this.makeApiRequest(messages, companyConfig);
      
      logger.info('Perplexity API response generated', { 
        company: companyConfig.name,
        messageLength: response.length 
      });
      
      return response;
    } catch (error) {
      logger.error('Perplexity API error', { 
        error: error.message,
        company: companyConfig.name 
      });
      return this.getFallbackResponse(companyConfig);
    }
  }

  buildSystemPrompt(companyConfig) {
    const { name, description, urls, strategicPriorities, brandMessage, supportedTopics, responseStyle } = companyConfig;
    
    return `You are a knowledgeable assistant for ${name}. 

COMPANY CONTEXT:
- Company: ${name}
- Description: ${description}
- Industry: ${companyConfig.industry}
- Brand Message: ${brandMessage}

INFORMATION SOURCES:
Use only publicly available information from these official sources:
${urls.map(url => `- ${url}`).join('\n')}

STRATEGIC PRIORITIES:
When relevant to user questions, incorporate information about these strategic priorities:
${strategicPriorities.map(priority => `- ${priority}`).join('\n')}

SUPPORTED TOPICS:
Focus on these areas:
${supportedTopics.map(topic => `- ${topic}`).join('\n')}

RESPONSE STYLE: ${responseStyle}

GUIDELINES:
- Provide accurate, helpful information based on official company sources
- When discussing strategic priorities, explain how they benefit customers
- If asked about priorities specifically, provide detailed explanations with examples
- Stay within your knowledge domain and refer to official sources when appropriate
- Be concise but comprehensive
- Maintain a ${responseStyle} tone throughout responses
- If you cannot find specific information, acknowledge limitations and suggest official resources

Remember: Always prioritize accuracy over completeness and cite official company sources when available.`;
  }

  buildMessageContext(systemPrompt, conversationHistory, userMessage) {
    const messages = [{ role: 'system', content: systemPrompt }];
    
    // Add recent conversation history for context (last 3 exchanges)
    const recentHistory = conversationHistory.slice(-3);
    recentHistory.forEach(exchange => {
      messages.push({ role: 'user', content: exchange.user });
      messages.push({ role: 'assistant', content: exchange.assistant });
    });
    
    // Add current user message
    messages.push({ role: 'user', content: userMessage });
    
    return messages;
  }

  async makeApiRequest(messages, companyConfig, attempt = 1) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'sonar-medium-online',
        messages: messages,
        max_tokens: companyConfig.maxResponseTokens || 600,
        temperature: companyConfig.temperature || 0.4,
        stream: false
      });

      return response.choices[^0].message.content.trim();
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        logger.warn('Retrying Perplexity API request', { attempt, error: error.message });
        await this.delay(this.retryDelay * attempt);
        return this.makeApiRequest(messages, companyConfig, attempt + 1);
      }
      throw error;
    }
  }

  isRetryableError(error) {
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.status) || 
           error.message.includes('timeout') || 
           error.message.includes('network');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getFallbackResponse(companyConfig) {
    return `I apologize, but I'm experiencing technical difficulties right now. For immediate assistance, please visit our official website at ${companyConfig.urls[^0] || 'our website'} or contact our support team directly. I'll be back online shortly to help with your ${companyConfig.name} questions.`;
  }
}

module.exports = PerplexityService;
```


### Step 3: Session Management Service

**Session Manager**:[^7][^8]

```javascript
// src/services/session-manager.js
const { PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class SessionManager {
  constructor(docClient, tableName) {
    this.docClient = docClient;
    this.tableName = tableName;
    this.sessionTTL = 3600; // 1 hour
  }

  async createConnection(connectionId, initialData = {}) {
    const sessionId = uuidv4();
    const timestamp = Math.floor(Date.now() / 1000);
    
    const item = {
      PK: `CONNECTION#${connectionId}`,
      SK: `SESSION#${sessionId}`,
      ConnectionId: connectionId,
      SessionId: sessionId,
      CreatedAt: timestamp,
      LastActivity: timestamp,
      TTL: timestamp + this.sessionTTL,
      ...initialData
    };

    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      
      logger.info('Session created', { connectionId, sessionId });
      return sessionId;
    } catch (error) {
      logger.error('Failed to create session', { error: error.message, connectionId });
      throw error;
    }
  }

  async getSession(connectionId, sessionId = null) {
    try {
      let params;
      
      if (sessionId) {
        // Get specific session
        params = {
          TableName: this.tableName,
          Key: {
            PK: `CONNECTION#${connectionId}`,
            SK: `SESSION#${sessionId}`
          }
        };
      } else {
        // Query for any active session for this connection
        const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
        params = {
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `CONNECTION#${connectionId}`
          },
          ScanIndexForward: false, // Get most recent first
          Limit: 1
        };
        
        const result = await this.docClient.send(new QueryCommand(params));
        return result.Items?.[^0] || null;
      }

      const result = await this.docClient.send(new GetCommand(params));
      return result.Item || null;
    } catch (error) {
      logger.error('Failed to get session', { error: error.message, connectionId, sessionId });
      return null;
    }
  }

  async updateSession(connectionId, sessionId, updateData) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':lastActivity': timestamp,
      ':ttl': timestamp + this.sessionTTL
    };

    // Build dynamic update expression
    Object.keys(updateData).forEach(key => {
      const placeholder = `:${key.toLowerCase()}`;
      updateExpression.push(`#${key} = ${placeholder}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[placeholder] = updateData[key];
    });

    updateExpression.push('LastActivity = :lastActivity', 'TTL = :ttl');

    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `CONNECTION#${connectionId}`,
          SK: `SESSION#${sessionId}`
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      logger.debug('Session updated', { connectionId, sessionId });
    } catch (error) {
      logger.error('Failed to update session', { error: error.message, connectionId, sessionId });
      throw error;
    }
  }

  async removeConnection(connectionId) {
    try {
      // Query all sessions for this connection
      const { QueryCommand } = require('@aws-sdk/lib-dynamodb');
      const queryResult = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `CONNECTION#${connectionId}`
        }
      }));

      // Delete all sessions for this connection
      const deletePromises = (queryResult.Items || []).map(item => 
        this.docClient.send(new DeleteCommand({
          TableName: this.tableName,
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        }))
      );

      await Promise.all(deletePromises);
      logger.info('Connection removed', { connectionId, sessionsDeleted: deletePromises.length });
    } catch (error) {
      logger.error('Failed to remove connection', { error: error.message, connectionId });
      throw error;
    }
  }

  async cleanupExpiredSessions() {
    // This method can be called by a scheduled Lambda for cleanup
    const timestamp = Math.floor(Date.now() / 1000);
    
    try {
      const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
      const scanResult = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'TTL < :now',
        ExpressionAttributeValues: {
          ':now': timestamp
        }
      }));

      const deletePromises = (scanResult.Items || []).map(item =>
        this.docClient.send(new DeleteCommand({
          TableName: this.tableName,
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        }))
      );

      await Promise.all(deletePromises);
      logger.info('Expired sessions cleaned up', { count: deletePromises.length });
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error: error.message });
    }
  }
}

module.exports = SessionManager;
```


## Frontend Implementation

### Step 1: Configurable Chat Widget

**Generic Chat Widget**:[^9][^10]

```javascript
// static/js/generic-chat-widget.js
class GenericChatWidget {
  constructor(config = {}) {
    this.config = {
      // Default configuration
      companyId: config.companyId || 'generic',
      companyName: config.companyName || 'Assistant',
      websocketUrl: config.websocketUrl || 'wss://your-api-gateway-url',
      primaryColor: config.primaryColor || '#007bff',
      position: config.position || 'bottom-right',
      autoOpen: config.autoOpen || false,
      autoOpenDelay: config.autoOpenDelay || 30000,
      welcomeMessage: config.welcomeMessage || 'Hello! How can I help you today?',
      placeholderText: config.placeholderText || 'Type your message...',
      maxRetries: config.maxRetries || 3,
      reconnectDelay: config.reconnectDelay || 2000,
      ...config
    };

    this.websocket = null;
    this.isConnected = false;
    this.sessionId = this.generateSessionId();
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.isTyping = false;

    this.initializeWidget();
  }

  initializeWidget() {
    this.createWidgetElements();
    this.bindEvents();
    this.loadPersistedState();
    
    if (this.config.autoOpen) {
      setTimeout(() => this.openChat(), this.config.autoOpenDelay);
    }
  }

  createWidgetElements() {
    // Create widget HTML structure
    const widgetHtml = `
      <div id="chat-widget-trigger" class="chat-widget-trigger" style="--primary-color: ${this.config.primaryColor}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .4-.1.5-.2L14.1 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
        </svg>
        <span class="chat-widget-badge" id="chat-widget-badge" style="display: none;">1</span>
      </div>
      
      <div id="chat-widget-popup" class="chat-widget-popup" style="--primary-color: ${this.config.primaryColor}">
        <div class="chat-widget-header">
          <div class="chat-widget-company-info">
            <h3>${this.config.companyName}</h3>
            <span class="chat-widget-status" id="chat-status">Connecting...</span>
          </div>
          <button id="chat-widget-close" class="chat-widget-close">&times;</button>
        </div>
        
        <div id="chat-widget-messages" class="chat-widget-messages">
          <div class="chat-message system-message">
            ${this.config.welcomeMessage}
          </div>
        </div>
        
        <div class="chat-widget-input-container">
          <input 
            type="text" 
            id="chat-widget-input" 
            class="chat-widget-input"
            placeholder="${this.config.placeholderText}"
            maxlength="500"
          />
          <button id="chat-widget-send" class="chat-widget-send" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Inject widget into page
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'generic-chat-widget';
    widgetContainer.innerHTML = widgetHtml;
    document.body.appendChild(widgetContainer);

    // Load CSS
    this.loadStyles();
  }

  loadStyles() {
    const css = `
      #generic-chat-widget * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .chat-widget-trigger {
        position: fixed;
        ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
        width: 60px;
        height: 60px;
        background: var(--primary-color);
        border-radius: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        z-index: 1000;
        user-select: none;
      }

      .chat-widget-trigger:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }

      .chat-widget-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff4444;
        color: white;
        border-radius: 10px;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .chat-widget-popup {
        display: none;
        position: fixed;
        ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 90px;'}
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        z-index: 1001;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chat-widget-header {
        background: var(--primary-color);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .chat-widget-company-info h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .chat-widget-status {
        font-size: 12px;
        opacity: 0.9;
        margin-top: 2px;
        display: block;
      }

      .chat-widget-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 15px;
        transition: background-color 0.2s;
      }

      .chat-widget-close:hover {
        background: rgba(255,255,255,0.1);
      }

      .chat-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8f9fa;
      }

      .chat-message {
        margin: 12px 0;
        padding: 10px 14px;
        border-radius: 18px;
        max-width: 80%;
        word-wrap: break-word;
        line-height: 1.4;
        font-size: 14px;
      }

      .user-message {
        background: var(--primary-color);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }

      .assistant-message {
        background: white;
        border: 1px solid #e1e5e9;
        margin-right: auto;
        border-bottom-left-radius: 4px;
      }

      .system-message {
        background: #e3f2fd;
        color: #1565c0;
        margin: 0 auto;
        text-align: center;
        font-size: 13px;
        max-width: 90%;
      }

      .typing-indicator {
        background: white;
        border: 1px solid #e1e5e9;
        margin-right: auto;
        border-bottom-left-radius: 4px;
        padding: 16px 14px 12px;
      }

      .typing-dots {
        display: inline-block;
      }

      .typing-dots span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #999;
        margin: 0 1px;
        animation: typing 1.4s infinite ease-in-out;
      }

      .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
      .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

      @keyframes typing {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }

      .chat-widget-input-container {
        display: flex;
        padding: 16px;
        background: white;
        border-top: 1px solid #e1e5e9;
        gap: 12px;
      }

      .chat-widget-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #e1e5e9;
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      .chat-widget-input:focus {
        border-color: var(--primary-color);
      }

      .chat-widget-send {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        background: var(--primary-color);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .chat-widget-send:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .chat-widget-send:not(:disabled):hover {
        transform: scale(1.05);
      }

      @media (max-width: 480px) {
        .chat-widget-popup {
          width: calc(100vw - 40px);
          height: calc(100vh - 40px);
          top: 20px !important;
          right: 20px !important;
          left: 20px !important;
          bottom: 20px !important;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = css;
    document.head.appendChild(styleSheet);
  }

  bindEvents() {
    // Get DOM elements
    this.elements = {
      trigger: document.getElementById('chat-widget-trigger'),
      popup: document.getElementById('chat-widget-popup'),
      close: document.getElementById('chat-widget-close'),
      messages: document.getElementById('chat-widget-messages'),
      input: document.getElementById('chat-widget-input'),
      send: document.getElementById('chat-widget-send'),
      status: document.getElementById('chat-status'),
      badge: document.getElementById('chat-widget-badge')
    };

    // Bind event listeners
    this.elements.trigger.addEventListener('click', () => this.openChat());
    this.elements.close.addEventListener('click', () => this.closeChat());
    this.elements.send.addEventListener('click', () => this.sendMessage());
    this.elements.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.elements.input.addEventListener('input', () => this.updateSendButton());
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.websocket && this.websocket.readyState !== WebSocket.OPEN) {
        this.reconnectWebSocket();
      }
    });
  }

  openChat() {
    this.elements.popup.style.display = 'flex';
    this.elements.trigger.style.display = 'none';
    this.elements.input.focus();
    
    if (!this.isConnected) {
      this.connectWebSocket();
    }
    
    this.saveState({ isOpen: true });
  }

  closeChat() {
    this.elements.popup.style.display = 'none';
    this.elements.trigger.style.display = 'flex';
    this.saveState({ isOpen: false });
  }

  connectWebSocket() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `${this.config.websocketUrl}?company=${this.config.companyId}&session=${this.sessionId}`;
    
    try {
      this.websocket = new WebSocket(url);
      this.setupWebSocketHandlers();
      this.updateConnectionStatus('Connecting...');
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.updateConnectionStatus('Connection failed');
      this.scheduleReconnect();
    }
  }

  setupWebSocketHandlers() {
    this.websocket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('Connected');
      this.processPendingMessages();
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleIncomingMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.updateConnectionStatus('Disconnected');
      
      if (event.code !== 1000) { // Not normal closure
        this.scheduleReconnect();
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('Connection error');
    };
  }

  handleIncomingMessage(data) {
    this.hideTypingIndicator();
    
    switch (data.type) {
      case 'response':
        this.displayMessage(data.message, 'assistant');
        break;
      case 'error':
        this.displayMessage(data.message, 'system');
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  sendMessage() {
    const text = this.elements.input.value.trim();
    if (!text) return;

    this.elements.input.value = '';
    this.updateSendButton();
    this.displayMessage(text, 'user');

    const message = {
      action: 'sendMessage',
      text: text,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      this.showTypingIndicator();
    } else {
      this.messageQueue.push(message);
      this.connectWebSocket();
    }
  }

  displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.textContent = text;
    
    this.elements.messages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    if (this.isTyping) return;
    
    this.isTyping = true;
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'chat-message typing-indicator';
    typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div> Typing...';
    
    this.elements.messages.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    if (!this.isTyping) return;
    
    this.isTyping = false;
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
      typingDiv.remove();
    }
  }

  scrollToBottom() {
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  updateSendButton() {
    const hasText = this.elements.input.value.trim().length > 0;
    this.elements.send.disabled = !hasText || !this.isConnected;
  }

  updateConnectionStatus(status) {
    this.elements.status.textContent = status;
    this.updateSendButton();
  }

  processPendingMessages() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.websocket.send(JSON.stringify(message));
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.config.maxRetries) {
      this.reconnectAttempts++;
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connectWebSocket();
      }, delay);
    } else {
      this.updateConnectionStatus('Connection lost');
      this.displayMessage('Connection lost. Please refresh the page to reconnect.', 'system');
    }
  }

  reconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
    }
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  generateSessionId() {
    return 'session-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  saveState(state) {
    const currentState = this.loadState();
    const newState = { ...currentState, ...state };
    localStorage.setItem(`chat-widget-${this.config.companyId}`, JSON.stringify(newState));
  }

  loadState() {
    try {
      const state = localStorage.getItem(`chat-widget-${this.config.companyId}`);
      return state ? JSON.parse(state) : {};
    } catch {
      return {};
    }
  }

  loadPersistedState() {
    const state = this.loadState();
    if (state.isOpen) {
      this.openChat();
    }
  }

  destroy() {
    if (this.websocket) {
      this.websocket.close();
    }
    
    const widget = document.getElementById('generic-chat-widget');
    if (widget) {
      widget.remove();
    }
  }
}

// Export for use
window.GenericChatWidget = GenericChatWidget;
```


### Step 2: Configuration-Based Widget Initialization

**Widget Configuration Examples**:

```html
<!-- Example usage for different companies -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Company Website</title>
</head>
<body>
    <!-- Your website content -->
    
    <script src="js/generic-chat-widget.js"></script>
    <script>
        // Configuration for Vanguard
        const vanguardConfig = {
            companyId: 'vanguard',
            companyName: 'Vanguard Assistant',
            websocketUrl: 'wss://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production',
            primaryColor: '#FF6B35',
            welcomeMessage: 'Hello! I\'m here to help with your Vanguard investment questions.',
            placeholderText: 'Ask about funds, fees, accounts...',
            autoOpen: false,
            position: 'bottom-right'
        };

        // Configuration for Microsoft
        const microsoftConfig = {
            companyId: 'microsoft',
            companyName: 'Microsoft Support',
            websocketUrl: 'wss://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production',
            primaryColor: '#0078d4',
            welcomeMessage: 'Hi! I can help you with Microsoft products and services.',
            placeholderText: 'Ask about Azure, Office, or other products...',
            autoOpen: true,
            autoOpenDelay: 45000,
            position: 'bottom-right'
        };

        // Generic configuration
        const genericConfig = {
            companyId: 'generic',
            companyName: 'Assistant',
            websocketUrl: 'wss://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production',
            primaryColor: '#007bff',
            welcomeMessage: 'Hello! How can I assist you today?',
            placeholderText: 'Type your message...',
            position: 'bottom-left'
        };

        // Initialize widget based on current domain or configuration
        const currentDomain = window.location.hostname;
        let widgetConfig;

        if (currentDomain.includes('vanguard')) {
            widgetConfig = vanguardConfig;
        } else if (currentDomain.includes('microsoft')) {
            widgetConfig = microsoftConfig;
        } else {
            widgetConfig = genericConfig;
        }

        // Create and initialize the chat widget
        const chatWidget = new GenericChatWidget(widgetConfig);

        // Optional: Expose widget to global scope for manual control
        window.chatWidget = chatWidget;
    </script>
</body>
</html>
```


## Deployment Configuration

### Step 1: Serverless Framework Configuration

**Main Serverless Configuration**:[^11][^2]

```yaml
# serverless.yml
service: generic-enterprise-chatbot

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: ${opt:region, 'us-east-1'}
  stage: ${opt:stage, 'dev'}
  memorySize: 512
  timeout: 30
  
  environment:
    NODE_ENV: ${self:provider.stage}
    DYNAMODB_TABLE_NAME: ${self:service}-sessions-${self:provider.stage}
    PERPLEXITY_API_KEY: ${env:PERPLEXITY_API_KEY}
    LOG_LEVEL: ${env:LOG_LEVEL, 'info'}
    DEFAULT_COMPANY: ${env:DEFAULT_COMPANY, 'generic'}

  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
            - dynamodb:Scan
          Resource:
            - Fn::GetAtt: [SessionsTable, Arn]
            - Fn::Sub: "${SessionsTable.Arn}/index/*"
        - Effect: Allow
          Action:
            - execute-api:ManageConnections
          Resource:
            - Fn::Sub: "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${WebSocketApi}/*/*"

plugins:
  - serverless-webpack
  - serverless-offline

custom:
  webpack:
    webpackConfig: webpack.config.js
    includeModules:
      forceExclude:
        - aws-sdk
    packager: npm
    excludeFiles: src/**/*.test.js

  serverless-offline:
    httpPort: 3000
    websocketPort: 3001
    lambdaPort: 3002

functions:
  websocketHandler:
    handler: src/handlers/websocket-handler.handler
    events:
      - websocket:
          route: $connect
      - websocket:
          route: $disconnect  
      - websocket:
          route: $default
      - websocket:
          route: sendMessage

  sessionCleanup:
    handler: src/handlers/session-cleanup.handler
    events:
      - schedule: rate(1 hour)

resources:
  Resources:
    WebSocketApi:
      Type: AWS::ApiGatewayV2::Api
      Properties:
        Name: ${self:service}-websocket-${self:provider.stage}
        ProtocolType: WEBSOCKET
        RouteSelectionExpression: $request.body.action

    SessionsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-sessions-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: PK
            AttributeType: S
          - AttributeName: SK
            AttributeType: S
        KeySchema:
          - AttributeName: PK
            KeyType: HASH
          - AttributeName: SK
            KeyType: RANGE
        TimeToLiveSpecification:
          AttributeName: TTL
          Enabled: true
        StreamSpecification:
          StreamViewType: NEW_AND_OLD_IMAGES

  Outputs:
    WebSocketURI:
      Description: The WSS Protocol URI to connect to
      Value: 
        Fn::Sub: 'wss://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/${self:provider.stage}'
      Export:
        Name: ${self:service}-websocket-uri-${self:provider.stage}

    SessionsTableName:
      Description: DynamoDB table name for sessions
      Value: ${self:service}-sessions-${self:provider.stage}
      Export:
        Name: ${self:service}-sessions-table-${self:provider.stage}
```


### Step 2: Webpack Configuration

**Webpack Build Configuration**:[^12]

```javascript
// webpack.config.js
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    'websocket-handler': './src/handlers/websocket-handler.js',
    'session-cleanup': './src/handlers/session-cleanup.js'
  },
  output: {
    path: path.resolve(__dirname, '.webpack'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  externals: [
    nodeExternals({
      allowlist: ['uuid'] // Include specific packages in bundle
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: { node: '20' }
              }]
            ]
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true
  },
  resolve: {
    extensions: ['.js', '.json']
  }
};
```


### Step 3: Environment Configuration

**Development Environment Configuration**:[^4][^3]

```json
// config/development.json
{
  "logLevel": "debug",
  "corsOrigins": ["http://localhost:3000", "http://localhost:8080"],
  "sessionTimeout": 1800,
  "maxConversationHistory": 10,
  "rateLimiting": {
    "enabled": false,
    "maxRequestsPerMinute": 60
  },
  "monitoring": {
    "enabled": false
  }
}
```

**Production Environment Configuration**:

```json
// config/production.json
{
  "logLevel": "info", 
  "corsOrigins": ["https://yourdomain.com"],
  "sessionTimeout": 3600,
  "maxConversationHistory": 20,
  "rateLimiting": {
    "enabled": true,
    "maxRequestsPerMinute": 30
  },
  "monitoring": {
    "enabled": true,
    "metricsNamespace": "GenericChatbot"
  }
}
```

**Package Configuration**:[^13][^14]

```json
// package.json
{
  "name": "generic-enterprise-chatbot",
  "version": "1.0.0",
  "description": "Configurable enterprise chatbot powered by Perplexity AI",
  "main": "src/handlers/websocket-handler.js",
  "scripts": {
    "dev": "serverless offline start",
    "build": "webpack --mode=production",
    "deploy:dev": "serverless deploy --stage dev",
    "deploy:prod": "serverless deploy --stage prod", 
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "dependencies": {
    "@aws-sdk/client-apigatewaymanagementapi": "^3.400.0",
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "openai": "^4.20.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@babel/core": "^7.22.0",
    "@babel/preset-env": "^7.22.0",
    "babel-loader": "^9.1.0", 
    "eslint": "^8.45.0",
    "jest": "^29.6.0",
    "serverless": "^3.34.0",
    "serverless-offline": "^12.0.0",
    "serverless-webpack": "^5.13.0",
    "webpack": "^5.88.0",
    "webpack-node-externals": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "chatbot",
    "aws-lambda",
    "websocket",
    "perplexity-ai",
    "serverless"
  ]
}
```


## Security and Best Practices

### Step 1: Security Implementation

**Input Validation and Sanitization**:

```javascript
// utils/security.js
class SecurityManager {
  static validateMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message format');
    }

    const { text } = message;
    
    // Basic validation
    if (!text || typeof text !== 'string') {
      throw new Error('Message text is required and must be a string');
    }

    // Length validation
    if (text.length > 500) {
      throw new Error('Message too long');
    }

    // Basic content filtering
    if (this.containsHarmfulContent(text)) {
      throw new Error('Message contains inappropriate content');
    }

    return {
      ...message,
      text: this.sanitizeText(text)
    };
  }

  static sanitizeText(text) {
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove basic HTML characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .substring(0, 500); // Enforce length limit
  }

  static containsHarmfulContent(text) {
    const harmfulPatterns = [
      /script\s*:/i,
      /javascript\s*:/i,
      /<script/i,
      /eval\s*\(/i,
      /document\s*\./i
    ];

    return harmfulPatterns.some(pattern => pattern.test(text));
  }

  static validateCompanyId(companyId) {
    if (!companyId || typeof companyId !== 'string') {
      return 'generic';
    }

    // Only allow alphanumeric characters and hyphens
    const sanitized = companyId.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    return sanitized.substring(0, 50);
  }
}

module.exports = SecurityManager;
```


### Step 2: Rate Limiting Implementation

**Rate Limiting Service**:

```javascript
// services/rate-limiter.js
class RateLimiter {
  constructor(docClient, tableName) {
    this.docClient = docClient;
    this.tableName = tableName;
    this.defaultLimits = {
      requestsPerMinute: 30,
      requestsPerHour: 200
    };
  }

  async checkRateLimit(connectionId, limits = this.defaultLimits) {
    const now = Date.now();
    const minuteKey = Math.floor(now / 60000); // Current minute
    const hourKey = Math.floor(now / 3600000); // Current hour

    try {
      // Check minute limit
      const minuteCount = await this.getRequestCount(connectionId, 'minute', minuteKey);
      if (minuteCount >= limits.requestsPerMinute) {
        throw new Error('Rate limit exceeded: too many requests per minute');
      }

      // Check hour limit  
      const hourCount = await this.getRequestCount(connectionId, 'hour', hourKey);
      if (hourCount >= limits.requestsPerHour) {
        throw new Error('Rate limit exceeded: too many requests per hour');
      }

      // Increment counters
      await Promise.all([
        this.incrementCounter(connectionId, 'minute', minuteKey, 120), // TTL 2 minutes
        this.incrementCounter(connectionId, 'hour', hourKey, 7200) // TTL 2 hours
      ]);

      return true;
    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) {
        throw error;
      }
      // On error, allow request but log the issue
      console.error('Rate limiter error:', error);
      return true;
    }
  }

  async getRequestCount(connectionId, period, timeKey) {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `RATE_LIMIT#${connectionId}`,
          SK: `${period.toUpperCase()}#${timeKey}`
        }
      }));

      return result.Item?.count || 0;
    } catch (error) {
      console.error('Failed to get rate limit count:', error);
      return 0;
    }
  }

  async incrementCounter(connectionId, period, timeKey, ttlSeconds) {
    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;
    
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `RATE_LIMIT#${connectionId}`,
          SK: `${period.toUpperCase()}#${timeKey}`
        },
        UpdateExpression: 'ADD #count :inc SET #ttl = :ttl',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#ttl': 'TTL'
        },
        ExpressionAttributeValues: {
          ':inc': 1,
          ':ttl': ttl
        }
      }));
    } catch (error) {
      console.error('Failed to increment rate limit counter:', error);
    }
  }
}

module.exports = RateLimiter;
```


### Step 3: Monitoring and Logging

**Enhanced Logging Service**:

```javascript
// utils/logger.js
class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  log(level, message, meta = {}) {
    if (this.levels[level] > this.levels[this.logLevel]) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      service: 'generic-chatbot',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    };

    console.log(JSON.stringify(logEntry));
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

module.exports = new Logger();
```


## Testing Strategy

### Step 1: Unit Tests

**Service Testing Examples**:

```javascript
// tests/services/perplexity-service.test.js
const PerplexityService = require('../../src/services/perplexity-service');

describe('PerplexityService', () => {
  let perplexityService;
  let mockConfig;

  beforeEach(() => {
    perplexityService = new PerplexityService('test-api-key');
    mockConfig = {
      name: 'Test Company',
      description: 'Test description',
      urls: ['https://test.com'],
      strategicPriorities: ['Priority 1', 'Priority 2'],
      brandMessage: 'Test message',
      industry: 'Technology',
      supportedTopics: ['Topic 1'],
      responseStyle: 'professional',
      maxResponseTokens: 600,
      temperature: 0.4
    };
  });

  test('buildSystemPrompt creates proper prompt structure', () => {
    const prompt = perplexityService.buildSystemPrompt(mockConfig);
    
    expect(prompt).toContain('Test Company');
    expect(prompt).toContain('https://test.com');
    expect(prompt).toContain('Priority 1');
    expect(prompt).toContain('professional');
  });

  test('buildMessageContext formats messages correctly', () => {
    const systemPrompt = 'System prompt';
    const history = [
      { user: 'Question 1', assistant: 'Answer 1' },
      { user: 'Question 2', assistant: 'Answer 2' }
    ];
    const userMessage = 'Current question';

    const messages = perplexityService.buildMessageContext(systemPrompt, history, userMessage);

    expect(messages).toEqual({ role: 'system', content: systemPrompt });
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: userMessage });
    expect(messages).toHaveLength(6); // system + 2*history + user
  });

  test('getFallbackResponse returns appropriate message', () => {
    const fallback = perplexityService.getFallbackResponse(mockConfig);
    
    expect(fallback).toContain('technical difficulties');
    expect(fallback).toContain('https://test.com');
    expect(fallback).toContain('Test Company');
  });
});
```


### Step 2: Integration Tests

**WebSocket Handler Testing**:

```javascript
// tests/handlers/websocket-handler.integration.test.js
const { handler } = require('../../src/handlers/websocket-handler');

describe('WebSocket Handler Integration', () => {
  const mockContext = {
    connectionId: 'test-connection-id',
    stage: 'test',
    domainName: 'test.execute-api.us-east-1.amazonaws.com'
  };

  test('handles connection event', async () => {
    const event = {
      requestContext: {
        ...mockContext,
        routeKey: '$connect'
      },
      queryStringParameters: {
        company: 'test-company'
      }
    };

    const result = await handler(event, {});
    expect(result.statusCode).toBe(200);
  });

  test('handles message event', async () => {
    const event = {
      requestContext: {
        ...mockContext,
        routeKey: 'sendMessage'
      },
      body: JSON.stringify({
        text: 'Test message',
        sessionId: 'test-session'
      })
    };

    // Mock dependencies would be set up here
    const result = await handler(event, {});
    expect(result.statusCode).toBe(200);
  });

  test('handles invalid message format', async () => {
    const event = {
      requestContext: {
        ...mockContext,
        routeKey: 'sendMessage'
      },
      body: 'invalid json'
    };

    const result = await handler(event, {});
    expect(result.statusCode).toBe(500);
  });
});
```


## Performance Optimization

### Cold Start Optimization Strategies[^5][^12]

- **Minimize bundle size**: Use webpack for tree-shaking and code splitting
- **External SDK management**: Keep AWS SDK external to reduce package size
- **Connection pooling**: Initialize database connections outside handlers
- **Memory optimization**: Use appropriate Lambda memory settings (512MB recommended)
- **Provisioned concurrency**: For high-traffic applications


### Monitoring and Metrics

- **CloudWatch Integration**: Custom metrics for response times, error rates
- **X-Ray Tracing**: Distributed tracing for performance analysis
- **DynamoDB Metrics**: Monitor read/write capacity and throttling
- **WebSocket Connection Monitoring**: Track connection lifecycle and errors

This comprehensive implementation guide provides a robust, scalable, and configurable chatbot solution that can be adapted for any enterprise use case. The modular architecture, security features, and extensive configuration options make it suitable for deployment across diverse organizational contexts while maintaining high performance and reliability standards.
<span style="display:none">[^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34]</span>

<div style="text-align: center">⁂</div>

[^1]: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html

[^2]: https://github.com/serverless/serverless

[^3]: https://configu.com/blog/node-js-environment-variables-working-with-process-env-and-dotenv/

[^4]: https://dev.to/kylewcode/setting-up-custom-environment-variables-using-dotenv-and-node-config-24hg

[^5]: https://lumigo.io/learn/top-10-aws-lambda-best-practices/

[^6]: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html

[^7]: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html

[^8]: https://dev.to/nikolabintev/dynamodb-querycommand-in-aws-sdk-js-v3-1nlg

[^9]: https://dev.to/robertobutti/websocket-client-with-javascript-54ec

[^10]: https://arounda.agency/blog/chatbot-ui-examples

[^11]: https://www.serverless.com/examples/aws-node

[^12]: https://aws.amazon.com/blogs/compute/optimizing-node-js-dependencies-in-aws-lambda/

[^13]: https://www.reddit.com/r/devops/comments/1if4rzc/how_to_upload_a_lambda_function_with_nodejs_sdks/

[^14]: https://www.reddit.com/r/node/comments/z8rv26/i_made_an_open_source_nodejs_starter_template/

[^15]: https://ably.com/blog/web-app-websockets-nodejs

[^16]: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html

[^17]: https://awsfundamentals.com/blog/aws-lambda-environment-variables-best-practices-and-common-use-cases

[^18]: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html

[^19]: https://github.com/websockets/ws

[^20]: https://blog.johnbutler.dev/environment-variables-in-aws-lambda

[^21]: https://www.reddit.com/r/aws/comments/1hqx41o/how_does_aws_lambda_scaling_work_with_nodejs/

[^22]: https://stackoverflow.com/questions/48491694/how-get-environment-variables-from-lambda-nodejs-aws-sdk

[^23]: https://juji.io/docs/juji-studio/design/

[^24]: https://cci.drexel.edu/SeniorDesign/2016_2017/DrexelChatbot/DrexelChatbotDD.pdf

[^25]: https://www.reddit.com/r/node/comments/1812y77/using_env_variables_in_configjson/

[^26]: https://lirantal.com/blog/best-practices-for-bootstrapping-a-node-js-application-configuration

[^27]: https://botsailor.com/help/en/blog/generic-template-use-case-with-rcn-botsailor-chatbot-design-example

[^28]: https://lirantal.com/blog/environment-variables-configuration-anti-patterns-node-js-applications

[^29]: https://stackoverflow.com/questions/65612466/add-cors-options-to-aws-websocket-api-gateway

[^30]: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html

[^31]: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-examples.html

[^32]: https://stackoverflow.com/questions/68641214/accessing-environment-configs-defined-in-serverless-yaml-in-standalone-nodejs-sc

[^33]: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors-console.html

[^34]: https://stackoverflow.com/questions/67894959/how-to-access-amazon-dynamodb-via-javascript-aws-sdk-version-3-with-just-browser

[^35]: https://www.reddit.com/r/aws/comments/12t1pil/how_do_i_enable_cors_in_api_gateway_for_an_http/

