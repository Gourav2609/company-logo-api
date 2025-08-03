#!/bin/bash

echo "🚀 Company Logo API Deployment Helper"
echo "======================================"

echo ""
echo "📋 Available deployment options:"
echo "1. Vercel (Recommended for Node.js APIs)"
echo "2. Railway (May have DNS issues)"
echo "3. Local testing"

echo ""
echo "💡 Recommended: Use Vercel for better reliability"
echo ""

# Check if running locally first
echo "🔍 Testing local server..."
npm start &
SERVER_PID=$!
sleep 3

# Test local health
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Local server is working"
    kill $SERVER_PID
else
    echo "❌ Local server has issues"
    kill $SERVER_PID 2>/dev/null
fi

echo ""
echo "📦 To deploy to Vercel:"
echo "1. Run: vercel login"
echo "2. Run: vercel --prod"
echo "3. Add environment variables in Vercel dashboard"
echo "4. Your API URL: https://company-logo-api.vercel.app/"

echo ""
echo "🌐 To deploy to Railway:"
echo "1. Install Railway CLI: npm install -g @railway/cli" 
echo "2. Run: railway login"
echo "3. Run: railway up"
