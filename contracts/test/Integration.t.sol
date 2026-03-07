// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MockERC20} from "./MockERC20.sol";
import {InvoiceFactoring} from "../src/InvoiceFactoring.sol";
import {FedExEscrow} from "../src/FedExEscrow.sol";
import {Reclaim} from "reclaim-verifier-foundry/Reclaim.sol";

contract IntegrationTest is Test {
    MockERC20 public token;
    InvoiceFactoring public factoring;
    FedExEscrow public escrow;

    address public buyer = address(0x1);
    address public seller = address(0x2);
    address public lender = address(0x3);

    function setUp() public {
        // 1. Deploy Mock Token
        token = new MockERC20();

        // 2. Deploy Factoring Contract
        factoring = new InvoiceFactoring(address(token));

        // 3. Deploy Escrow Contract (address(0) bypasses ZK checks for our local test)
        escrow = new FedExEscrow(address(token), address(0));

        // 4. Fund participants
        token.mint(buyer, 10_000 * 1e6);  // Buyer has 10k for the invoice
        token.mint(lender, 50_000 * 1e6); // Lender has 50k for liquidity
    }

    function test_FrontendRedirectFlow() public {
        string memory offchainUuid = "fedex_tracking_12345";
        bytes32 paymentId = escrow.toPaymentId(offchainUuid);
        
        uint256 totalInvoice = 10_000 * 1e6;
        uint8 upfrontPct = 25;
        uint256 upfrontAmount = 2_500 * 1e6; 
        uint256 factoredAmount = 7_500 * 1e6; 

        // ==========================================
        // 1. ESCROW SETUP & UPFRONT PAYMENT
        // ==========================================
        vm.startPrank(buyer);
        token.approve(address(escrow), totalInvoice);
        escrow.createEscrow(paymentId, totalInvoice, upfrontPct, seller);
        vm.stopPrank();

        assertEq(token.balanceOf(seller), upfrontAmount);

        // ==========================================
        // 2. LENDER PROVIDES LIQUIDITY
        // ==========================================
        uint256 depositAmount = 50_000 * 1e6;
        
        vm.startPrank(lender);
        token.approve(address(factoring), depositAmount);
        uint256 offerId = factoring.createOffer(10, depositAmount); 
        vm.stopPrank();

        // ==========================================
        // 3. FRONTEND FLOW: REDIRECT THEN FACTOR
        // ==========================================
        vm.startPrank(seller);
        
        // A. Frontend looks up the lender's address for the offer and redirects the escrow
        address matchedLender = factoring.getOffer(offerId).lender;
        escrow.redirectPayment(paymentId, matchedLender);
        console.log("3a. Seller redirected Escrow payout to Lender:", matchedLender);

        // B. Seller factors the invoice to get their discounted upfront cash
        factoring.factorInvoice(paymentId, totalInvoice, upfrontAmount, factoredAmount, 10);
        vm.stopPrank();

        uint256 expectedPayout = factoredAmount * 90 / 100; // 6,750
        assertEq(token.balanceOf(seller), upfrontAmount + expectedPayout);
        console.log("3b. Seller received Factoring payout. Total balance:", token.balanceOf(seller) / 1e6);

        // ==========================================
        // 4. DELIVERY COMPLETE: ESCROW PAYS LENDER DIRECTLY
        // ==========================================
        // Lender's wallet balance right before delivery
        uint256 lenderBalanceBefore = token.balanceOf(lender); 

        // Create an empty dummy proof since reclaimAddress == address(0)
        Reclaim.Proof memory dummyProof;
        escrow.releasePayment(paymentId, dummyProof);
        
        // Validate the Escrow sent the 7,500 directly to the Lender's wallet!
        uint256 lenderBalanceAfter = token.balanceOf(lender);
        assertEq(lenderBalanceAfter, lenderBalanceBefore + factoredAmount);
        
        console.log("4. Delivery verified. Escrow paid Lender directly!");
        console.log("   Lender wallet received:", (lenderBalanceAfter - lenderBalanceBefore) / 1e6);
        
        // ==========================================
        // 5. LENDER WITHDRAWS REMAINING POOL FUNDS
        // ==========================================
        vm.prank(lender);
        factoring.cancelOffer(offerId);
        
        // Lender started with 50,000. 
        // Paid out 6,750 via Factoring contract.
        // Received 7,500 directly to wallet from Escrow.
        // Withdrew remaining 43,250 from Factoring contract.
        // Total final wallet balance: 50,750 (Principal + 750 profit)
        assertEq(token.balanceOf(lender), 50_750 * 1e6);
        console.log("5. Lender total end balance:", token.balanceOf(lender) / 1e6);
    }
}