#!/bin/bash

# Rapid polling test to catch commands
echo "🔍 Rapid Command Polling Test"
echo "============================="

BATTLE_ID="0x1FEb2f5F4E711C054D7419fa5Fe9127012dd6932"
API_BASE="http://localhost:3000/api/arena/commands"

echo "📡 Starting rapid polling every 1 second..."
echo "This will help us catch commands as they're generated"
echo ""

for i in {1..200}; do
    timestamp=$(date '+%H:%M:%S')
    response=$(curl -s "${API_BASE}?battleId=${BATTLE_ID}")
    
    if [ $? -eq 0 ]; then
        has_command=$(echo "$response" | jq -r '.hasCommand // false')
        phase=$(echo "$response" | jq -r '.gameState.phase // "unknown"')
        round=$(echo "$response" | jq -r '.gameState.currentRound // 0')
        time_remaining=$(echo "$response" | jq -r '.gameState.timeRemaining // 0')
        game_state=$(echo "$response" | jq -r '.gameState.gameState // "unknown"')
        
        if [ "$has_command" = "true" ]; then
            echo "🎯 [$timestamp] COMMAND DETECTED!"
            echo "$response" | jq '.'
            echo "=================================="
        else
            echo "[$timestamp] Phase: $phase | Round: $round | Time: ${time_remaining}s | State: $game_state"
        fi
        
        if [ "$game_state" = "finished" ]; then
            echo "🏁 Battle finished!"
            break
        fi
    else
        echo "[$timestamp] ❌ API call failed"
    fi
    
    sleep 1
done
