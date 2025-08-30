const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (error) {
    // .env.local file doesn't exist or can't be loaded, continue without it
  }
}

class ConfigurationManager {
  constructor() {
    this.config = null;
    this.loadConfiguration();
  }

  loadConfiguration() {
    try {
      // Load environment-specific configuration
      const environment = process.env.NODE_ENV || 'development';
      const configPath = path.join(__dirname, '../../config', `${environment}.json`);
      
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Override with environment variables
      this.config = {
        ...this.config,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        dynamoDbTable: process.env.DYNAMODB_TABLE_NAME,
        websocketApiEndpoint: process.env.WEBSOCKET_API_ENDPOINT,
        defaultCompany: process.env.DEFAULT_COMPANY || 'vanguard',
        logLevel: process.env.LOG_LEVEL || 'info'
      };
      
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw new Error('Configuration loading failed');
    }
  }

  getCompanyConfig(companyId) {
    const companyConfigurations = require('../../config/companies/company-config');
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
