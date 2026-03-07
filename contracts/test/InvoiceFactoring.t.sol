// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {InvoiceFactoring} from "../src/InvoiceFactoring.sol";
import {MockERC20} from "./MockERC20.sol";

contract InvoiceFactoringTest is Test {
    InvoiceFactoring public factoring;
    MockERC20 public token;

    address public lender = address(0x1);
    address public seller = address(0x2);
    address public escrow = address(0x3);

    uint256 constant INITIAL_BALANCE = 100_000 * 1e6; // 100k tokens

    function setUp() public {
        // 1. Deploy Mock Token
        token = new MockERC20();
        
        // 2. Deploy Factoring Contract
        factoring = new InvoiceFactoring(address(token));

        // 3. Setup balances
        token.mint(lender, INITIAL_BALANCE);
        token.mint(escrow, INITIAL_BALANCE);
    }

    function test_FullFlow() public {
        // --- STEP 1: LENDER CREATES OFFER ---
        uint256 depositAmount = 50_000 * 1e6;
        
        vm.startPrank(lender);
        token.approve(address(factoring), depositAmount);
        uint256 offerId = factoring.createOffer(10, depositAmount); // 10% discount
        vm.stopPrank();

        assertEq(token.balanceOf(address(factoring)), depositAmount);
        console.log("Lender created offer with:", depositAmount / 1e6, "tokens");

        // --- STEP 2: SELLER FACTORS INVOICE ---
        bytes32 invId = keccak256("invoice_001");
        uint256 totalInvoice = 10_000 * 1e6;
        uint256 upfront = 2_500 * 1e6;
        uint256 amountToFactor = 7_500 * 1e6;

        // Calculate expected payout (90% of 7500 = 6750)
        uint256 expectedPayout = amountToFactor * 90 / 100;

        vm.prank(seller);
        factoring.factorInvoice(invId, totalInvoice, upfront, amountToFactor, 10);

        assertEq(token.balanceOf(seller), expectedPayout);
        console.log("Seller received payout of:", expectedPayout / 1e6);

        // --- STEP 3: ESCROW SETTLES INVOICE ---
        vm.startPrank(escrow);
        token.approve(address(factoring), amountToFactor);
        factoring.settleInvoice(invId);
        vm.stopPrank();

        // Verify lender profit
        // Lender started with 100k. Spent 6750. Got back 7500.
        // Final balance should be 100k + 750 (the spread)
        vm.prank(lender);
        factoring.cancelOffer(offerId); 

        uint256 finalLenderBal = token.balanceOf(lender);
        console.log("Lender final balance:", finalLenderBal / 1e6);
        assertEq(finalLenderBal, INITIAL_BALANCE + (amountToFactor - expectedPayout));
    }
}