#!/bin/bash

# S3 Deployment Script for Next.js Static Export
# Usage: ./scripts/deploy-s3.sh [bucket-name] [cloudfront-distribution-id]

set -e

# Configuration
BUCKET_NAME=${1:-"your-s3-bucket-name"}
CLOUDFRONT_DISTRIBUTION_ID=${2:-"your-cloudfront-distribution-id"}
REGION=${AWS_REGION:-"us-east-1"}
AWS_PROFILE=${AWS_PROFILE:-"sitebot"}

echo "🚀 Starting S3 deployment..."

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

# Build the Next.js app
echo "📦 Building Next.js application..."
npm run build

if [ ! -d "out" ]; then
    echo "❌ Build failed - 'out' directory not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Sync to S3
echo "📤 Syncing to S3 bucket: $BUCKET_NAME"
aws s3 sync out/ s3://$BUCKET_NAME --delete --region $REGION --profile $AWS_PROFILE

if [ $? -eq 0 ]; then
    echo "✅ Successfully synced to S3"
else
    echo "❌ Failed to sync to S3"
    exit 1
fi

# Invalidate CloudFront cache if distribution ID is provided
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ] && [ "$CLOUDFRONT_DISTRIBUTION_ID" != "your-cloudfront-distribution-id" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*" \
        --region $REGION \
        --profile $AWS_PROFILE
    
    if [ $? -eq 0 ]; then
        echo "✅ CloudFront cache invalidation initiated"
    else
        echo "⚠️  CloudFront cache invalidation failed, but deployment was successful"
    fi
else
    echo "ℹ️  Skipping CloudFront invalidation (no distribution ID provided)"
fi

echo "🎉 Deployment completed successfully!"
echo "🌐 Your site should be available at: https://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo "   (or your custom domain if configured)"
