// app/payments/buyer/page.tsx
"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import PaymentCard from "@/app/components/payment-card";
import NewPaymentModal from "@/app/components/new-payment-modal";

const MOCK_PAYMENTS = [
  {
    id: "1",
    company: "Acme Inc.",
    terms: "25% at start, 75% on delivery",
    amount: "$5,000",
    badges: ["Initial Paid", "Awaiting Delivery"],
    paid: "$1,250 paid",
  },
];

export default function BuyerPaymentsPage() {
  const [modalOpen, setModalOpen] = useState(false);

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
            {MOCK_PAYMENTS.map((payment) => (
              <PaymentCard
                key={payment.id}
                variant="buyer"
                company={payment.company}
                terms={payment.terms}
                amount={payment.amount}
                badges={payment.badges}
                paid={payment.paid}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <NewPaymentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
