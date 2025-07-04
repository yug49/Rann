# Kurukshetra Arena Automation System

## Overview

This document outlines the robust backend automation system for the Kurukshetra game, specifically focusing on how the API handles contract interactions for startGame and battle functions.

## Critical Requirements

### 1. Contract Address Resolution

-   **When battleId is an Ethereum address**: The system always uses the battleId directly as the contract address
-   **When battleId is not an Ethereum address**: The system uses a consistent mapping algorithm to assign an arena address

### IMPORTANT UPDATE (July 2, 2025)

We've implemented additional safeguards to ensure that when battleId is a valid Ethereum address:

1. The address is always returned in both `arenaAddress` and `contractAddress` API fields
2. The address is explicitly stored in the game state object
3. The system performs multiple validation checks to ensure the correct address is used
4. Multiple fixes to ensure consistency across all API endpoints (GET, POST, status)

### 2. Timing Requirements

-   **Initial delay**: 70 seconds before calling startGame
-   **Round interval**: 40 seconds between rounds for battle calls

### 3. Contract Interaction Safety

-   Contract bytecode verification before calling startGame
-   Transaction verification and error handling (automation pauses on failure)
-   Consistent address usage between startGame and battle calls
-   Comprehensive logging for all address mapping decisions

## Address Resolution Logic

### In `getKurukshetraContractAddress` function:

```typescript
// If the battleId is already a valid address, use it directly
if (battleId.startsWith("0x") && battleId.length === 42) {
    console.log(`📍 CRITICAL: battleId IS the contract address: ${battleId}`);
    // Always cache it to ensure consistency
    arenaAddressCache.set(battleId, battleId);
    return battleId;
}
```

### In the startGame and battle functions:

Both functions implement similar logic:

```typescript
// CRITICAL: Double-check if battleId is a contract address itself
let contractAddress;
if (battleId.startsWith("0x") && battleId.length === 42) {
    console.log(`🔴 CRITICAL: Using battleId as contract address: ${battleId}`);
    contractAddress = battleId;
} else {
    contractAddress = await getKurukshetraContractAddress(battleId);
}
```

## Initialization Logic

When initializing a new battle session:

```typescript
// CRITICAL: If battleId is an Ethereum address, treat it as the contract address
if (battleId.startsWith("0x") && battleId.length === 42) {
    console.log(
        `🔴 CRITICAL: battleId IS an Ethereum address - using it as contract address: ${battleId}`
    );
    // Force cache the address immediately
    arenaAddressCache.set(battleId, battleId);
}
```

## Testing

### Test Scripts

1. `test-arena-api.sh` - Tests arena address mapping
2. `test-critical-gamestarted.sh` - Tests address consistency when battleId is an Ethereum address
3. `test-robust-automation.js` - Tests the entire automation flow

### Test with Ethereum Address as battleId

```bash
# Use a real contract address as battleId
./test-critical-gamestarted.sh
```

### Test with Non-Ethereum Address as battleId

```bash
# Use a simulation battleId
./test-robust-automation.js
```

## Debugging

The system includes extensive logging with clear prefixes:

-   `📍 CRITICAL:` - Important address mapping decisions
-   `🔴 CRITICAL:` - Critical operations that affect contract interaction
-   `⚠️ WARNING:` - Potential issues that need attention
-   `✅` - Successful operations
-   `❌` - Errors

## How to Verify

1. Check logs for `📍 CRITICAL:` messages to confirm address mapping
2. Verify `arenaAddress` in the API responses matches the expected contract
3. Check for `✅ Using consistent address:` logs to confirm consistency
4. Monitor transaction hashes to ensure proper contract interaction

## Important Notes

-   Always check that both startGame and battle are called on the same contract
-   The system caches arena addresses to ensure consistency throughout a session
-   If you need to use a specific arena, provide it in the initialization request
