// app/payments/buyer/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import PaymentCard from "@/app/components/payment-card";
import NewPaymentModal from "@/app/components/new-payment-modal";
import BalanceCard from "@/app/components/balance-card";
import { useWallets } from "@privy-io/react-auth";
import { Payment } from "@/lib/types";

function paymentBadges(payment: Payment): string[] {
  switch (payment.status) {
    case "upfront_paid":
      return ["Initial Paid", "Awaiting Delivery"];
    case "delivered":
      return ["Delivered", "Pending Release"];
    case "completed":
      return ["Completed"];
    default:
      return ["Pending"];
  }
}

export default function BuyerPaymentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const { wallets } = useWallets();

  const buyerAddress = wallets.find((w) => w.walletClientType === "privy")?.address;

  const fetchPayments = useCallback(async () => {
    if (!buyerAddress) return;
    const res = await fetch("/api/payments");
    const json = await res.json();
    if (json.success) {
      setPayments(
        (json.data as Payment[]).filter(
          (p) => p.buyer_address.toLowerCase() === buyerAddress.toLowerCase()
        )
      );
    }
  }, [buyerAddress]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <>
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          backgroundColor: "#FAFAFA",
          px: 7,
          py: 6,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Balance Card */}
          {buyerAddress && <BalanceCard walletAddress={buyerAddress} />}

          {/* Title row */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
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
              Scheduled Payments
            </Typography>
            <Button
              onClick={() => setModalOpen(true)}
              sx={{
                backgroundColor: "#171717",
                color: "#FFFFFF",
                borderRadius: "10px",
                px: 2.5,
                py: 1.25,
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#2a2a2a" },
              }}
            >
              New Payment
            </Button>
          </Box>

          {/* Payment cards */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {payments.length === 0 ? (
              <Typography
                sx={{ fontSize: "14px", color: "#999999", fontFamily: "inherit" }}
              >
                No payments yet. Create your first payment above.
              </Typography>
            ) : (
              payments.map((payment) => {
                const upfrontPaid = (
                  (parseFloat(payment.total_amount) * payment.upfront_percentage) /
                  100
                ).toFixed(2);
                return (
                  <PaymentCard
                    key={payment.id}
                    variant="buyer"
                    company={payment.seller_address}
                    terms={`${payment.upfront_percentage}% upfront, ${payment.remaining_percentage}% on delivery`}
                    amount={`$${parseFloat(payment.total_amount).toLocaleString()} USDC`}
                    badges={paymentBadges(payment)}
                    paid={`$${upfrontPaid} paid`}
                  />
                );
              })
            )}
          </Box>
        </Box>
      </Box>

      <NewPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchPayments}
      />
    </>
  );
}
