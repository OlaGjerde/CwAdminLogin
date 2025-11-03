#!/bin/bash

# Frontend Production Deployment Script
# Deploys to AWS S3: dev.calwincloud.com

set -e  # Exit on error

echo "🚀 CalWin Admin - Frontend Production Deployment"
echo "================================================"
echo ""

# Configuration
S3_BUCKET="your-s3-bucket-name"  # TODO: Update with actual bucket name
CLOUDFRONT_DIST_ID="YOUR_DIST_ID"  # TODO: Update with CloudFront distribution ID
BUILD_DIR="dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf $BUILD_DIR
echo "${GREEN}✅ Clean complete${NC}"
echo ""

# Step 2: Install dependencies (if needed)
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}⚠️  node_modules not found, installing...${NC}"
    yarn install
else
    echo "${GREEN}✅ Dependencies OK${NC}"
fi
echo ""

# Step 3: Run production build
echo "🔨 Building production bundle..."
yarn build

if [ $? -ne 0 ]; then
    echo "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo "${GREEN}✅ Build successful${NC}"
echo ""

# Step 4: Verify build output
echo "📊 Build output:"
ls -lh $BUILD_DIR
echo ""

# Step 5: Confirm deployment
echo "${YELLOW}⚠️  Ready to deploy to S3: s3://$S3_BUCKET/${NC}"
echo "${YELLOW}⚠️  Target URL: https://dev.calwincloud.com${NC}"
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

# Step 6: Upload to S3
echo "☁️  Uploading to S3..."
aws s3 sync $BUILD_DIR/ s3://$S3_BUCKET/ \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "index.html" \
    --exclude "*.json"

# Upload index.html and JSON files with no-cache
aws s3 cp $BUILD_DIR/index.html s3://$S3_BUCKET/index.html \
    --cache-control "no-cache, no-store, must-revalidate"

if [ -f "$BUILD_DIR/build-info.json" ]; then
    aws s3 cp $BUILD_DIR/build-info.json s3://$S3_BUCKET/build-info.json \
        --cache-control "no-cache, no-store, must-revalidate"
fi

echo "${GREEN}✅ Upload complete${NC}"
echo ""

# Step 7: Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DIST_ID \
    --paths "/*"

echo "${GREEN}✅ Cache invalidation started${NC}"
echo ""

# Step 8: Deployment summary
echo "🎉 Deployment Complete!"
echo "======================="
echo "Frontend URL: https://dev.calwincloud.com"
echo "Build Version: $(cat $BUILD_DIR/build-info.json 2>/dev/null | grep version || echo 'N/A')"
echo "Timestamp: $(date)"
echo ""
echo "${GREEN}✅ All done! Visit https://dev.calwincloud.com to test.${NC}"
