// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {KurukshetraFactory} from "../src/Kurukshetra/KurukshetraFactory.sol";
import {Kurukshetra} from "../src/Kurukshetra/Kurukshetra.sol";
import {YodhaNFT} from "../src/Chaavani/YodhaNFT.sol";
import {RannToken} from "../src/RannToken.sol";
import {IYodhaNFT} from "../src/Interfaces/IYodhaNFT.sol";
import {DeployRann} from "../script/DeployRann.s.sol";
import {IERC721Receiver} from "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";

contract KurukshetraFactoryTest is Test, IERC721Receiver {
    KurukshetraFactory kurukshetraFactory;
    YodhaNFT yodhaNFT;
    RannToken rannToken;
    DeployRann deployer;

    // Test constants
    uint256 constant COST_TO_INFLUENCE = 0.00001 ether;
    uint256 constant COST_TO_DEFLUENCE = 0.0001 ether;
    uint256 constant BET_AMOUNT = 0.001 ether;
    address constant NEAR_AI_PUBLIC_KEY = address(0x123);
    address constant CADENCE_ARCH = 0x0000000000000000000000010000000000000001;
    address constant DAO = address(0x456);
    address constant USER = address(0x789);

    // Events
    event NewArenaCreated(
        address indexed arenaAddress,
        IYodhaNFT.Ranking indexed ranking,
        uint256 costToInfluence,
        uint256 costToDefluence,
        uint256 betAmount
    );

    // IERC721Receiver implementation
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function setUp() public {
        // Deploy contracts
        rannToken = new RannToken();
        yodhaNFT = new YodhaNFT(DAO, NEAR_AI_PUBLIC_KEY);

        kurukshetraFactory = new KurukshetraFactory(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            NEAR_AI_PUBLIC_KEY,
            CADENCE_ARCH,
            address(yodhaNFT),
            BET_AMOUNT
        );

        // Set the factory address in YodhaNFT (if needed)
        vm.prank(DAO);
        yodhaNFT.setKurukshetraFactory(address(kurukshetraFactory));
    }

    ////////////////////////////
    // Constructor Tests       //
    ////////////////////////////

    function testConstructorCreatesInitialArenas() public view {
        address[] memory arenas = kurukshetraFactory.getArenas();
        assertEq(arenas.length, 5, "Should create 5 initial arenas");

        // Check that each arena has the correct ranking
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[0])), uint256(IYodhaNFT.Ranking.UNRANKED));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[1])), uint256(IYodhaNFT.Ranking.BRONZE));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[2])), uint256(IYodhaNFT.Ranking.SILVER));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[3])), uint256(IYodhaNFT.Ranking.GOLD));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[4])), uint256(IYodhaNFT.Ranking.PLATINUM));
    }

    function testConstructorSetsCorrectAddresses() public view {
        assertEq(kurukshetraFactory.getRannTokenAddress(), address(rannToken));
        assertEq(kurukshetraFactory.getCadenceArch(), CADENCE_ARCH);
        assertEq(kurukshetraFactory.getYodhaNFTCollection(), address(yodhaNFT));
    }

    function testConstructorRevertsWithInvalidRannTokenAddress() public {
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__InvalidAddress.selector);
        new KurukshetraFactory(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(0),
            NEAR_AI_PUBLIC_KEY,
            CADENCE_ARCH,
            address(yodhaNFT),
            BET_AMOUNT
        );
    }

    function testConstructorRevertsWithInvalidNearAiPublicKey() public {
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__InvalidAddress.selector);
        new KurukshetraFactory(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            address(0),
            CADENCE_ARCH,
            address(yodhaNFT),
            BET_AMOUNT
        );
    }

    function testConstructorRevertsWithInvalidCadenceArch() public {
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__InvalidAddress.selector);
        new KurukshetraFactory(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            NEAR_AI_PUBLIC_KEY,
            address(0),
            address(yodhaNFT),
            BET_AMOUNT
        );
    }

    function testConstructorRevertsWithInvalidYodhaNFTCollection() public {
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__InvalidAddress.selector);
        new KurukshetraFactory(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            NEAR_AI_PUBLIC_KEY,
            CADENCE_ARCH,
            address(0),
            BET_AMOUNT
        );
    }

    function testConstructorRevertsWithZeroBetAmount() public {
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__InvalidBetAmount.selector);
        new KurukshetraFactory(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            NEAR_AI_PUBLIC_KEY,
            CADENCE_ARCH,
            address(yodhaNFT),
            0
        );
    }

    function testConstructorRevertsWithZeroCostToInfluence() public {
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__InvalidCostToInfluence.selector);
        new KurukshetraFactory(
            0, COST_TO_DEFLUENCE, address(rannToken), NEAR_AI_PUBLIC_KEY, CADENCE_ARCH, address(yodhaNFT), BET_AMOUNT
        );
    }

    function testConstructorRevertsWithZeroCostToDefluence() public {
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__InvalidCostToDefluence.selector);
        new KurukshetraFactory(
            COST_TO_INFLUENCE, 0, address(rannToken), NEAR_AI_PUBLIC_KEY, CADENCE_ARCH, address(yodhaNFT), BET_AMOUNT
        );
    }

    ////////////////////////////
    // makeNewArena Tests      //
    ////////////////////////////

    function testMakeNewArenaSuccessfully() public {
        uint256 customCostToInfluence = 0.0001 ether;
        uint256 customCostToDefluence = 0.001 ether;
        uint256 customBetAmount = 0.01 ether;
        IYodhaNFT.Ranking customRanking = IYodhaNFT.Ranking.BRONZE;

        uint256 initialArenaCount = kurukshetraFactory.getArenas().length;

        vm.expectEmit(false, true, false, true);
        emit NewArenaCreated(address(0), customRanking, customCostToInfluence, customCostToDefluence, customBetAmount);

        address newArenaAddress = kurukshetraFactory.makeNewArena(
            customCostToInfluence, customCostToDefluence, customBetAmount, customRanking
        );

        // Check that a new arena was created
        address[] memory arenas = kurukshetraFactory.getArenas();
        assertEq(arenas.length, initialArenaCount + 1, "Arena count should increase by 1");
        assertEq(arenas[arenas.length - 1], newArenaAddress, "New arena should be at the end of the array");

        // Check that the arena is registered correctly
        assertTrue(kurukshetraFactory.isArenaAddress(newArenaAddress), "New arena should be registered");
        assertEq(
            uint256(kurukshetraFactory.getArenaRanking(newArenaAddress)),
            uint256(customRanking),
            "Arena should have correct ranking"
        );
    }

    function testMakeNewArenaWithDifferentRankings() public {
        IYodhaNFT.Ranking[] memory rankings = new IYodhaNFT.Ranking[](5);
        rankings[0] = IYodhaNFT.Ranking.UNRANKED;
        rankings[1] = IYodhaNFT.Ranking.BRONZE;
        rankings[2] = IYodhaNFT.Ranking.SILVER;
        rankings[3] = IYodhaNFT.Ranking.GOLD;
        rankings[4] = IYodhaNFT.Ranking.PLATINUM;

        for (uint256 i = 0; i < rankings.length; i++) {
            address newArenaAddress = kurukshetraFactory.makeNewArena(
                COST_TO_INFLUENCE * (i + 1), COST_TO_DEFLUENCE * (i + 1), BET_AMOUNT * (i + 1), rankings[i]
            );

            assertEq(uint256(kurukshetraFactory.getArenaRanking(newArenaAddress)), uint256(rankings[i]));
        }
    }

    ////////////////////////////
    // updateWinnings Tests    //
    ////////////////////////////

    function testUpdateWinningsFromArena() public {
        // First, mint an NFT so we have a valid token ID
        yodhaNFT.mintNft("test-uri");
        uint256 yodhaNFTId = 0; // First token ID is 0

        address[] memory arenas = kurukshetraFactory.getArenas();
        address arena = arenas[0];
        uint256 winningsAmount = 1000;

        // This should work since the call is from a registered arena
        vm.prank(arena);
        kurukshetraFactory.updateWinnings(yodhaNFTId, winningsAmount);

        // Note: We can't easily test if the winnings were actually updated without
        // having access to the YodhaNFT contract's getWinnings function or similar
        // But we can verify that the call doesn't revert when called from an arena
    }

    function testUpdateWinningsRevertsFromNonArena() public {
        // First, mint an NFT so we have a valid token ID
        yodhaNFT.mintNft("test-uri");
        uint256 yodhaNFTId = 0; // First token ID is 0
        uint256 winningsAmount = 1000;

        vm.prank(USER);
        vm.expectRevert(KurukshetraFactory.KurukshetraFactory__NotArena.selector);
        kurukshetraFactory.updateWinnings(yodhaNFTId, winningsAmount);
    }

    ////////////////////////////
    // Getter Functions Tests  //
    ////////////////////////////

    function testGetArenas() public {
        address[] memory arenas = kurukshetraFactory.getArenas();
        assertEq(arenas.length, 5, "Should return 5 initial arenas");

        // Add a new arena and check again
        address newArena =
            kurukshetraFactory.makeNewArena(COST_TO_INFLUENCE, COST_TO_DEFLUENCE, BET_AMOUNT, IYodhaNFT.Ranking.SILVER);

        arenas = kurukshetraFactory.getArenas();
        assertEq(arenas.length, 6, "Should return 6 arenas after adding one");
        assertEq(arenas[5], newArena, "New arena should be at index 5");
    }

    function testGetArenaRanking() public view {
        address[] memory arenas = kurukshetraFactory.getArenas();

        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[0])), uint256(IYodhaNFT.Ranking.UNRANKED));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[1])), uint256(IYodhaNFT.Ranking.BRONZE));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[2])), uint256(IYodhaNFT.Ranking.SILVER));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[3])), uint256(IYodhaNFT.Ranking.GOLD));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(arenas[4])), uint256(IYodhaNFT.Ranking.PLATINUM));
    }

    function testIsArenaAddress() public {
        address[] memory arenas = kurukshetraFactory.getArenas();

        // Test that all initial arenas are recognized
        for (uint256 i = 0; i < arenas.length; i++) {
            assertTrue(kurukshetraFactory.isArenaAddress(arenas[i]), "Initial arena should be recognized");
        }

        // Test that a random address is not recognized
        assertFalse(kurukshetraFactory.isArenaAddress(USER), "Random address should not be recognized as arena");

        // Create a new arena and test it's recognized
        address newArena =
            kurukshetraFactory.makeNewArena(COST_TO_INFLUENCE, COST_TO_DEFLUENCE, BET_AMOUNT, IYodhaNFT.Ranking.GOLD);
        assertTrue(kurukshetraFactory.isArenaAddress(newArena), "New arena should be recognized");
    }

    function testGetRannTokenAddress() public view {
        assertEq(kurukshetraFactory.getRannTokenAddress(), address(rannToken));
    }

    function testGetCadenceArch() public view {
        assertEq(kurukshetraFactory.getCadenceArch(), CADENCE_ARCH);
    }

    function testGetYodhaNFTCollection() public view {
        assertEq(kurukshetraFactory.getYodhaNFTCollection(), address(yodhaNFT));
    }

    ////////////////////////////
    // Integration Tests       //
    ////////////////////////////

    function testFactoryIntegrationWithCreatedArenas() public {
        // First, mint an NFT so we have a valid token ID
        yodhaNFT.mintNft("test-uri");
        uint256 yodhaNFTId = 0; // First token ID is 0

        // Create a new arena
        address newArenaAddress = kurukshetraFactory.makeNewArena(
            COST_TO_INFLUENCE * 2, COST_TO_DEFLUENCE * 2, BET_AMOUNT * 2, IYodhaNFT.Ranking.SILVER
        );

        // Verify the arena was created with correct parameters
        // Note: We don't need to instantiate the Kurukshetra contract here
        // as we're just testing the factory functionality

        // Test that the arena can call updateWinnings on the factory
        vm.prank(newArenaAddress);
        kurukshetraFactory.updateWinnings(yodhaNFTId, 500);

        // Verify arena is properly registered
        assertTrue(kurukshetraFactory.isArenaAddress(newArenaAddress));
        assertEq(uint256(kurukshetraFactory.getArenaRanking(newArenaAddress)), uint256(IYodhaNFT.Ranking.SILVER));
    }

    function testMultipleArenaCreation() public {
        uint256 initialCount = kurukshetraFactory.getArenas().length;
        uint256 arenasToCreate = 3;

        for (uint256 i = 0; i < arenasToCreate; i++) {
            kurukshetraFactory.makeNewArena(
                COST_TO_INFLUENCE * (i + 1), COST_TO_DEFLUENCE * (i + 1), BET_AMOUNT * (i + 1), IYodhaNFT.Ranking.BRONZE
            );
        }

        assertEq(kurukshetraFactory.getArenas().length, initialCount + arenasToCreate);
    }

    ////////////////////////////
    // Edge Cases Tests        //
    ////////////////////////////

    function testArenaCreationWithMaxValues() public {
        uint256 maxCostToInfluence = type(uint256).max;
        uint256 maxCostToDefluence = type(uint256).max;
        uint256 maxBetAmount = type(uint256).max;

        // This should not revert as there are no upper bounds in the contract
        address newArena = kurukshetraFactory.makeNewArena(
            maxCostToInfluence, maxCostToDefluence, maxBetAmount, IYodhaNFT.Ranking.PLATINUM
        );

        assertTrue(kurukshetraFactory.isArenaAddress(newArena));
    }

    function testArenaCreationWithMinValues() public {
        uint256 minCostToInfluence = 1;
        uint256 minCostToDefluence = 1;
        uint256 minBetAmount = 1;

        address newArena = kurukshetraFactory.makeNewArena(
            minCostToInfluence, minCostToDefluence, minBetAmount, IYodhaNFT.Ranking.UNRANKED
        );

        assertTrue(kurukshetraFactory.isArenaAddress(newArena));
    }
}
