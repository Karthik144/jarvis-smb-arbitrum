"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ethers } from "ethers";

// USDC contract on Arbitrum mainnet
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDC_DECIMALS = 6;

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

interface BalanceCardProps {
  walletAddress: string;
}

export default function BalanceCard({ walletAddress }: BalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchBalance() {
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Create provider for Arbitrum
        const provider = new ethers.JsonRpcProvider(
          "https://arb1.arbitrum.io/rpc"
        );

        // Create contract instance
        const usdcContract = new ethers.Contract(
          USDC_ADDRESS,
          ERC20_ABI,
          provider
        );

        // Fetch balance
        const rawBalance = await usdcContract.balanceOf(walletAddress);

        // Format balance (USDC has 6 decimals)
        const balanceInUsdc = Number(rawBalance) / Math.pow(10, USDC_DECIMALS);
        const formattedBalance = `$${balanceInUsdc.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} USDC`;

        setBalance(formattedBalance);
      } catch (error) {
        console.error("Failed to fetch USDC balance:", error);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
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
