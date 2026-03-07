"use client";

import { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import { ethers } from "ethers";

const ARBITRUM_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
  "https://sepolia-rollup.arbitrum.io/rpc";

const ROBINHOOD_TESTNET_RPC =
  process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL || "";

const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

const USAT_ADDRESS =
  process.env.NEXT_PUBLIC_USAT_ADDRESS ||
  "0x026671bE3F475c9003fc0eBc3d77e9FA44dA5f55";

const TOKEN_DECIMALS = 6;

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

        const arbProvider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
        const rhoProvider = new ethers.JsonRpcProvider(ROBINHOOD_TESTNET_RPC);

        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, arbProvider);
        const usatContract = new ethers.Contract(USAT_ADDRESS, ERC20_ABI, rhoProvider);

        const [rawUsdc, rawUsat] = await Promise.all([
          usdcContract.balanceOf(walletAddress),
          usatContract.balanceOf(walletAddress),
        ]);

        const usdcBalance = Number(rawUsdc) / Math.pow(10, TOKEN_DECIMALS);
        const usatBalance = Number(rawUsat) / Math.pow(10, TOKEN_DECIMALS);
        const total = usdcBalance + usatBalance;

        const formattedBalance = `$${total.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        setBalance(formattedBalance);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
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
