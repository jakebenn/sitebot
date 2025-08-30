const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
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
      // Always query for any active session for this connection first
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `CONNECTION#${connectionId}`
        },
        ScanIndexForward: false, // Get most recent first
        Limit: 1
      };
      
      const result = await this.docClient.send(new QueryCommand(params));
      const session = result.Items?.[0] || null;
      
      if (session) {
        logger.debug('Session found', { connectionId, sessionId: session.SessionId, requestedSessionId: sessionId });
        return session;
      }
      
      logger.warn('No session found for connection', { connectionId, requestedSessionId: sessionId });
      return null;
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

    // Build dynamic update expression for specific fields only
    Object.keys(updateData).forEach(key => {
      const placeholder = `:${key.toLowerCase()}`;
      updateExpression.push(`#${key} = ${placeholder}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[placeholder] = updateData[key];
    });

    // Handle TTL as a reserved keyword
    updateExpression.push('LastActivity = :lastActivity', '#TTL = :ttl');
    expressionAttributeNames['#TTL'] = 'TTL';

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
