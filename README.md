# Rann: Modular Ethereum DApp with NEAR Agents

Rann is a modular, extensible decentralized application (DApp) for Ethereum, designed to support a rich gaming ecosystem with on-chain assets, battles, and marketplace features. It leverages NEAR agents for advanced battle logic and cross-chain interactions.

## Features

- **RannToken (ERC20):** Native utility and governance token for the ecosystem.
- **YodhaNFT (ERC721):** Unique, upgradable warrior NFTs with attributes and traits.
- **Bazaar (Marketplace):** Buy, sell, and trade NFTs and in-game assets.
- **Gurukul:** Training and upgrading system for YodhaNFTs.
- **Kurukshetra (Battle Arena):** On-chain battle system powered by NEAR agents for advanced logic and randomness.
- **Accounts & Game Accounts:** User and game account management for seamless onboarding.
- **Upgradeable & Modular Contracts:** Built with OpenZeppelin for security and upgradability.
- **NEAR Agents Integration:** Off-chain agents on NEAR protocol for battle computation, randomness, and cross-chain features.
- **Comprehensive Testing:** Extensive test suite using Foundry (Forge).

## Project Structure

- `src/` — Main Solidity contracts (token, NFTs, marketplace, battle, etc.)
- `script/` — Deployment and helper scripts
- `test/` — Foundry test contracts
- `lib/` — External dependencies (OpenZeppelin, forge-std, etc.)

## Getting Started

### Build

```shell
forge build
```

### Test

```shell
forge test
```

### Format

```shell
forge fmt
```

### Gas Snapshots

```shell
forge snapshot
```

### Local Node

```shell
anvil
```

### Deploy

```shell
forge script script/DeployRann.s.sol:DeployRann --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
cast <subcommand>
```

## Documentation

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/)
- NEAR Agents: [NEAR Protocol](https://near.org/)

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements, features, or bug fixes.

## License

This project is licensed under the MIT License.
