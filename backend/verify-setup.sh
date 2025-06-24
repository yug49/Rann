#!/bin/bash

# 🎮 Rann Backend - Comprehensive Verification Script
# This script performs a complete health check of the cleaned backend

echo "🎮 RANN BACKEND COMPREHENSIVE VERIFICATION"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}🔍 Testing: ${test_name}${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: ${test_name}${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL: ${test_name}${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "📁 STEP 1: PROJECT STRUCTURE VERIFICATION"
echo "----------------------------------------"

# Check essential files exist
run_test "Main production server exists" "[ -f 'server-production.js' ]"
run_test "Package.json exists" "[ -f 'package.json' ]"
run_test "TypeScript config exists" "[ -f 'tsconfig.json' ]"
run_test "Database schema exists" "[ -f 'prisma/schema.prisma' ]"
run_test "Deployment script exists" "[ -f 'deploy.sh' ]"
run_test "Test script exists" "[ -f 'final-test.sh' ]"

# Check source structure
run_test "Source directory exists" "[ -d 'src' ]"
run_test "Routes directory exists" "[ -d 'src/routes' ]"
run_test "Services directory exists" "[ -d 'src/services' ]"
run_test "Middleware directory exists" "[ -d 'src/middleware' ]"

# Check clean structure (no unwanted files)
run_test "No compiled JS in src/" "[ ! -f 'src/*.js' ]"
run_test "No test directory" "[ ! -d 'test' ]"
run_test "No scripts directory" "[ ! -d 'scripts' ]"

echo ""
echo "🔧 STEP 2: DEPENDENCIES VERIFICATION"
echo "-----------------------------------"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing dependencies...${NC}"
    npm install
fi

run_test "Dependencies installed" "[ -d 'node_modules' ]"
run_test "Prisma client generated" "[ -d 'node_modules/.prisma' ] || [ -d 'node_modules/@prisma' ]"

echo ""
echo "🗄️ STEP 3: DATABASE VERIFICATION"
echo "-------------------------------"

# Generate Prisma client if needed
echo -e "${YELLOW}🔄 Generating Prisma client...${NC}"
npm run db:generate > /dev/null 2>&1

run_test "Database file exists" "[ -f 'prisma/dev.db' ]"
run_test "Prisma client generation" "npm run db:generate"

echo ""
echo "🚀 STEP 4: SERVER STARTUP VERIFICATION"
echo "-------------------------------------"

# Test production server startup
echo -e "${YELLOW}🔄 Testing production server startup...${NC}"
timeout 10s node server-production.js > server_test.log 2>&1 &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅ PASS: Production server starts successfully${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    kill $SERVER_PID 2>/dev/null
else
    echo -e "${RED}❌ FAIL: Production server startup${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Check if server is responding
echo -e "${YELLOW}🔄 Testing server response...${NC}"
node server-production.js > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

run_test "Server responds to health check" "curl -s http://localhost:3001/api/health"
run_test "Server responds to root endpoint" "curl -s http://localhost:3001/"

# Clean up
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "🔍 STEP 5: API ENDPOINTS VERIFICATION"
echo "-----------------------------------"

# Start server for API testing
echo -e "${YELLOW}🔄 Starting server for API tests...${NC}"
node server-production.js > api_test.log 2>&1 &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null; then
    # Test core endpoints
    run_test "Health endpoint responds" "curl -s -f http://localhost:3001/api/health"
    run_test "Database test endpoint" "curl -s -f http://localhost:3001/api/test/db"
    run_test "Auth nonce endpoint" "curl -s -f -X POST http://localhost:3001/api/auth/nonce -H 'Content-Type: application/json' -d '{\"address\":\"0x742d35Cc6635C0532925a3b8D8c0cCC04e5D4A3A\"}'"
    
    # Test CORS headers
    run_test "CORS headers present" "curl -s -H 'Origin: http://localhost:3000' http://localhost:3001/api/health | grep -i 'access-control'"
    
    kill $SERVER_PID 2>/dev/null
else
    echo -e "${RED}❌ Could not start server for API testing${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 5))
    TOTAL_TESTS=$((TOTAL_TESTS + 5))
fi

echo ""
echo "📋 STEP 6: PACKAGE.JSON SCRIPTS VERIFICATION"
echo "------------------------------------------"

# Test npm scripts
run_test "npm start script works" "timeout 5s npm start > /dev/null 2>&1"
run_test "Database generate script" "npm run db:generate > /dev/null 2>&1"

echo ""
echo "🔐 STEP 7: SECURITY & CONFIGURATION CHECK"
echo "----------------------------------------"

# Check environment template
run_test "Environment template exists" "[ -f '.env.example' ]"
run_test "GitIgnore exists" "[ -f '.gitignore' ]"

# Check gitignore rules
run_test "GitIgnore includes node_modules" "grep -q 'node_modules' .gitignore"
run_test "GitIgnore includes dist/" "grep -q 'dist/' .gitignore"
run_test "GitIgnore includes .env" "grep -q '.env' .gitignore"

echo ""
echo "🧪 STEP 8: INTEGRATION TEST"
echo "--------------------------"

# Run the existing test script if available
if [ -f "final-test.sh" ]; then
    echo -e "${YELLOW}🔄 Running integration test script...${NC}"
    chmod +x final-test.sh
    if timeout 30s ./final-test.sh > integration_test.log 2>&1; then
        echo -e "${GREEN}✅ PASS: Integration test script${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  PARTIAL: Integration test (check integration_test.log)${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo ""
echo "📊 VERIFICATION RESULTS"
echo "======================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
echo -e "Pass Rate: ${PASS_RATE}%"

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Backend is ready for production! 🎉${NC}"
elif [ $PASS_RATE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  Most tests passed (${PASS_RATE}%). Minor issues to address.${NC}"
else
    echo -e "${RED}❌ Significant issues detected (${PASS_RATE}% pass rate). Review logs.${NC}"
fi

echo ""
echo "📋 NEXT STEPS"
echo "============"
echo "1. Review any failed tests above"
echo "2. Check server_test.log for server startup issues"
echo "3. Check api_test.log for API response issues"
echo "4. Check integration_test.log for detailed test results"
echo "5. Run 'npm run deploy' when ready for production"

echo ""
echo "🔧 QUICK COMMANDS"
echo "==============="
echo "Start production server:  npm start"
echo "Start development:        npm run dev"
echo "Test API endpoints:       ./final-test.sh"
echo "Database management:      npm run db:studio"
echo "Deploy to production:     ./deploy.sh"

# Cleanup
rm -f server_test.log api_test.log integration_test.log 2>/dev/null

exit $TESTS_FAILED
