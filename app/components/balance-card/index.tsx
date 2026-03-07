"use client";

import { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
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

const INVOICE_FACTORING_ADDRESS = "0x207CaC4B8B14Ef28a962B419959AA23fF94c2191";

const TOKEN_DECIMALS = 6;

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];

const INVOICE_FACTORING_ABI = [
  "function getLenderOffers(address lender) view returns (uint256[])",
  "function getOffer(uint256 offerId) view returns (tuple(address lender, uint256 totalAmount, uint256 availableAmount, uint8 discountRate, bool active))",
];

interface BalanceCardProps {
  walletAddress: string;
  showContractBalance?: boolean;
}

export default function BalanceCard({ walletAddress, showContractBalance = false }: BalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [contractBalance, setContractBalance] = useState<{ totalDeposited: number; currentlyAvailable: number } | null>(null);
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

        // Fetch contract balance if requested
        if (showContractBalance) {
          const factoringContract = new ethers.Contract(
            INVOICE_FACTORING_ADDRESS,
            INVOICE_FACTORING_ABI,
            rhoProvider
          );

          const offerIds = await factoringContract.getLenderOffers(walletAddress);

          let totalDeposited = 0;
          let currentlyAvailable = 0;

          for (const offerId of offerIds) {
            const offer = await factoringContract.getOffer(offerId);
            if (offer.active) {
              totalDeposited += Number(offer.totalAmount) / Math.pow(10, TOKEN_DECIMALS);
              currentlyAvailable += Number(offer.availableAmount) / Math.pow(10, TOKEN_DECIMALS);
            }
          }

          setContractBalance({ totalDeposited, currentlyAvailable });
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(null);
        setContractBalance(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [walletAddress, showContractBalance]);

  if (!showContractBalance) {
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box>
        <Typography
          sx={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#777777",
            fontFamily: "inherit",
            mb: 0.5,
          }}
        >
          Wallet Balance
        </Typography>
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
      </Box>

      {contractBalance && (
        <Box
          sx={{
            backgroundColor: "#F5F5F5",
            borderRadius: "10px",
            p: 2,
            display: "flex",
            gap: 3,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#777777",
                fontFamily: "inherit",
                mb: 0.5,
              }}
            >
              Total Deposited
            </Typography>
            <Typography
              sx={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#000000",
                fontFamily: "inherit",
              }}
            >
              ${contractBalance.totalDeposited.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#777777",
                fontFamily: "inherit",
                mb: 0.5,
              }}
            >
              Currently Available
            </Typography>
            <Typography
              sx={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#2e7d32",
                fontFamily: "inherit",
              }}
            >
              ${contractBalance.currentlyAvailable.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
