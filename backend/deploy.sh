#!/bin/bash

# 🎮 Rann Backend Quick Deploy Script
# Automated deployment for production environment

set -e

echo "🎮 ========================================"
echo "   Rann Backend Production Deployment"
echo "🎮 ========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Node.js version
echo -e "\n${BLUE}📋 Checking system requirements...${NC}"
node_version=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}⚠️  Yarn not found. Installing...${NC}"
    npm install -g yarn
fi
echo -e "${GREEN}✅ Yarn version: $(yarn -v)${NC}"

# Install dependencies
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
yarn install

# Generate Prisma client
echo -e "\n${BLUE}🗄️  Setting up database...${NC}"
yarn prisma:generate

# Check if database exists, if not create it
if [ ! -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}⚠️  Database not found. Creating...${NC}"
    yarn prisma:migrate
else
    echo -e "${GREEN}✅ Database found${NC}"
fi

# Test database connection
echo -e "\n${BLUE}🔍 Testing database connection...${NC}"
if yarn prisma db pull > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "\n${YELLOW}⚠️  Creating .env file...${NC}"
    cat > .env << EOF
# Database
DATABASE_URL="file:./prisma/dev.db"

# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000

# Authentication (configure these for production)
JWT_SECRET=rann-gaming-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
ADMIN_ADDRESSES=

# AI Services (for future implementation)
NEAR_AI_ENDPOINT=https://api.near.ai
OPENAI_API_KEY=

# Flow Blockchain (for future implementation)
FLOW_NETWORK=testnet
FLOW_PRIVATE_KEY=

# Filecoin Storage (for future implementation)
LIGHTHOUSE_API_KEY=
WEB3_STORAGE_TOKEN=
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Test the server startup
echo -e "\n${BLUE}🚀 Testing server startup...${NC}"
timeout 10s node server-production.js > /dev/null 2>&1 &
server_pid=$!
sleep 3

# Test if server is responding
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server startup successful${NC}"
    kill $server_pid 2>/dev/null || true
else
    echo -e "${RED}❌ Server startup failed${NC}"
    kill $server_pid 2>/dev/null || true
    exit 1
fi

# Run basic tests
echo -e "\n${BLUE}🧪 Running basic functionality tests...${NC}"
timeout 15s node server-production.js > /dev/null 2>&1 &
server_pid=$!
sleep 2

# Test core endpoints
test_passed=0
test_total=4

echo -e "${BLUE}   Testing server status...${NC}"
if curl -s http://localhost:3001/ | grep -q "Rann Backend Service"; then
    echo -e "${GREEN}   ✅ Server status: OK${NC}"
    ((test_passed++))
else
    echo -e "${RED}   ❌ Server status: FAIL${NC}"
fi

echo -e "${BLUE}   Testing health check...${NC}"
if curl -s http://localhost:3001/api/health | grep -q "healthy"; then
    echo -e "${GREEN}   ✅ Health check: OK${NC}"
    ((test_passed++))
else
    echo -e "${RED}   ❌ Health check: FAIL${NC}"
fi

echo -e "${BLUE}   Testing database connection...${NC}"
if curl -s http://localhost:3001/api/test/db | grep -q "Database connection successful"; then
    echo -e "${GREEN}   ✅ Database test: OK${NC}"
    ((test_passed++))
else
    echo -e "${RED}   ❌ Database test: FAIL${NC}"
fi

echo -e "${BLUE}   Testing nonce generation...${NC}"
if curl -s -X POST -H "Content-Type: application/json" \
   -d '{"address":"0x742d35Cc6635C0532925a3b8D8c0cCC04e5D4A3A"}' \
   http://localhost:3001/api/auth/nonce | grep -q "nonce"; then
    echo -e "${GREEN}   ✅ Nonce generation: OK${NC}"
    ((test_passed++))
else
    echo -e "${RED}   ❌ Nonce generation: FAIL${NC}"
fi

kill $server_pid 2>/dev/null || true

# Results
echo -e "\n${BLUE}📊 Test Results: ${test_passed}/${test_total} tests passed${NC}"

if [ $test_passed -eq $test_total ]; then
    echo -e "\n${GREEN}🎉 ===============================================${NC}"
    echo -e "${GREEN}   Deployment Successful!${NC}"
    echo -e "${GREEN}🎉 ===============================================${NC}"
    echo -e "\n${GREEN}🚀 Ready to start production server:${NC}"
    echo -e "${YELLOW}   yarn start:production${NC}"
    echo -e "${YELLOW}   # OR${NC}"
    echo -e "${YELLOW}   node server-production.js${NC}"
    echo -e "\n${GREEN}📡 Server will be available at:${NC}"
    echo -e "${BLUE}   http://localhost:3001${NC}"
    echo -e "\n${GREEN}📋 Available endpoints:${NC}"
    echo -e "${BLUE}   GET  /                     - Server status${NC}"
    echo -e "${BLUE}   GET  /api/health           - Health check${NC}"
    echo -e "${BLUE}   POST /api/auth/nonce       - Generate nonce${NC}"
    echo -e "${BLUE}   POST /api/traits/generate  - Generate traits${NC}"
    echo -e "${BLUE}   POST /api/training/start   - Start training${NC}"
    echo -e "${BLUE}   GET  /api/profile/:address - User profile${NC}"
    echo -e "\n${GREEN}📖 For detailed documentation, see:${NC}"
    echo -e "${BLUE}   DEPLOYMENT-GUIDE.md${NC}"
    exit 0
else
    echo -e "\n${RED}❌ ===============================================${NC}"
    echo -e "${RED}   Deployment Failed!${NC}"
    echo -e "${RED}❌ ===============================================${NC}"
    echo -e "\n${RED}🔍 Check the following:${NC}"
    echo -e "${YELLOW}   - Node.js version 18+${NC}"
    echo -e "${YELLOW}   - Database permissions${NC}"
    echo -e "${YELLOW}   - Port 3001 availability${NC}"
    echo -e "${YELLOW}   - Network connectivity${NC}"
    echo -e "\n${RED}📋 For troubleshooting, see:${NC}"
    echo -e "${BLUE}   DEPLOYMENT-GUIDE.md${NC}"
    exit 1
fi
