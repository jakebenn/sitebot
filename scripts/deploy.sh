#!/bin/bash

# Generic Enterprise Chatbot Deployment Script
# This script helps deploy the chatbot to AWS using Serverless Framework

set -e

# Load environment variables from .env.local if it exists
if [ -f ".env.local" ]; then
    echo "[INFO] Loading environment variables from .env.local"
    # Use a more robust way to load environment variables
    while IFS= read -r line; do
        # Skip comments and empty lines
        if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ -n "$line" ]]; then
            # Export the variable
            export "$line"
        fi
    done < .env.local
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ensure Node 18 is used (via nvm if available)
ensure_node_18() {
    local current_node_ver
    if command -v node >/dev/null 2>&1; then
        current_node_ver=$(node -v)
    else
        current_node_ver="not-installed"
    fi

    # If node is not v18, try to switch with nvm
    if ! echo "$current_node_ver" | grep -q "^v18\."; then
        # Load nvm if available
        export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
        if [ -s "$NVM_DIR/nvm.sh" ]; then
            # shellcheck disable=SC1090
            . "$NVM_DIR/nvm.sh"
        fi
        if command -v nvm >/dev/null 2>&1; then
            print_status "Switching to Node 18 using nvm..."
            nvm install 18 >/dev/null 2>&1 || true
            nvm use 18 >/dev/null 2>&1 || true
        else
            print_warning "nvm not found. Current Node is $current_node_ver. For local dev, use Node 18 to avoid ESM issues."
            print_status "Install nvm: https://github.com/nvm-sh/nvm and run: nvm install 18 && nvm use 18"
        fi
    fi

    if command -v node >/dev/null 2>&1; then
        print_status "Using Node $(node -v)"
    else
        print_error "Node.js is not installed. Please install Node 18+."
        exit 1
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command_exists serverless; then
        print_warning "Serverless Framework is not installed globally. Installing..."
        npm install -g serverless
    fi
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    # Check AWS credentials
    # Check AWS credentials with sitebot profile
    if ! aws sts get-caller-identity --profile sitebot >/dev/null 2>&1; then
        print_error "AWS credentials for 'sitebot' profile are not configured. Please run 'aws configure --profile sitebot' first."
        exit 1
    fi
    
    print_success "All prerequisites are met!"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "Dependencies installed successfully!"
    else
        print_status "Dependencies already installed, skipping..."
    fi
}

# Function to validate environment variables
validate_env_vars() {
    print_status "Validating environment variables..."
    
    if [ -z "$PERPLEXITY_API_KEY" ]; then
        print_warning "PERPLEXITY_API_KEY environment variable is not set."
        print_status "Please add it to your .env.local file: PERPLEXITY_API_KEY=your-api-key"
        print_status "Or set it directly: export PERPLEXITY_API_KEY='your-api-key'"
        
        # For local development, allow dummy key
        if [ "$1" = "local" ]; then
            export PERPLEXITY_API_KEY="dummy-key-for-local-dev"
            print_status "Using dummy API key for local development"
        else
            exit 1
        fi
    fi
    
    if [ -z "$NODE_ENV" ]; then
        print_warning "NODE_ENV not set, defaulting to 'development'"
        export NODE_ENV="development"
    fi
    
    print_success "Environment variables validated!"
}

# Function to build the project
build_project() {
    print_status "Building project..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Project built successfully!"
    else
        print_error "Build failed!"
        exit 1
    fi
}

# Function to deploy to AWS
deploy_to_aws() {
    local stage=$1
    local region=$2
    
    print_status "Deploying to AWS (stage: $stage, region: $region)..."
    
    # Set environment variables for deployment
    export STAGE=$stage
    export REGION=$region
    
    # Deploy using serverless with sitebot profile
    serverless deploy --stage $stage --region $region --aws-profile sitebot
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully!"
        
        # Get the WebSocket URL from the deployment output
        local websocket_url=$(serverless info --stage $stage --region $region --aws-profile sitebot | grep "WebSocketURI" | awk '{print $2}')
        
        if [ ! -z "$websocket_url" ]; then
            print_success "WebSocket URL: $websocket_url"
            print_status "Update your frontend configuration with this URL"
        fi
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev     - Deploy to development environment"
    echo "  prod    - Deploy to production environment"
    echo "  local   - Start local development server"
    echo "  clean   - Clean build artifacts"
    echo "  help    - Show this help message"
    echo ""
    echo "Options:"
    echo "  --region REGION  - AWS region (default: us-east-1)"
    echo "  --stage STAGE    - Deployment stage (default: dev for dev, prod for prod)"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 prod --region us-west-2"
    echo "  $0 local"
}

# Function to clean build artifacts
clean_build() {
    print_status "Cleaning build artifacts..."
    
    rm -rf .serverless/
    rm -rf .webpack/
    rm -rf node_modules/
    
    print_success "Build artifacts cleaned!"
}

# Function to start local development
start_local() {
    print_status "Starting local development server..."
    
    # Check if serverless-offline is installed
    if ! npm list serverless-offline >/dev/null 2>&1; then
        print_warning "serverless-offline not found, installing..."
        npm install --save-dev serverless-offline
    fi
    
    npm run dev
}

# Main script logic
main() {
    local command=$1
    local region="us-east-1"
    local stage=""
    
    # Parse command line arguments
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --region)
                region="$2"
                shift 2
                ;;
            --stage)
                stage="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    case $command in
        dev)
            stage=${stage:-"dev"}
            ensure_node_18
            check_prerequisites
            validate_env_vars
            install_dependencies
            build_project
            deploy_to_aws $stage $region
            ;;
        prod)
            stage=${stage:-"prod"}
            ensure_node_18
            check_prerequisites
            validate_env_vars
            install_dependencies
            build_project
            deploy_to_aws $stage $region
            ;;
        local)
            ensure_node_18
            check_prerequisites
            validate_env_vars "local"
            install_dependencies
            start_local
            ;;
        clean)
            clean_build
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
