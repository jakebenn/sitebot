# Generic Enterprise Chatbot Web Interface

A modern Next.js web application providing a beautiful, responsive interface for the Generic Enterprise Chatbot with real-time WebSocket communication.

## Features

- **Modern React/Next.js Architecture** - Built with TypeScript and Tailwind CSS
- **Real-time Chat Widget** - WebSocket-based communication with the API
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Static Export** - Can be deployed to any static hosting service
- **Vanguard Branding** - Customizable for different companies

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **WebSocket**: Native WebSocket API
- **Build**: Static export for deployment

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Building for Production

```bash
# Build the application
npm run build

# The static files will be generated in the out/ directory
```

### Static Deployment

```bash
# Build and serve locally
npm run build
npm run serve

# Deploy to AWS S3 + CloudFront
npm run deploy:s3
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main page component
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ChatWidget.tsx     # Chat widget component
└── types/                 # TypeScript type definitions
```

## Configuration

The chat widget can be configured with various props:

```tsx
<ChatWidget 
  companyId="vanguard"
  companyName="Vanguard Assistant"
  websocketUrl="wss://your-api-endpoint"
  primaryColor="#FF6B35"
  position="bottom-right"
  autoOpen={false}
  welcomeMessage="Hello! How can I help you?"
  placeholderText="Ask a question..."
/>
```

## Environment Variables

Create a `.env.local` file for environment-specific configuration:

```bash
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-api-endpoint
NEXT_PUBLIC_COMPANY_ID=vanguard
NEXT_PUBLIC_COMPANY_NAME=Vanguard Assistant
```

## Deployment

### AWS S3 + CloudFront (Recommended)

```bash
# Build the project
npm run build

# Deploy to S3 (requires AWS CLI configured)
npm run deploy:s3

# Or manually:
aws s3 sync out/ s3://your-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Other Static Hosting

The static export in the `out/` directory can be deployed to any static hosting service that supports static files.

## Customization

### Styling

The application uses Tailwind CSS for styling. You can customize the design by:

1. Modifying the `tailwind.config.js` file
2. Updating component styles in the JSX
3. Adding custom CSS in `globals.css`

### Company Branding

To customize for different companies:

1. Update the `companyId` and `companyName` props
2. Change the `primaryColor` to match brand colors
3. Modify the welcome message and placeholder text
4. Update the main page content and branding

## API Integration

The web app connects to the backend API via WebSocket. Make sure:

1. The API is deployed and accessible
2. The WebSocket URL is correctly configured
3. CORS is properly configured if needed
4. The API accepts the expected message format

## Development

### Adding New Components

```bash
# Create a new component
touch src/components/NewComponent.tsx
```

### Running Tests

```bash
# Run linting
npm run lint

# Type checking is done automatically by TypeScript
```

### Performance Optimization

- The app uses Next.js static export for optimal performance
- Images are optimized using Next.js Image component
- CSS is purged using Tailwind's purge feature
- JavaScript is minified and bundled automatically
