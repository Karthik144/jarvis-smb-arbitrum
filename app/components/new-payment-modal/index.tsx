// app/components/new-payment-modal/index.tsx
"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

interface NewPaymentModalProps {
  open: boolean;
  onClose: () => void;
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

export default function NewPaymentModal({ open, onClose }: NewPaymentModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        {/* Header */}
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
          <Typography
            sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit" }}
          >
            Set up a scheduled payment to a seller.
          </Typography>
        </Box>

        {/* Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Payment To"
            placeholder="Acme Inc."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Seller Wallet Address"
            placeholder="0x..."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Total Amount (USD)"
            placeholder="$5,000"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Initial Payment (%)"
            placeholder="25"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="FedEx Tracking Number"
            placeholder="1234567890"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />

          <Button
            fullWidth
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
            }}
          >
            Create Payment
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
