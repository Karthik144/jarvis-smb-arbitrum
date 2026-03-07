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
const FEDEX_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS || "";

const TOKEN_DECIMALS = 6;

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];

const INVOICE_FACTORING_ABI = [
  "function getLenderOffers(address lender) view returns (uint256[])",
  "function getOffer(uint256 offerId) view returns (tuple(address lender, uint256 totalAmount, uint256 availableAmount, uint8 discountRate, bool active))",
];

const FEDEX_ESCROW_ABI = [
  "function getEscrow(bytes32 paymentId) view returns (tuple(address buyer, address seller, uint256 totalAmount, uint256 remainingAmount, uint8 upfrontPct, uint8 status))",
];

interface BalanceCardProps {
  walletAddress: string;
  showContractBalance?: boolean;
  showEscrowBalance?: boolean;
  userRole?: "buyer" | "seller";
}

export default function BalanceCard({
  walletAddress,
  showContractBalance = false,
  showEscrowBalance = false,
  userRole
}: BalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [contractBalance, setContractBalance] = useState<{ totalDeposited: number; currentlyAvailable: number } | null>(null);
  const [escrowBalance, setEscrowBalance] = useState<number | null>(null);
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

        // Fetch escrow balance if requested
        if (showEscrowBalance && userRole) {
          try {
            // Fetch all payments for this user
            const paymentsRes = await fetch("/api/payments");
            const paymentsJson = await paymentsRes.json();

            if (paymentsJson.success) {
              const escrowContract = new ethers.Contract(
                FEDEX_ESCROW_ADDRESS,
                FEDEX_ESCROW_ABI,
                arbProvider
              );

              let totalEscrow = 0;
              const payments = paymentsJson.data;

              for (const payment of payments) {
                // Filter payments based on user role
                const isRelevant = userRole === "buyer"
                  ? payment.buyer_address.toLowerCase() === walletAddress.toLowerCase()
                  : payment.seller_address.toLowerCase() === walletAddress.toLowerCase();

                if (!isRelevant || payment.status === "completed") continue;

                try {
                  // Convert UUID to bytes32
                  const paymentId = ethers.keccak256(ethers.toUtf8Bytes(payment.id));
                  const escrow = await escrowContract.getEscrow(paymentId);

                  // Sum up remainingAmount (still locked in escrow)
                  const remainingAmount = Number(escrow.remainingAmount) / Math.pow(10, TOKEN_DECIMALS);
                  totalEscrow += remainingAmount;
                } catch (err) {
                  console.warn(`Could not fetch escrow for payment ${payment.id}:`, err);
                }
              }

              setEscrowBalance(totalEscrow);
            }
          } catch (error) {
            console.error("Failed to fetch escrow balance:", error);
            setEscrowBalance(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(null);
        setContractBalance(null);
        setEscrowBalance(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [walletAddress, showContractBalance, showEscrowBalance, userRole]);

  if (!showContractBalance && !showEscrowBalance) {
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
        <Box>
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#777777",
              fontFamily: "inherit",
              mb: 1,
            }}
          >
            Lending Contract Balance
          </Typography>
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
        </Box>
      )}

      {showEscrowBalance && escrowBalance !== null && (
        <Box>
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#777777",
              fontFamily: "inherit",
              mb: 1,
            }}
          >
            {userRole === "buyer" ? "Escrow Balance (Locked)" : "Escrow Balance (Claimable)"}
          </Typography>
          <Box
            sx={{
              backgroundColor: "#F5F5F5",
              borderRadius: "10px",
              p: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: "20px",
                fontWeight: 600,
                color: userRole === "buyer" ? "#ff6b35" : "#2e7d32",
                fontFamily: "inherit",
              }}
            >
              ${escrowBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                color: "#777777",
                fontFamily: "inherit",
                mt: 0.5,
              }}
            >
              {userRole === "buyer"
                ? "Funds held in escrow for pending payments"
                : "Funds awaiting delivery verification"}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
