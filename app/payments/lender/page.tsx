// app/payments/lender/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import PaymentCard from "@/app/components/payment-card";
import BalanceCard from "@/app/components/balance-card";
import DepositModal from "@/app/components/deposit-modal";
import WithdrawModal from "@/app/components/withdraw-modal";
import RoleSwitcher from "@/app/components/role-switcher";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { createLendingOffer, withdrawFromLendingOffer } from "@/lib/contract";
import { LenderPosition, FactoredInvoice } from "@/lib/database.types";
import { useClaimPayment } from "../useClaimPayment";
import { Payment } from "@/lib/types";

export default function LenderPaymentsPage() {
  const [positions, setPositions] = useState<LenderPosition[]>([]);
  const [factoredInvoices, setFactoredInvoices] = useState<
    Array<FactoredInvoice & { payment: Payment }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedDiscountRate, setSelectedDiscountRate] = useState<number>(5);
  const [selectedPosition, setSelectedPosition] =
    useState<LenderPosition | null>(null);
  const { wallets } = useWallets();
  const {
    claimPayment,
    state: claimState,
    txHash: claimTxHash,
    error: claimError,
    reset: resetClaim,
  } = useClaimPayment();

  const lenderAddress = wallets.find(
    (w) => w.walletClientType === "privy"
  )?.address;

  const fetchPositions = useCallback(async () => {
    if (!lenderAddress) return;
    const res = await fetch(
      `/api/lender-positions?lender_address=${lenderAddress}`
    );
    const json = await res.json();
    if (json.success) {
      setPositions(json.data);
    }
  }, [lenderAddress]);

  const fetchFactoredInvoices = useCallback(async () => {
    if (!lenderAddress) return;

    // Get all positions for this lender
    const posRes = await fetch(
      `/api/lender-positions?lender_address=${lenderAddress}`
    );
    const posJson = await posRes.json();

    if (posJson.success && posJson.data.length > 0) {
      // Get offer IDs for this lender
      const offerIds = posJson.data.map((p: LenderPosition) => p.offer_id);

      // Fetch all payments
      const paymentsRes = await fetch("/api/payments");
      const paymentsJson = await paymentsRes.json();

      // Fetch all factored invoices
      const factoredRes = await fetch("/api/factored-invoices");
      const factoredJson = await factoredRes.json();

      if (factoredJson.success && paymentsJson.success) {
        // Filter factored invoices that match lender's offers
        const lenderInvoices = factoredJson.data
          .filter((fi: FactoredInvoice) =>
            offerIds.includes(fi.lender_offer_id)
          )
          .map((fi: FactoredInvoice) => {
            // Find the associated payment
            const payment = paymentsJson.data.find(
              (p: Payment) => p.id === fi.payment_id
            );
            return { ...fi, payment };
          })
          .filter((fi: any) => fi.payment); // Only include if payment exists

        setFactoredInvoices(lenderInvoices);
      }
    }
  }, [lenderAddress]);

  useEffect(() => {
    fetchPositions();
    fetchFactoredInvoices();
  }, [fetchPositions, fetchFactoredInvoices]);

  // Refresh factored invoices after a successful claim
  useEffect(() => {
    if (claimState === "done") {
      fetchFactoredInvoices();
      fetchPositions();
    }
  }, [claimState, fetchFactoredInvoices, fetchPositions]);

  const handleCreateOffer = (discountRate: number) => {
    setSelectedDiscountRate(discountRate);
    setDepositModalOpen(true);
  };

  const handleDeposit = async (amount: number) => {
    setError(null);
    setTxHash(null);

    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) {
      setError("No wallet connected");
      throw new Error("No wallet connected");
    }

    try {
      await wallet.switchChain(46630); // Robinhood Testnet

      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      const { offerId, txHash } = await createLendingOffer(signer, {
        discountRate: selectedDiscountRate,
        amountUSD: amount,
      });

      // Save to database
      await fetch("/api/lender-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: offerId,
          lender_address: wallet.address,
          amount: amount.toString(),
          discount_rate: selectedDiscountRate,
          amount_available: amount.toString(),
          amount_lent: "0",
          status: "active",
        }),
      });

      setTxHash(txHash);
      fetchPositions();
    } catch (err: any) {
      setError(err.message || "Transaction failed");
      throw err;
    }
  };

  const handleWithdraw = (position: LenderPosition) => {
    setSelectedPosition(position);
    setWithdrawModalOpen(true);
  };

  const handleWithdrawSubmit = async (amount: number) => {
    if (!selectedPosition) return;

    setError(null);
    setTxHash(null);

    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) {
      setError("No wallet connected");
      throw new Error("No wallet connected");
    }

    try {
      await wallet.switchChain(46630); // Robinhood Testnet

      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      const hash = await withdrawFromLendingOffer(signer, {
        offerId: selectedPosition.offer_id,
        amountUSD: amount,
      });

      // Update database
      const newAvailable = (
        parseFloat(selectedPosition.amount_available) - amount
      ).toString();
      const newStatus =
        parseFloat(newAvailable) === 0 ? "withdrawn" : selectedPosition.status;

      await fetch(`/api/lender-positions/${selectedPosition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_available: newAvailable,
          status: newStatus,
        }),
      });

      setTxHash(hash);
      fetchPositions();
    } catch (err: any) {
      setError(err.message || "Withdrawal failed");
      throw err;
    }
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        backgroundColor: "#FAFAFA",
        px: 7,
        py: 6,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <RoleSwitcher />

        {/* Balance Card */}
        {lenderAddress && (
          <BalanceCard
            walletAddress={lenderAddress}
            showContractBalance={true}
          />
        )}

        <Typography
          component="h1"
          sx={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          Lender Dashboard
        </Typography>

        {/* Status banner for regular actions */}
        {(error || txHash) && (
          <Box
            sx={{
              backgroundColor: error ? "#fff0f0" : "#f0fff4",
              border: `1px solid ${error ? "#ffcccc" : "#b7ebc8"}`,
              borderRadius: "10px",
              px: 3,
              py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "14px",
                color: error ? "#d32f2f" : "#2e7d32",
                fontFamily: "inherit",
                wordBreak: "break-all",
              }}
            >
              {error || `Success! Tx: ${txHash}`}
            </Typography>
            <Typography
              onClick={() => {
                setError(null);
                setTxHash(null);
              }}
              sx={{
                fontSize: "13px",
                color: "#171717",
                fontFamily: "inherit",
                cursor: "pointer",
                ml: 2,
                flexShrink: 0,
                textDecoration: "underline",
              }}
            >
              Dismiss
            </Typography>
          </Box>
        )}

        {/* Claim status banner */}
        {claimState !== "idle" && (
          <Box
            sx={{
              backgroundColor:
                claimState === "error"
                  ? "#fff0f0"
                  : claimState === "done"
                  ? "#f0fff4"
                  : "#f5f5f5",
              border: `1px solid ${
                claimState === "error"
                  ? "#ffcccc"
                  : claimState === "done"
                  ? "#b7ebc8"
                  : "#e0e0e0"
              }`,
              borderRadius: "10px",
              px: 3,
              py: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: "14px",
                color:
                  claimState === "error"
                    ? "#d32f2f"
                    : claimState === "done"
                    ? "#2e7d32"
                    : "#555555",
                fontFamily: "inherit",
                wordBreak: "break-all",
              }}
            >
              {claimState === "scanning" &&
                "Scan the QR code with your phone to verify FedEx delivery…"}
              {claimState === "verifying" && "Verifying proof…"}
              {claimState === "submitting" && "Submitting to blockchain…"}
              {claimState === "done" && `Payment claimed! Tx: ${claimTxHash}`}
              {claimState === "error" && `Error: ${claimError}`}
            </Typography>
            {(claimState === "done" || claimState === "error") && (
              <Typography
                onClick={resetClaim}
                sx={{
                  fontSize: "13px",
                  color: "#171717",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  ml: 2,
                  flexShrink: 0,
                  textDecoration: "underline",
                }}
              >
                Dismiss
              </Typography>
            )}
          </Box>
        )}

        {/* Create offer buttons */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography
            sx={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#333333",
              fontFamily: "inherit",
            }}
          >
            Create New Lending Offer
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              onClick={() => handleCreateOffer(5)}
              disabled={loading}
              sx={{
                flex: 1,
                backgroundColor: "#FFFFFF",
                color: "#000000",
                border: "1px solid #E0E0E0",
                borderRadius: "10px",
                py: 2,
                px: 3,
                textTransform: "none",
                fontSize: "15px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#F5F5F5" },
                "&:disabled": { backgroundColor: "#F0F0F0" },
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: "18px",
                    fontWeight: 700,
                    fontFamily: "inherit",
                  }}
                >
                  5% Lower Risk
                </Typography>
                <Typography
                  sx={{
                    fontSize: "13px",
                    color: "#777777",
                    fontFamily: "inherit",
                  }}
                >
                  Conservative returns, lower default risk
                </Typography>
              </Box>
            </Button>
            <Button
              onClick={() => handleCreateOffer(10)}
              disabled={loading}
              sx={{
                flex: 1,
                backgroundColor: "#171717",
                color: "#FFFFFF",
                borderRadius: "10px",
                py: 2,
                px: 3,
                textTransform: "none",
                fontSize: "15px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#2a2a2a" },
                "&:disabled": { backgroundColor: "#999999" },
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: "18px",
                    fontWeight: 700,
                    fontFamily: "inherit",
                  }}
                >
                  10% Higher Risk
                </Typography>
                <Typography
                  sx={{
                    fontSize: "13px",
                    color: "#CCCCCC",
                    fontFamily: "inherit",
                  }}
                >
                  Higher returns, increased default risk
                </Typography>
              </Box>
            </Button>
          </Box>
        </Box>

        {/* Lending positions */}
        <Typography
          sx={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#333333",
            fontFamily: "inherit",
            mt: 2,
          }}
        >
          Your Lending Positions
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {positions.length === 0 ? (
            <Typography
              sx={{ fontSize: "14px", color: "#999999", fontFamily: "inherit" }}
            >
              No lending positions yet. Create an offer to get started.
            </Typography>
          ) : (
            positions.map((position) => {
              const amountLent = parseFloat(position.amount_lent);
              const totalAmount = parseFloat(position.amount);
              const expectedReturn =
                (totalAmount * position.discount_rate) / 100;

              return (
                <PaymentCard
                  key={position.id}
                  variant="lender"
                  company={`${position.discount_rate}% Discount Rate`}
                  terms={`Offer ID: ${position.offer_id}`}
                  amount={`$${parseFloat(
                    position.amount
                  ).toLocaleString()} USAT`}
                  badges={[position.status]}
                  depositedAmount={`$${totalAmount.toLocaleString()} deposited`}
                  availableAmount={`$${parseFloat(
                    position.amount_available
                  ).toLocaleString()} available`}
                  lentAmount={`$${amountLent.toLocaleString()} lent out`}
                  expectedReturn={`~$${expectedReturn.toFixed(
                    2
                  )} expected return`}
                  onWithdraw={
                    parseFloat(position.amount_available) > 0 &&
                    position.status === "active"
                      ? () => handleWithdraw(position)
                      : undefined
                  }
                />
              );
            })
          )}
        </Box>

        {/* Factored Invoices Section */}
        <Typography
          sx={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#333333",
            fontFamily: "inherit",
            mt: 4,
          }}
        >
          Factored Invoices to Claim
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {factoredInvoices.length === 0 ? (
            <Typography
              sx={{ fontSize: "14px", color: "#999999", fontFamily: "inherit" }}
            >
              No factored invoices to claim yet.
            </Typography>
          ) : (
            factoredInvoices.map((factoredInvoice) => {
              const payment = factoredInvoice.payment;
              const isCompleted = payment.status === "completed";
              const isClaiming =
                claimState !== "idle" &&
                claimState !== "done" &&
                claimState !== "error";

              const remaining = (
                (parseFloat(payment.total_amount) *
                  payment.remaining_percentage) /
                100
              ).toFixed(2);

              return (
                <PaymentCard
                  key={factoredInvoice.id}
                  paymentId={payment.id}
                  variant="seller"
                  company={`Seller: ${payment.seller_address}`}
                  terms={`${factoredInvoice.discount_rate}% discount rate • Invoice factored for ${remaining} USDC`}
                  amount={`$${parseFloat(remaining).toLocaleString()} USDC`}
                  badges={
                    isCompleted
                      ? ["Completed"]
                      : ["Ready to Claim", `${factoredInvoice.status}`]
                  }
                  remaining={
                    isCompleted
                      ? undefined
                      : `Factored amount: $${parseFloat(
                          factoredInvoice.factored_amount
                        ).toLocaleString()}`
                  }
                  onClaim={
                    isCompleted || isClaiming
                      ? undefined
                      : () => claimPayment(payment)
                  }
                />
              );
            })
          )}
        </Box>
      </Box>

      {/* Deposit Modal */}
      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        discountRate={selectedDiscountRate}
        onDeposit={handleDeposit}
      />

      {/* Withdraw Modal */}
      {selectedPosition && (
        <WithdrawModal
          open={withdrawModalOpen}
          onClose={() => setWithdrawModalOpen(false)}
          maxAmount={selectedPosition.amount_available}
          discountRate={selectedPosition.discount_rate}
          onWithdraw={handleWithdrawSubmit}
        />
      )}
    </Box>
  );
}
