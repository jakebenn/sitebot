# Generic Enterprise Chatbot Web Interface

This is the web interface for the Generic Enterprise Chatbot, providing a static HTML/JavaScript frontend for user interaction.

## Structure

- `static/` - Static web files
  - `index.html` - Main HTML file
  - `js/` - JavaScript files
    - `generic-chat-widget.js` - Chat widget implementation

## Quick Start

```bash
# Install dependencies
npm install

# Serve the web app locally
npm run serve

# Or using Node.js http-server
npm run serve:node
```

## Usage

1. Start the web server: `npm run serve`
2. Open your browser to `http://localhost:8080`
3. The chat widget will connect to the deployed API endpoint

## Configuration

The web app connects to the API endpoint configured in `static/js/generic-chat-widget.js`. Make sure the API is deployed and the endpoint URL is correct.

## Development

The web app is a static application that can be served by any web server. For development, you can use:

- Python's built-in server: `python3 -m http.server 8080 --directory static`
- Node.js http-server: `npx http-server static -p 8080`
- Any other static file server
