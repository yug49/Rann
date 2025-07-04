# Production Checklist

This checklist should be completed before deploying the Rann platform to production environments.

## Backend Automation

-   [ ] Verify that the API server correctly identifies Ethereum addresses as battleIds

    -   Test by using a valid contract address as the battleId (run `./test-critical-gamestarted.sh`)
    -   Confirm in logs that `CRITICAL: battleId IS the contract address` appears
    -   **CRITICAL**: Verify that both `arenaAddress` and `contractAddress` in API responses match the battleId

-   [ ] Confirm contract address consistency

    -   Check that the same contract address is used for all operations (startGame and battle)
    -   Verify by checking the logs for address used in each transaction
    -   **IMPORTANT**: When battleId is an Ethereum address, it MUST be used as the contract address

-   [ ] Test timer accuracy

    -   Initial timer should be 70 seconds before startGame
    -   Round timers should be 40 seconds between rounds
    -   Verify by watching the logs during automation

-   [ ] Validate error handling
    -   Test with invalid contract addresses
    -   Ensure automation pauses when transactions fail
    -   Check that error messages are clear and actionable

## Smart Contracts

-   [ ] Complete audit of all contracts
-   [ ] Verify all contracts are properly deployed
-   [ ] Check that access controls are correctly implemented
-   [ ] Confirm game mechanics work as expected
-   [ ] Validate token economics

## Frontend

-   [ ] Test UI on multiple browsers and devices
-   [ ] Verify wallet connections work correctly
-   [ ] Check that game state updates properly
-   [ ] Test error handling and user feedback
-   [ ] Ensure animations and sounds work

## DevOps

-   [ ] Set up monitoring for the API servers
-   [ ] Configure alerting for failed transactions
-   [ ] Ensure proper logging is in place
-   [ ] Set up backup systems
-   [ ] Test failover scenarios

## Security

-   [ ] Audit API endpoints for security issues
-   [ ] Confirm private keys are stored securely
-   [ ] Check for any exposed sensitive information
-   [ ] Test rate limiting on all endpoints
-   [ ] Validate input sanitization

## Performance

-   [ ] Load test the API with simulated battles
-   [ ] Verify the system can handle multiple concurrent games
-   [ ] Check database performance under load
-   [ ] Monitor transaction confirmation times

## Final Verification

-   [ ] Run a complete game simulation in the production environment
-   [ ] Verify all transactions are successful
-   [ ] Confirm that the game progresses automatically
-   [ ] Check that the UI accurately reflects game state
