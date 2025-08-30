# Generic Enterprise Chatbot

A configurable, generic chatbot solution using Node.js, AWS Lambda, API Gateway WebSockets, and DynamoDB. The system is designed to be company-agnostic and highly configurable, allowing any organization to deploy a knowledge-based chatbot powered by the Perplexity AI API.

## Features

- **Multi-company configuration support** - Currently configured for Vanguard
- **Strategic priorities integration** - Company-specific priorities and messaging
- **Real-time WebSocket communication** - Instant messaging experience
- **Session persistence** - Conversation history and context maintenance
- **Scalable serverless architecture** - AWS Lambda and DynamoDB
- **Popup chat widget interface** - Modern, responsive UI
- **Security features** - Input validation and sanitization
- **Comprehensive logging** - Structured logging for monitoring

## Architecture

### Technology Stack

- **Runtime**: Node.js 20.x (latest supported Lambda runtime)
- **Backend**: AWS Lambda with WebSocket API Gateway
- **Database**: DynamoDB for session management and configuration
- **AI Service**: Perplexity AI API for knowledge retrieval
- **Frontend**: Vanilla JavaScript WebSocket client
- **Deployment**: Serverless Framework for infrastructure management

### Core Components

1. **WebSocket Handler** (`src/handlers/websocket-handler.js`) - Main Lambda function for handling WebSocket connections and messages
2. **Perplexity Service** (`src/services/perplexity-service.js`) - Integration with Perplexity AI API
3. **Session Manager** (`src/services/session-manager.js`) - DynamoDB operations for session management
4. **Configuration Manager** (`src/utils/config-manager.js`) - Environment and company-specific configuration
5. **Chat Widget** (`static/js/generic-chat-widget.js`) - Frontend chat interface

## Quick Start

### Prerequisites

- Node.js 18+ installed
- AWS CLI configured with appropriate permissions
- Perplexity AI API key

### AWS Profile Setup

The application uses the "sitebot" AWS profile by default. Set up your AWS credentials:

```bash
# Configure AWS credentials for the sitebot profile
aws configure --profile sitebot

# Enter your AWS Access Key ID, Secret Access Key, and preferred region
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: us-east-1
# Default output format: json
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd generic-enterprise-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   export PERPLEXITY_API_KEY="your-perplexity-api-key"
   export NODE_ENV="development"
   export AWS_PROFILE="sitebot"
   ```

4. **Deploy to AWS**
   ```bash
   # Deploy to development environment
   npm run deploy:dev
   
   # Deploy to production environment
   npm run deploy:prod
   ```

### Local Development

1. **Start local development server**
   ```bash
   npm run dev
   ```

2. **Open the demo page**
   - Navigate to `static/index.html` in your browser
   - The chat widget will be available in the bottom-right corner

## Configuration

### Company Configuration

The system is currently configured for Vanguard. Company-specific settings are defined in `config/companies/company-config.js`:

```javascript
{
  "vanguard": {
    name: "Vanguard",
    description: "Leading investment management company...",
    urls: ["https://investor.vanguard.com", ...],
    strategicPriorities: ["Low-cost investing philosophy", ...],
    brandMessage: "Taking a long-term approach and keeping costs low",
    // ... more configuration
  }
}
```

### Environment Configuration

Environment-specific settings are in `config/development.json` and `config/production.json`:

```json
{
  "logLevel": "debug",
  "sessionTimeout": 1800,
  "maxConversationHistory": 10
}
```

### Frontend Widget Configuration

Configure the chat widget in your HTML:

```javascript
const vanguardConfig = {
  companyId: 'vanguard',
  companyName: 'Vanguard Assistant',
  websocketUrl: 'wss://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production',
  primaryColor: '#FF6B35',
  welcomeMessage: 'Hello! How can I help you with your Vanguard investments today?',
  placeholderText: 'Ask about funds, fees, accounts...',
  autoOpen: false,
  position: 'bottom-right'
};

const chatWidget = new GenericChatWidget(vanguardConfig);
```

## Deployment

### AWS Infrastructure

The Serverless Framework automatically creates:

- **API Gateway WebSocket API** - Handles WebSocket connections
- **Lambda Functions** - Process messages and manage sessions
- **DynamoDB Table** - Stores session data and conversation history
- **IAM Roles** - Secure permissions for Lambda functions

### Deployment Commands

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Deploy to specific region
serverless deploy --stage prod --region us-west-2
```

### Environment Variables

Required environment variables:

- `PERPLEXITY_API_KEY` - Your Perplexity AI API key
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## Usage

### Adding a New Company

1. **Add company configuration** in `config/companies/company-config.js`:
   ```javascript
   "newcompany": {
     name: "New Company",
     description: "Company description",
     urls: ["https://company.com"],
     strategicPriorities: ["Priority 1", "Priority 2"],
     brandMessage: "Company brand message",
     industry: "Industry",
     supportedTopics: ["Topic 1", "Topic 2"],
     responseStyle: "professional, helpful",
     maxResponseTokens: 600,
     temperature: 0.4
   }
   ```

2. **Update frontend configuration**:
   ```javascript
   const config = {
     companyId: 'newcompany',
     companyName: 'New Company Assistant',
     // ... other settings
   };
   ```

3. **Deploy the updated configuration**

### Customizing the Chat Widget

The chat widget supports extensive customization:

- **Position**: `bottom-right`, `bottom-left`, `top-right`, `top-left`
- **Colors**: Custom primary color
- **Messages**: Welcome message and placeholder text
- **Behavior**: Auto-open, connection retry settings
- **Styling**: Custom CSS classes and responsive design

## Security

### Input Validation

- Message length limits (500 characters)
- Content filtering for harmful patterns
- HTML sanitization
- Company ID validation

### AWS Security

- IAM roles with minimal required permissions
- DynamoDB encryption at rest
- API Gateway request validation
- Lambda function isolation

## Monitoring and Logging

### CloudWatch Integration

- Structured JSON logging
- Lambda function metrics
- DynamoDB performance monitoring
- API Gateway access logs

### Log Levels

- `debug` - Detailed debugging information
- `info` - General application flow
- `warn` - Warning conditions
- `error` - Error conditions

## Performance Optimization

### Cold Start Optimization

- Webpack bundling for smaller package sizes
- External SDK management
- Connection pooling
- Memory optimization (512MB recommended)

### DynamoDB Optimization

- Pay-per-request billing for variable workloads
- TTL for automatic session cleanup
- Efficient query patterns
- Connection reuse

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check API Gateway endpoint URL
   - Verify CORS settings
   - Ensure Lambda function is deployed

2. **Perplexity API Errors**
   - Verify API key is correct
   - Check API rate limits
   - Review error logs for specific issues

3. **Session Management Issues**
   - Check DynamoDB table permissions
   - Verify table exists and is accessible
   - Review session cleanup logs

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

1. Check the troubleshooting section
2. Review CloudWatch logs
3. Open an issue in the repository

## Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with additional AI providers
- [ ] Enhanced security features
- [ ] Mobile app support
