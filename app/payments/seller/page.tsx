"use client";

import PaymentCard from "@/app/components/payment-card";
import { Box, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

const MOCK_PAYMENTS = [
  {
    id: "1",
    company: "From: Buyer Corp",
    terms: "25% paid upfront, 75% on delivery verification",
    amount: "$5,000",
    badges: ["Pending Claim"],
    remaining: "$3,750 remaining",
  },
];

export default function SellerPaymentsPage() {
  const router = useRouter();

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

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {MOCK_PAYMENTS.map((payment) => (
            <PaymentCard
              key={payment.id}
              variant="seller"
              company={payment.company}
              terms={payment.terms}
              amount={payment.amount}
              badges={payment.badges}
              remaining={payment.remaining}
              onClaim={() => router.push("/verification")}
            />
          ))}
        </Box>

        {/* Helper text */}
        <Typography
          sx={{
            fontSize: "13px",
            color: "#888888",
            lineHeight: 1.6,
            maxWidth: "500px",
            fontFamily: "inherit",
          }}
        >
          Clicking Claim will open a QR code. Scan it with your phone to verify
          delivery via FedEx tracking through Reclaim Protocol.
        </Typography>
      </Box>
    </Box>
  );
}
