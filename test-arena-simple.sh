#!/bin/bash

# Simple test for arena automation API
BATTLE_ID="sim$(date +%s)"
API_URL="http://localhost:3000/api/arena/$BATTLE_ID"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to get state
get_state() {
  curl -s -X GET "$API_URL" | jq '{ gameStarted, timeRemaining, currentRound, gameState, lastTransactionHash }'
}

# Step 1: Initialize battle
echo -e "${YELLOW}STEP 1: Initializing battle $BATTLE_ID${NC}"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"initialize","yodha1Id":1,"yodha2Id":2}' > /dev/null

echo -e "\n${YELLOW}Initial state:${NC}"
get_state

# Step 2: Wait 20 seconds
echo -e "\n${YELLOW}Waiting 20 seconds...${NC}"
sleep 20

echo -e "\n${YELLOW}State after 20 seconds:${NC}"
get_state

# Step 3: Wait 60 more seconds (total 80s) - startGame should be called
echo -e "\n${YELLOW}Waiting 60 more seconds for startGame...${NC}"
sleep 60

echo -e "\n${YELLOW}State after startGame should be called:${NC}"
STATE=$(get_state)
echo "$STATE"

# Check if gameStarted is true
if echo "$STATE" | grep -q '"gameStarted": true'; then
  echo -e "\n${GREEN}✅ Game started successfully${NC}"
else
  echo -e "\n${RED}❌ ERROR: Game not started after timer expired!${NC}"
fi

# Step 4: Wait 50 seconds - first battle round should complete
echo -e "\n${YELLOW}Waiting 50 seconds for first battle round...${NC}"
sleep 50

echo -e "\n${YELLOW}State after first battle round:${NC}"
STATE=$(get_state)
echo "$STATE"

# Check if round has increased
ROUND=$(echo "$STATE" | jq '.currentRound')
if [ "$ROUND" -gt 1 ]; then
  echo -e "\n${GREEN}✅ Battle round executed successfully, now at round $ROUND${NC}"
else
  echo -e "\n${RED}❌ ERROR: Round not increased after battle!${NC}"
fi

# Step 5: Clean up
echo -e "\n${YELLOW}Cleaning up battle${NC}"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup"}' > /dev/null

echo -e "\n${GREEN}✅ Test completed${NC}"
