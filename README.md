# Generic Enterprise Chatbot

A configurable enterprise chatbot powered by Perplexity AI, built with AWS Lambda, WebSocket API Gateway, and Next.js.

## Project Structure

```
site-agent/
├── services/
│   ├── api/                    # Backend API (AWS Lambda + WebSocket)
│   │   ├── src/               # Lambda function source code
│   │   ├── tests/             # API test suite
│   │   ├── serverless.yml     # Serverless Framework config
│   │   └── package.json       # API dependencies
│   └── web/                   # Frontend (Next.js)
│       ├── src/               # Next.js source code
│       ├── out/               # Static export directory
│       ├── scripts/           # Deployment scripts
│       └── package.json       # Web dependencies
├── package.json               # Root package.json (monorepo)
└── README.md                  # This file
```

## Core Components

### Backend API (`services/api/`)
- **WebSocket Handler**: Real-time chat communication
- **Session Manager**: DynamoDB session persistence
- **Perplexity Service**: AI response generation
- **Configuration Manager**: Company-specific settings

### Frontend Web App (`services/web/`)
- **Next.js 14**: Modern React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Chat Widget**: Real-time WebSocket chat component
- **Static Export**: Deployable to any static hosting

## Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured with `sitebot` profile
- Perplexity API key

### Installation

```bash
# Install all dependencies
npm run setup

# Or install individually:
npm install
cd services/api && npm install
cd ../web && npm install
```

### Development

```bash
# Start API development server
npm run dev:api

# Start web development server
npm run dev:web

# Run API tests
npm run test:api
```

### Deployment

```bash
# Deploy API to AWS
npm run deploy:api:dev    # Development environment
npm run deploy:api:prod   # Production environment

# Deploy web app to S3
npm run deploy:web:s3     # Build and deploy to S3
```

## Environment Configuration

### API Environment Variables
Create `.env.local` in the root directory:

```bash
# AWS Configuration
AWS_PROFILE=sitebot
AWS_REGION=us-east-1

# Perplexity AI
PERPLEXITY_API_KEY=your-api-key

# Company Configuration
COMPANY_ID=vanguard
```

### Web App Environment Variables
Create `.env.local` in `services/web/`:

```bash
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-api-gateway-url
NEXT_PUBLIC_COMPANY_ID=vanguard
NEXT_PUBLIC_COMPANY_NAME=Vanguard Assistant
```

## Testing

### API Tests
```bash
# Run all API tests
npm run test:api

# Run specific tests
cd services/api
npm run test:websocket
npm run test:connectivity
```

### Web App
The web app uses Next.js built-in testing capabilities and TypeScript for type checking.

## Deployment

### API Deployment
The API is deployed using Serverless Framework to AWS:
- Lambda functions for WebSocket handling
- API Gateway for WebSocket connections
- DynamoDB for session storage

### Web App Deployment
The web app is built as a static export and deployed to AWS S3:

```bash
# Build and deploy to S3
npm run deploy:web:s3

# Or manually:
cd services/web
npm run build
aws s3 sync out/ s3://your-bucket --delete
```

See `services/web/S3-SETUP.md` for detailed S3 setup instructions.

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Next.js Web   │ ◄─────────────► │   AWS Lambda    │
│     App         │                 │   Functions     │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
    Static Files                        DynamoDB
    (S3 Hosted)                         Sessions
```

## Customization

### Company Configuration
Update company settings in `services/api/src/config/companies/`:
- Company name and branding
- AI model parameters
- Response templates
- WebSocket endpoints

### Web App Styling
Customize the web app in `services/web/src/`:
- Tailwind CSS classes
- Component styling
- Brand colors and themes

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check API Gateway endpoint URL
   - Verify Lambda function permissions
   - Check CloudWatch logs

2. **API Responses Not Working**
   - Verify Perplexity API key
   - Check company configuration
   - Review Lambda function logs

3. **S3 Deployment Issues**
   - Ensure AWS credentials are configured
   - Check S3 bucket permissions
   - Verify bucket policy

### Logs and Monitoring
- **API Logs**: CloudWatch Logs for Lambda functions
- **WebSocket Logs**: API Gateway CloudWatch logs
- **Web App**: Browser developer tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:api`
5. Submit a pull request

## License

This project is licensed under the MIT License.
