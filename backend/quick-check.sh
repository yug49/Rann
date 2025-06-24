#!/bin/bash

# 🔍 Quick Backend Status Check
# Lightweight version for daily verification

echo "🎮 RANN BACKEND - QUICK STATUS CHECK"
echo "==================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Quick file checks
echo -e "${BLUE}📁 File Structure:${NC}"
[ -f "server-production.js" ] && echo "✅ Production server" || echo "❌ Production server missing"
[ -f "package.json" ] && echo "✅ Package.json" || echo "❌ Package.json missing"
[ -d "src" ] && echo "✅ Source directory" || echo "❌ Source directory missing"
[ -f "prisma/dev.db" ] && echo "✅ Database" || echo "❌ Database missing"

echo ""
echo -e "${BLUE}🔧 Dependencies:${NC}"
[ -d "node_modules" ] && echo "✅ Dependencies installed" || echo "❌ Run npm install"

echo ""
echo -e "${BLUE}🚀 Server Test:${NC}"
echo "Starting server..."

# Quick server test
timeout 8s node server-production.js &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server starts successfully"
    
    # Quick API test
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Health endpoint responds"
    else
        echo "❌ Health endpoint not responding"
    fi
    
    if curl -s http://localhost:3001/ > /dev/null 2>&1; then
        echo "✅ Root endpoint responds"
    else
        echo "❌ Root endpoint not responding"
    fi
    
    kill $SERVER_PID 2>/dev/null
    echo "✅ Server stopped cleanly"
else
    echo "❌ Server failed to start"
fi

echo ""
echo -e "${GREEN}🎉 Quick check complete!${NC}"
echo "For detailed verification, run: ./verify-setup.sh"
