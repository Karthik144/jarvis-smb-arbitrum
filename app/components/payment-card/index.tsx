// app/components/payment-card/index.tsx
"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Badge from "@/app/components/badge";

interface PaymentCardProps {
  variant: "buyer" | "seller" | "lender";
  company: string;
  sellerAddress?: string;
  terms: string;
  amount: string;
  badges: string[];
  // buyer only
  paid?: string;
  // seller only
  remaining?: string;
  onClaim?: () => void;
  onFactorInvoice?: () => void;
  // lender only
  depositedAmount?: string;
  availableAmount?: string;
  lentAmount?: string;
  expectedReturn?: string;
  onWithdraw?: () => void;
}

export default function PaymentCard({
  variant,
  company,
  sellerAddress,
  terms,
  amount,
  badges,
  paid,
  remaining,
  onClaim,
  onFactorInvoice,
  depositedAmount,
  availableAmount,
  lentAmount,
  expectedReturn,
  onWithdraw,
}: PaymentCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!sellerAddress) return;
    navigator.clipboard.writeText(sellerAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #F0F0F0",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        px: 4,
        py: 3,
      }}
    >
      {/* Left column */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          sx={{
            fontSize: "17px",
            fontWeight: 600,
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          {company}
        </Typography>
        {sellerAddress && (
          <Typography
            onClick={handleCopy}
            sx={{
              fontSize: "12px",
              color: copied ? "#22a06b" : "#AAAAAA",
              fontFamily: "monospace",
              cursor: "pointer",
              userSelect: "none",
              transition: "color 0.15s",
              "&:hover": { color: copied ? "#22a06b" : "#555555" },
            }}
          >
            {copied
              ? "Copied!"
              : `${sellerAddress.slice(0, 6)}…${sellerAddress.slice(-4)}`}
          </Typography>
        )}
        <Typography
          sx={{ fontSize: "14px", color: "#777777", fontFamily: "inherit" }}
        >
          {terms}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {badges.map((badge) => (
            <Badge key={badge} label={badge} />
          ))}
        </Box>
      </Box>

      {/* Right column */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: variant === "seller" || variant === "lender" ? 1.5 : 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          {amount}
        </Typography>

        {variant === "buyer" && paid && (
          <Typography
            sx={{ fontSize: "13px", color: "#999999", fontFamily: "inherit" }}
          >
            {paid}
          </Typography>
        )}

        {variant === "seller" && (
          <>
            {remaining && (
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#999999",
                  fontFamily: "inherit",
                }}
              >
                {remaining}
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              {onClaim && (
                <Button
                  onClick={onClaim}
                  sx={{
                    backgroundColor: "#171717",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    px: 2.5,
                    py: 1,
                    textTransform: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    "&:hover": { backgroundColor: "#2a2a2a" },
                  }}
                >
                  Claim
                </Button>
              )}
              {onFactorInvoice && (
                <Button
                  onClick={onFactorInvoice}
                  variant="outlined"
                  sx={{
                    borderColor: "#E0E0E0",
                    color: "#000000",
                    borderRadius: "8px",
                    px: 2.5,
                    py: 1,
                    textTransform: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    "&:hover": {
                      backgroundColor: "#F5F5F5",
                      borderColor: "#CCCCCC",
                    },
                  }}
                >
                  Factor Invoice
                </Button>
              )}
            </Box>
          </>
        )}

        {variant === "lender" && (
          <>
            {depositedAmount && (
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#999999",
                  fontFamily: "inherit",
                }}
              >
                {depositedAmount}
              </Typography>
            )}
            {availableAmount && (
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#22a06b",
                  fontFamily: "inherit",
                }}
              >
                {availableAmount}
              </Typography>
            )}
            {lentAmount && (
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#777777",
                  fontFamily: "inherit",
                }}
              >
                {lentAmount}
              </Typography>
            )}
            {expectedReturn && (
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#2e7d32",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                {expectedReturn}
              </Typography>
            )}
            {onWithdraw && (
              <Button
                onClick={onWithdraw}
                sx={{
                  backgroundColor: "#171717",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  px: 2.5,
                  py: 1,
                  textTransform: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  "&:hover": { backgroundColor: "#2a2a2a" },
                }}
              >
                Withdraw
              </Button>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
