#!/bin/bash

# Test script for arena automation flow
echo "🎮 Testing Arena Automation Flow"
echo "================================="

BATTLE_ID="0x1234567890123456789012345678901234567890"
BASE_URL="http://localhost:3000/api/arena/battle-final"

echo "1. Initializing battle..."
curl -X POST "${BASE_URL}?battleId=${BATTLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize", "yodha1Id": 1, "yodha2Id": 2}' \
  -s | jq .

echo ""
echo "2. Checking status after 5 seconds..."
sleep 5
curl -X GET "${BASE_URL}?battleId=${BATTLE_ID}" -s | jq .

echo ""
echo "3. Checking status after 75 seconds (should have called startGame)..."
echo "   Waiting 70 more seconds..."
sleep 70
curl -X GET "${BASE_URL}?battleId=${BATTLE_ID}" -s | jq .

echo ""
echo "4. Checking status after 45 more seconds (should have called first NEXT ROUND)..."
sleep 45
curl -X GET "${BASE_URL}?battleId=${BATTLE_ID}" -s | jq .

echo ""
echo "5. Cleaning up..."
curl -X POST "${BASE_URL}?battleId=${BATTLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup"}' \
  -s | jq .

echo ""
echo "✅ Test completed!"
