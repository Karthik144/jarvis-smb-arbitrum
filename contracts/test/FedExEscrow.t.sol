// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {FedExEscrow} from "../src/FedExEscrow.sol";
import {Reclaim} from "reclaim-verifier-foundry/Reclaim.sol";
import {Claims} from "reclaim-verifier-foundry/Claims.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Minimal mock USDC for unit tests (no forking required)
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @dev Mock Reclaim verifier that always succeeds (unit test bypass)
contract MockReclaim {
    bool public shouldRevert;

    function setShouldRevert(bool _revert) external {
        shouldRevert = _revert;
    }

    function verifyProof(Reclaim.Proof memory) external view {
        require(!shouldRevert, "MockReclaim: proof invalid");
    }
}

contract FedExEscrowTest is Test {
    FedExEscrow public escrow;
    MockUSDC public usdc;
    MockReclaim public mockReclaim;

    address public buyer = makeAddr("buyer");
    address public seller = makeAddr("seller");
    address public owner = makeAddr("owner");

    uint256 constant TOTAL = 1000e6; // 1000 USDC (6 decimals)
    uint8 constant UPFRONT_PCT = 30;

    bytes32 constant PAYMENT_ID = keccak256("test-payment-001");

    function setUp() public {
        usdc = new MockUSDC();
        mockReclaim = new MockReclaim();

        vm.prank(owner);
        escrow = new FedExEscrow(address(usdc), address(mockReclaim));

        // Fund buyer
        usdc.mint(buyer, TOTAL);
        vm.prank(buyer);
        usdc.approve(address(escrow), TOTAL);
    }

    // -------------------------------------------------------------------------
    // createEscrow
    // -------------------------------------------------------------------------

    function test_createEscrow_releasesUpfront() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        uint256 upfront = (TOTAL * UPFRONT_PCT) / 100;
        uint256 remaining = TOTAL - upfront;

        assertEq(usdc.balanceOf(seller), upfront, "Seller should receive upfront");
        assertEq(usdc.balanceOf(address(escrow)), remaining, "Contract holds remaining");

        FedExEscrow.Escrow memory e = escrow.getEscrow(PAYMENT_ID);
        assertEq(e.remainingAmount, remaining);
        assertEq(uint8(e.status), uint8(FedExEscrow.EscrowStatus.Active));
    }

    function test_createEscrow_zeroUpfront() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, 0, seller);

        assertEq(usdc.balanceOf(seller), 0);
        assertEq(usdc.balanceOf(address(escrow)), TOTAL);

        FedExEscrow.Escrow memory e = escrow.getEscrow(PAYMENT_ID);
        assertEq(e.remainingAmount, TOTAL);
    }

    function test_createEscrow_fullUpfront() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, 100, seller);

        assertEq(usdc.balanceOf(seller), TOTAL);
        assertEq(usdc.balanceOf(address(escrow)), 0);

        FedExEscrow.Escrow memory e = escrow.getEscrow(PAYMENT_ID);
        assertEq(e.remainingAmount, 0);
    }

    function test_createEscrow_revertsIfDuplicate() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        usdc.mint(buyer, TOTAL);
        vm.prank(buyer);
        usdc.approve(address(escrow), TOTAL);

        vm.prank(buyer);
        vm.expectRevert("Escrow already exists");
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);
    }

    function test_createEscrow_revertsIfZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert("Amount must be > 0");
        escrow.createEscrow(PAYMENT_ID, 0, UPFRONT_PCT, seller);
    }

    function test_createEscrow_revertsIfBuyerIsSeller() public {
        vm.prank(buyer);
        vm.expectRevert("Buyer and seller must differ");
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, buyer);
    }

    // -------------------------------------------------------------------------
    // releasePayment
    // -------------------------------------------------------------------------

    function _dummyProof() internal pure returns (Reclaim.Proof memory) {
        Claims.ClaimInfo memory claimInfo = Claims.ClaimInfo({
            provider: "fedex-tracking",
            parameters: "{}",
            context: "{}"
        });
        Claims.CompleteClaimData memory claimData = Claims.CompleteClaimData({
            identifier: bytes32(0),
            owner: address(0),
            timestampS: 0,
            epoch: 1
        });
        Claims.SignedClaim memory signedClaim = Claims.SignedClaim({
            claim: claimData,
            signatures: new bytes[](0)
        });
        return Reclaim.Proof({claimInfo: claimInfo, signedClaim: signedClaim});
    }

    function test_releasePayment_transfersRemainingToSeller() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        uint256 remaining = TOTAL - (TOTAL * UPFRONT_PCT) / 100;

        escrow.releasePayment(PAYMENT_ID, _dummyProof());

        assertEq(usdc.balanceOf(seller), TOTAL, "Seller should have full amount");
        assertEq(usdc.balanceOf(address(escrow)), 0);

        FedExEscrow.Escrow memory e = escrow.getEscrow(PAYMENT_ID);
        assertEq(e.remainingAmount, 0);
        assertEq(uint8(e.status), uint8(FedExEscrow.EscrowStatus.Released));
    }

    function test_releasePayment_revertsIfProofInvalid() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        mockReclaim.setShouldRevert(true);

        vm.expectRevert("MockReclaim: proof invalid");
        escrow.releasePayment(PAYMENT_ID, _dummyProof());
    }

    function test_releasePayment_revertsIfAlreadyReleased() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        escrow.releasePayment(PAYMENT_ID, _dummyProof());

        vm.expectRevert("Escrow not active");
        escrow.releasePayment(PAYMENT_ID, _dummyProof());
    }

    // -------------------------------------------------------------------------
    // cancelEscrow
    // -------------------------------------------------------------------------

    function test_cancelEscrow_refundsBuyer() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        uint256 remaining = TOTAL - (TOTAL * UPFRONT_PCT) / 100;
        uint256 buyerBalanceBefore = usdc.balanceOf(buyer);

        vm.prank(buyer);
        escrow.cancelEscrow(PAYMENT_ID);

        assertEq(usdc.balanceOf(buyer), buyerBalanceBefore + remaining, "Buyer should be refunded");
        assertEq(usdc.balanceOf(address(escrow)), 0);

        FedExEscrow.Escrow memory e = escrow.getEscrow(PAYMENT_ID);
        assertEq(uint8(e.status), uint8(FedExEscrow.EscrowStatus.Cancelled));
    }

    function test_cancelEscrow_revertsIfNotBuyer() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        vm.prank(seller);
        vm.expectRevert("Not authorized");
        escrow.cancelEscrow(PAYMENT_ID);
    }

    function test_cancelEscrow_ownerCanCancel() public {
        vm.prank(buyer);
        escrow.createEscrow(PAYMENT_ID, TOTAL, UPFRONT_PCT, seller);

        vm.prank(owner);
        escrow.cancelEscrow(PAYMENT_ID);

        FedExEscrow.Escrow memory e = escrow.getEscrow(PAYMENT_ID);
        assertEq(uint8(e.status), uint8(FedExEscrow.EscrowStatus.Cancelled));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function test_toPaymentId_isKeccak256() public view {
        bytes32 id = escrow.toPaymentId("test-payment-001");
        assertEq(id, keccak256("test-payment-001"));
    }
}
