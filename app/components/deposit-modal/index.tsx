// app/components/deposit-modal/index.tsx
"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  discountRate: number;
  onDeposit: (amount: number) => Promise<void>;
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

export default function DepositModal({
  open,
  onClose,
  discountRate,
  onDeposit,
}: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!amount || amount.trim() === "") {
      setError("Please enter an amount");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setLoading(true);
      await onDeposit(amountNum);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Deposit failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setAmount("");
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
            Create Lending Offer
          </Typography>
          <Typography sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit" }}>
            Deposit USAT to create a {discountRate}% discount rate lending offer.
          </Typography>
        </Box>

        {/* Discount rate info */}
        <Box
          sx={{
            backgroundColor: discountRate === 10 ? "#fff9e6" : "#e8f5e9",
            border: `1px solid ${discountRate === 10 ? "#ffe082" : "#c8e6c9"}`,
            borderRadius: "10px",
            px: 3,
            py: 2,
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#000000",
              fontFamily: "inherit",
              mb: 0.5,
            }}
          >
            {discountRate}% {discountRate === 10 ? "Higher" : "Lower"} Risk Tranche
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#555555", fontFamily: "inherit" }}>
            {discountRate === 10
              ? "Higher returns with increased default risk"
              : "Conservative returns with lower default risk"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Amount (USAT)"
            placeholder="1000"
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            autoFocus
            type="number"
            slotProps={{
              htmlInput: { min: 0, step: "any" }
            }}
          />

          {/* Expected return calculation */}
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <Box
              sx={{
                backgroundColor: "#f0fff4",
                border: "1px solid #b7ebc8",
                borderRadius: "10px",
                px: 3,
                py: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#2e7d32",
                  fontFamily: "inherit",
                }}
              >
                Expected return: ~$
                {((parseFloat(amount) * discountRate) / 100).toFixed(2)} USAT
              </Typography>
            </Box>
          )}

          {error && (
            <Typography sx={{ fontSize: "13px", color: "#d32f2f", fontFamily: "inherit" }}>
              {error}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Button
              fullWidth
              onClick={handleClose}
              disabled={loading}
              sx={{
                backgroundColor: "#FFFFFF",
                color: "#000000",
                border: "1px solid #E0E0E0",
                borderRadius: "10px",
                py: 1.75,
                textTransform: "none",
                fontSize: "15px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#F5F5F5" },
                "&:disabled": { backgroundColor: "#F0F0F0", color: "#999999" },
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleSubmit}
              disabled={loading}
              sx={{
                backgroundColor: "#171717",
                color: "#FFFFFF",
                borderRadius: "10px",
                py: 1.75,
                textTransform: "none",
                fontSize: "15px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#2a2a2a" },
                "&:disabled": { backgroundColor: "#999999", color: "#ffffff" },
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: "#fff" }} />
                  <span>Processing…</span>
                </Box>
              ) : (
                "Create Offer"
              )}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
