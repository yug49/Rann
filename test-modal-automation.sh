#!/bin/bash

# Test script to verify modal UI automation works correctly
BATTLE_ID="0x1FEb2f5F4E711C054D7419fa5Fe9127012dd6932"
API_BASE="http://localhost:3000/api/arena/commands"

echo "🎯 Testing Modal UI Automation System"
echo "====================================="

# Initialize automation
echo "🚀 Initializing automation..."
curl -X POST -H "Content-Type: application/json" "${API_BASE}?battleId=${BATTLE_ID}" \
     -d '{"action":"initialize","yodha1Id":1,"yodha2Id":2}'
echo ""

# Check status every 2 seconds for 20 seconds
echo "📡 Monitoring automation status..."
for i in {1..10}; do
    echo "⏰ Check $i:"
    response=$(curl -s "${API_BASE}?battleId=${BATTLE_ID}")
    echo "$response" | jq -r 'if .hasCommand then "🎮 COMMAND AVAILABLE: " + .command.action else "⏳ Time remaining: " + (.gameState.timeRemaining | tostring) + "s" end'
    
    # If command is available, show it
    if echo "$response" | jq -e '.hasCommand' > /dev/null; then
        echo "📤 Command details:"
        echo "$response" | jq '.command'
        break
    fi
    
    sleep 2
done

echo "✅ Test completed!"
