"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Payment } from "@/lib/types";
import { ethers } from "ethers";

interface FactorInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
  onSuccess: () => void;
}

export default function FactorInvoiceModal({
  open,
  onClose,
  payment,
  onSuccess,
}: FactorInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<5 | 10>(10);

  const totalAmount = parseFloat(payment.total_amount);
  const upfrontPct = payment.upfront_percentage;
  const upfrontPaid = (totalAmount * upfrontPct) / 100;
  const remainingAmount = totalAmount - upfrontPaid;

  const payoutAmount = remainingAmount * (100 - selectedRate) / 100;
  const lenderReturn = remainingAmount;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate invoice ID (hash of payment ID)
      const invoiceId = ethers.keccak256(ethers.toUtf8Bytes(payment.id));

      const response = await fetch("/api/factored-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: payment.id,
          seller_address: payment.seller_address,
          invoice_id: invoiceId,
          total_invoice_amount: totalAmount.toString(),
          upfront_paid: upfrontPaid.toString(),
          factored_amount: remainingAmount.toString(),
          payout_to_seller: payoutAmount.toString(),
          discount_rate: selectedRate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to factor invoice");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to factor invoice");
    } finally {
      setLoading(false);
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

        {error && (
          <Typography
            sx={{
              fontSize: "14px",
              color: "#d32f2f",
              mb: 2,
              fontFamily: "inherit",
            }}
          >
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            onClick={onClose}
            disabled={loading}
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
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
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
            {loading ? "Submitting..." : "Factor Invoice"}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
