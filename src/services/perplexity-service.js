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
      // Check if this is a dummy key for local development
      if (this.client.apiKey === 'dummy-key-for-local-dev') {
        return this.getLocalDevelopmentResponse(userMessage, companyConfig);
      }

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

      return response.choices[0].message.content.trim();
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
    return `I apologize, but I'm experiencing technical difficulties right now. For immediate assistance, please visit our official website at ${companyConfig.urls[0] || 'our website'} or contact our support team directly. I'll be back online shortly to help with your ${companyConfig.name} questions.`;
  }

  getLocalDevelopmentResponse(userMessage, companyConfig) {
    const responses = [
      `Hello! This is a local development response for ${companyConfig.name}. I'm here to help with your questions about ${companyConfig.name.toLowerCase()} investments, funds, and services.`,
      `Thanks for your message: "${userMessage}". In a real deployment, I would provide detailed information about ${companyConfig.name}'s investment products and services.`,
      `This is a development environment for the ${companyConfig.name} chatbot. I can help you with questions about our low-cost investing philosophy, retirement planning, and account management.`,
      `Welcome to the ${companyConfig.name} assistant! I'm currently running in development mode. I can help you understand our investor-owned structure and long-term wealth building strategies.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

module.exports = PerplexityService;
