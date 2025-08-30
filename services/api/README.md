# Generic Enterprise Chatbot API

This is the API service for the Generic Enterprise Chatbot, providing WebSocket-based communication and AI-powered responses using Perplexity AI.

## Structure

- `src/` - Source code
  - `handlers/` - AWS Lambda handlers
  - `services/` - Business logic services
  - `utils/` - Utility functions
- `config/` - Configuration files
- `scripts/` - Deployment and utility scripts
- `tests/` - Test files
- `serverless.yml` - Serverless Framework configuration

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy to dev
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Run locally
npm run dev
```

## Environment Variables

Create a `.env.local` file in the API directory:

```bash
PERPLEXITY_API_KEY=your-perplexity-api-key
AWS_PROFILE=sitebot
```

## Testing

```bash
# Run all tests
npm test

# Run WebSocket tests
npm run test:websocket:automated

# Run connectivity tests
npm run test:connectivity
```
