#!/bin/bash

# Monitor automation with improved 60-second timers
echo "🤖 Monitoring Improved Automation System"
echo "========================================"

BATTLE_ID="0x1FEb2f5F4E711C054D7419fa5Fe9127012dd6932"
API_BASE="http://localhost:3000/api/arena/commands"

monitor_progress() {
    local max_checks=20
    local check_count=0
    
    echo "📊 Monitoring automation progress..."
    
    while [ $check_count -lt $max_checks ]; do
        response=$(curl -s "${API_BASE}?battleId=${BATTLE_ID}")
        
        if [ $? -eq 0 ]; then
            game_state=$(echo "$response" | jq -r '.gameState.gameState // "unknown"')
            phase=$(echo "$response" | jq -r '.gameState.phase // "unknown"')
            current_round=$(echo "$response" | jq -r '.gameState.currentRound // 0')
            time_remaining=$(echo "$response" | jq -r '.gameState.timeRemaining // 0')
            
            echo "⏱️  $(date '+%H:%M:%S') | Phase: $phase | Round: $current_round | Time: ${time_remaining}s"
            
            if [ "$game_state" = "finished" ]; then
                echo "🏁 Automation completed successfully!"
                break
            fi
        else
            echo "❌ Failed to get status"
        fi
        
        sleep 10
        check_count=$((check_count + 1))
    done
}

# Start monitoring
monitor_progress

echo ""
echo "📋 Final Status Check:"
curl -s "${API_BASE}?battleId=${BATTLE_ID}" | jq '.'
