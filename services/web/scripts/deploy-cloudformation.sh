#!/bin/bash

# CloudFormation Deployment Script for S3 Website
# Usage: ./scripts/deploy-cloudformation.sh [stack-name] [bucket-name]

set -e

# Configuration
STACK_NAME=${1:-"sitebot-website"}
BUCKET_NAME=${2:-"sitebot-web"}
REGION=${AWS_REGION:-"us-east-1"}
AWS_PROFILE=${AWS_PROFILE:-"sitebot"}

echo "🚀 Starting CloudFormation deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
    echo "❌ AWS credentials not configured for profile '$AWS_PROFILE'. Please run 'aws configure --profile $AWS_PROFILE' first."
    exit 1
fi

# Check if CloudFormation template exists
TEMPLATE_FILE="cloudformation/s3-website.yaml"
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ CloudFormation template not found: $TEMPLATE_FILE"
    exit 1
fi

echo "📋 Deploying CloudFormation stack: $STACK_NAME"
echo "🪣 S3 Bucket: $BUCKET_NAME"
echo "🌍 Region: $REGION"
echo "👤 AWS Profile: $AWS_PROFILE"

# Deploy CloudFormation stack
aws cloudformation deploy \
    --template-file "$TEMPLATE_FILE" \
    --stack-name "$STACK_NAME" \
    --parameter-overrides BucketName="$BUCKET_NAME" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION" \
    --profile "$AWS_PROFILE"

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack deployed successfully!"
    
    # Get stack outputs
    echo "📊 Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
    
    # Get the website URL
    WEBSITE_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
        --output text)
    
    echo ""
    echo "🎉 S3 website setup complete!"
    echo "🌐 Website URL: $WEBSITE_URL"
    echo ""
    echo "📝 Next steps:"
    echo "1. Build the Next.js app: npm run build"
    echo "2. Deploy to S3: aws s3 sync out/ s3://$BUCKET_NAME --delete --profile $AWS_PROFILE"
    echo "3. Or use the deployment script: npm run deploy:s3"
    
else
    echo "❌ CloudFormation deployment failed"
    exit 1
fi
