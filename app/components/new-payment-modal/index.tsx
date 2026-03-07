// app/components/new-payment-modal/index.tsx
"use client";

import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { createEscrow } from "@/lib/contract";
import { Contact } from "@/lib/types";

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saveAsContact, setSaveAsContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = wallets.find((w) => w.walletClientType === "privy");

  useEffect(() => {
    if (open && wallet?.address) {
      fetch(`/api/contacts?owner_address=${wallet.address}`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setContacts(json.data); });
    }
  }, [open, wallet?.address]);

  function handleChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function reset() {
    setForm({ paymentTo: "", sellerAddress: "", totalAmount: "", upfrontPct: "", trackingNumber: "" });
    setSaveAsContact(false);
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

    if (!wallet) {
      setError("No wallet connected. Please log in again.");
      return;
    }

    setLoading(true);
    try {
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

      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      const txHash = await createEscrow(signer, {
        paymentId,
        totalAmountUSD: amount,
        upfrontPct: pct,
        seller: sellerAddress,
      });
      console.log("Escrow created:", txHash);

      await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "upfront_paid" }),
      });

      // Save contact if requested and not already saved
      if (saveAsContact && form.paymentTo.trim()) {
        const alreadySaved = contacts.some(
          (c) => c.wallet_address.toLowerCase() === sellerAddress.toLowerCase()
        );
        if (!alreadySaved) {
          await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner_address: wallet.address,
              name: form.paymentTo.trim(),
              wallet_address: sellerAddress,
            }),
          });
        }
      }

      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  // Whether the current sellerAddress is already a saved contact
  const alreadyContact = contacts.some(
    (c) => c.wallet_address.toLowerCase() === form.sellerAddress.toLowerCase()
  );

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
          {/* Seller autocomplete — searches by name or address */}
          <Autocomplete
            freeSolo
            options={contacts}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.name
            }
            filterOptions={(options, { inputValue }) => {
              const q = inputValue.toLowerCase();
              return options.filter(
                (c) =>
                  c.name.toLowerCase().includes(q) ||
                  c.wallet_address.toLowerCase().includes(q)
              );
            }}
            inputValue={form.paymentTo}
            onInputChange={(_, value) => setForm((p) => ({ ...p, paymentTo: value }))}
            onChange={(_, value) => {
              if (value && typeof value !== "string") {
                setForm((p) => ({
                  ...p,
                  paymentTo: value.name,
                  sellerAddress: value.wallet_address,
                }));
              }
            }}
            disabled={loading}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box component="li" {...otherProps} key={option.id}>
                  <Box>
                    <Typography sx={{ fontSize: "14px", fontWeight: 600, fontFamily: "inherit" }}>
                      {option.name}
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#777", fontFamily: "inherit" }}>
                      {option.wallet_address.slice(0, 6)}…{option.wallet_address.slice(-4)}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Payment To"
                placeholder="Acme Inc. or search contacts…"
                variant="outlined"
                sx={inputSx}
              />
            )}
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

          {/* Save as contact option — only shown when address is set and not already saved */}
          {form.sellerAddress && ethers.isAddress(form.sellerAddress) && !alreadyContact && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={saveAsContact}
                  onChange={(e) => setSaveAsContact(e.target.checked)}
                  size="small"
                  sx={{ color: "#999", "&.Mui-checked": { color: "#171717" } }}
                />
              }
              label={
                <Typography sx={{ fontSize: "13px", color: "#555", fontFamily: "inherit" }}>
                  Save seller as a contact
                </Typography>
              }
              disabled={loading}
            />
          )}

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
