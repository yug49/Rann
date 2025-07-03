# Rann Game Platform

A web3 gaming platform featuring Kurukshetra battle arenas built with Foundry.

## Components

-   **Smart Contracts**: Solidity contracts for the Rann ecosystem

    -   `Kurukshetra`: The main battle arena contract
    -   `YodhaNFT`: NFT representing warriors
    -   `RannToken`: The platform's native token
    -   `Bazaar`: Marketplace for in-game assets
    -   `Gurukul`: Training ground for warriors

-   **Frontend**: Next.js web application
    -   Implements game UI and interactions
    -   Connects to smart contracts via web3 providers

## Backend Automation System

The platform features a robust backend automation system that handles game progression automatically:

-   **Automatic Game Execution**: The system automatically starts games and executes battle rounds
-   **Timer-based Progression**:
    -   70 seconds before calling startGame
    -   40 seconds between battle rounds
-   **Contract Address Resolution**:
    -   If battleId is an Ethereum address, it's used directly as the contract address
    -   Otherwise, a consistent mapping ensures the same battleId always uses the same arena

For detailed information on the automation system, see [ARENA_AUTOMATION_SYSTEM.md](./ARENA_AUTOMATION_SYSTEM.md).

## Foundry

Foundry is a blazing fast, portable and modular toolkit for Ethereum application development.

-   **Forge**: Ethereum testing framework
-   **Cast**: Tool for interacting with EVM smart contracts
-   **Anvil**: Local Ethereum node
-   **Chisel**: Solidity REPL

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## Testing the Backend Automation

```shell
# Test arena address mapping
./test-arena-api.sh

# Test using contract address as battleId
./test-critical-gamestarted.sh

# Test full automation flow
node test-robust-automation.js
```

## Additional Documentation

-   [Arena Automation System](./ARENA_AUTOMATION_SYSTEM.md) - Details about the automated backend system
-   [Production Checklist](./PRODUCTION_CHECKLIST.md) - Pre-deployment checklist
