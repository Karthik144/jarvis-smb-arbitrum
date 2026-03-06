"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ open, onClose }: GetStartedModalProps) {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
          border: "1px solid #F0F0F0",
          width: "480px",
          maxWidth: "480px",
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: "48px !important" }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "26px",
              letterSpacing: "-0.5px",
              color: "#000000",
              mb: 1,
              fontFamily: "inherit",
            }}
          >
            Get started
          </Typography>
          <Typography sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit" }}>
            Tell us about your business.
          </Typography>
        </Box>

        {/* Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Company Name"
            placeholder="Acme Inc."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Email"
            placeholder="you@company.com"
            type="email"
            fullWidth
            variant="outlined"
            sx={inputSx}
          />
          <TextField
            label="Wallet Address"
            placeholder="0x..."
            fullWidth
            variant="outlined"
            sx={inputSx}
          />

          {/* Role selector */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography
              sx={{ fontSize: "14px", fontWeight: 500, color: "#333333", fontFamily: "inherit" }}
            >
              I am a
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                fullWidth
                onClick={() => setRole("buyer")}
                sx={{
                  borderRadius: "10px",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  backgroundColor: role === "buyer" ? "#171717" : "#FFFFFF",
                  color: role === "buyer" ? "#FFFFFF" : "#000000",
                  border: role === "buyer" ? "none" : "1px solid #E0E0E0",
                  boxShadow: role === "buyer" ? "0 1px 3px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.06)",
                  "&:hover": {
                    backgroundColor: role === "buyer" ? "#2a2a2a" : "#F5F5F5",
                  },
                }}
              >
                Buyer
              </Button>
              <Button
                fullWidth
                onClick={() => setRole("seller")}
                sx={{
                  borderRadius: "10px",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                  backgroundColor: role === "seller" ? "#171717" : "#FFFFFF",
                  color: role === "seller" ? "#FFFFFF" : "#000000",
                  border: role === "seller" ? "none" : "1px solid #E0E0E0",
                  boxShadow: role === "seller" ? "0 1px 3px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.06)",
                  "&:hover": {
                    backgroundColor: role === "seller" ? "#2a2a2a" : "#F5F5F5",
                  },
                }}
              >
                Seller
              </Button>
            </Box>
          </Box>

          {/* Continue button */}
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
            Continue
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
