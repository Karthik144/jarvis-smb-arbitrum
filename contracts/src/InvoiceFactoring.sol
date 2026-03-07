// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title InvoiceFactoring
/// @notice Simple 1-to-1 matching between lenders and sellers for invoice factoring using a custom ERC-20 Stablecoin
contract InvoiceFactoring is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint8 public constant HIGH_RISK_RATE = 10; // 10% discount
    uint8 public constant LOW_RISK_RATE = 5;   // 5% discount

    // Mock stabelcoin (USAT)
    IERC20 public immutable paymentToken;

    struct LenderOffer {
        address lender;           // Lender's address
        uint256 totalAmount;      // Total amount lender deposited (in base units)
        uint256 availableAmount;  // Amount still available to lend (in base units)
        uint8 discountRate;       // Discount rate (5 or 10)
        bool active;              // Whether offer is active
    }

    struct Invoice {
        bytes32 invoiceId;           // Unique invoice identifier
        address seller;              // Seller who factored the invoice
        uint256 lenderOfferId;       // Which lender offer funded this
        uint256 totalInvoiceAmount;  // Total invoice amount in base units
        uint256 upfrontPaid;         // Amount already paid upfront in base units
        uint256 factoredAmount;      // Amount being factored in base units
        uint256 payoutToSeller;      // Discounted amount paid to seller now in base units
        bool settled;                // Whether invoice has been settled
    }

    uint256 public nextOfferId = 1;

    /// @notice All lender offers
    mapping(uint256 => LenderOffer) public lenderOffers;

    /// @notice All invoices
    mapping(bytes32 => Invoice) public invoices;

    /// @notice Track lender's offer IDs
    mapping(address => uint256[]) public lenderOfferIds;

    event OfferCreated(
        uint256 indexed offerId,
        address indexed lender,
        uint256 amount,
        uint8 discountRate
    );

    event OfferCancelled(uint256 indexed offerId);

    event InvoiceFactored(
        bytes32 indexed invoiceId,
        address indexed seller,
        uint256 indexed lenderOfferId,
        uint256 factoredAmount,
        uint256 payoutToSeller
    );

    event InvoiceSettled(
        bytes32 indexed invoiceId,
        uint256 lenderOfferId,
        uint256 factoredAmount,
        uint256 spread
    );

    event FundsWithdrawn(
        uint256 indexed offerId,
        address indexed lender,
        uint256 amount
    );

    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
    }

    // -------------------------------------------------------------------------
    // Lender Functions
    // -------------------------------------------------------------------------

    /// @notice Lender creates an offer to lend at specified rate
    /// @param discountRate Discount rate (5 or 10)
    /// @param amount Amount of stablecoin to deposit (in base units)
    /// @return offerId The created offer ID
    function createOffer(uint8 discountRate, uint256 amount) external nonReentrant returns (uint256 offerId) {
        require(amount > 0, "Amount must be > 0");
        require(
            discountRate == HIGH_RISK_RATE || discountRate == LOW_RISK_RATE,
            "Invalid discount rate"
        );

        // Transfer stablecoin from lender to this contract
        // NOTE: Lender must have called `approve()` on the token contract first!
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        offerId = nextOfferId++;

        lenderOffers[offerId] = LenderOffer({
            lender: msg.sender,
            totalAmount: amount,
            availableAmount: amount,
            discountRate: discountRate,
            active: true
        });

        lenderOfferIds[msg.sender].push(offerId);

        emit OfferCreated(offerId, msg.sender, amount, discountRate);
    }

    /// @notice Lender cancels their offer and withdraws available funds
    /// @param offerId The offer ID to cancel
    function cancelOffer(uint256 offerId) external nonReentrant {
        LenderOffer storage offer = lenderOffers[offerId];
        require(offer.lender == msg.sender, "Not your offer");
        require(offer.active, "Offer not active");

        uint256 withdrawAmount = offer.availableAmount;
        offer.active = false;
        offer.availableAmount = 0;

        if (withdrawAmount > 0) {
            paymentToken.safeTransfer(msg.sender, withdrawAmount);
        }

        emit OfferCancelled(offerId);
    }

    /// @notice Lender withdraws available funds from their offer
    /// @param offerId The offer ID
    /// @param amount Amount to withdraw in base units
    function withdrawFromOffer(uint256 offerId, uint256 amount) external nonReentrant {
        LenderOffer storage offer = lenderOffers[offerId];
        require(offer.lender == msg.sender, "Not your offer");
        require(offer.active, "Offer not active");
        require(amount > 0, "Amount must be > 0");
        require(offer.availableAmount >= amount, "Insufficient available amount");

        offer.availableAmount -= amount;

        paymentToken.safeTransfer(msg.sender, amount);

        emit FundsWithdrawn(offerId, msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Seller Functions
    // -------------------------------------------------------------------------

    /// @notice Seller factors an invoice by getting matched with a lender
    /// @param invoiceId Unique invoice identifier
    /// @param totalInvoiceAmount Total invoice amount in base units
    /// @param upfrontPaid Amount already paid upfront in base units
    /// @param factoredAmount Amount to factor from remaining in base units
    /// @param discountRate Desired discount rate (5 or 10)
    function factorInvoice(
        bytes32 invoiceId,
        uint256 totalInvoiceAmount,
        uint256 upfrontPaid,
        uint256 factoredAmount,
        uint8 discountRate
    ) external nonReentrant {
        require(totalInvoiceAmount > 0, "Total amount must be > 0");
        require(factoredAmount > 0, "Factored amount must be > 0");
        require(upfrontPaid < totalInvoiceAmount, "Upfront paid >= total");

        uint256 remainingAmount = totalInvoiceAmount - upfrontPaid;
        require(factoredAmount <= remainingAmount, "Factored amount exceeds remaining");

        require(
            discountRate == HIGH_RISK_RATE || discountRate == LOW_RISK_RATE,
            "Invalid discount rate"
        );
        require(invoices[invoiceId].seller == address(0), "Invoice already exists");

        uint256 payoutToSeller = factoredAmount * (100 - discountRate) / 100;

        uint256 matchedOfferId = _findMatchingOffer(payoutToSeller, discountRate);
        require(matchedOfferId != 0, "No matching lender offer found");

        LenderOffer storage offer = lenderOffers[matchedOfferId];
        offer.availableAmount -= payoutToSeller;

        invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            seller: msg.sender,
            lenderOfferId: matchedOfferId,
            totalInvoiceAmount: totalInvoiceAmount,
            upfrontPaid: upfrontPaid,
            factoredAmount: factoredAmount,
            payoutToSeller: payoutToSeller,
            settled: false
        });

        // Transfer stablecoin from contract to seller
        paymentToken.safeTransfer(msg.sender, payoutToSeller);

        emit InvoiceFactored(invoiceId, msg.sender, matchedOfferId, factoredAmount, payoutToSeller);
    }

    /// @notice Settle invoice on delivery - escrow sends factored amount to matched lender
    /// @param invoiceId The invoice being settled
    function settleInvoice(bytes32 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];

        require(invoice.seller != address(0), "Invoice does not exist");
        require(!invoice.settled, "Invoice already settled");

        // Mark as settled
        invoice.settled = true;

        LenderOffer storage offer = lenderOffers[invoice.lenderOfferId];
        uint256 spread = invoice.factoredAmount - invoice.payoutToSeller;
        offer.availableAmount += invoice.factoredAmount;

        // Pull the funds from the escrow/payer into the contract
        // NOTE: The caller must have approved the contract to spend `factoredAmount`
        paymentToken.safeTransferFrom(msg.sender, address(this), invoice.factoredAmount);

        emit InvoiceSettled(invoiceId, invoice.lenderOfferId, invoice.factoredAmount, spread);
    }

    // -------------------------------------------------------------------------
    // Internal & View Functions
    // -------------------------------------------------------------------------

    function _findMatchingOffer(uint256 requiredAmount, uint8 discountRate) internal view returns (uint256 offerId) {
        for (uint256 i = 1; i < nextOfferId; i++) {
            LenderOffer storage offer = lenderOffers[i];
            if (
                offer.active &&
                offer.discountRate == discountRate &&
                offer.availableAmount >= requiredAmount
            ) {
                return i;
            }
        }
        return 0;
    }

    function getOffer(uint256 offerId) external view returns (LenderOffer memory) {
        return lenderOffers[offerId];
    }

    function getLenderOffers(address lender) external view returns (uint256[] memory) {
        return lenderOfferIds[lender];
    }

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }

    function calculatePayout(uint256 factoredAmount, uint8 discountRate) external pure returns (uint256) {
        require(
            discountRate == HIGH_RISK_RATE || discountRate == LOW_RISK_RATE,
            "Invalid discount rate"
        );
        return factoredAmount * (100 - discountRate) / 100;
    }

    function calculateSellerEarnings(
        uint256 upfrontPaid,
        uint256 factoredAmount,
        uint8 discountRate
    ) external pure returns (
        uint256 upfront,
        uint256 factoredPayout,
        uint256 totalReceived
    ) {
        require(
            discountRate == HIGH_RISK_RATE || discountRate == LOW_RISK_RATE,
            "Invalid discount rate"
        );

        upfront = upfrontPaid;
        factoredPayout = factoredAmount * (100 - discountRate) / 100;
        totalReceived = upfront + factoredPayout;
    }

    function hasAvailableOffer(uint256 requiredAmount, uint8 discountRate) external view returns (bool) {
        return _findMatchingOffer(requiredAmount, discountRate) != 0;
    }
}