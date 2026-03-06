// app/components/new-payment-modal/index.tsx
"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { createEscrow } from "@/lib/contract";

interface NewPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const inputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#F5F5F5",
    borderRadius: "10px",
    fontSize: "14px",
    "& fieldset": { border: "none" },
    "&:hover fieldset": { border: "none" },
    "&.Mui-focused fieldset": {
      border: "1px solid #E0E0E0",
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: "13px",
    color: "#777777",
    fontWeight: 500,
  },
  "& .MuiInputLabel-shrink": {
    color: "#555555",
  },
};

export default function NewPaymentModal({ open, onClose, onSuccess }: NewPaymentModalProps) {
  const { wallets } = useWallets();
  const [form, setForm] = useState({
    paymentTo: "",
    sellerAddress: "",
    totalAmount: "",
    upfrontPct: "",
    trackingNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function reset() {
    setForm({ paymentTo: "", sellerAddress: "", totalAmount: "", upfrontPct: "", trackingNumber: "" });
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const { sellerAddress, totalAmount, upfrontPct, trackingNumber } = form;

    if (!sellerAddress || !totalAmount || !upfrontPct || !trackingNumber) {
      setError("All fields are required.");
      return;
    }
    if (!ethers.isAddress(sellerAddress)) {
      setError("Invalid seller wallet address.");
      return;
    }
    const amount = parseFloat(totalAmount);
    const pct = parseInt(upfrontPct, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Invalid total amount.");
      return;
    }
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setError("Upfront percentage must be 0–100.");
      return;
    }

    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) {
      setError("No wallet connected. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Supabase record to get the UUID (used as on-chain paymentId)
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_address: wallet.address,
          seller_address: sellerAddress,
          total_amount: totalAmount,
          upfront_percentage: pct,
          remaining_percentage: 100 - pct,
          tracking_number: trackingNumber,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save payment.");
      const paymentId: string = json.data.id;

      // 2. Get ethers signer from Privy embedded wallet
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // 3. Approve USDC + call createEscrow on-chain (upfront released immediately by contract)
      const txHash = await createEscrow(signer, {
        paymentId,
        totalAmountUSD: amount,
        upfrontPct: pct,
        seller: sellerAddress,
      });
      console.log("Escrow created:", txHash);

      // 4. Update Supabase status
      await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "upfront_paid" }),
      });

      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : () => { reset(); onClose(); }}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
          border: "1px solid #F0F0F0",
          width: "480px",
          maxWidth: "480px",
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: "48px !important" }}>
        <Box sx={{ mb: 4, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "26px",
              letterSpacing: "-0.5px",
              color: "#000000",
              fontFamily: "inherit",
            }}
          >
            New payment
          </Typography>
          <Typography sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit" }}>
            Set up a scheduled payment to a seller.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Payment To"
            placeholder="Acme Inc."
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={form.paymentTo}
            onChange={handleChange("paymentTo")}
            disabled={loading}
          />
          <TextField
            label="Seller Wallet Address"
            placeholder="0x..."
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={form.sellerAddress}
            onChange={handleChange("sellerAddress")}
            disabled={loading}
          />
          <TextField
            label="Total Amount (USDC)"
            placeholder="5000"
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={form.totalAmount}
            onChange={handleChange("totalAmount")}
            disabled={loading}
          />
          <TextField
            label="Initial Payment (%)"
            placeholder="25"
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={form.upfrontPct}
            onChange={handleChange("upfrontPct")}
            disabled={loading}
          />
          <TextField
            label="FedEx Tracking Number"
            placeholder="1234567890"
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={form.trackingNumber}
            onChange={handleChange("trackingNumber")}
            disabled={loading}
          />

          {error && (
            <Typography sx={{ fontSize: "13px", color: "#d32f2f", fontFamily: "inherit" }}>
              {error}
            </Typography>
          )}

          <Button
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              mt: 1,
              backgroundColor: "#171717",
              color: "#FFFFFF",
              borderRadius: "10px",
              py: 1.75,
              textTransform: "none",
              fontSize: "15px",
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { backgroundColor: "#2a2a2a" },
              "&.Mui-disabled": { backgroundColor: "#999999", color: "#ffffff" },
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={18} sx={{ color: "#fff" }} />
                <span>Processing…</span>
              </Box>
            ) : (
              "Create Payment"
            )}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
