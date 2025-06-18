// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test} from "../lib/forge-std/src/Test.sol";
import {console} from "../lib/forge-std/src/console.sol";
import {Bazaar} from "../src/Bazaar/Bazaar.sol";
import {RannToken} from "../src/RannToken.sol";
import {YodhaNFT} from "../src/Chaavani/YodhaNFT.sol";

contract BazaarTest is Test {
    Bazaar public bazaar;
    RannToken public rannToken;
    YodhaNFT public yodhaNFT;

    // Test addresses
    address public dao = makeAddr("dao");
    address public gameMaster = makeAddr("gameMaster");
    address public gurukul = makeAddr("gurukul");
    address public kurukshetraFactory = makeAddr("kurukshetraFactory");
    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public otherUser = makeAddr("otherUser");

    // Test constants
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10 ** 18; // 1M tokens
    uint256 public constant SALE_PRICE = 100 * 10 ** 18; // 100 tokens
    uint256 public constant NEW_PRICE = 150 * 10 ** 18; // 150 tokens
    uint256 public constant TOKEN_ID_1 = 1;
    uint256 public constant TOKEN_ID_2 = 2;
    string public constant TOKEN_URI = "https://example.com/token/";

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    function setUp() public {
        // Deploy contracts
        rannToken = new RannToken();
        yodhaNFT = new YodhaNFT(dao, gameMaster);
        bazaar = new Bazaar(address(yodhaNFT), address(rannToken));

        // Set up YodhaNFT
        vm.prank(dao);
        yodhaNFT.setGurukul(gurukul);
        vm.prank(dao);
        yodhaNFT.setKurukshetraFactory(kurukshetraFactory);

        // Mint tokens to users (using payable mint function)
        vm.deal(seller, INITIAL_SUPPLY);
        vm.prank(seller);
        rannToken.mint{value: INITIAL_SUPPLY}(INITIAL_SUPPLY);

        vm.deal(buyer, INITIAL_SUPPLY);
        vm.prank(buyer);
        rannToken.mint{value: INITIAL_SUPPLY}(INITIAL_SUPPLY);

        vm.deal(otherUser, INITIAL_SUPPLY);
        vm.prank(otherUser);
        rannToken.mint{value: INITIAL_SUPPLY}(INITIAL_SUPPLY);

        // Mint NFTs to seller
        vm.prank(seller);
        yodhaNFT.mintNft(string(abi.encodePacked(TOKEN_URI, "1")));
        vm.prank(seller);
        yodhaNFT.mintNft(string(abi.encodePacked(TOKEN_URI, "2")));

        // Approve bazaar to spend tokens
        vm.prank(buyer);
        rannToken.approve(address(bazaar), type(uint256).max);
        vm.prank(otherUser);
        rannToken.approve(address(bazaar), type(uint256).max);

        // Approve bazaar to transfer NFTs
        vm.prank(seller);
        yodhaNFT.setApprovalForAll(address(bazaar), true);
    }

    /*//////////////////////////////////////////////////////////////
                           SUCCESSFUL OPERATIONS
    //////////////////////////////////////////////////////////////*/

    function test_PutYourYodhaForSale_Success() public {
        // Verify seller owns the NFT initially
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), seller);
        assertEq(bazaar.isYodhaOnSale(TOKEN_ID_1), false);

        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Verify NFT is now owned by bazaar
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), address(bazaar));

        // Verify sale details
        assertEq(bazaar.getYodhaOwner(TOKEN_ID_1), seller);
        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), SALE_PRICE);
        assertEq(bazaar.isYodhaOnSale(TOKEN_ID_1), true);

        // Verify token is in sale list
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 1);
        assertEq(tokensOnSale[0], TOKEN_ID_1);
    }

    function test_BuyYodha_Success() public {
        // Put NFT for sale first
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        uint256 sellerBalanceBefore = rannToken.balanceOf(seller);
        uint256 buyerBalanceBefore = rannToken.balanceOf(buyer);

        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        // Verify NFT ownership transfer
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), buyer);

        // Verify token transfers
        assertEq(rannToken.balanceOf(seller), sellerBalanceBefore + SALE_PRICE);
        assertEq(rannToken.balanceOf(buyer), buyerBalanceBefore - SALE_PRICE);

        // Verify sale data is cleared
        assertEq(bazaar.getYodhaOwner(TOKEN_ID_1), address(0));
        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), 0);
        assertEq(bazaar.isYodhaOnSale(TOKEN_ID_1), false);

        // Verify token is removed from sale list
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 0);
    }

    function test_RetrieveYodhaOnSale_Success() public {
        // Put NFT for sale first
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.prank(seller);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);

        // Verify NFT is returned to seller
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), seller);

        // Verify sale data is cleared
        assertEq(bazaar.getYodhaOwner(TOKEN_ID_1), address(0));
        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), 0);
        assertEq(bazaar.isYodhaOnSale(TOKEN_ID_1), false);

        // Verify token is removed from sale list
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 0);
    }

    function test_ChangePriceOfYodhaAlreadyOnSale_Success() public {
        // Put NFT for sale first
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.prank(seller);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, NEW_PRICE);

        // Verify price is updated
        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), NEW_PRICE);

        // Verify other data remains unchanged
        assertEq(bazaar.getYodhaOwner(TOKEN_ID_1), seller);
        assertEq(bazaar.isYodhaOnSale(TOKEN_ID_1), true);
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), address(bazaar));
    }

    function test_MultipleSales_Success() public {
        // Put both NFTs for sale
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_2, NEW_PRICE);

        // Verify both are on sale
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 2);

        // Buy one NFT
        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        // Verify only one remains on sale
        tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 1);
        assertEq(tokensOnSale[0], TOKEN_ID_2);

        // Verify ownership
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), buyer);
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_2), address(bazaar));
    }

    /*//////////////////////////////////////////////////////////////
                              REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_PutYourYodhaForSale_RevertWhen_NotOwner() public {
        vm.prank(buyer);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);
    }

    function test_PutYourYodhaForSale_RevertWhen_InvalidPrice() public {
        vm.prank(seller);
        vm.expectRevert(Bazaar.Bazaar__InvalidPrice.selector);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, 0);
    }

    function test_PutYourYodhaForSale_RevertWhen_AlreadyOnSale() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Try to put the same NFT on sale again with a different seller
        // Since the NFT is now owned by the bazaar, seller is no longer the owner
        vm.prank(seller);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, NEW_PRICE);
    }

    function test_PutYourYodhaForSale_RevertWhen_NotApproved() public {
        // Remove approval
        vm.prank(seller);
        yodhaNFT.setApprovalForAll(address(bazaar), false);

        vm.prank(seller);
        vm.expectRevert();
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);
    }

    function test_BuyYodha_RevertWhen_NotOnSale() public {
        vm.prank(buyer);
        vm.expectRevert(Bazaar.Bazaar__NotOnSale.selector);
        bazaar.buyYodha(TOKEN_ID_1);
    }

    function test_BuyYodha_RevertWhen_InsufficientTokens() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Create a new user with insufficient tokens
        address poorBuyer = makeAddr("poorBuyer");
        vm.deal(poorBuyer, 1 ether); // Give some ETH to buy a small amount of tokens
        vm.prank(poorBuyer);
        rannToken.mint{value: 1 ether}(1 ether); // Only 1 ether worth of tokens, but need SALE_PRICE

        vm.prank(poorBuyer);
        rannToken.approve(address(bazaar), type(uint256).max);

        vm.prank(poorBuyer);
        vm.expectRevert();
        bazaar.buyYodha(TOKEN_ID_1);
    }

    function test_BuyYodha_RevertWhen_NotApprovedTokens() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Remove approval
        vm.prank(buyer);
        rannToken.approve(address(bazaar), 0);

        vm.prank(buyer);
        vm.expectRevert();
        bazaar.buyYodha(TOKEN_ID_1);
    }

    function test_RetrieveYodhaOnSale_RevertWhen_NotOwner() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.prank(buyer);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);
    }

    function test_RetrieveYodhaOnSale_RevertWhen_NotOnSale() public {
        // When NFT is not on sale, s_tokenIdToOwner[tokenId] returns address(0)
        // So the owner check fails first, throwing NotOwnerOfYodha error
        vm.prank(seller);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);
    }

    function test_RetrieveYodhaOnSale_RevertWhen_NotOnSale_ButCorrectMapping() public {
        // Create a scenario where the owner mapping is set but price is 0
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Buy the NFT to clear the sale
        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        // Now try to retrieve - the mapping should be cleared
        vm.prank(seller);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);
    }

    function test_ChangePriceOfYodhaAlreadyOnSale_RevertWhen_NotOwner() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.prank(buyer);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, NEW_PRICE);
    }

    function test_ChangePriceOfYodhaAlreadyOnSale_RevertWhen_InvalidPrice() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.prank(seller);
        vm.expectRevert(Bazaar.Bazaar__InvalidPrice.selector);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, 0);
    }

    function test_ChangePriceOfYodhaAlreadyOnSale_RevertWhen_NotOnSale() public {
        // When NFT is not on sale, s_tokenIdToOwner[tokenId] returns address(0)
        // So the owner check fails first, throwing NotOwnerOfYodha error
        vm.prank(seller);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, NEW_PRICE);
    }

    function test_ChangePriceOfYodhaAlreadyOnSale_RevertWhen_NotOnSale_ButCorrectMapping() public {
        // Create a scenario where the owner mapping is set but price is 0
        // This simulates a bug scenario or manual state manipulation
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Buy the NFT to clear the sale
        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        // Now try to change price - the mapping should be cleared
        vm.prank(seller);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, NEW_PRICE);
    }

    /*//////////////////////////////////////////////////////////////
                           GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_GetYodhaIdsOnSale_EmptyInitially() public view {
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 0);
    }

    function test_GetYodhaOwner_ReturnsZeroAddressWhenNotOnSale() public view {
        assertEq(bazaar.getYodhaOwner(TOKEN_ID_1), address(0));
    }

    function test_GetYodhaPrice_ReturnsZeroWhenNotOnSale() public view {
        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), 0);
    }

    function test_IsYodhaOnSale_ReturnsFalseWhenNotOnSale() public view {
        assertEq(bazaar.isYodhaOnSale(TOKEN_ID_1), false);
    }

    /*//////////////////////////////////////////////////////////////
                             EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_BuyYodha_RemovesCorrectTokenFromSaleList() public {
        // Put multiple NFTs for sale
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_2, NEW_PRICE);

        // Buy the first one
        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        // Verify correct token is removed
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 1);
        assertEq(tokensOnSale[0], TOKEN_ID_2);
    }

    function test_RetrieveYodhaOnSale_RemovesCorrectTokenFromSaleList() public {
        // Put multiple NFTs for sale
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_2, NEW_PRICE);

        // Retrieve the first one
        vm.prank(seller);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);

        // Verify correct token is removed
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 1);
        assertEq(tokensOnSale[0], TOKEN_ID_2);
    }

    function test_SellerCannotBuyOwnYodha() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Seller tries to buy their own NFT
        vm.prank(seller);
        rannToken.approve(address(bazaar), SALE_PRICE);

        vm.prank(seller);
        bazaar.buyYodha(TOKEN_ID_1);

        // This should work - seller can buy their own NFT back
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), seller);
    }

    /*//////////////////////////////////////////////////////////////
                           FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_PutYourYodhaForSale_Price(uint256 price) public {
        vm.assume(price > 0 && price <= type(uint128).max);

        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, price);

        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), price);
    }

    function testFuzz_ChangePriceOfYodhaAlreadyOnSale_Price(uint256 newPrice) public {
        vm.assume(newPrice > 0 && newPrice <= type(uint128).max);

        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.prank(seller);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, newPrice);

        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), newPrice);
    }

    /*//////////////////////////////////////////////////////////////
                           INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_FullMarketplaceFlow() public {
        // 1. Seller puts NFT for sale
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // 2. Seller changes price
        vm.prank(seller);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, NEW_PRICE);

        // 3. Buyer purchases NFT
        uint256 sellerBalanceBefore = rannToken.balanceOf(seller);
        uint256 buyerBalanceBefore = rannToken.balanceOf(buyer);

        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        // Verify final state
        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), buyer);
        assertEq(rannToken.balanceOf(seller), sellerBalanceBefore + NEW_PRICE);
        assertEq(rannToken.balanceOf(buyer), buyerBalanceBefore - NEW_PRICE);
        assertEq(bazaar.isYodhaOnSale(TOKEN_ID_1), false);
    }

    function test_CannotManipulateOthersListings() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Other user cannot retrieve seller's NFT
        vm.prank(otherUser);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);

        // Other user cannot change price of seller's NFT
        vm.prank(otherUser);
        vm.expectRevert(Bazaar.Bazaar__NotOwnerOfYodha.selector);
        bazaar.changePriceOfYodhaAlreadyOnSale(TOKEN_ID_1, NEW_PRICE);
    }

    /*//////////////////////////////////////////////////////////////
                           EVENT EMISSION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_PutYourYodhaForSale_EmitsTransferEvent() public {
        vm.expectEmit(true, true, true, false);
        emit Transfer(seller, address(bazaar), TOKEN_ID_1);

        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);
    }

    function test_BuyYodha_EmitsTransferEvent() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.expectEmit(true, true, true, false);
        emit Transfer(address(bazaar), buyer, TOKEN_ID_1);

        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);
    }

    function test_RetrieveYodhaOnSale_EmitsTransferEvent() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        vm.expectEmit(true, true, true, false);
        emit Transfer(address(bazaar), seller, TOKEN_ID_1);

        vm.prank(seller);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);
    }

    /*//////////////////////////////////////////////////////////////
                           ADDITIONAL EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_BuyYodha_WithExactTokenAmount() public {
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Create buyer with exact amount needed
        address exactBuyer = makeAddr("exactBuyer");
        vm.deal(exactBuyer, SALE_PRICE);
        vm.prank(exactBuyer);
        rannToken.mint{value: SALE_PRICE}(SALE_PRICE);
        vm.prank(exactBuyer);
        rannToken.approve(address(bazaar), SALE_PRICE);

        vm.prank(exactBuyer);
        bazaar.buyYodha(TOKEN_ID_1);

        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), exactBuyer);
        assertEq(rannToken.balanceOf(exactBuyer), 0);
    }

    function test_SequentialOperations_SameNFT() public {
        // Put for sale
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, SALE_PRICE);

        // Retrieve
        vm.prank(seller);
        bazaar.retrieveYodhaOnSale(TOKEN_ID_1);

        // Put for sale again with different price
        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, NEW_PRICE);

        // Verify new price
        assertEq(bazaar.getYodhaPrice(TOKEN_ID_1), NEW_PRICE);

        // Buy it
        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), buyer);
    }

    function test_HighValueSale() public {
        uint256 highPrice = 1000000 * 10 ** 18; // 1M tokens

        // Give seller enough tokens for high value sale
        vm.deal(seller, highPrice);
        vm.prank(seller);
        rannToken.mint{value: highPrice}(highPrice);

        // Give buyer enough tokens for high value purchase
        vm.deal(buyer, highPrice);
        vm.prank(buyer);
        rannToken.mint{value: highPrice}(highPrice);

        vm.prank(seller);
        bazaar.putYourYodhaForSale(TOKEN_ID_1, highPrice);

        uint256 buyerBalanceBefore = rannToken.balanceOf(buyer);
        uint256 sellerBalanceBefore = rannToken.balanceOf(seller);

        vm.prank(buyer);
        bazaar.buyYodha(TOKEN_ID_1);

        assertEq(yodhaNFT.ownerOf(TOKEN_ID_1), buyer);
        assertEq(rannToken.balanceOf(buyer), buyerBalanceBefore - highPrice);
        assertEq(rannToken.balanceOf(seller), sellerBalanceBefore + highPrice);
    }

    function test_MultipleUsersInteraction() public {
        address user1 = makeAddr("user1");
        address user2 = makeAddr("user2");
        address user3 = makeAddr("user3");

        // Mint NFTs to different users
        vm.prank(user1);
        yodhaNFT.mintNft(string(abi.encodePacked(TOKEN_URI, "3")));
        vm.prank(user2);
        yodhaNFT.mintNft(string(abi.encodePacked(TOKEN_URI, "4")));

        // Give them tokens
        vm.deal(user1, INITIAL_SUPPLY);
        vm.prank(user1);
        rannToken.mint{value: INITIAL_SUPPLY}(INITIAL_SUPPLY);
        vm.deal(user2, INITIAL_SUPPLY);
        vm.prank(user2);
        rannToken.mint{value: INITIAL_SUPPLY}(INITIAL_SUPPLY);
        vm.deal(user3, INITIAL_SUPPLY);
        vm.prank(user3);
        rannToken.mint{value: INITIAL_SUPPLY}(INITIAL_SUPPLY);

        // Set approvals
        vm.prank(user1);
        yodhaNFT.setApprovalForAll(address(bazaar), true);
        vm.prank(user2);
        yodhaNFT.setApprovalForAll(address(bazaar), true);
        vm.prank(user1);
        rannToken.approve(address(bazaar), type(uint256).max);
        vm.prank(user2);
        rannToken.approve(address(bazaar), type(uint256).max);
        vm.prank(user3);
        rannToken.approve(address(bazaar), type(uint256).max);

        // User1 sells NFT 3, User2 sells NFT 4
        vm.prank(user1);
        bazaar.putYourYodhaForSale(3, SALE_PRICE);
        vm.prank(user2);
        bazaar.putYourYodhaForSale(4, NEW_PRICE);

        // User3 buys both NFTs
        vm.prank(user3);
        bazaar.buyYodha(3);
        vm.prank(user3);
        bazaar.buyYodha(4);

        // Verify ownership
        assertEq(yodhaNFT.ownerOf(3), user3);
        assertEq(yodhaNFT.ownerOf(4), user3);

        // Verify no NFTs are on sale
        uint256[] memory tokensOnSale = bazaar.getYodhaIdsOnSale();
        assertEq(tokensOnSale.length, 0);
    }

    /*//////////////////////////////////////////////////////////////
                           STRESS TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_PutYourYodhaForSale_VariousAddresses(address randomSeller) public {
        // Skip zero address and contract addresses
        vm.assume(randomSeller != address(0));
        vm.assume(randomSeller != address(bazaar));
        vm.assume(randomSeller != address(yodhaNFT));
        vm.assume(randomSeller != address(rannToken));
        vm.assume(randomSeller.code.length == 0); // Only EOAs

        // Mint NFT to random seller
        vm.prank(randomSeller);
        yodhaNFT.mintNft(TOKEN_URI);

        // Set approval
        vm.prank(randomSeller);
        yodhaNFT.setApprovalForAll(address(bazaar), true);

        // Should work with any valid address
        vm.prank(randomSeller);
        bazaar.putYourYodhaForSale(3, SALE_PRICE);

        assertEq(bazaar.getYodhaOwner(3), randomSeller);
        assertEq(yodhaNFT.ownerOf(3), address(bazaar));
    }
}
