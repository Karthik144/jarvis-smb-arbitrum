"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ethers } from "ethers";

// USDC contract addresses
const USDC_ADDRESS_MAINNET = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDC_ADDRESS_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const USDC_DECIMALS = 6;

// Use environment variable or fallback to public RPC
const RPC_URL =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
  "https://sepolia-rollup.arbitrum.io/rpc";

// Detect which USDC address to use based on RPC URL
const USDC_ADDRESS = RPC_URL.includes("sepolia")
  ? USDC_ADDRESS_SEPOLIA
  : USDC_ADDRESS_MAINNET;

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];

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

        const provider = new ethers.JsonRpcProvider(RPC_URL);

        console.log("BalanceCard Debug:", {
          rpcUrl: RPC_URL,
          usdcAddress: USDC_ADDRESS,
          walletAddress,
        });

        const usdcContract = new ethers.Contract(
          USDC_ADDRESS,
          ERC20_ABI,
          provider
        );

        const rawBalance = await usdcContract.balanceOf(walletAddress);
        console.log("Raw balance:", rawBalance.toString());

        const balanceInUsdc = Number(rawBalance) / Math.pow(10, USDC_DECIMALS);
        console.log("Formatted balance:", balanceInUsdc);

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
    <Typography
      sx={{
        fontSize: loading ? "14px" : "42px",
        fontWeight: loading ? 500 : 700,
        letterSpacing: loading ? "0" : "-0.5px",
        color: loading || !balance ? "#999999" : "#000000",
        fontFamily: "inherit",
      }}
    >
      {loading ? "Loading..." : balance || "Unavailable"}
    </Typography>
  );
}
