// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {Kurukshetra} from "../src/Kurukshetra/Kurukshetra.sol";
import {KurukshetraFactory} from "../src/Kurukshetra/KurukshetraFactory.sol";
import {RannToken} from "../src/RannToken.sol";
import {YodhaNFT} from "../src/Chaavani/YodhaNFT.sol";
import {MockCadenceArch} from "./mocks/MockCadenceArch.sol";
import {IYodhaNFT} from "../src/Interfaces/IYodhaNFT.sol";
import {ECDSA} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";

contract KurukshetraTest is Test {
    Kurukshetra public kurukshetra;
    RannToken public rannToken;
    YodhaNFT public yodhaNFT;
    KurukshetraFactory public kurukshetraFactory;
    MockCadenceArch public cadenceArch;

    address public owner = makeAddr("owner");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    address public player3 = makeAddr("player3");
    address public nearAiPublicKey;
    uint256 public nearAiPrivateKey;

    uint256 public constant COST_TO_INFLUENCE = 0.00001 ether;
    uint256 public constant COST_TO_DEFLUENCE = 0.0001 ether;
    uint256 public constant BET_AMOUNT = 0.001 ether;
    uint256 public constant YODHA_ONE_ID = 1;
    uint256 public constant YODHA_TWO_ID = 2;

    // Events
    event GameInitialized(
        uint256 indexed yodhaOneNFTId, uint256 indexed yodhaTwoNFTId, uint256 indexed gameInitializedAt
    );
    event BetPlacedOnYodhaOne(address indexed player, uint256 indexed multiplier, uint256 indexed betAmount);
    event BetPlacedOnYodhaTwo(address indexed player, uint256 indexed multiplier, uint256 indexed betAmount);
    event GameStarted(uint256 indexed gameStartedAt);
    event YodhaOneInfluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);
    event YodhaTwoInfluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);
    event YodhaOneDefluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);
    event YodhaTwoDefluenced(address indexed player, uint256 indexed yodhaNFTId, uint256 indexed currentRound);
    event RoundOver(
        uint256 indexed roundNumber,
        uint256 indexed yodhaOneNFTId,
        uint256 indexed yodhaTwoNFTId,
        uint256 yodhaOneDamage,
        uint256 yodhaOneRecovery,
        uint256 yodhaTwoDamage,
        uint256 yodhaTwoRecovery
    );
    event GameFinished(
        uint256 indexed yodhaOneNFTId,
        uint256 indexed yodhaTwoNFTId,
        uint256 indexed damageOnYodhaOne,
        uint256 damageOnYodhaTwo
    );
    event GameResetted(uint256 indexed yodhaOneNFTId, uint256 indexed yodhaTwoNFTId);

    function setUp() public {
        vm.startPrank(owner);

        // Generate AI key pair
        (nearAiPublicKey, nearAiPrivateKey) = makeAddrAndKey("nearAi");

        // Deploy real contracts
        rannToken = new RannToken();
        yodhaNFT = new YodhaNFT(owner, nearAiPublicKey);
        cadenceArch = new MockCadenceArch(); // Keep mock for predictable random numbers

        // Deploy factory with real contracts
        kurukshetraFactory = new KurukshetraFactory(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            nearAiPublicKey,
            address(cadenceArch),
            address(yodhaNFT),
            BET_AMOUNT
        );

        // Set the factory in YodhaNFT
        yodhaNFT.setKurukshetraFactory(address(kurukshetraFactory));

        vm.stopPrank();

        // Get the UNRANKED arena from the factory
        address[] memory arenas = kurukshetraFactory.getArenas();
        kurukshetra = Kurukshetra(arenas[0]); // UNRANKED arena

        // Setup Yodha NFTs for testing
        vm.startPrank(player1);
        yodhaNFT.mintNft("https://example.com/yodha1.json");

        // Create signature for traits assignment
        bytes32 traitsHash = keccak256(
            abi.encodePacked(
                uint16(1),
                uint16(8000),
                uint16(7000),
                uint16(6000),
                uint16(5000),
                uint16(4000),
                "Strike",
                "Taunt",
                "Dodge",
                "Special",
                "Recover"
            )
        );
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(traitsHash);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature1 = abi.encodePacked(r1, s1, v1);

        yodhaNFT.assignTraitsAndMoves(
            1, 8000, 7000, 6000, 5000, 4000, "Strike", "Taunt", "Dodge", "Special", "Recover", signature1
        );
        vm.stopPrank();

        vm.startPrank(player2);
        yodhaNFT.mintNft("https://example.com/yodha2.json");

        // Create signature for traits assignment
        bytes32 traitsHash2 = keccak256(
            abi.encodePacked(
                uint16(2),
                uint16(7500),
                uint16(6500),
                uint16(5500),
                uint16(4500),
                uint16(3500),
                "Strike",
                "Taunt",
                "Dodge",
                "Special",
                "Recover"
            )
        );
        bytes32 ethSignedMessage2 = MessageHashUtils.toEthSignedMessageHash(traitsHash2);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(nearAiPrivateKey, ethSignedMessage2);
        bytes memory signature2 = abi.encodePacked(r2, s2, v2);

        yodhaNFT.assignTraitsAndMoves(
            2, 7500, 6500, 5500, 4500, 3500, "Strike", "Taunt", "Dodge", "Special", "Recover", signature2
        );
        vm.stopPrank();

        // Distribute tokens to players (mint with ETH)
        vm.deal(player1, 20 ether);
        vm.deal(player2, 20 ether);
        vm.deal(player3, 20 ether);

        vm.prank(player1);
        rannToken.mint{value: 10 ether}(10 ether);
        vm.prank(player2);
        rannToken.mint{value: 10 ether}(10 ether);
        vm.prank(player3);
        rannToken.mint{value: 10 ether}(10 ether);

        // Approve tokens for spending
        vm.prank(player1);
        rannToken.approve(address(kurukshetra), type(uint256).max);
        vm.prank(player2);
        rannToken.approve(address(kurukshetra), type(uint256).max);
        vm.prank(player3);
        rannToken.approve(address(kurukshetra), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                        INITIALIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_InitializeGame_Success() public {
        vm.expectEmit(true, true, true, true);
        emit GameInitialized(YODHA_ONE_ID, YODHA_TWO_ID, block.timestamp);

        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        assertEq(kurukshetra.getYodhaOneNFTId(), YODHA_ONE_ID);
        assertEq(kurukshetra.getYodhaTwoNFTId(), YODHA_TWO_ID);
        assertTrue(kurukshetra.getInitializationStatus());
        assertEq(kurukshetra.getGameInitializedAt(), block.timestamp);
    }

    function test_InitializeGame_RevertsWhenAlreadyInitialized() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.expectRevert(Kurukshetra.Kurukshetra__GameAlreadyInitialized.selector);
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);
    }

    function test_InitializeGame_RevertsWithZeroTokenIds() public {
        vm.expectRevert(Kurukshetra.Kurukshetra__InvalidTokenAddress.selector);
        kurukshetra.initializeGame(0, YODHA_TWO_ID);

        vm.expectRevert(Kurukshetra.Kurukshetra__InvalidTokenAddress.selector);
        kurukshetra.initializeGame(YODHA_ONE_ID, 0);
    }

    function test_InitializeGame_RevertsWithSameTokenIds() public {
        vm.expectRevert(Kurukshetra.Kurukshetra__YodhaIdsCannotBeSame.selector);
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_ONE_ID);
    }

    function test_InitializeGame_RevertsWithDifferentRankings() public {
        // Create different ranked Yodhas by minting and promoting one
        // First, we need to setup a Gurukul to promote NFTs
        vm.startPrank(owner);
        // For this test, we'll use a different arena that requires higher ranks
        address[] memory arenas = kurukshetraFactory.getArenas();
        Kurukshetra bronzeArena = Kurukshetra(arenas[1]); // BRONZE arena

        // Try to initialize game with unranked Yodhas in BRONZE arena (should fail)
        vm.expectRevert(Kurukshetra.Kurukshetra__InvalidRankCategory.selector);
        bronzeArena.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                            BETTING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_BetOnYodhaOne_Success() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        uint256 multiplier = 3;
        uint256 initialBalance = rannToken.balanceOf(player1);

        vm.expectEmit(true, true, true, true);
        emit BetPlacedOnYodhaOne(player1, multiplier, BET_AMOUNT);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(multiplier);

        assertEq(kurukshetra.getPlayerOneBetAddresses().length, multiplier);
        assertEq(rannToken.balanceOf(player1), initialBalance - (BET_AMOUNT * multiplier));
        assertEq(rannToken.balanceOf(address(kurukshetra)), BET_AMOUNT * multiplier);
    }

    function test_BetOnYodhaTwo_Success() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        uint256 multiplier = 2;
        uint256 initialBalance = rannToken.balanceOf(player2);

        vm.expectEmit(true, true, true, true);
        emit BetPlacedOnYodhaTwo(player2, multiplier, BET_AMOUNT);

        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(multiplier);

        assertEq(kurukshetra.getPlayerTwoBetAddresses().length, multiplier);
        assertEq(rannToken.balanceOf(player2), initialBalance - (BET_AMOUNT * multiplier));
        assertEq(rannToken.balanceOf(address(kurukshetra)), BET_AMOUNT * multiplier);
    }

    function test_Bet_RevertsWhenGameNotInitialized() public {
        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotStartedYet.selector);
        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);

        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotStartedYet.selector);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);
    }

    function test_Bet_RevertsWhenGameAlreadyStarted() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);

        vm.warp(block.timestamp + 61); // Wait for betting period
        kurukshetra.startGame();

        vm.expectRevert(Kurukshetra.Kurukshetra__GameAlreadyStarted.selector);
        vm.prank(player3);
        kurukshetra.betOnYodhaOne(1);
    }

    function test_Bet_RevertsWithZeroMultiplier() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.expectRevert(Kurukshetra.Kurukshetra__InvalidBetAmount.selector);
        vm.prank(player1);
        kurukshetra.betOnYodhaOne(0);

        vm.expectRevert(Kurukshetra.Kurukshetra__InvalidBetAmount.selector);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(0);
    }

    /*//////////////////////////////////////////////////////////////
                            GAME START TESTS
    //////////////////////////////////////////////////////////////*/

    function test_StartGame_Success() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);

        vm.warp(block.timestamp + 61); // Wait for betting period

        vm.expectEmit(true, true, true, true);
        emit GameStarted(block.timestamp);

        kurukshetra.startGame();

        assertEq(kurukshetra.getCurrentRound(), 1);
        assertEq(kurukshetra.getLastRoundEndedAt(), block.timestamp);
    }

    function test_StartGame_RevertsWhenBettingPeriodNotOver() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);

        vm.expectRevert(Kurukshetra.Kurukshetra__BettingPeriodStillGoingOn.selector);
        kurukshetra.startGame();
    }

    function test_StartGame_RevertsWhenNoPlayersOnOneSide() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        // No bets on Yodha Two

        vm.warp(block.timestamp + 61);

        vm.expectRevert(Kurukshetra.Kurukshetra__ThereShouldBeBettersOnBothSide.selector);
        kurukshetra.startGame();
    }

    function test_StartGame_RevertsWhenGameNotInitialized() public {
        vm.warp(block.timestamp + 61);

        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotInitializedYet.selector);
        kurukshetra.startGame();
    }

    function test_StartGame_RevertsWhenAlreadyStarted() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);

        vm.warp(block.timestamp + 61);
        kurukshetra.startGame();

        vm.expectRevert(Kurukshetra.Kurukshetra__GameAlreadyStarted.selector);
        kurukshetra.startGame();
    }

    /*//////////////////////////////////////////////////////////////
                        INFLUENCE/DEFLUENCE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_InfluenceYodhaOne_Success() public {
        _initializeAndStartGame();

        uint256 initialBalance = rannToken.balanceOf(player1);

        vm.expectEmit(true, true, true, true);
        emit YodhaOneInfluenced(player1, YODHA_ONE_ID, 1);

        vm.prank(player1);
        kurukshetra.influenceYodhaOne();

        assertEq(rannToken.balanceOf(player1), initialBalance - COST_TO_INFLUENCE);
        assertEq(rannToken.balanceOf(address(kurukshetra)), 2 * BET_AMOUNT + COST_TO_INFLUENCE);
    }

    function test_DefluenceYodhaOne_Success() public {
        _initializeAndStartGame();

        uint256 initialBalance = rannToken.balanceOf(player1);

        vm.expectEmit(true, true, true, true);
        emit YodhaOneDefluenced(player1, YODHA_ONE_ID, 1);

        vm.prank(player1);
        kurukshetra.defluenceYodhaOne();

        assertEq(rannToken.balanceOf(player1), initialBalance - COST_TO_DEFLUENCE);
        assertEq(rannToken.balanceOf(address(kurukshetra)), 2 * BET_AMOUNT + COST_TO_DEFLUENCE);
    }

    function test_DefluenceYodhaOne_RevertsWhenAlreadyUsed() public {
        _initializeAndStartGame();

        vm.startPrank(player1);
        kurukshetra.defluenceYodhaOne();

        vm.expectRevert(Kurukshetra.Kurukshetra__PlayerAlreadyUsedDefluence.selector);
        kurukshetra.defluenceYodhaOne();
        vm.stopPrank();
    }

    function test_InfluenceDefluence_RevertsWhenGameNotStarted() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotStartedYet.selector);
        vm.prank(player1);
        kurukshetra.influenceYodhaOne();

        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotStartedYet.selector);
        vm.prank(player1);
        kurukshetra.defluenceYodhaOne();
    }

    function test_InfluenceDefluence_RevertsWhenGameNotInitialized() public {
        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotInitializedYet.selector);
        vm.prank(player1);
        kurukshetra.influenceYodhaOne();

        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotInitializedYet.selector);
        vm.prank(player1);
        kurukshetra.defluenceYodhaOne();
    }

    /*//////////////////////////////////////////////////////////////
                            BATTLE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Battle_Success() public {
        _initializeAndStartGame();

        // Wait for battle interval
        vm.warp(block.timestamp + 31);

        bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Don't check exact values since they depend on random calculations
        vm.expectEmit(true, true, true, false);
        emit RoundOver(1, YODHA_ONE_ID, YODHA_TWO_ID, 0, 0, 0, 0);

        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);

        assertEq(kurukshetra.getCurrentRound(), 2);
        assertFalse(kurukshetra.getBattleStatus());
    }

    function test_Battle_RevertsWithInvalidSignature() public {
        _initializeAndStartGame();

        vm.warp(block.timestamp + 31);

        // Create short invalid signature to trigger ECDSA error
        bytes memory invalidSignature = "invalid";

        vm.expectRevert(); // Don't specify exact error since ECDSA library has its own
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, invalidSignature);
    }

    function test_Battle_RevertsWhenIntervalNotPassed() public {
        _initializeAndStartGame();

        bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(Kurukshetra.Kurukshetra__BattleRoundIntervalPeriodIsStillGoingOn.selector);
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);
    }

    function test_Battle_CompleteFiveRoundsAndFinishGame() public {
        _initializeAndStartGame();

        // Play 5 rounds with proper timing
        uint256 startTime = block.timestamp;
        for (uint256 i = 0; i < 5; i++) {
            // Set timestamp for this round to ensure proper interval
            vm.warp(startTime + (i + 1) * 31);

            bytes32 dataHash =
                keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
            bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
            bytes memory signature = abi.encodePacked(r, s, v);

            kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);
        }

        // Game should be finished and reset after the 5th round
        assertEq(kurukshetra.getCurrentRound(), 0);
        assertFalse(kurukshetra.getInitializationStatus());
        assertEq(kurukshetra.getYodhaOneNFTId(), 0);
        assertEq(kurukshetra.getYodhaTwoNFTId(), 0);
    }

    /*//////////////////////////////////////////////////////////////
                        GAME FINISH TESTS
    //////////////////////////////////////////////////////////////*/

    function test_FinishGame_Success() public {
        _initializeAndStartGame();

        // Complete 5 battles to get to round 6 (which triggers finishGame automatically)
        uint256 startTime = block.timestamp;
        for (uint256 i = 0; i < 5; i++) {
            vm.warp(startTime + (i + 1) * 31);

            bytes32 dataHash =
                keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
            bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
            bytes memory signature = abi.encodePacked(r, s, v);

            kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);
        }

        // Check game is reset after auto-finish
        assertEq(kurukshetra.getCurrentRound(), 0);
        assertFalse(kurukshetra.getInitializationStatus());
    }

    function test_FinishGame_RevertsWhenRoundsNotComplete() public {
        _initializeAndStartGame();

        vm.expectRevert(Kurukshetra.Kurukshetra__GameFinishConditionNotMet.selector);
        kurukshetra.finishGame();
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES TESTS
    //////////////////////////////////////////////////////////////*/

    function test_MultiplePlayersCanBetOnSameYodha() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(2);

        vm.prank(player3);
        kurukshetra.betOnYodhaOne(1);

        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(3);

        assertEq(kurukshetra.getPlayerOneBetAddresses().length, 3);
        assertEq(kurukshetra.getPlayerTwoBetAddresses().length, 3);
    }

    function test_InfluenceAndDefluenceMultipleTimes() public {
        _initializeAndStartGame();

        vm.startPrank(player1);
        kurukshetra.influenceYodhaOne();
        kurukshetra.influenceYodhaOne();
        kurukshetra.influenceYodhaTwo();
        kurukshetra.defluenceYodhaTwo(); // Can only defluence once
        vm.stopPrank();

        // Trying to defluence again should fail
        vm.expectRevert(Kurukshetra.Kurukshetra__PlayerAlreadyUsedDefluence.selector);
        vm.prank(player1);
        kurukshetra.defluenceYodhaOne();
    }

    function test_GameResetAfterCompletion() public {
        _initializeAndStartGame();

        // Play exactly 5 rounds to complete the game with proper timing
        uint256 startTime = block.timestamp;
        for (uint256 i = 0; i < 5; i++) {
            // Set timestamp for this round to ensure proper interval
            vm.warp(startTime + (i + 1) * 31);

            bytes32 dataHash =
                keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
            bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
            bytes memory signature = abi.encodePacked(r, s, v);

            kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);
        }

        // Game should be finished and reset automatically after 5 rounds
        assertFalse(kurukshetra.getInitializationStatus());

        // Should be able to initialize a new game
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);
        assertTrue(kurukshetra.getInitializationStatus());
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _initializeAndStartGame() internal {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);

        vm.warp(block.timestamp + 61);
        kurukshetra.startGame();
    }

    /*//////////////////////////////////////////////////////////////
                        GETTER FUNCTIONS TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetterFunctions() public view {
        assertEq(kurukshetra.getRannTokenAddress(), address(rannToken));
        assertEq(kurukshetra.getCadenceArchAddress(), address(cadenceArch));
        assertEq(kurukshetra.getCostToInfluence(), COST_TO_INFLUENCE);
        assertEq(kurukshetra.getCostToDefluence(), COST_TO_DEFLUENCE);
        assertEq(kurukshetra.getNearAiPublicKey(), nearAiPublicKey);
        assertEq(kurukshetra.getBetAmount(), BET_AMOUNT);
        assertEq(kurukshetra.getMinYodhaBettingPeriod(), 60);
        assertEq(kurukshetra.getMinBattleRoundsInterval(), 30);
    }

    function test_GetterFunctions_AfterInitialization() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        assertEq(kurukshetra.getYodhaOneNFTId(), YODHA_ONE_ID);
        assertEq(kurukshetra.getYodhaTwoNFTId(), YODHA_TWO_ID);
        assertTrue(kurukshetra.getInitializationStatus());
        assertEq(kurukshetra.getCurrentRound(), 0);
        assertFalse(kurukshetra.getBattleStatus());
    }
}
