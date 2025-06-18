// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "../lib/forge-std/src/Script.sol";

contract HelperConfig is Script {
    error HelperConfig__ChainIdNotSupported();

    struct NetworkConfig {
        address gameMasterPublicKey;
        address cadenceArch;
        uint256 initialNumberOfQuestions;
        uint256[] initialQuestionsToOptions;
        uint256 costToInfluence;
        uint256 costToDefluence;
        uint256 betAmount;
        string initialIpfsCid;
    }

    address public constant GAME_MASTER_PUBLIC_KEY = address(0x123); // need to set this to the actual game master public key once the backend is ready
    uint256 public constant INITIAL_NUMBER_OF_QUESTIONS = 5;
    address public constant CADENCE_ARCH = 0x0000000000000000000000010000000000000001;
    uint256[] public s_initialQuestionsToOptions;
    uint256 public constant COST_TO_INFLUENCE = 0.00001 ether;
    uint256 public constant COST_TO_DEFLUENCE = 0.0001 ether;
    uint256 public constant BET_AMOUNT = 0.001 ether;
    string public constant INITIAL_IPFS_CID = "INITIAL_IPFS_CID"; // need to set this to the actual IPFS CID once the backend is ready

    NetworkConfig public activeNetworkConfig;

    constructor() {
        s_initialQuestionsToOptions = [4, 4, 4, 4, 4];

        if (block.chainid == 747) {
            activeNetworkConfig = getFlowTestnetNetworkConfig();
        } else if (block.chainid == 545) {
            activeNetworkConfig = getFlowMainnetNetworkConfig();
        } else {
            revert HelperConfig__ChainIdNotSupported();
        }
    }

    /**
     *  @notice Returns the active network configuration.
     */
    function getConfig() external view returns (NetworkConfig memory) {
        return activeNetworkConfig;
    }

    /**
     *  @notice Returns the network configuration for Flow Testnet.
     */
    function getFlowTestnetNetworkConfig() internal view returns (NetworkConfig memory _flowTestnetNetworkConfig) {
        _flowTestnetNetworkConfig = NetworkConfig({
            gameMasterPublicKey: GAME_MASTER_PUBLIC_KEY,
            cadenceArch: CADENCE_ARCH,
            initialNumberOfQuestions: INITIAL_NUMBER_OF_QUESTIONS,
            initialQuestionsToOptions: s_initialQuestionsToOptions,
            costToInfluence: COST_TO_INFLUENCE,
            costToDefluence: COST_TO_DEFLUENCE,
            betAmount: BET_AMOUNT,
            initialIpfsCid: INITIAL_IPFS_CID
        });
    }

    /**
     *   @notice Returns the network configuration for Flow Mainnet.
     */
    function getFlowMainnetNetworkConfig() internal view returns (NetworkConfig memory _sepoliaNotworkConfig) {
        _sepoliaNotworkConfig = NetworkConfig({
            gameMasterPublicKey: GAME_MASTER_PUBLIC_KEY,
            cadenceArch: CADENCE_ARCH,
            initialNumberOfQuestions: INITIAL_NUMBER_OF_QUESTIONS,
            initialQuestionsToOptions: s_initialQuestionsToOptions,
            costToInfluence: COST_TO_INFLUENCE,
            costToDefluence: COST_TO_DEFLUENCE,
            betAmount: BET_AMOUNT,
            initialIpfsCid: INITIAL_IPFS_CID
        });
    }
}
