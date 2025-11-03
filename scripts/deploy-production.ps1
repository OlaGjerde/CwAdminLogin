# Frontend Production Deployment Script (Windows PowerShell)
# Deploys to AWS S3: dev.calwincloud.com

# Configuration
$S3_BUCKET = "your-s3-bucket-name"  # TODO: Update with actual bucket name
$CLOUDFRONT_DIST_ID = "YOUR_DIST_ID"  # TODO: Update with CloudFront distribution ID
$BUILD_DIR = "dist"

Write-Host "🚀 CalWin Admin - Frontend Production Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous build
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path $BUILD_DIR) {
    Remove-Item -Recurse -Force $BUILD_DIR
}
Write-Host "✅ Clean complete" -ForegroundColor Green
Write-Host ""

# Step 2: Check dependencies
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found, installing..." -ForegroundColor Yellow
    yarn install
} else {
    Write-Host "✅ Dependencies OK" -ForegroundColor Green
}
Write-Host ""

# Step 3: Run production build
Write-Host "🔨 Building production bundle..." -ForegroundColor Yellow
yarn build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Step 4: Verify build output
Write-Host "📊 Build output:" -ForegroundColor Yellow
Get-ChildItem $BUILD_DIR -Recurse | Measure-Object -Property Length -Sum | Select-Object Count, @{Name="Size (MB)";Expression={[math]::Round($_.Sum / 1MB, 2)}}
Write-Host ""

# Step 5: Confirm deployment
Write-Host "⚠️  Ready to deploy to S3: s3://$S3_BUCKET/" -ForegroundColor Yellow
Write-Host "⚠️  Target URL: https://dev.calwincloud.com" -ForegroundColor Yellow
$confirm = Read-Host "Continue with deployment? (y/n)"

if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 1
}

# Step 6: Upload to S3
Write-Host "☁️  Uploading to S3..." -ForegroundColor Yellow

# Upload all files except index.html and JSON files with long cache
Write-Host "  Uploading assets with cache..."
aws s3 sync $BUILD_DIR/ s3://$S3_BUCKET/ `
    --delete `
    --cache-control "public, max-age=31536000" `
    --exclude "index.html" `
    --exclude "*.json"

# Upload index.html with no-cache
Write-Host "  Uploading index.html with no-cache..."
aws s3 cp "$BUILD_DIR/index.html" "s3://$S3_BUCKET/index.html" `
    --cache-control "no-cache, no-store, must-revalidate"

# Upload build-info.json if exists
if (Test-Path "$BUILD_DIR/build-info.json") {
    Write-Host "  Uploading build-info.json..."
    aws s3 cp "$BUILD_DIR/build-info.json" "s3://$S3_BUCKET/build-info.json" `
        --cache-control "no-cache, no-store, must-revalidate"
}

Write-Host "✅ Upload complete" -ForegroundColor Green
Write-Host ""

# Step 7: Invalidate CloudFront cache
Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Yellow
aws cloudfront create-invalidation `
    --distribution-id $CLOUDFRONT_DIST_ID `
    --paths "/*"

Write-Host "✅ Cache invalidation started" -ForegroundColor Green
Write-Host ""

# Step 8: Deployment summary
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host "Frontend URL: https://dev.calwincloud.com"
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""
Write-Host "✅ All done! Visit https://dev.calwincloud.com to test." -ForegroundColor Green
