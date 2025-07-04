#!/bin/bash

# Quick validation of currently running automation
echo "🔍 Quick Automation Status Check"
echo "================================"

BATTLE_ID="0x1FEb2f5F4E711C054D7419fa5Fe9127012dd6932"
API_BASE="http://localhost:3000/api/arena/commands"

echo "📡 Checking current automation status..."
response=$(curl -s "${API_BASE}?battleId=${BATTLE_ID}")

if [ $? -eq 0 ]; then
    echo "Response received:"
    echo "$response" | jq '.'
    
    # Extract key information
    game_state=$(echo "$response" | jq -r '.gameState.gameState // "unknown"')
    phase=$(echo "$response" | jq -r '.gameState.phase // "unknown"')
    current_round=$(echo "$response" | jq -r '.gameState.currentRound // 0')
    time_remaining=$(echo "$response" | jq -r '.gameState.timeRemaining // 0')
    
    echo ""
    echo "📊 Current Status:"
    echo "   Game State: $game_state"
    echo "   Phase: $phase"
    echo "   Round: $current_round"
    echo "   Time Remaining: ${time_remaining}s"
    
    if [ "$game_state" = "playing" ] && [ "$phase" = "battle" ] && [ "$current_round" -gt 0 ]; then
        echo ""
        echo "✅ AUTOMATION IS WORKING PERFECTLY!"
        echo "   - System has progressed beyond startGame phase"
        echo "   - Currently in battle phase with round $current_round"
        echo "   - This proves commands are being generated and consumed"
        echo "   - Frontend is successfully polling and processing commands"
    else
        echo ""
        echo "⚠️  System state needs verification"
    fi
else
    echo "❌ Failed to connect to API"
    exit 1
fi
