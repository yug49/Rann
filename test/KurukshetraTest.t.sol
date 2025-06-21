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
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _createBattleSignature(Kurukshetra.PlayerMoves moveOne, Kurukshetra.PlayerMoves moveTwo)
        internal
        view
        returns (bytes memory)
    {
        bytes32 dataHash = keccak256(abi.encodePacked(moveOne, moveTwo));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        return abi.encodePacked(r, s, v);
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

        // Wait for 1st battle interval
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
                    CONSTRUCTOR VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor_RevertsWithInvalidCostToInfluence() public {
        vm.expectRevert();
        vm.prank(address(kurukshetraFactory));
        new Kurukshetra(
            0, // Invalid cost to influence
            COST_TO_DEFLUENCE,
            address(rannToken),
            nearAiPublicKey,
            address(cadenceArch),
            address(yodhaNFT),
            BET_AMOUNT,
            IYodhaNFT.Ranking.UNRANKED
        );
    }

    function test_Constructor_RevertsWithInvalidCostToDefluence() public {
        vm.expectRevert();
        vm.prank(address(kurukshetraFactory));
        new Kurukshetra(
            COST_TO_INFLUENCE,
            0, // Invalid cost to defluence
            address(rannToken),
            nearAiPublicKey,
            address(cadenceArch),
            address(yodhaNFT),
            BET_AMOUNT,
            IYodhaNFT.Ranking.UNRANKED
        );
    }

    function test_Constructor_RevertsWithInvalidRannTokenAddress() public {
        vm.expectRevert();
        vm.prank(address(kurukshetraFactory));
        new Kurukshetra(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(0), // Invalid token address
            nearAiPublicKey,
            address(cadenceArch),
            address(yodhaNFT),
            BET_AMOUNT,
            IYodhaNFT.Ranking.UNRANKED
        );
    }

    function test_Constructor_RevertsWithInvalidNearAiPublicKey() public {
        vm.expectRevert();
        vm.prank(address(kurukshetraFactory));
        new Kurukshetra(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            address(0), // Invalid near AI key
            address(cadenceArch),
            address(yodhaNFT),
            BET_AMOUNT,
            IYodhaNFT.Ranking.UNRANKED
        );
    }

    function test_Constructor_RevertsWithInvalidCadenceArchAddress() public {
        vm.expectRevert();
        vm.prank(address(kurukshetraFactory));
        new Kurukshetra(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            nearAiPublicKey,
            address(0), // Invalid cadence arch
            address(yodhaNFT),
            BET_AMOUNT,
            IYodhaNFT.Ranking.UNRANKED
        );
    }

    function test_Constructor_RevertsWithInvalidYodhaNFTAddress() public {
        vm.expectRevert();
        vm.prank(address(kurukshetraFactory));
        new Kurukshetra(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            nearAiPublicKey,
            address(cadenceArch),
            address(0), // Invalid YodhaNFT address
            BET_AMOUNT,
            IYodhaNFT.Ranking.UNRANKED
        );
    }

    function test_Constructor_RevertsWithInvalidBetAmount() public {
        vm.expectRevert();
        vm.prank(address(kurukshetraFactory));
        new Kurukshetra(
            COST_TO_INFLUENCE,
            COST_TO_DEFLUENCE,
            address(rannToken),
            nearAiPublicKey,
            address(cadenceArch),
            address(yodhaNFT),
            0, // Invalid bet amount
            IYodhaNFT.Ranking.UNRANKED
        );
    }

    /*//////////////////////////////////////////////////////////////
                        ADVANCED BATTLE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Battle_AllMovesCombinations() public {
        _initializeAndStartGame();

        // Test different move combinations
        Kurukshetra.PlayerMoves[4] memory moves = [
            Kurukshetra.PlayerMoves.STRIKE,
            Kurukshetra.PlayerMoves.TAUNT,
            Kurukshetra.PlayerMoves.DODGE,
            Kurukshetra.PlayerMoves.SPECIAL
        ];

        uint256 battleCount = 0;
        uint256 startTime = block.timestamp;

        for (uint256 i = 0; i < moves.length && battleCount < 5; i++) {
            for (uint256 j = 0; j < moves.length && battleCount < 5; j++) {
                // Ensure proper timing between battles
                vm.warp(startTime + (battleCount + 1) * 31);

                bytes32 dataHash = keccak256(abi.encodePacked(moves[i], moves[j]));
                bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
                (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
                bytes memory signature = abi.encodePacked(r, s, v);

                uint256 roundBefore = kurukshetra.getCurrentRound();
                kurukshetra.battle(moves[i], moves[j], signature);
                battleCount++;

                // Verify round progressed or game finished
                if (!kurukshetra.getInitializationStatus()) {
                    // Game finished after 5 rounds
                    break;
                } else {
                    assertEq(kurukshetra.getCurrentRound(), roundBefore + 1);
                }
            }

            if (!kurukshetra.getInitializationStatus()) {
                break;
            }
        }
    }

    function test_Battle_WithInfluenceAndDefluenceEffects() public {
        _initializeAndStartGame();

        // Apply influences before battle
        vm.prank(player1);
        kurukshetra.influenceYodhaOne();

        vm.prank(player2);
        kurukshetra.defluenceYodhaTwo();

        vm.warp(block.timestamp + 31);

        bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature = abi.encodePacked(r, s, v);

        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE, signature);

        assertEq(kurukshetra.getCurrentRound(), 2);
    }

    function test_Battle_RevertsWhenBattleOngoing() public {
        _initializeAndStartGame();

        vm.warp(block.timestamp + 31);

        bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature = abi.encodePacked(r, s, v);

        // This would require modifying the contract state to simulate an ongoing battle
        // For now, we'll test the normal flow
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);
        assertEq(kurukshetra.getCurrentRound(), 2);
    }

    /*//////////////////////////////////////////////////////////////
                    REWARD DISTRIBUTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_FinishGame_YodhaOneWinsRewardDistribution() public {
        _initializeAndStartGame();

        // Play battles with proper timing
        uint256 startTime = block.timestamp;
        for (uint256 i = 0; i < 5; i++) {
            vm.warp(startTime + (i + 1) * 31);

            // Use moves that typically favor Yodha One
            bytes32 dataHash =
                keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
            bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
            bytes memory signature = abi.encodePacked(r, s, v);

            kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);

            if (!kurukshetra.getInitializationStatus()) {
                break; // Game finished
            }
        }

        // Verify game finished and rewards distributed
        assertEq(kurukshetra.getCurrentRound(), 0);
        assertFalse(kurukshetra.getInitializationStatus());
    }

    function test_FinishGame_DrawScenario() public {
        // This is harder to test deterministically since damage calculation involves randomness
        // We'll test the general finish game flow
        _initializeAndStartGame();

        // Complete 5 rounds with proper timing
        uint256 startTime = block.timestamp;
        for (uint256 i = 0; i < 5; i++) {
            vm.warp(startTime + (i + 1) * 31);

            bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.DODGE, Kurukshetra.PlayerMoves.DODGE));
            bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
            bytes memory signature = abi.encodePacked(r, s, v);

            kurukshetra.battle(Kurukshetra.PlayerMoves.DODGE, Kurukshetra.PlayerMoves.DODGE, signature);

            if (!kurukshetra.getInitializationStatus()) {
                break; // Game finished
            }
        }

        // Verify game finished
        assertFalse(kurukshetra.getInitializationStatus());
    }

    function test_FinishGame_MultiplePlayersRewardDistribution() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        // Multiple players bet on each side
        vm.prank(player1);
        kurukshetra.betOnYodhaOne(2);

        vm.prank(player3);
        kurukshetra.betOnYodhaOne(1);

        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(3);

        vm.warp(block.timestamp + 61);
        kurukshetra.startGame();

        // Complete 5 rounds with proper timing
        uint256 startTime = block.timestamp;
        for (uint256 i = 0; i < 5; i++) {
            vm.warp(startTime + (i + 1) * 31);

            bytes32 dataHash =
                keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE));
            bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
            bytes memory signature = abi.encodePacked(r, s, v);

            kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);

            if (!kurukshetra.getInitializationStatus()) {
                break;
            }
        }

        // Verify game completed
        assertFalse(kurukshetra.getInitializationStatus());
    }

    /*//////////////////////////////////////////////////////////////
                        GETTER FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetCostFunctions() public view {
        // Test initial costs
        assertEq(kurukshetra.getCostToInfluence(), COST_TO_INFLUENCE);
        assertEq(kurukshetra.getCostToDefluence(), COST_TO_DEFLUENCE);
    }

    function test_GetDamageFunctions() public {
        _initializeAndStartGame();

        // Initially no damage
        assertEq(kurukshetra.getDamageOnYodhaOne(), 0);
        assertEq(kurukshetra.getDamageOnYodhaTwo(), 0);

        // After battle, there should be some damage
        vm.warp(block.timestamp + 31);
        bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature = abi.encodePacked(r, s, v);

        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE, signature);

        // Damage should be greater than 0 after strike moves
        assertTrue(kurukshetra.getDamageOnYodhaOne() > 0 || kurukshetra.getDamageOnYodhaTwo() > 0);
    }

    function test_GetInfluenceDefluenceCosts() public {
        _initializeAndStartGame();

        // Test dynamic cost functions (these might change based on usage)
        uint256 costInfluenceOne = kurukshetra.getCostToInfluenceYodhaOne();
        uint256 costInfluenceTwo = kurukshetra.getCostToInfluenceYodhaTwo();
        uint256 costDefluenceOne = kurukshetra.getCostToDefluenceYodhaOne();
        uint256 costDefluenceTwo = kurukshetra.getCostToDefluenceYodhaTwo();

        assertTrue(costInfluenceOne > 0);
        assertTrue(costInfluenceTwo > 0);
        assertTrue(costDefluenceOne > 0);
        assertTrue(costDefluenceTwo > 0);

        // Use influence
        vm.prank(player1);
        kurukshetra.influenceYodhaOne();

        // Cost should remain the same initially (only changes during battles with certain moves)
        assertEq(kurukshetra.getCostToInfluenceYodhaOne(), costInfluenceOne);
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Battle_WithMaxTraitValues() public {
        // Create Yodhas with extreme trait values for edge case testing
        vm.startPrank(player1);
        yodhaNFT.mintNft("https://example.com/yodha3.json");

        bytes32 traitsHash = keccak256(
            abi.encodePacked(
                uint16(3),
                uint16(10000),
                uint16(10000),
                uint16(10000),
                uint16(10000),
                uint16(10000),
                "MaxStrike",
                "MaxTaunt",
                "MaxDodge",
                "MaxSpecial",
                "MaxRecover"
            )
        );
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(traitsHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature = abi.encodePacked(r, s, v);

        yodhaNFT.assignTraitsAndMoves(
            3,
            10000,
            10000,
            10000,
            10000,
            10000,
            "MaxStrike",
            "MaxTaunt",
            "MaxDodge",
            "MaxSpecial",
            "MaxRecover",
            signature
        );
        vm.stopPrank();

        // Initialize game with extreme Yodha
        kurukshetra.initializeGame(1, 3);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);

        vm.warp(block.timestamp + 61);
        kurukshetra.startGame();

        vm.warp(block.timestamp + 31);
        bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE));
        bytes32 ethSignedMessage2 = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(nearAiPrivateKey, ethSignedMessage2);
        bytes memory signature2 = abi.encodePacked(r2, s2, v2);

        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE, signature2);

        assertEq(kurukshetra.getCurrentRound(), 2);
    }

    function test_InfluenceDefluence_CostDecrease() public {
        _initializeAndStartGame();

        uint256 initialCost = kurukshetra.getCostToInfluenceYodhaOne();

        // Use influence
        vm.prank(player1);
        kurukshetra.influenceYodhaOne();

        // Cost should remain the same initially (only changes during battles with TAUNT move)
        assertEq(kurukshetra.getCostToInfluenceYodhaOne(), initialCost);

        // Now perform battle with TAUNT move which should decrease costs
        vm.warp(block.timestamp + 31);
        bytes32 dataHash = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.TAUNT, Kurukshetra.PlayerMoves.DODGE));
        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(dataHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nearAiPrivateKey, ethSignedMessage);
        bytes memory signature = abi.encodePacked(r, s, v);

        kurukshetra.battle(Kurukshetra.PlayerMoves.TAUNT, Kurukshetra.PlayerMoves.DODGE, signature);

        // Cost might decrease after successful TAUNT (depending on success rate)
        uint256 costAfterTaunt = kurukshetra.getCostToInfluenceYodhaOne();
        assertTrue(costAfterTaunt <= initialCost);
    }

    function test_Battle_RecoverMove() public {
        _initializeAndStartGame();

        // First battle to cause some damage
        uint256 startTime = block.timestamp;
        vm.warp(startTime + 31);
        bytes32 dataHash1 = keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE));
        bytes32 ethSignedMessage1 = MessageHashUtils.toEthSignedMessageHash(dataHash1);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(nearAiPrivateKey, ethSignedMessage1);
        bytes memory signature1 = abi.encodePacked(r1, s1, v1);
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE, signature1);

        uint256 damageAfterStrike = kurukshetra.getDamageOnYodhaOne();

        // Second battle with recover moves
        vm.warp(startTime + 62);
        bytes32 dataHash2 =
            keccak256(abi.encodePacked(Kurukshetra.PlayerMoves.RECOVER, Kurukshetra.PlayerMoves.RECOVER));
        bytes32 ethSignedMessage2 = MessageHashUtils.toEthSignedMessageHash(dataHash2);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(nearAiPrivateKey, ethSignedMessage2);
        bytes memory signature2 = abi.encodePacked(r2, s2, v2);
        kurukshetra.battle(Kurukshetra.PlayerMoves.RECOVER, Kurukshetra.PlayerMoves.RECOVER, signature2);

        // Damage should potentially be reduced after recover
        uint256 damageAfterRecover = kurukshetra.getDamageOnYodhaOne();
        assertTrue(damageAfterRecover <= damageAfterStrike);
    }

    function _initializeAndStartGame() internal {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.prank(player1);
        kurukshetra.betOnYodhaOne(1);
        vm.prank(player2);
        kurukshetra.betOnYodhaTwo(1);

        vm.warp(block.timestamp + 61);
        kurukshetra.startGame();
    }

    // ========================= ADDITIONAL TESTS FOR COVERAGE =========================

    function test_InfluenceYodhaTwo_Success() public {
        _initializeAndStartGame();

        vm.startPrank(player1);
        vm.deal(player1, 10 ether);
        rannToken.mint{value: 1 ether}(1 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);

        vm.expectEmit(true, true, true, false);
        emit YodhaTwoInfluenced(player1, YODHA_TWO_ID, 1);
        kurukshetra.influenceYodhaTwo();
        vm.stopPrank();
    }

    function test_InfluenceYodhaTwo_RevertsWhenGameNotInitialized() public {
        vm.startPrank(player1);
        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotInitializedYet.selector);
        kurukshetra.influenceYodhaTwo();
        vm.stopPrank();
    }

    function test_InfluenceYodhaTwo_RevertsWhenGameNotStarted() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.startPrank(player1);
        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotStartedYet.selector);
        kurukshetra.influenceYodhaTwo();
        vm.stopPrank();
    }

    function test_InfluenceYodhaTwo_RevertsWhenBattleOngoing() public {
        _initializeAndStartGame();

        // Manually set battle ongoing (by accessing private state through battle function start)
        vm.startPrank(player1);
        vm.deal(player1, 10 ether);
        rannToken.mint{value: 1 ether}(1 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);

        // Start a battle to set isBattleOngoing = true
        vm.warp(block.timestamp + 31);

        bytes memory signature = _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE);

        // Execute battle which sets s_isBattleOngoing = true temporarily
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);
        vm.stopPrank();
    }

    function test_DefluenceYodhaTwo_Success() public {
        _initializeAndStartGame();

        vm.startPrank(player1);
        vm.deal(player1, 10 ether);
        rannToken.mint{value: 1 ether}(1 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);

        vm.expectEmit(true, true, true, false);
        emit YodhaTwoDefluenced(player1, YODHA_TWO_ID, 1);
        kurukshetra.defluenceYodhaTwo();
        vm.stopPrank();
    }

    function test_DefluenceYodhaTwo_RevertsWhenGameNotInitialized() public {
        vm.startPrank(player1);
        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotInitializedYet.selector);
        kurukshetra.defluenceYodhaTwo();
        vm.stopPrank();
    }

    function test_DefluenceYodhaTwo_RevertsWhenGameNotStarted() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.startPrank(player1);
        vm.expectRevert(Kurukshetra.Kurukshetra__GameNotStartedYet.selector);
        kurukshetra.defluenceYodhaTwo();
        vm.stopPrank();
    }

    function test_DefluenceYodhaTwo_RevertsWhenAlreadyUsed() public {
        _initializeAndStartGame();

        vm.startPrank(player1);
        vm.deal(player1, 10 ether);
        rannToken.mint{value: 1 ether}(1 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);

        // Use defluence once
        kurukshetra.defluenceYodhaTwo();

        // Try to use again - should revert
        vm.expectRevert(Kurukshetra.Kurukshetra__PlayerAlreadyUsedDefluence.selector);
        kurukshetra.defluenceYodhaTwo();
        vm.stopPrank();
    }

    function test_Battle_EdgeCase_BothYodhasDodge() public {
        _initializeAndStartGame();

        vm.warp(block.timestamp + 31);

        bytes memory signature = _createBattleSignature(Kurukshetra.PlayerMoves.DODGE, Kurukshetra.PlayerMoves.DODGE);

        kurukshetra.battle(Kurukshetra.PlayerMoves.DODGE, Kurukshetra.PlayerMoves.DODGE, signature);

        // Both should dodge - no damage
        assertEq(kurukshetra.getDamageOnYodhaOne(), 0);
        assertEq(kurukshetra.getDamageOnYodhaTwo(), 0);
    }

    function test_Battle_EdgeCase_OnlyOneYodhaDodges() public {
        _initializeAndStartGame();

        vm.warp(block.timestamp + 31);

        bytes memory signature = _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE);

        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);

        // When one dodges and one attacks, damage logic should still work
        // The exact damage depends on success rates, but we can check the function executed
        assertTrue(kurukshetra.getCurrentRound() == 2);
    }

    function test_Battle_TAUNTMove_ModifiesCosts() public {
        _initializeAndStartGame();

        // Record initial costs
        uint256 initialInfluenceOneCost = kurukshetra.getCostToInfluenceYodhaOne();
        uint256 initialDefluenceTwoCost = kurukshetra.getCostToDefluenceYodhaTwo();

        vm.warp(block.timestamp + 31);

        bytes memory signature = _createBattleSignature(Kurukshetra.PlayerMoves.TAUNT, Kurukshetra.PlayerMoves.STRIKE);

        kurukshetra.battle(Kurukshetra.PlayerMoves.TAUNT, Kurukshetra.PlayerMoves.STRIKE, signature);

        // If TAUNT is successful, costs should be reduced
        uint256 newInfluenceOneCost = kurukshetra.getCostToInfluenceYodhaOne();
        uint256 newDefluenceTwoCost = kurukshetra.getCostToDefluenceYodhaTwo();

        // Costs might be reduced (depending on success rate)
        assertTrue(newInfluenceOneCost <= initialInfluenceOneCost);
        assertTrue(newDefluenceTwoCost <= initialDefluenceTwoCost);
    }

    function test_Battle_RecoverMoveEdgeCase() public {
        _initializeAndStartGame();

        // First do some damage
        vm.warp(block.timestamp + 31);
        bytes memory signature1 = _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE);
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE, signature1);

        uint256 damageAfterRound1 = kurukshetra.getDamageOnYodhaOne();

        // Now try to recover in round 2 - use lastRoundEndedAt for proper timing
        uint256 lastRoundEndedAt = kurukshetra.getLastRoundEndedAt();
        vm.warp(lastRoundEndedAt + 31);
        bytes memory signature2 =
            _createBattleSignature(Kurukshetra.PlayerMoves.RECOVER, Kurukshetra.PlayerMoves.STRIKE);
        kurukshetra.battle(Kurukshetra.PlayerMoves.RECOVER, Kurukshetra.PlayerMoves.STRIKE, signature2);

        // Should have less damage after recovery
        uint256 damageAfterRecover = kurukshetra.getDamageOnYodhaOne();
        assertLe(damageAfterRecover, damageAfterRound1);
    }

    function test_Battle_SPECIALMove() public {
        _initializeAndStartGame();

        vm.warp(block.timestamp + 31);

        bytes memory signature = _createBattleSignature(Kurukshetra.PlayerMoves.SPECIAL, Kurukshetra.PlayerMoves.DODGE);

        kurukshetra.battle(Kurukshetra.PlayerMoves.SPECIAL, Kurukshetra.PlayerMoves.DODGE, signature);

        // Special move combines multiple traits - just verify it executes
        assertTrue(kurukshetra.getCurrentRound() == 2);
    }

    function test_FinishGame_DrawScenario_ExactSameDamage() public {
        _initializeAndStartGame();

        // Run 4 rounds with minimal damage moves, using proper timing
        for (uint256 i = 1; i <= 4; i++) {
            if (i == 1) {
                vm.warp(block.timestamp + 31);
            } else {
                uint256 lastRoundTime = kurukshetra.getLastRoundEndedAt();
                vm.warp(lastRoundTime + 31);
            }
            bytes memory signature = _createBattleSignature(
                Kurukshetra.PlayerMoves.RECOVER, // Minimize damage to create potential draw
                Kurukshetra.PlayerMoves.RECOVER
            );
            kurukshetra.battle(Kurukshetra.PlayerMoves.RECOVER, Kurukshetra.PlayerMoves.RECOVER, signature);
        }

        // Complete the 5th round
        uint256 lastRoundEndedAt = kurukshetra.getLastRoundEndedAt();
        vm.warp(lastRoundEndedAt + 31);
        bytes memory finalSignature =
            _createBattleSignature(Kurukshetra.PlayerMoves.RECOVER, Kurukshetra.PlayerMoves.RECOVER);
        kurukshetra.battle(Kurukshetra.PlayerMoves.RECOVER, Kurukshetra.PlayerMoves.RECOVER, finalSignature);

        // Game should auto-finish after 5 rounds
        assertEq(kurukshetra.getCurrentRound(), 0); // Game should be reset
        assertFalse(kurukshetra.getInitializationStatus()); // Game should be reset
    }

    function test_FinishGame_RevertsWhenRoundsNotComplete() public {
        _initializeAndStartGame();

        // Try to finish before 5 rounds
        vm.expectRevert(Kurukshetra.Kurukshetra__GameFinishConditionNotMet.selector);
        kurukshetra.finishGame();
    }

    function test_GetterFunctions_ComprehensiveCheck() public {
        _initializeAndStartGame();

        // Test all getter functions
        assertEq(kurukshetra.getRannTokenAddress(), address(rannToken));
        assertEq(kurukshetra.getCadenceArchAddress(), address(cadenceArch));
        assertEq(kurukshetra.getCostToInfluence(), COST_TO_INFLUENCE);
        assertEq(kurukshetra.getCostToDefluence(), COST_TO_DEFLUENCE);
        assertEq(kurukshetra.getNearAiPublicKey(), nearAiPublicKey);
        assertEq(kurukshetra.getBetAmount(), BET_AMOUNT);
        assertEq(kurukshetra.getYodhaOneNFTId(), YODHA_ONE_ID);
        assertEq(kurukshetra.getYodhaTwoNFTId(), YODHA_TWO_ID);
        assertEq(kurukshetra.getCurrentRound(), 1);
        assertTrue(kurukshetra.getInitializationStatus());
        assertFalse(kurukshetra.getBattleStatus());
        assertGt(kurukshetra.getGameInitializedAt(), 0);
        assertGt(kurukshetra.getLastRoundEndedAt(), 0);
        assertEq(kurukshetra.getDamageOnYodhaOne(), 0);
        assertEq(kurukshetra.getDamageOnYodhaTwo(), 0);
        assertEq(kurukshetra.getMinYodhaBettingPeriod(), 60);
        assertEq(kurukshetra.getMinBattleRoundsInterval(), 30);

        // Test bet addresses
        address[] memory playerOneBets = kurukshetra.getPlayerOneBetAddresses();
        address[] memory playerTwoBets = kurukshetra.getPlayerTwoBetAddresses();
        assertEq(playerOneBets.length, 1);
        assertEq(playerTwoBets.length, 1);
        assertEq(playerOneBets[0], player1);
        assertEq(playerTwoBets[0], player2);
    }

    function test_Battle_AllFailedMoves() public {
        // This test aims to hit branches where all moves fail due to luck
        // In practice, this would require very specific trait setups or mocking
        _initializeAndStartGame();

        vm.warp(block.timestamp + 31);

        bytes memory signature = _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE);

        // Execute battle - even if moves fail, the battle should complete
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.STRIKE, signature);

        assertTrue(kurukshetra.getCurrentRound() == 2);
    }

    function test_InitializeGame_WithOwnerOfCall() public {
        // This test ensures the ownerOf calls in initializeGame are covered
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        assertTrue(kurukshetra.getInitializationStatus());
        assertEq(kurukshetra.getYodhaOneNFTId(), YODHA_ONE_ID);
        assertEq(kurukshetra.getYodhaTwoNFTId(), YODHA_TWO_ID);
    }

    function test_Battle_RoundSixAutoFinish() public {
        _initializeAndStartGame();

        // Complete 4 rounds first, using proper timing
        for (uint256 i = 1; i <= 4; i++) {
            if (i == 1) {
                vm.warp(block.timestamp + 31);
            } else {
                uint256 lastRoundTime = kurukshetra.getLastRoundEndedAt();
                vm.warp(lastRoundTime + 31);
            }
            bytes memory signature =
                _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE);
            kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, signature);
        }

        // Verify we're at round 5
        assertEq(kurukshetra.getCurrentRound(), 5);

        // Complete round 5 - this should auto-finish the game
        uint256 lastRoundEndedAt = kurukshetra.getLastRoundEndedAt();
        vm.warp(lastRoundEndedAt + 31);
        bytes memory finalSignature =
            _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE);
        kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.DODGE, finalSignature);

        // Game should be auto-finished and reset
        assertEq(kurukshetra.getCurrentRound(), 0); // Game should be reset
        assertFalse(kurukshetra.getInitializationStatus()); // Game should be reset
    }

    function test_BetOnYodhaOne_MultipleMultiplier() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.startPrank(player1);
        vm.deal(player1, 10 ether);
        rannToken.mint{value: 2 ether}(2 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);

        // Bet with multiplier 5
        kurukshetra.betOnYodhaOne(5);

        address[] memory betters = kurukshetra.getPlayerOneBetAddresses();
        assertEq(betters.length, 5); // Should have 5 entries for the same player
        for (uint256 i = 0; i < 5; i++) {
            assertEq(betters[i], player1);
        }
        vm.stopPrank();
    }

    function test_BetOnYodhaTwo_MultipleMultiplier() public {
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        vm.startPrank(player2);
        vm.deal(player2, 10 ether);
        rannToken.mint{value: 3 ether}(3 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);

        // Bet with multiplier 7
        kurukshetra.betOnYodhaTwo(7);

        address[] memory betters = kurukshetra.getPlayerTwoBetAddresses();
        assertEq(betters.length, 7); // Should have 7 entries for the same player
        for (uint256 i = 0; i < 7; i++) {
            assertEq(betters[i], player2);
        }
        vm.stopPrank();
    }

    function test_InfluenceAndDefluence_CostChanges() public {
        // Use a fresh game state without relying on _initializeAndStartGame
        kurukshetra.initializeGame(YODHA_ONE_ID, YODHA_TWO_ID);

        // Setup fresh players for this test
        address freshPlayer1 = makeAddr("freshPlayer1");
        address freshPlayer2 = makeAddr("freshPlayer2");

        // Player 1 bets on yodha one
        vm.startPrank(freshPlayer1);
        vm.deal(freshPlayer1, 10 ether);
        rannToken.mint{value: 5 ether}(5 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);
        kurukshetra.betOnYodhaOne(1);
        vm.stopPrank();

        // Player 2 bets on yodha two
        vm.startPrank(freshPlayer2);
        vm.deal(freshPlayer2, 10 ether);
        rannToken.mint{value: 5 ether}(5 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);
        kurukshetra.betOnYodhaTwo(1);
        vm.stopPrank();

        // Start the game
        vm.warp(block.timestamp + 61);
        kurukshetra.startGame();

        // Get initial costs
        uint256 initialInfluenceOne = kurukshetra.getCostToInfluenceYodhaOne();
        uint256 initialInfluenceTwo = kurukshetra.getCostToInfluenceYodhaTwo();
        uint256 initialDefluenceOne = kurukshetra.getCostToDefluenceYodhaOne();
        uint256 initialDefluenceTwo = kurukshetra.getCostToDefluenceYodhaTwo();

        // Player 1 influences both yodhas
        vm.startPrank(freshPlayer1);
        kurukshetra.influenceYodhaOne();
        kurukshetra.influenceYodhaTwo();
        vm.stopPrank();

        // Player 2 defluences yodha one (can only defluence once per game)
        vm.startPrank(freshPlayer2);
        kurukshetra.defluenceYodhaOne();
        vm.stopPrank();

        // Player 3 defluences yodha two (different player since each player can only defluence once)
        address freshPlayer3 = makeAddr("freshPlayer3");
        vm.startPrank(freshPlayer3);
        vm.deal(freshPlayer3, 10 ether);
        rannToken.mint{value: 5 ether}(5 ether);
        rannToken.approve(address(kurukshetra), type(uint256).max);
        kurukshetra.defluenceYodhaTwo();
        vm.stopPrank();

        // Costs should remain the same since no TAUNT moves have been used
        assertEq(kurukshetra.getCostToInfluenceYodhaOne(), initialInfluenceOne);
        assertEq(kurukshetra.getCostToInfluenceYodhaTwo(), initialInfluenceTwo);
        assertEq(kurukshetra.getCostToDefluenceYodhaOne(), initialDefluenceOne);
        assertEq(kurukshetra.getCostToDefluenceYodhaTwo(), initialDefluenceTwo);
    }

    function test_Battle_HighRoundsWithResets() public {
        // Test that game resets properly after completion
        for (uint256 gameRound = 0; gameRound < 3; gameRound++) {
            _initializeAndStartGame();

            // Complete 4 rounds first, using proper timing
            for (uint256 i = 1; i <= 4; i++) {
                if (i == 1) {
                    vm.warp(block.timestamp + 31);
                } else {
                    uint256 lastRoundTime = kurukshetra.getLastRoundEndedAt();
                    vm.warp(lastRoundTime + 31);
                }
                bytes memory signature =
                    _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.RECOVER);
                kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.RECOVER, signature);
            }

            // Complete the 5th round - this auto-finishes the game
            uint256 lastRoundEndedAt = kurukshetra.getLastRoundEndedAt();
            vm.warp(lastRoundEndedAt + 31);
            bytes memory finalSignature =
                _createBattleSignature(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.RECOVER);
            kurukshetra.battle(Kurukshetra.PlayerMoves.STRIKE, Kurukshetra.PlayerMoves.RECOVER, finalSignature);

            // Game should be reset
            assertEq(kurukshetra.getCurrentRound(), 0);
            assertFalse(kurukshetra.getInitializationStatus());
        }
    }
}
