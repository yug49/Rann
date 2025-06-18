// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {DeployRann} from "../script/DeployRann.s.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";
import {YodhaNFT} from "../src/Chaavani/YodhaNFT.sol";
import {Bazaar} from "../src/Bazaar/Bazaar.sol";
import {Gurukul} from "../src/Gurukul/Gurukul.sol";
import {KurukshetraFactory} from "../src/Kurukshetra/KurukshetraFactory.sol";
import {RannToken} from "../src/RannToken.sol";
import {IYodhaNFT} from "../src/Interfaces/IYodhaNFT.sol";
import {IERC721Receiver} from "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";

contract DeploymentScriptsTest is Test, IERC721Receiver {
    DeployRann deployer;
    HelperConfig helperConfig;

    // Test constants - these should match the actual values in HelperConfig
    address constant GAME_MASTER_PUBLIC_KEY = address(0x123); // Use a valid address for testing
    uint256 constant INITIAL_NUMBER_OF_QUESTIONS = 5;
    address constant CADENCE_ARCH = 0x0000000000000000000000010000000000000001;
    uint256 constant COST_TO_INFLUENCE = 0.00001 ether;
    uint256 constant COST_TO_DEFLUENCE = 0.0001 ether;
    uint256 constant BET_AMOUNT = 0.001 ether;
    string constant INITIAL_IPFS_CID = "INITIAL_IPFS_CID"; // Match the actual value in HelperConfig
    address constant TEST_DAO = address(0x456); // Test DAO address

    // IERC721Receiver implementation
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function setUp() public {
        deployer = new DeployRann();
    }

    // Helper function to set up a valid DAO address for deployment
    function setupValidDeployment() internal {
        // Set the DAO address in the deployer contract
        // Since s_dao is public in DeployRann, we need to call a function to set it
        // But since there's no setter, we'll need to work around this

        // For now, we'll use vm.store to directly modify the storage
        // This is a hack but necessary since the DeployRann doesn't have a proper DAO setup
        bytes32 daoSlot = bytes32(uint256(6)); // s_dao is likely at slot 6 based on contract structure
        vm.store(address(deployer), daoSlot, bytes32(uint256(uint160(TEST_DAO))));
    }

    ////////////////////////////
    // HelperConfig Tests      //
    ////////////////////////////

    function testHelperConfigConstants() public {
        // Set a supported chain ID first
        vm.chainId(747);

        helperConfig = new HelperConfig();

        assertEq(helperConfig.GAME_MASTER_PUBLIC_KEY(), GAME_MASTER_PUBLIC_KEY);
        assertEq(helperConfig.INITIAL_NUMBER_OF_QUESTIONS(), INITIAL_NUMBER_OF_QUESTIONS);
        assertEq(helperConfig.CADENCE_ARCH(), CADENCE_ARCH);
        assertEq(helperConfig.COST_TO_INFLUENCE(), COST_TO_INFLUENCE);
        assertEq(helperConfig.COST_TO_DEFLUENCE(), COST_TO_DEFLUENCE);
        assertEq(helperConfig.BET_AMOUNT(), BET_AMOUNT);
        assertEq(helperConfig.INITIAL_IPFS_CID(), INITIAL_IPFS_CID);
    }

    function testHelperConfigFlowTestnetConfiguration() public {
        // Set chain ID to Flow Testnet
        vm.chainId(747);

        helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        assertEq(config.gameMasterPublicKey, GAME_MASTER_PUBLIC_KEY);
        assertEq(config.cadenceArch, CADENCE_ARCH);
        assertEq(config.initialNumberOfQuestions, INITIAL_NUMBER_OF_QUESTIONS);
        assertEq(config.costToInfluence, COST_TO_INFLUENCE);
        assertEq(config.costToDefluence, COST_TO_DEFLUENCE);
        assertEq(config.betAmount, BET_AMOUNT);
        assertEq(config.initialIpfsCid, INITIAL_IPFS_CID);

        // Test initial questions to options array
        assertEq(config.initialQuestionsToOptions.length, 5);
        for (uint256 i = 0; i < 5; i++) {
            assertEq(config.initialQuestionsToOptions[i], 4);
        }
    }

    function testHelperConfigFlowMainnetConfiguration() public {
        // Set chain ID to Flow Mainnet
        vm.chainId(545);

        helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        assertEq(config.gameMasterPublicKey, GAME_MASTER_PUBLIC_KEY);
        assertEq(config.cadenceArch, CADENCE_ARCH);
        assertEq(config.initialNumberOfQuestions, INITIAL_NUMBER_OF_QUESTIONS);
        assertEq(config.costToInfluence, COST_TO_INFLUENCE);
        assertEq(config.costToDefluence, COST_TO_DEFLUENCE);
        assertEq(config.betAmount, BET_AMOUNT);
        assertEq(config.initialIpfsCid, INITIAL_IPFS_CID);

        // Test initial questions to options array
        assertEq(config.initialQuestionsToOptions.length, 5);
        for (uint256 i = 0; i < 5; i++) {
            assertEq(config.initialQuestionsToOptions[i], 4);
        }
    }

    function testHelperConfigRevertsOnUnsupportedChain() public {
        // Set chain ID to an unsupported network (e.g., Ethereum mainnet)
        vm.chainId(1);

        vm.expectRevert(HelperConfig.HelperConfig__ChainIdNotSupported.selector);
        new HelperConfig();
    }

    function testHelperConfigRevertsOnAnotherUnsupportedChain() public {
        // Test with another unsupported chain ID
        vm.chainId(11155111); // Sepolia

        vm.expectRevert(HelperConfig.HelperConfig__ChainIdNotSupported.selector);
        new HelperConfig();
    }

    ////////////////////////////
    // DeployRann Tests        //
    ////////////////////////////

    function testDeployRannOnFlowTestnet() public {
        // Set chain ID to Flow Testnet
        vm.chainId(747);

        // Deploy all contracts
        deployer.run();

        // Verify all contracts were deployed
        assertTrue(address(deployer.s_rannToken()) != address(0), "RannToken should be deployed");
        assertTrue(address(deployer.s_yodhaNFT()) != address(0), "YodhaNFT should be deployed");
        assertTrue(address(deployer.s_gurukul()) != address(0), "Gurukul should be deployed");
        assertTrue(address(deployer.s_bazaar()) != address(0), "Bazaar should be deployed");
        assertTrue(address(deployer.s_kurukshetraFactory()) != address(0), "KurukshetraFactory should be deployed");
        assertTrue(address(deployer.s_helperConfig()) != address(0), "HelperConfig should be deployed");
    }

    function testDeployRannOnFlowMainnet() public {
        // Set chain ID to Flow Mainnet
        vm.chainId(545);

        // Deploy all contracts
        deployer.run();

        // Verify all contracts were deployed
        assertTrue(address(deployer.s_rannToken()) != address(0), "RannToken should be deployed");
        assertTrue(address(deployer.s_yodhaNFT()) != address(0), "YodhaNFT should be deployed");
        assertTrue(address(deployer.s_gurukul()) != address(0), "Gurukul should be deployed");
        assertTrue(address(deployer.s_bazaar()) != address(0), "Bazaar should be deployed");
        assertTrue(address(deployer.s_kurukshetraFactory()) != address(0), "KurukshetraFactory should be deployed");
        assertTrue(address(deployer.s_helperConfig()) != address(0), "HelperConfig should be deployed");
    }

    function testDeployRannContractInteractions() public {
        // Set chain ID to Flow Testnet
        vm.chainId(747);

        // Deploy all contracts
        deployer.run();

        // Get deployed contracts
        YodhaNFT yodhaNFT = deployer.s_yodhaNFT();
        Bazaar bazaar = deployer.s_bazaar();
        KurukshetraFactory kurukshetraFactory = deployer.s_kurukshetraFactory();
        RannToken rannToken = deployer.s_rannToken();

        // Test contract interconnections
        // YodhaNFT should have Gurukul set
        // Note: We can't easily test this without public getter, but deployment shouldn't revert

        // Bazaar should have correct YodhaNFT and RannToken addresses
        // These are stored as immutable public variables, so we can access them directly
        assertEq(address(bazaar.i_yodhaNFT()), address(yodhaNFT), "Bazaar should have correct YodhaNFT address");
        assertEq(address(bazaar.i_rannToken()), address(rannToken), "Bazaar should have correct RannToken address");

        // KurukshetraFactory should have correct addresses
        assertEq(
            kurukshetraFactory.getYodhaNFTCollection(),
            address(yodhaNFT),
            "Factory should have correct YodhaNFT address"
        );
        assertEq(
            kurukshetraFactory.getRannTokenAddress(),
            address(rannToken),
            "Factory should have correct RannToken address"
        );
        assertEq(kurukshetraFactory.getCadenceArch(), CADENCE_ARCH, "Factory should have correct Cadence Arch address");
    }

    function testDeployRannKurukshetraFactoryInitialArenas() public {
        // Set chain ID to Flow Testnet
        vm.chainId(747);

        // Deploy all contracts
        deployer.run();

        KurukshetraFactory kurukshetraFactory = deployer.s_kurukshetraFactory();

        // Verify initial arenas were created
        address[] memory arenas = kurukshetraFactory.getArenas();
        assertEq(arenas.length, 5, "Should create 5 initial arenas");

        // Verify arena rankings
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[0])), uint256(IYodhaNFT.Ranking.UNRANKED));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[1])), uint256(IYodhaNFT.Ranking.BRONZE));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[2])), uint256(IYodhaNFT.Ranking.SILVER));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[3])), uint256(IYodhaNFT.Ranking.GOLD));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[4])), uint256(IYodhaNFT.Ranking.PLATINUM));
    }

    function testDeployRannWithHelperConfigIntegration() public {
        // Set chain ID to Flow Testnet
        vm.chainId(747);

        // Deploy all contracts
        deployer.run();

        // Get the helper config that was used
        HelperConfig deployedHelperConfig = deployer.s_helperConfig();
        HelperConfig.NetworkConfig memory config = deployedHelperConfig.getConfig();

        // Verify that the deployed contracts use the correct configuration
        KurukshetraFactory kurukshetraFactory = deployer.s_kurukshetraFactory();

        // Test that the factory was configured with the right parameters from HelperConfig
        assertEq(kurukshetraFactory.getCadenceArch(), config.cadenceArch);

        // We can't directly test the cost parameters as they're not exposed as public getters
        // But we can verify the contracts were deployed successfully with those parameters
        assertTrue(address(kurukshetraFactory) != address(0));
    }

    ////////////////////////////
    // Integration Tests       //
    ////////////////////////////

    function testFullDeploymentIntegration() public {
        // Set chain ID to Flow Testnet
        vm.chainId(747);

        // Deploy all contracts
        deployer.run();

        // Get all deployed contracts
        YodhaNFT yodhaNFT = deployer.s_yodhaNFT();
        KurukshetraFactory kurukshetraFactory = deployer.s_kurukshetraFactory();
        RannToken rannToken = deployer.s_rannToken();

        // Test basic functionality to ensure contracts are properly deployed and configured

        // Test RannToken
        assertEq(rannToken.totalSupply(), 0, "RannToken should start with zero supply");
        // Test that the token name and symbol are correct
        assertEq(rannToken.name(), "RannToken");
        assertEq(rannToken.symbol(), "RANN");

        // Test YodhaNFT minting (should work)
        yodhaNFT.mintNft("test-uri");
        // We can't easily check token counter as it's private, but successful minting indicates proper deployment

        // Test KurukshetraFactory arena creation
        address newArena =
            kurukshetraFactory.makeNewArena(COST_TO_INFLUENCE, COST_TO_DEFLUENCE, BET_AMOUNT, IYodhaNFT.Ranking.BRONZE);
        assertTrue(kurukshetraFactory.isArenaAddress(newArena), "New arena should be registered");

        // Verify arenas count increased
        assertEq(kurukshetraFactory.getArenas().length, 6, "Should have 6 arenas after creating one");
    }

    function testDeploymentOnDifferentNetworks() public {
        // Test Flow Testnet deployment
        vm.chainId(747);
        DeployRann testnetDeployer = new DeployRann();
        testnetDeployer.run();
        assertTrue(address(testnetDeployer.s_rannToken()) != address(0), "Testnet deployment should succeed");

        // Test Flow Mainnet deployment
        vm.chainId(545);
        DeployRann mainnetDeployer = new DeployRann();
        mainnetDeployer.run();
        assertTrue(address(mainnetDeployer.s_rannToken()) != address(0), "Mainnet deployment should succeed");
    }

    function testDeploymentRevertOnUnsupportedNetwork() public {
        // Set to unsupported network
        vm.chainId(1); // Ethereum mainnet

        // Deployment should revert when HelperConfig constructor is called
        vm.expectRevert(HelperConfig.HelperConfig__ChainIdNotSupported.selector);
        deployer.run();
    }

    ////////////////////////////
    // Edge Cases Tests        //
    ////////////////////////////

    function testMultipleDeployments() public {
        // Set chain ID to Flow Testnet
        vm.chainId(747);

        // Deploy first set of contracts
        DeployRann deployer1 = new DeployRann();
        deployer1.run();

        // Deploy second set of contracts
        DeployRann deployer2 = new DeployRann();
        deployer2.run();

        // Verify both deployments created different contract instances
        assertTrue(
            address(deployer1.s_rannToken()) != address(deployer2.s_rannToken()),
            "Multiple deployments should create different contract instances"
        );
        assertTrue(
            address(deployer1.s_yodhaNFT()) != address(deployer2.s_yodhaNFT()),
            "Multiple deployments should create different YodhaNFT instances"
        );
    }

    function testHelperConfigStateConsistency() public {
        // Test that helper config maintains consistent state across calls
        vm.chainId(747);

        helperConfig = new HelperConfig();

        HelperConfig.NetworkConfig memory config1 = helperConfig.getConfig();
        HelperConfig.NetworkConfig memory config2 = helperConfig.getConfig();

        // Verify configs are identical
        assertEq(config1.gameMasterPublicKey, config2.gameMasterPublicKey);
        assertEq(config1.cadenceArch, config2.cadenceArch);
        assertEq(config1.initialNumberOfQuestions, config2.initialNumberOfQuestions);
        assertEq(config1.costToInfluence, config2.costToInfluence);
        assertEq(config1.costToDefluence, config2.costToDefluence);
        assertEq(config1.betAmount, config2.betAmount);
        assertEq(config1.initialIpfsCid, config2.initialIpfsCid);
    }
}
