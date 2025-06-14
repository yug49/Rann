// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {YodhaNFT} from "../src/Chaavani/YodhaNFT.sol";
import {Test} from "../lib/forge-std/src/Test.sol";
import {console} from "../lib/forge-std/src/console.sol";

contract YodhaNFTTest is Test {
    YodhaNFT public yodhaNFT;
    
    // Test addresses
    address public dao = makeAddr("dao");
    address public gurukul = makeAddr("gurukul");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    address public gameMaster = makeAddr("gameMaster");
    
    // Private key for signing (corresponds to gameMaster address)
    uint256 public gameMasterPrivateKey = 0x123456789abcdef;
    
    // Sample data
    string constant TOKEN_URI = "https://example.com/token/1";
    string constant STRIKE_MOVE = "Thunder Strike";
    string constant TAUNT_MOVE = "Witty Banter";
    string constant DODGE_MOVE = "Shadow Dodge";
    string constant SPECIAL_MOVE = "Dragon Fury";
    string constant RECOVER_MOVE = "Healing Light";
    
    // Events for testing
    event YodhaNFTMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event YodhaPromoted(uint256 indexed tokenId, YodhaNFT.Ranking newRanking);
    event YodhaDemoted(uint256 indexed tokenId, YodhaNFT.Ranking newRanking);
    event YodhaTraitsAndMovesAssigned(uint256 indexed tokenId);
    event YodhaTraitsUpdated(uint256 indexed tokenId);
    event YodhaNFT__GurukulSet(address indexed gurukul);

    function setUp() public {
        // Generate the actual address from the private key for consistency
        gameMaster = vm.addr(gameMasterPrivateKey);
        
        // Deploy YodhaNFT contract
        yodhaNFT = new YodhaNFT(dao, gameMaster);
        
        // Set up gurukul
        vm.prank(dao);
        yodhaNFT.setGurukul(gurukul);
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function testConstructorSetsCorrectValues() public view {
        assertEq(yodhaNFT.name(), "Yodhas");
        assertEq(yodhaNFT.symbol(), "YDA");
    }

    /*//////////////////////////////////////////////////////////////
                            GURUKUL SETUP TESTS
    //////////////////////////////////////////////////////////////*/

    function testSetGurukulSuccess() public {
        // Deploy new contract to test gurukul setting
        YodhaNFT newYodhaNFT = new YodhaNFT(dao, gameMaster);
        
        vm.expectEmit(true, false, false, false);
        emit YodhaNFT__GurukulSet(gurukul);
        
        newYodhaNFT.setGurukul(gurukul);
    }

    function testSetGurukulRevertsIfAlreadySet() public {
        vm.expectRevert(YodhaNFT.YodhaNFT__GurukulAlreadySet.selector);
        yodhaNFT.setGurukul(makeAddr("newGurukul"));
    }

    function testSetGurukulRevertsIfZeroAddress() public {
        YodhaNFT newYodhaNFT = new YodhaNFT(dao, gameMaster);
        
        vm.expectRevert(YodhaNFT.YodhaNFT__InvalidGurukulAddress.selector);
        newYodhaNFT.setGurukul(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                            MINTING TESTS
    //////////////////////////////////////////////////////////////*/

    function testMintNftSuccess() public {
        vm.prank(player1);
        
        vm.expectEmit(true, true, false, true);
        emit YodhaNFTMinted(player1, 1, TOKEN_URI);
        
        yodhaNFT.mintNft(TOKEN_URI);
        
        // Verify NFT was minted correctly
        assertEq(yodhaNFT.ownerOf(1), player1);
        assertEq(yodhaNFT.tokenURI(1), TOKEN_URI);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.UNRANKED));
    }

    function testMintMultipleNfts() public {
        // Mint first NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // Mint second NFT
        vm.prank(player2);
        yodhaNFT.mintNft("https://example.com/token/2");
        
        // Verify both NFTs
        assertEq(yodhaNFT.ownerOf(1), player1);
        assertEq(yodhaNFT.ownerOf(2), player2);
        assertEq(yodhaNFT.tokenURI(1), TOKEN_URI);
        assertEq(yodhaNFT.tokenURI(2), "https://example.com/token/2");
    }

    /*//////////////////////////////////////////////////////////////
                        TRAITS AND MOVES TESTS
    //////////////////////////////////////////////////////////////*/

    function testAssignTraitsAndMovesSuccess() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // Prepare signed data
        bytes memory signedData = _createSignedTraitsData(
            1, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE
        );
        
        vm.expectEmit(true, false, false, false);
        emit YodhaTraitsAndMovesAssigned(1);
        
        yodhaNFT.assignTraitsAndMoves(
            1, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
            signedData
        );
        
        // Verify traits were assigned
        YodhaNFT.Traits memory traits = yodhaNFT.getTraits(1);
        assertEq(traits.strength, 80);
        assertEq(traits.wit, 70);
        assertEq(traits.charisma, 85);
        assertEq(traits.defence, 75);
        assertEq(traits.luck, 90);
        
        // Verify moves were assigned
        YodhaNFT.Moves memory moves = yodhaNFT.getMoves(1);
        assertEq(moves.strike, STRIKE_MOVE);
        assertEq(moves.taunt, TAUNT_MOVE);
        assertEq(moves.dodge, DODGE_MOVE);
        assertEq(moves.special, SPECIAL_MOVE);
        assertEq(moves.recover, RECOVER_MOVE);
    }

    function testAssignTraitsAndMovesRevertsIfAlreadyAssigned() public {
        // First mint an NFT and assign traits
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        bytes memory signedData = _createSignedTraitsData(
            1, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE
        );
        
        yodhaNFT.assignTraitsAndMoves(
            1, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
            signedData
        );
        
        // Try to assign traits again
        vm.expectRevert(YodhaNFT.YodhaNFT__TraitsAlreadyAssigned.selector);
        yodhaNFT.assignTraitsAndMoves(
            1, 90, 80, 95, 85, 100,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
            signedData
        );
    }

    function testAssignTraitsAndMovesRevertsIfInvalidTokenId() public {
        bytes memory signedData = _createSignedTraitsData(
            999, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE
        );
        
        vm.expectRevert(YodhaNFT.YodhaNFT__InvalidTokenId.selector);
        yodhaNFT.assignTraitsAndMoves(
            999, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
            signedData
        );
    }

    function testAssignTraitsAndMovesRevertsIfInvalidSignature() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // Create invalid signature (signed with wrong key)
        uint256 wrongPrivateKey = 0x987654321;
        bytes32 dataHash = keccak256(
            abi.encodePacked(
                uint16(1), uint16(80), uint16(70), uint16(85), uint16(75), uint16(90),
                STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE
            )
        );
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, ethSignedMessage);
        bytes memory invalidSignature = abi.encodePacked(r, s, v);
        
        vm.expectRevert(YodhaNFT.YodhaNFT__InvalidSignature.selector);
        yodhaNFT.assignTraitsAndMoves(
            1, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
            invalidSignature
        );
    }

    /*//////////////////////////////////////////////////////////////
                        UPDATE TRAITS TESTS
    //////////////////////////////////////////////////////////////*/

    function testUpdateTraitsSuccess() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(gurukul);
        vm.expectEmit(true, false, false, false);
        emit YodhaTraitsUpdated(1);
        
        yodhaNFT.updateTraits(1, 9000, 8500, 9500, 8000, 9200);
        
        // Verify traits were updated
        YodhaNFT.Traits memory traits = yodhaNFT.getTraits(1);
        assertEq(traits.strength, 9000);
        assertEq(traits.wit, 8500);
        assertEq(traits.charisma, 9500);
        assertEq(traits.defence, 8000);
        assertEq(traits.luck, 9200);
    }

    function testUpdateTraitsRevertsIfNotGurukul() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(player1);
        vm.expectRevert(YodhaNFT.YodhaNFT__NotGurukulOrDao.selector);
        yodhaNFT.updateTraits(1, 9000, 8500, 9500, 8000, 9200);
    }

    function testUpdateTraitsRevertsIfInvalidTokenId() public {
        vm.prank(gurukul);
        vm.expectRevert(YodhaNFT.YodhaNFT__InvalidTokenId.selector);
        yodhaNFT.updateTraits(999, 9000, 8500, 9500, 8000, 9200);
    }

    function testUpdateTraitsRevertsIfTraitsValueTooHigh() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(gurukul);
        vm.expectRevert(YodhaNFT.YodhaNFT__InvalidTraitsValue.selector);
        yodhaNFT.updateTraits(1, 10001, 8500, 9500, 8000, 9200); // strength > 10000
    }

    /*//////////////////////////////////////////////////////////////
                        PROMOTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testPromoteNFTByGurukul() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(gurukul);
        vm.expectEmit(true, false, false, true);
        emit YodhaPromoted(1, YodhaNFT.Ranking.BRONZE);
        
        yodhaNFT.promoteNFT(1);
        
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.BRONZE));
    }

    function testPromoteNFTByDao() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(dao);
        vm.expectEmit(true, false, false, true);
        emit YodhaPromoted(1, YodhaNFT.Ranking.BRONZE);
        
        yodhaNFT.promoteNFT(1);
        
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.BRONZE));
    }

    function testPromoteNFTThroughAllRanks() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // UNRANKED -> BRONZE
        vm.prank(gurukul);
        yodhaNFT.promoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.BRONZE));
        
        // BRONZE -> SILVER
        vm.prank(gurukul);
        yodhaNFT.promoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.SILVER));
        
        // SILVER -> GOLD
        vm.prank(gurukul);
        yodhaNFT.promoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.GOLD));
        
        // GOLD -> PLATINUM
        vm.prank(gurukul);
        yodhaNFT.promoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.PLATINUM));
    }

    function testPromoteNFTRevertsIfAlreadyPlatinum() public {
        // First mint an NFT and promote to platinum
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // Promote to platinum
        vm.startPrank(gurukul);
        yodhaNFT.promoteNFT(1); // BRONZE
        yodhaNFT.promoteNFT(1); // SILVER
        yodhaNFT.promoteNFT(1); // GOLD
        yodhaNFT.promoteNFT(1); // PLATINUM
        
        // Try to promote beyond platinum
        vm.expectRevert(YodhaNFT.YodhaNFT__YodhaAlreadyAtTopRank.selector);
        yodhaNFT.promoteNFT(1);
        vm.stopPrank();
    }

    function testPromoteNFTRevertsIfNotAuthorized() public {
        // First mint an NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(player1);
        vm.expectRevert(YodhaNFT.YodhaNFT__NotGurukulOrDao.selector);
        yodhaNFT.promoteNFT(1);
    }

    /*//////////////////////////////////////////////////////////////
                        DEMOTION TESTS
    //////////////////////////////////////////////////////////////*/

    function testDemoteNFTByDao() public {
        // First mint an NFT and promote it
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(gurukul);
        yodhaNFT.promoteNFT(1); // BRONZE
        
        vm.prank(dao);
        vm.expectEmit(true, false, false, true);
        emit YodhaDemoted(1, YodhaNFT.Ranking.UNRANKED);
        
        yodhaNFT.demoteNFT(1);
        
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.UNRANKED));
    }

    function testDemoteNFTThroughAllRanks() public {
        // First mint an NFT and promote to platinum
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // Promote to platinum
        vm.startPrank(gurukul);
        yodhaNFT.promoteNFT(1); // BRONZE
        yodhaNFT.promoteNFT(1); // SILVER
        yodhaNFT.promoteNFT(1); // GOLD
        yodhaNFT.promoteNFT(1); // PLATINUM
        vm.stopPrank();
        
        // Now demote through all ranks
        vm.startPrank(dao);
        
        // PLATINUM -> GOLD
        yodhaNFT.demoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.GOLD));
        
        // GOLD -> SILVER
        yodhaNFT.demoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.SILVER));
        
        // SILVER -> BRONZE
        yodhaNFT.demoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.BRONZE));
        
        // BRONZE -> UNRANKED
        yodhaNFT.demoteNFT(1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.UNRANKED));
        
        vm.stopPrank();
    }

    function testDemoteNFTRevertsIfAlreadyUnranked() public {
        // First mint an NFT (starts as UNRANKED)
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(dao);
        vm.expectRevert(YodhaNFT.YodhaNFT__YodhaAlreadyAtBottomRank.selector);
        yodhaNFT.demoteNFT(1);
    }

    function testDemoteNFTRevertsIfNotDao() public {
        // First mint an NFT and promote it
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        vm.prank(gurukul);
        yodhaNFT.promoteNFT(1);
        
        // Try to demote with wrong address
        vm.prank(gurukul);
        vm.expectRevert(YodhaNFT.YodhaNFT__NotDao.selector);
        yodhaNFT.demoteNFT(1);
        
        vm.prank(player1);
        vm.expectRevert(YodhaNFT.YodhaNFT__NotDao.selector);
        yodhaNFT.demoteNFT(1);
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASES & INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testCompleteNFTLifecycle() public {
        // 1. Mint NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // 2. Assign traits and moves
        bytes memory signedData = _createSignedTraitsData(
            1, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE
        );
        
        yodhaNFT.assignTraitsAndMoves(
            1, 80, 70, 85, 75, 90,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
            signedData
        );
        
        // 3. Update traits through training
        vm.prank(gurukul);
        yodhaNFT.updateTraits(1, 8500, 7500, 9000, 8000, 9500);
        
        // 4. Promote through ranks
        vm.startPrank(gurukul);
        yodhaNFT.promoteNFT(1); // BRONZE
        yodhaNFT.promoteNFT(1); // SILVER
        vm.stopPrank();
        
        // 5. Demote by DAO
        vm.prank(dao);
        yodhaNFT.demoteNFT(1); // BRONZE
        
        // Verify final state
        assertEq(yodhaNFT.ownerOf(1), player1);
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.BRONZE));
        
        YodhaNFT.Traits memory finalTraits = yodhaNFT.getTraits(1);
        assertEq(finalTraits.strength, 8500);
        assertEq(finalTraits.wit, 7500);
        assertEq(finalTraits.charisma, 9000);
        assertEq(finalTraits.defence, 8000);
        assertEq(finalTraits.luck, 9500);
    }

    function testFuzzMintAndAssignTraits(
        uint16 strength,
        uint16 wit,
        uint16 charisma,
        uint16 defence,
        uint16 luck
    ) public {
        // Bound the values to reasonable ranges (0-10000)
        strength = uint16(bound(strength, 0, 10000));
        wit = uint16(bound(wit, 0, 10000));
        charisma = uint16(bound(charisma, 0, 10000));
        defence = uint16(bound(defence, 0, 10000));
        luck = uint16(bound(luck, 0, 10000));
        
        // Mint NFT
        vm.prank(player1);
        yodhaNFT.mintNft(TOKEN_URI);
        
        // Assign traits
        bytes memory signedData = _createSignedTraitsData(
            1, strength, wit, charisma, defence, luck,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE
        );
        
        yodhaNFT.assignTraitsAndMoves(
            1, strength, wit, charisma, defence, luck,
            STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
            signedData
        );
        
        // Verify traits
        YodhaNFT.Traits memory traits = yodhaNFT.getTraits(1);
        assertEq(traits.strength, strength);
        assertEq(traits.wit, wit);
        assertEq(traits.charisma, charisma);
        assertEq(traits.defence, defence);
        assertEq(traits.luck, luck);
    }

    function testMultiplePlayersScenario() public {
        address[] memory players = new address[](3);
        players[0] = makeAddr("player1");
        players[1] = makeAddr("player2");
        players[2] = makeAddr("player3");
        
        // Each player mints an NFT
        for (uint i = 0; i < players.length; i++) {
            vm.prank(players[i]);
            yodhaNFT.mintNft(string(abi.encodePacked("https://example.com/token/", vm.toString(i + 1))));
            
            // Assign traits to each
            bytes memory signedData = _createSignedTraitsData(
                uint16(i + 1), uint16(70 + i * 10), uint16(60 + i * 5), uint16(80 + i * 3), 
                uint16(75 + i * 2), uint16(85 + i * 4),
                STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE
            );
            
            yodhaNFT.assignTraitsAndMoves(
                uint16(i + 1), uint16(70 + i * 10), uint16(60 + i * 5), uint16(80 + i * 3), 
                uint16(75 + i * 2), uint16(85 + i * 4),
                STRIKE_MOVE, TAUNT_MOVE, DODGE_MOVE, SPECIAL_MOVE, RECOVER_MOVE,
                signedData
            );
        }
        
        // Promote players to different ranks
        vm.startPrank(gurukul);
        yodhaNFT.promoteNFT(1); // Player 1 -> BRONZE
        yodhaNFT.promoteNFT(2); // Player 2 -> BRONZE
        yodhaNFT.promoteNFT(2); // Player 2 -> SILVER
        vm.stopPrank();
        
        // Verify final states
        assertEq(uint(yodhaNFT.getRanking(1)), uint(YodhaNFT.Ranking.BRONZE));
        assertEq(uint(yodhaNFT.getRanking(2)), uint(YodhaNFT.Ranking.SILVER));
        assertEq(uint(yodhaNFT.getRanking(3)), uint(YodhaNFT.Ranking.UNRANKED));
        
        // Verify ownership
        for (uint i = 0; i < players.length; i++) {
            assertEq(yodhaNFT.ownerOf(i + 1), players[i]);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _createSignedTraitsData(
        uint16 tokenId,
        uint16 strength,
        uint16 wit,
        uint16 charisma,
        uint16 defence,
        uint16 luck,
        string memory strike,
        string memory taunt,
        string memory dodge,
        string memory special,
        string memory recover
    ) internal view returns (bytes memory) {
        bytes32 dataHash = keccak256(
            abi.encodePacked(tokenId, strength, wit, charisma, defence, luck, strike, taunt, dodge, special, recover)
        );
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(gameMasterPrivateKey, ethSignedMessage);
        return abi.encodePacked(r, s, v);
    }
}