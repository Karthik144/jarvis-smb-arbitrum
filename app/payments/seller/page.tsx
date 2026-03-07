// app/payments/seller/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PaymentCard from "@/app/components/payment-card";
import BalanceCard from "@/app/components/balance-card";
import RoleSwitcher from "@/app/components/role-switcher";
import FactorInvoiceModal from "@/app/components/factor-invoice-modal";
import { useWallets } from "@privy-io/react-auth";
import { Payment } from "@/lib/types";
import { useClaimPayment } from "../useClaimPayment";

export default function SellerPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [factoringPayment, setFactoringPayment] = useState<Payment | null>(null);
  const { wallets } = useWallets();
  const { claimPayment, state, txHash, error, reset } = useClaimPayment();

  const sellerAddress = wallets.find(
    (w) => w.walletClientType === "privy"
  )?.address;

  const fetchPayments = useCallback(async () => {
    if (!sellerAddress) return;

    // Fetch all payments
    const res = await fetch("/api/payments");
    const json = await res.json();

    if (json.success) {
      // Fetch factored invoices for this seller
      const factoredRes = await fetch(
        `/api/factored-invoices?seller_address=${sellerAddress}`
      );
      const factoredJson = await factoredRes.json();

      // Get payment IDs that have been factored
      const factoredPaymentIds = new Set(
        factoredJson.success
          ? factoredJson.data.map((fi: any) => fi.payment_id)
          : []
      );

      // Filter out factored invoices and only show seller's payments
      setPayments(
        (json.data as Payment[]).filter(
          (p) =>
            p.seller_address.toLowerCase() === sellerAddress.toLowerCase() &&
            !factoredPaymentIds.has(p.id)
        )
      );
    }
  }, [sellerAddress]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Refresh list after a successful claim
  useEffect(() => {
    if (state === "done") {
      fetchPayments();
    }
  }, [state, fetchPayments]);

  function statusLabel(): string {
    switch (state) {
      case "scanning":
        return "Scan the QR code with your phone to verify FedEx delivery…";
      case "verifying":
        return "Verifying proof…";
      case "submitting":
        return "Submitting to blockchain…";
      case "done":
        return `Payment released! Tx: ${txHash}`;
      case "error":
        return `Error: ${error}`;
      default:
        return "";
    }
  }

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
        {sellerAddress && (
          <BalanceCard
            walletAddress={sellerAddress}
            showEscrowBalance={true}
            userRole="seller"
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
          Incoming Payments
        </Typography>

        {/* Claim status banner */}
        {state !== "idle" && (
          <Box
            sx={{
              backgroundColor:
                state === "error"
                  ? "#fff0f0"
                  : state === "done"
                  ? "#f0fff4"
                  : "#f5f5f5",
              border: `1px solid ${
                state === "error"
                  ? "#ffcccc"
                  : state === "done"
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
                  state === "error"
                    ? "#d32f2f"
                    : state === "done"
                    ? "#2e7d32"
                    : "#555555",
                fontFamily: "inherit",
                wordBreak: "break-all",
              }}
            >
              {statusLabel()}
            </Typography>
            {(state === "done" || state === "error") && (
              <Typography
                onClick={reset}
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

        {/* Payment cards */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {payments.length === 0 ? (
            <Typography
              sx={{ fontSize: "14px", color: "#999999", fontFamily: "inherit" }}
            >
              No incoming payments yet.
            </Typography>
          ) : (
            payments.map((payment) => {
              const remaining = (
                (parseFloat(payment.total_amount) *
                  payment.remaining_percentage) /
                100
              ).toFixed(2);
              const isCompleted = payment.status === "completed";
              const isClaiming =
                state !== "idle" && state !== "done" && state !== "error";
              return (
                <PaymentCard
                  key={payment.id}
                  paymentId={payment.id}
                  variant="seller"
                  company={`From: ${payment.buyer_address}`}
                  terms={`${payment.upfront_percentage}% paid upfront, ${payment.remaining_percentage}% on delivery verification`}
                  amount={`$${parseFloat(
                    payment.total_amount
                  ).toLocaleString()} USDC`}
                  badges={isCompleted ? ["Completed"] : ["Pending Claim"]}
                  remaining={
                    isCompleted ? undefined : `$${remaining} remaining`
                  }
                  onClaim={
                    isCompleted || isClaiming
                      ? undefined
                      : () => claimPayment(payment)
                  }
                  onFactorInvoice={
                    isCompleted ? undefined : () => setFactoringPayment(payment)
                  }
                />
              );
            })
          )}
        </Box>

        {payments.length !== 0 ? (
          <Typography
            sx={{
              fontSize: "13px",
              color: "#888888",
              fontFamily: "inherit",
            }}
          >
            Clicking Claim will open a QR code. Scan it with your phone to
            verify delivery via FedEx tracking through Reclaim Protocol.
          </Typography>
        ) : null}
      </Box>

      {factoringPayment && (
        <FactorInvoiceModal
          open={!!factoringPayment}
          onClose={() => setFactoringPayment(null)}
          payment={factoringPayment}
          onSuccess={fetchPayments}
        />
      )}
    </Box>
  );
}
