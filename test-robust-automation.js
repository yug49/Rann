// Simple test script for arena automation

const axios = require("axios");

const battleId = `sim${Date.now()}`;
const baseUrl = "http://localhost:3000/api/arena";

async function checkState() {
    const response = await axios.get(`${baseUrl}/${battleId}`);
    return response.data;
}

async function wait(seconds) {
    console.log(`Waiting ${seconds} seconds...`);
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function printState(message = "") {
    try {
        const state = await checkState();
        console.log(message);
        console.log(
            JSON.stringify(
                {
                    gameStarted: state.gameStarted,
                    timeRemaining: state.timeRemaining,
                    currentRound: state.currentRound,
                    gameState: state.gameState,
                    lastTransactionHash: state.lastTransactionHash,
                },
                null,
                2
            )
        );
        return state;
    } catch (error) {
        console.error("Failed to get state:", error.message);
        return null;
    }
}

async function main() {
    try {
        console.log(`\n=== Testing battle ${battleId} ===\n`);

        // Step 1: Initialize battle
        console.log("Step 1: Initializing battle");
        await axios.post(`${baseUrl}/${battleId}`, {
            action: "initialize",
            yodha1Id: 1,
            yodha2Id: 2,
        });

        // Step 2: Check initial state
        await printState("Initial state:");

        // Step 3: Wait 20 seconds and check again
        await wait(20);
        await printState("After 20 seconds:");

        // Step 4: Wait 60 more seconds (total 80s) - startGame should be called
        await wait(60);
        const stateAfterStartGame = await printState(
            "After 80 seconds (startGame should be called):"
        );

        // Verify gameStarted is true
        if (!stateAfterStartGame.gameStarted) {
            console.error("❌ ERROR: Game not started after 80 seconds!");
        } else {
            console.log("✅ Game started successfully");
        }

        // Step 5: Wait 50 seconds - first battle round should complete
        await wait(50);
        const stateAfterFirstRound = await printState(
            "After first battle round:"
        );

        // Verify round has increased
        if (stateAfterFirstRound.currentRound <= 1) {
            console.error("❌ ERROR: Round not increased after battle!");
        } else {
            console.log("✅ Battle round executed successfully");
        }

        // Step 6: Cleanup
        console.log("Cleaning up battle");
        await axios.post(`${baseUrl}/${battleId}`, { action: "cleanup" });
        console.log("✅ Test completed");
    } catch (error) {
        console.error("Test error:", error.message);
    }
}

main();
