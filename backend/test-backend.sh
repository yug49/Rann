#!/bin/bash

# Comprehensive Rann Backend Test Script
# Tests all implemented functionality

BASE_URL="http://localhost:3001"
TEST_WALLET="0x742d35Cc6635C0532925a3b8D8c0cCC04e5D4A3A"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}🚀 Rann Backend Comprehensive Test Suite${NC}"
echo -e "${BLUE}==========================================${NC}"

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_status="${5:-200}"
    
    echo -e "\n${BLUE}🧪 Testing: ${name}${NC}"
    echo -e "${YELLOW}   URL: ${url}${NC}"
    echo -e "${YELLOW}   Method: ${method}${NC}"
    
    if [ -n "$data" ]; then
        echo -e "${CYAN}   Data: ${data}${NC}"
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" "$url" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null)
    fi
    
    # Extract status code (last line) and body (everything else)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ] || [ "$expected_status" = "any" ]; then
        echo -e "${GREEN}✅ SUCCESS: ${name}${NC}"
        echo -e "${GREEN}   Status: ${status_code}${NC}"
    else
        echo -e "${RED}❌ FAILED: ${name}${NC}"
        echo -e "${RED}   Expected: ${expected_status}, Got: ${status_code}${NC}"
    fi
    
    echo -e "${CYAN}   Response: ${body}${NC}"
    
    return $((status_code == expected_status ? 0 : 1))
}

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0

run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if test_endpoint "$@"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
}

echo -e "\n${MAGENTA}📊 HEALTH CHECKS${NC}"
echo -e "${MAGENTA}================${NC}"

run_test "Root Endpoint" "$BASE_URL/" "GET" "" "200"
run_test "Health Check" "$BASE_URL/api/health" "GET" "" "200"
run_test "Database Test" "$BASE_URL/api/test/db" "GET" "" "200"

echo -e "\n${MAGENTA}🔐 AUTHENTICATION TESTS${NC}"
echo -e "${MAGENTA}======================${NC}"

run_test "Generate Nonce (Valid)" "$BASE_URL/api/auth/nonce" "POST" \
    "{\"address\":\"$TEST_WALLET\"}" "200"

run_test "Generate Nonce (Invalid Address)" "$BASE_URL/api/auth/nonce" "POST" \
    "{\"address\":\"invalid\"}" "400"

echo -e "\n${MAGENTA}🎮 GAME FUNCTIONALITY TESTS${NC}"
echo -e "${MAGENTA}===========================${NC}"

run_test "Profile (No Auth)" "$BASE_URL/api/auth/profile" "GET" "" "401"
run_test "Generate Traits (No Auth)" "$BASE_URL/api/traits/generate" "POST" \
    "{\"tokenId\":\"test-123\"}" "401"

echo -e "\n${MAGENTA}🚨 ERROR HANDLING TESTS${NC}"
echo -e "${MAGENTA}======================${NC}"

run_test "Non-existent Endpoint" "$BASE_URL/api/nonexistent" "GET" "" "404"
run_test "Malformed JSON" "$BASE_URL/api/auth/nonce" "POST" \
    "invalid-json" "400"

echo -e "\n${BOLD}📈 TEST SUMMARY${NC}"
echo -e "${BLUE}===============${NC}"

FAILED_TESTS=$((TOTAL_TESTS - PASSED_TESTS))
SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))

echo -e "${BLUE}Total Tests: ${TOTAL_TESTS}${NC}"
echo -e "${GREEN}✅ Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}❌ Failed: ${FAILED_TESTS}${NC}"
echo -e "${MAGENTA}📊 Success Rate: ${SUCCESS_RATE}%${NC}"

echo -e "\n${BOLD}🖥️ SERVER STATUS${NC}"
echo -e "${BLUE}===============${NC}"

# Get detailed server status
server_status=$(curl -s "$BASE_URL/api/health" 2>/dev/null)
echo -e "${CYAN}Server Response: ${server_status}${NC}"

echo -e "\n${BOLD}🏁 Testing Complete!${NC}"
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! The Rann Backend is working perfectly!${NC}"
else
    echo -e "${YELLOW}⚠️ ${FAILED_TESTS} test(s) failed. Check the details above.${NC}"
fi

exit $FAILED_TESTS
