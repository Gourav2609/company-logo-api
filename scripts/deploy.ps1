# Company Logo API Deployment Helper for Windows PowerShell

Write-Host "🚀 Company Logo API Deployment Helper" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Available deployment options:" -ForegroundColor Yellow
Write-Host "1. Vercel (Recommended for Node.js APIs)" -ForegroundColor Cyan
Write-Host "2. Railway (May have DNS issues)" -ForegroundColor Cyan  
Write-Host "3. Local testing" -ForegroundColor Cyan

Write-Host ""
Write-Host "💡 Recommended: Use Vercel for better reliability" -ForegroundColor Magenta
Write-Host ""

# Test local server first
Write-Host "🔍 Testing local API endpoints..." -ForegroundColor Yellow

# Check if we can start the server locally
try {
    Write-Host "Testing health endpoint..." -ForegroundColor Gray
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Local server is responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Local server might not be running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 To deploy to Vercel:" -ForegroundColor Green
Write-Host "1. Run: vercel login" -ForegroundColor White
Write-Host "2. Run: vercel --prod" -ForegroundColor White
Write-Host "3. Add environment variables in Vercel dashboard:" -ForegroundColor White
Write-Host "   - NEON_DATABASE_URL" -ForegroundColor Gray
Write-Host "   - IMGBB_API_KEY" -ForegroundColor Gray
Write-Host "4. Your API URL: https://company-logo-api.vercel.app/" -ForegroundColor Cyan

Write-Host ""
Write-Host "🌐 To troubleshoot Railway:" -ForegroundColor Blue
Write-Host "1. Install Railway CLI: npm install -g @railway/cli" -ForegroundColor White
Write-Host "2. Run: railway login" -ForegroundColor White
Write-Host "3. Run: railway status" -ForegroundColor White
Write-Host "4. Check logs: railway logs" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Quick fixes for Railway DNS issues:" -ForegroundColor Red
Write-Host "- Wait 10-15 minutes for DNS propagation" -ForegroundColor White
Write-Host "- Try: railway domain" -ForegroundColor White
Write-Host "- Check if service is sleeping: railway ps" -ForegroundColor White
