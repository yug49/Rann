#!/bin/bash

# Test script for startGame reset detection
BATTLE_ID="0x1FEb2f5F4E711C054D7419fa5Fe9127012dd6932"
API_BASE="http://localhost:3000/api/arena/commands"

echo "🧪 Testing StartGame Reset Detection"
echo "===================================="

# Initialize automation with fast timer for testing
echo "🚀 Initializing automation..."
response=$(curl -X POST -H "Content-Type: application/json" \
     "${API_BASE}?battleId=${BATTLE_ID}" \
     -d '{"action":"initialize","yodha1Id":1,"yodha2Id":2}')

echo "Response: $response"

# Monitor the automation process
echo ""
echo "📡 Monitoring automation process..."
echo "This will track:"
echo "  1. Initial 70s countdown"
echo "  2. StartGame command generation"
echo "  3. Contract verification (10s after startGame)"
echo "  4. Either game progression OR timer reset"
echo ""

for i in {1..100}; do
    echo "⏰ Check $i:"
    response=$(curl -s "${API_BASE}?battleId=${BATTLE_ID}")
    
    # Extract phase and timeRemaining
    phase=$(echo "$response" | jq -r '.gameState.phase // "unknown"')
    timeRemaining=$(echo "$response" | jq -r '.gameState.timeRemaining // "unknown"')
    currentRound=$(echo "$response" | jq -r '.gameState.currentRound // "unknown"')
    hasCommand=$(echo "$response" | jq -r '.hasCommand // false')
    
    if [ "$hasCommand" = "true" ]; then
        action=$(echo "$response" | jq -r '.command.action // "unknown"')
        echo "🎮 COMMAND READY: $action"
    else
        echo "📊 Phase: $phase | Round: $currentRound | Time: ${timeRemaining}s"
    fi
    
    # Special attention to verification phase
    if [ "$phase" = "verifying" ]; then
        echo "🔍 VERIFICATION PHASE - Checking contract state..."
    fi
    
    # Break if game finished
    if echo "$response" | jq -e '.gameState.gameState == "finished"' > /dev/null; then
        echo "🏁 Game finished!"
        break
    fi
    
    sleep 2
done

echo "✅ Test completed!"
