// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {RannToken} from "../src/RannToken.sol";

contract RannTokenTest is Test {
    RannToken rannToken;

    // Test addresses
    address constant USER = address(0x1);
    address constant USER2 = address(0x2);

    // Test constants
    uint256 constant MINT_AMOUNT = 1 ether;
    uint256 constant BURN_AMOUNT = 0.5 ether;
    uint256 constant INITIAL_BALANCE = 10 ether;

    // Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function setUp() public {
        rannToken = new RannToken();

        // Give users some ETH for testing
        vm.deal(USER, INITIAL_BALANCE);
        vm.deal(USER2, INITIAL_BALANCE);
    }

    ////////////////////////////
    // Constructor Tests       //
    ////////////////////////////

    function testConstructorSetsCorrectNameAndSymbol() public view {
        assertEq(rannToken.name(), "RannToken");
        assertEq(rannToken.symbol(), "RANN");
    }

    function testConstructorSetsCorrectDecimals() public view {
        assertEq(rannToken.decimals(), 18);
    }

    function testConstructorSetsZeroInitialSupply() public view {
        assertEq(rannToken.totalSupply(), 0);
    }

    ////////////////////////////
    // Mint Function Tests     //
    ////////////////////////////

    function testMintSuccessfully() public {
        vm.startPrank(USER);

        // Expect the Transfer event (from ERC20) first
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), USER, MINT_AMOUNT);

        // Then expect the Minted event
        vm.expectEmit(true, false, false, true);
        emit Minted(USER, MINT_AMOUNT);

        rannToken.mint{value: MINT_AMOUNT}(MINT_AMOUNT);

        // Check balances
        assertEq(rannToken.balanceOf(USER), MINT_AMOUNT);
        assertEq(rannToken.totalSupply(), MINT_AMOUNT);
        assertEq(address(rannToken).balance, MINT_AMOUNT);

        vm.stopPrank();
    }

    function testMintMultipleAmounts() public {
        vm.startPrank(USER);

        // First mint
        rannToken.mint{value: 1 ether}(1 ether);
        assertEq(rannToken.balanceOf(USER), 1 ether);

        // Second mint
        rannToken.mint{value: 2 ether}(2 ether);
        assertEq(rannToken.balanceOf(USER), 3 ether);
        assertEq(rannToken.totalSupply(), 3 ether);
        assertEq(address(rannToken).balance, 3 ether);

        vm.stopPrank();
    }

    function testMintFromMultipleUsers() public {
        // User 1 mints
        vm.prank(USER);
        rannToken.mint{value: 1 ether}(1 ether);

        // User 2 mints
        vm.prank(USER2);
        rannToken.mint{value: 2 ether}(2 ether);

        // Check individual balances
        assertEq(rannToken.balanceOf(USER), 1 ether);
        assertEq(rannToken.balanceOf(USER2), 2 ether);
        assertEq(rannToken.totalSupply(), 3 ether);
        assertEq(address(rannToken).balance, 3 ether);
    }

    function testMintRevertsWithZeroAmount() public {
        vm.prank(USER);
        vm.expectRevert(RannToken.RannToken__InvalidMintAmount.selector);
        rannToken.mint{value: 0}(0);
    }

    function testMintRevertsWithMismatchedValue() public {
        vm.prank(USER);
        vm.expectRevert(RannToken.RannToken__ValueSentAndMintAmountRequestedMismatch.selector);
        rannToken.mint{value: 1 ether}(2 ether);
    }

    function testMintRevertsWithMismatchedValueReverse() public {
        vm.prank(USER);
        vm.expectRevert(RannToken.RannToken__ValueSentAndMintAmountRequestedMismatch.selector);
        rannToken.mint{value: 2 ether}(1 ether);
    }

    function testMintWithMaximumValue() public {
        // Test that minting works with the user's full balance
        vm.prank(USER);
        rannToken.mint{value: INITIAL_BALANCE}(INITIAL_BALANCE);

        assertEq(rannToken.balanceOf(USER), INITIAL_BALANCE);
        assertEq(USER.balance, 0);
    }

    ////////////////////////////
    // Burn Function Tests     //
    ////////////////////////////

    function testBurnSuccessfully() public {
        vm.startPrank(USER);

        // First mint some tokens
        rannToken.mint{value: MINT_AMOUNT}(MINT_AMOUNT);

        uint256 initialETHBalance = USER.balance;

        // Expect the Transfer event (from ERC20) first
        vm.expectEmit(true, true, false, true);
        emit Transfer(USER, address(0), BURN_AMOUNT);

        // Then expect the Burned event
        vm.expectEmit(true, false, false, true);
        emit Burned(USER, BURN_AMOUNT);

        rannToken.burn(BURN_AMOUNT);

        // Check balances
        assertEq(rannToken.balanceOf(USER), MINT_AMOUNT - BURN_AMOUNT);
        assertEq(rannToken.totalSupply(), MINT_AMOUNT - BURN_AMOUNT);
        assertEq(address(rannToken).balance, MINT_AMOUNT - BURN_AMOUNT);
        assertEq(USER.balance, initialETHBalance + BURN_AMOUNT);

        vm.stopPrank();
    }

    function testBurnAllTokens() public {
        vm.startPrank(USER);

        // Mint tokens
        rannToken.mint{value: MINT_AMOUNT}(MINT_AMOUNT);
        uint256 initialETHBalance = USER.balance;

        // Burn all tokens
        rannToken.burn(MINT_AMOUNT);

        // Check balances
        assertEq(rannToken.balanceOf(USER), 0);
        assertEq(rannToken.totalSupply(), 0);
        assertEq(address(rannToken).balance, 0);
        assertEq(USER.balance, initialETHBalance + MINT_AMOUNT);

        vm.stopPrank();
    }

    function testBurnPartialTokens() public {
        vm.startPrank(USER);

        // Mint tokens
        rannToken.mint{value: 3 ether}(3 ether);
        uint256 initialETHBalance = USER.balance;

        // Burn partial tokens
        rannToken.burn(1 ether);

        // Check balances
        assertEq(rannToken.balanceOf(USER), 2 ether);
        assertEq(rannToken.totalSupply(), 2 ether);
        assertEq(address(rannToken).balance, 2 ether);
        assertEq(USER.balance, initialETHBalance + 1 ether);

        vm.stopPrank();
    }

    function testBurnRevertsWithZeroAmount() public {
        vm.startPrank(USER);
        rannToken.mint{value: MINT_AMOUNT}(MINT_AMOUNT);

        vm.expectRevert(RannToken.RannToken__InvalidBurnAmount.selector);
        rannToken.burn(0);

        vm.stopPrank();
    }

    function testBurnRevertsWithInsufficientBalance() public {
        vm.startPrank(USER);

        // Mint some tokens
        rannToken.mint{value: 1 ether}(1 ether);

        // Try to burn more than balance
        vm.expectRevert(RannToken.RannToken__NotEnoughBalance.selector);
        rannToken.burn(2 ether);

        vm.stopPrank();
    }

    function testBurnRevertsWithNoTokens() public {
        vm.prank(USER);
        vm.expectRevert(RannToken.RannToken__NotEnoughBalance.selector);
        rannToken.burn(1 ether);
    }

    ////////////////////////////
    // ERC20 Function Tests    //
    ////////////////////////////

    function testTransferTokens() public {
        vm.startPrank(USER);

        // Mint tokens
        rannToken.mint{value: MINT_AMOUNT}(MINT_AMOUNT);

        // Transfer tokens
        rannToken.transfer(USER2, BURN_AMOUNT);

        // Check balances
        assertEq(rannToken.balanceOf(USER), MINT_AMOUNT - BURN_AMOUNT);
        assertEq(rannToken.balanceOf(USER2), BURN_AMOUNT);
        assertEq(rannToken.totalSupply(), MINT_AMOUNT);

        vm.stopPrank();
    }

    function testApproveAndTransferFrom() public {
        vm.startPrank(USER);

        // Mint tokens
        rannToken.mint{value: MINT_AMOUNT}(MINT_AMOUNT);

        // Approve USER2 to spend tokens
        rannToken.approve(USER2, BURN_AMOUNT);

        vm.stopPrank();

        // USER2 transfers tokens from USER to themselves
        vm.prank(USER2);
        rannToken.transferFrom(USER, USER2, BURN_AMOUNT);

        // Check balances
        assertEq(rannToken.balanceOf(USER), MINT_AMOUNT - BURN_AMOUNT);
        assertEq(rannToken.balanceOf(USER2), BURN_AMOUNT);
        assertEq(rannToken.allowance(USER, USER2), 0);
    }

    ////////////////////////////
    // Integration Tests       //
    ////////////////////////////

    function testMintAndBurnCycle() public {
        vm.startPrank(USER);

        uint256 initialETHBalance = USER.balance;

        // Mint tokens
        rannToken.mint{value: MINT_AMOUNT}(MINT_AMOUNT);

        // Burn tokens
        rannToken.burn(MINT_AMOUNT);

        // Check that ETH balance is restored (minus gas costs)
        assertEq(rannToken.balanceOf(USER), 0);
        assertEq(rannToken.totalSupply(), 0);
        assertEq(address(rannToken).balance, 0);
        assertEq(USER.balance, initialETHBalance);

        vm.stopPrank();
    }

    function testMultipleUserMintAndBurn() public {
        // User 1 mints
        vm.prank(USER);
        rannToken.mint{value: 2 ether}(2 ether);

        // User 2 mints
        vm.prank(USER2);
        rannToken.mint{value: 3 ether}(3 ether);

        // Check total supply
        assertEq(rannToken.totalSupply(), 5 ether);
        assertEq(address(rannToken).balance, 5 ether);

        // User 1 burns
        vm.prank(USER);
        rannToken.burn(1 ether);

        // User 2 burns
        vm.prank(USER2);
        rannToken.burn(2 ether);

        // Check final state
        assertEq(rannToken.balanceOf(USER), 1 ether);
        assertEq(rannToken.balanceOf(USER2), 1 ether);
        assertEq(rannToken.totalSupply(), 2 ether);
        assertEq(address(rannToken).balance, 2 ether);
    }

    ////////////////////////////
    // Edge Cases Tests        //
    ////////////////////////////

    function testMintWithExactBalance() public {
        vm.prank(USER);
        rannToken.mint{value: INITIAL_BALANCE}(INITIAL_BALANCE);

        assertEq(rannToken.balanceOf(USER), INITIAL_BALANCE);
        assertEq(USER.balance, 0);
    }

    function testBurnAndReceiveThenMintAgain() public {
        vm.startPrank(USER);

        // Mint tokens
        rannToken.mint{value: 5 ether}(5 ether);

        // Burn tokens
        rannToken.burn(3 ether);

        // Mint again with received ETH
        rannToken.mint{value: 2 ether}(2 ether);

        // Check final balance
        assertEq(rannToken.balanceOf(USER), 4 ether); // 2 remaining + 2 new

        vm.stopPrank();
    }

    function testLargeAmounts() public {
        uint256 largeAmount = 1000 ether;
        vm.deal(USER, largeAmount);

        vm.startPrank(USER);

        // Mint large amount
        rannToken.mint{value: largeAmount}(largeAmount);
        assertEq(rannToken.balanceOf(USER), largeAmount);

        // Burn large amount
        rannToken.burn(largeAmount);
        assertEq(rannToken.balanceOf(USER), 0);
        assertEq(USER.balance, largeAmount);

        vm.stopPrank();
    }

    ////////////////////////////
    // Fuzz Tests              //
    ////////////////////////////

    function testFuzzMint(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 100 ether);
        vm.deal(USER, amount);

        vm.prank(USER);
        rannToken.mint{value: amount}(amount);

        assertEq(rannToken.balanceOf(USER), amount);
        assertEq(address(rannToken).balance, amount);
    }

    function testFuzzBurn(uint256 mintAmount, uint256 burnAmount) public {
        vm.assume(mintAmount > 0 && mintAmount <= 100 ether);
        vm.assume(burnAmount > 0 && burnAmount <= mintAmount);
        vm.deal(USER, mintAmount);

        vm.startPrank(USER);

        // Mint tokens
        rannToken.mint{value: mintAmount}(mintAmount);
        uint256 initialETHBalance = USER.balance;

        // Burn tokens
        rannToken.burn(burnAmount);

        // Check balances
        assertEq(rannToken.balanceOf(USER), mintAmount - burnAmount);
        assertEq(USER.balance, initialETHBalance + burnAmount);

        vm.stopPrank();
    }

    ////////////////////////////
    // Gas Usage Tests         //
    ////////////////////////////

    function testGasUsageMint() public {
        vm.prank(USER);
        uint256 gasStart = gasleft();
        rannToken.mint{value: 1 ether}(1 ether);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for mint:", gasUsed);
        assertLt(gasUsed, 100000); // Should use less than 100k gas
    }

    function testGasUsageBurn() public {
        vm.startPrank(USER);

        // Setup
        rannToken.mint{value: 1 ether}(1 ether);

        // Test burn gas usage
        uint256 gasStart = gasleft();
        rannToken.burn(0.5 ether);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for burn:", gasUsed);
        assertLt(gasUsed, 100000); // Should use less than 100k gas

        vm.stopPrank();
    }
}
