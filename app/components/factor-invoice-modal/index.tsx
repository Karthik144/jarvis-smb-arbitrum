"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Payment } from "@/lib/types";
import { ethers } from "ethers";
import { useWallets } from "@privy-io/react-auth";
import { factorInvoice, redirectPaymentToLender } from "@/lib/contract";

interface FactorInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
  onSuccess: () => void;
}

type FactorStep = "idle" | "factoring" | "redirecting" | "done" | "error";

const ROBINHOOD_CHAIN_ID = 46630;
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

export default function FactorInvoiceModal({
  open,
  onClose,
  payment,
  onSuccess,
}: FactorInvoiceModalProps) {
  const { wallets } = useWallets();
  const [step, setStep] = useState<FactorStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<5 | 10>(10);

  const totalAmount = parseFloat(payment.total_amount);
  const upfrontPct = payment.upfront_percentage;
  const upfrontPaid = (totalAmount * upfrontPct) / 100;
  const remainingAmount = totalAmount - upfrontPaid;

  const payoutAmount = remainingAmount * (100 - selectedRate) / 100;

  function stepLabel(): string {
    switch (step) {
      case "factoring":   return "Step 1/2: Factoring invoice on Robinhood…";
      case "redirecting": return "Step 2/2: Redirecting escrow payment to lender on Arbitrum…";
      case "done":        return "Invoice factored! Payment redirected to lender.";
      case "error":       return `Error: ${error}`;
      default:            return "";
    }
  }

  async function getSignerOnChain(wallet: any, chainId: number): Promise<ethers.Signer> {
    await wallet.switchChain(chainId);
    const provider = await wallet.getEthereumProvider();
    const ethersProvider = new ethers.BrowserProvider(provider);

    // Verify the switch actually took effect
    const network = await ethersProvider.getNetwork();
    if (Number(network.chainId) !== chainId) {
      throw new Error(
        `Chain switch failed. Expected chainId ${chainId}, got ${network.chainId}. Please switch manually and try again.`
      );
    }

    return ethersProvider.getSigner();
  }

  const handleSubmit = async () => {
    setStep("factoring");
    setError(null);

    try {
      const wallet = wallets.find((w) => w.walletClientType === "privy");
      if (!wallet) throw new Error("No wallet connected.");

      // --- Step 1: factorInvoice on Robinhood testnet ---
      const robinhoodSigner = await getSignerOnChain(wallet, ROBINHOOD_CHAIN_ID);

      // Use payment.id + timestamp so the same payment can be factored repeatedly in demos
      const invoiceId = ethers.keccak256(
        ethers.toUtf8Bytes(payment.id + Date.now().toString())
      );

      const { lenderAddress } = await factorInvoice(robinhoodSigner, {
        invoiceId,
        totalInvoiceAmount: totalAmount,
        upfrontPaid,
        factoredAmount: remainingAmount,
        discountRate: selectedRate,
      });

      // --- Step 2: redirectPayment to lender on Arbitrum Sepolia ---
      setStep("redirecting");
      const arbitrumSigner = await getSignerOnChain(wallet, ARBITRUM_SEPOLIA_CHAIN_ID);

      await redirectPaymentToLender(arbitrumSigner, {
        paymentId: payment.id,
        lenderAddress,
      });

      setStep("done");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to factor invoice");
      setStep("error");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          p: 1,
        },
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Typography
          sx={{
            fontSize: "22px",
            fontWeight: 700,
            mb: 3,
            fontFamily: "inherit",
          }}
        >
          Factor Invoice
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: "14px", color: "#777", mb: 2, fontFamily: "inherit" }}>
            Get immediate payment for your remaining invoice amount at a discount.
          </Typography>

          <Box sx={{ backgroundColor: "#F5F5F5", borderRadius: "8px", p: 2, mb: 2 }}>
            <Typography sx={{ fontSize: "13px", color: "#777", mb: 1, fontFamily: "inherit" }}>
              Invoice Amount
            </Typography>
            <Typography sx={{ fontSize: "20px", fontWeight: 600, fontFamily: "inherit" }}>
              ${totalAmount.toLocaleString()} USDC
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#777", mt: 1, fontFamily: "inherit" }}>
              Upfront paid: ${upfrontPaid.toFixed(2)} • Remaining: ${remainingAmount.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ fontSize: "14px", fontWeight: 600, mb: 2, fontFamily: "inherit" }}>
          Select Discount Rate
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Box
            onClick={() => setSelectedRate(5)}
            sx={{
              flex: 1,
              border: selectedRate === 5 ? "2px solid #171717" : "1px solid #E0E0E0",
              borderRadius: "10px",
              p: 2,
              cursor: "pointer",
              backgroundColor: selectedRate === 5 ? "#F5F5F5" : "#FFF",
              transition: "all 0.2s",
              "&:hover": { borderColor: "#171717" },
            }}
          >
            <Typography sx={{ fontSize: "18px", fontWeight: 700, mb: 0.5, fontFamily: "inherit" }}>
              5% Discount
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#777", mb: 1, fontFamily: "inherit" }}>
              Lower cost, may take longer
            </Typography>
            <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#2e7d32", fontFamily: "inherit" }}>
              You get: ${(remainingAmount * 0.95).toFixed(2)}
            </Typography>
          </Box>

          <Box
            onClick={() => setSelectedRate(10)}
            sx={{
              flex: 1,
              border: selectedRate === 10 ? "2px solid #171717" : "1px solid #E0E0E0",
              borderRadius: "10px",
              p: 2,
              cursor: "pointer",
              backgroundColor: selectedRate === 10 ? "#F5F5F5" : "#FFF",
              transition: "all 0.2s",
              "&:hover": { borderColor: "#171717" },
            }}
          >
            <Typography sx={{ fontSize: "18px", fontWeight: 700, mb: 0.5, fontFamily: "inherit" }}>
              10% Discount
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#777", mb: 1, fontFamily: "inherit" }}>
              Faster matching
            </Typography>
            <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#2e7d32", fontFamily: "inherit" }}>
              You get: ${(remainingAmount * 0.90).toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {step !== "idle" && (
          <Typography
            sx={{
              fontSize: "14px",
              color: step === "error" ? "#d32f2f" : step === "done" ? "#2e7d32" : "#555",
              mb: 2,
              fontFamily: "inherit",
            }}
          >
            {stepLabel()}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            onClick={onClose}
            disabled={step === "factoring" || step === "redirecting"}
            variant="outlined"
            fullWidth
            sx={{
              borderColor: "#E0E0E0",
              color: "#000",
              borderRadius: "10px",
              py: 1.5,
              textTransform: "none",
              fontSize: "15px",
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": {
                backgroundColor: "#F5F5F5",
                borderColor: "#CCCCCC",
              },
            }}
          >
            {step === "done" ? "Close" : "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={step === "factoring" || step === "redirecting" || step === "done"}
            fullWidth
            sx={{
              backgroundColor: "#171717",
              color: "#FFF",
              borderRadius: "10px",
              py: 1.5,
              textTransform: "none",
              fontSize: "15px",
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { backgroundColor: "#2a2a2a" },
              "&:disabled": { backgroundColor: "#999" },
            }}
          >
            {step === "factoring" ? "Factoring…" : step === "redirecting" ? "Redirecting…" : "Factor Invoice"}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
