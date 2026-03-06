// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Reclaim} from "reclaim-verifier-foundry/Reclaim.sol";

/// @title FedExEscrow
/// @notice Escrow contract for importer/exporter USDC payments gated by
///         on-chain Reclaim Protocol ZK-TLS delivery proof verification.
///
/// Flow:
///   1. Buyer calls createEscrow() after approving this contract to spend USDC.
///      The upfront percentage is released to the seller immediately.
///      The remaining amount is held in escrow.
///   2. Once FedEx delivery is confirmed, anyone calls releasePayment() with
///      a Reclaim ZK proof. The contract verifies the proof on-chain and
///      transfers the remaining USDC to the seller.
///   3. The buyer can cancel the escrow (reclaiming remaining funds) before
///      the proof is submitted, e.g. if delivery is disputed.
contract FedExEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    IERC20 public immutable usdc;
    address public immutable reclaimAddress;

    enum EscrowStatus {
        Active,
        Released,
        Cancelled
    }

    struct Escrow {
        address buyer;
        address seller;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint8 upfrontPct;
        EscrowStatus status;
    }

    /// @dev paymentId is a bytes32 hash of the off-chain payment UUID
    mapping(bytes32 => Escrow) public escrows;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event EscrowCreated(
        bytes32 indexed paymentId,
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        uint256 upfrontAmount
    );

    event PaymentReleased(
        bytes32 indexed paymentId,
        address indexed seller,
        uint256 amount
    );

    event EscrowCancelled(bytes32 indexed paymentId, address indexed buyer, uint256 refund);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _usdc, address _reclaim) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_reclaim != address(0), "Invalid Reclaim address");
        usdc = IERC20(_usdc);
        reclaimAddress = _reclaim;
    }

    // -------------------------------------------------------------------------
    // External functions
    // -------------------------------------------------------------------------

    /// @notice Buyer creates an escrow, locking USDC and releasing the upfront
    ///         portion to the seller immediately.
    /// @param paymentId    Unique identifier (bytes32 hash of the off-chain UUID)
    /// @param totalAmount  Total USDC amount (in USDC's 6-decimal units)
    /// @param upfrontPct   Percentage (0–100) released to seller immediately
    /// @param seller       Seller's wallet address
    function createEscrow(
        bytes32 paymentId,
        uint256 totalAmount,
        uint8 upfrontPct,
        address seller
    ) external nonReentrant {
        require(escrows[paymentId].buyer == address(0), "Escrow already exists");
        require(totalAmount > 0, "Amount must be > 0");
        require(upfrontPct <= 100, "Invalid upfront percentage");
        require(seller != address(0), "Invalid seller address");
        require(seller != msg.sender, "Buyer and seller must differ");

        // Pull full amount from buyer (buyer must have approved this contract)
        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 upfrontAmount = (totalAmount * upfrontPct) / 100;
        uint256 remaining = totalAmount - upfrontAmount;

        escrows[paymentId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            totalAmount: totalAmount,
            remainingAmount: remaining,
            upfrontPct: upfrontPct,
            status: EscrowStatus.Active
        });

        // Release upfront immediately
        if (upfrontAmount > 0) {
            usdc.safeTransfer(seller, upfrontAmount);
        }

        emit EscrowCreated(paymentId, msg.sender, seller, totalAmount, upfrontAmount);
    }

    /// @notice Verifies a Reclaim ZK-TLS delivery proof on-chain and releases
    ///         the remaining escrowed USDC to the seller.
    /// @param paymentId Escrow identifier
    /// @param proof     Reclaim proof struct generated by the JS SDK
    function releasePayment(
        bytes32 paymentId,
        Reclaim.Proof memory proof
    ) external nonReentrant {
        Escrow storage escrow = escrows[paymentId];
        require(escrow.status == EscrowStatus.Active, "Escrow not active");
        require(escrow.remainingAmount > 0, "Nothing to release");

        // Verify ZK proof on-chain — reverts if invalid
        Reclaim(reclaimAddress).verifyProof(proof);

        uint256 amount = escrow.remainingAmount;
        escrow.remainingAmount = 0;
        escrow.status = EscrowStatus.Released;

        usdc.safeTransfer(escrow.seller, amount);

        emit PaymentReleased(paymentId, escrow.seller, amount);
    }

    /// @notice Buyer cancels the escrow and recovers remaining funds.
    ///         Only callable before the proof is submitted.
    /// @param paymentId Escrow identifier
    function cancelEscrow(bytes32 paymentId) external nonReentrant {
        Escrow storage escrow = escrows[paymentId];
        require(
            escrow.buyer == msg.sender || owner() == msg.sender,
            "Not authorized"
        );
        require(escrow.status == EscrowStatus.Active, "Escrow not active");

        uint256 refund = escrow.remainingAmount;
        escrow.remainingAmount = 0;
        escrow.status = EscrowStatus.Cancelled;

        if (refund > 0) {
            usdc.safeTransfer(escrow.buyer, refund);
        }

        emit EscrowCancelled(paymentId, escrow.buyer, refund);
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /// @notice Returns the escrow details for a given paymentId.
    function getEscrow(bytes32 paymentId) external view returns (Escrow memory) {
        return escrows[paymentId];
    }

    /// @notice Converts an off-chain string UUID to the bytes32 paymentId used
    ///         on-chain. The frontend should call this before createEscrow.
    function toPaymentId(string calldata uuid) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(uuid));
    }
}
