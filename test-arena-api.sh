#!/bin/bash

# Test script for arena address mapping
BATTLE_ID="sim$(date +%s)"
API_URL="http://localhost:3000/api/arena/$BATTLE_ID"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}TESTING ARENA ADDRESS MAPPING${NC}"

# Test 1: Initialize with specific arena address
ARENA_ADDRESS="0x1234567890123456789012345678901234567890"
echo -e "${YELLOW}Test 1: Initializing battle with specific arena address${NC}"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"initialize\",\"arenaAddress\":\"$ARENA_ADDRESS\"}" | jq .

# Wait a bit
echo -e "${YELLOW}Waiting 5 seconds...${NC}"
sleep 5

# Check if arena address was set correctly
echo -e "${YELLOW}Checking arena mapping:${NC}"
curl -s -X GET "$API_URL" | jq .

# Clean up
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup"}' > /dev/null

echo -e "${GREEN}✅ Test completed${NC}"
