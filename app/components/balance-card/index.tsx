"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface BalanceCardProps {
  walletAddress: string;
}

export default function BalanceCard({ walletAddress }: BalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Balance fetching logic will go here
    setLoading(false);
  }, [walletAddress]);

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
        mb: 4,
      }}
    >
      <Typography
        sx={{
          fontSize: "17px",
          fontWeight: 600,
          color: "#000000",
          fontFamily: "inherit",
        }}
      >
        Wallet Balance
      </Typography>
      <Typography
        sx={{
          fontSize: loading ? "14px" : "26px",
          fontWeight: loading ? 500 : 700,
          letterSpacing: loading ? "0" : "-0.5px",
          color: loading || !balance ? "#999999" : "#000000",
          fontFamily: "inherit",
        }}
      >
        {loading ? "Loading..." : balance || "Unavailable"}
      </Typography>
    </Box>
  );
}
