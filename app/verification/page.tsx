"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  TextField,
  Stack,
} from "@mui/material";
import { useReclaimVerification } from "./useReclaimVerification";

export default function Verification() {
  const [amount, setAmount] = useState<number>(1000);
  const [percent, setPercent] = useState<number>(20);

  const { startVerification, proofs, loading, error, txHash } =
    useReclaimVerification();

  const handleStart = () => {
    startVerification(amount, percent);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Jarvis Verification
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Enter the contract details and verify your data via zkTLS.
      </Typography>

      {!proofs && (
        <Stack spacing={3} sx={{ mb: 4 }}>
          <TextField
            label="Total Amount ($)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            fullWidth
            disabled={loading}
          />
          <TextField
            label="Percent to Release (%)"
            type="number"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            fullWidth
            disabled={loading}
          />
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!proofs ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            disabled={loading}
            onClick={handleStart}
            startIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : null
            }
            sx={{ px: 4, py: 1.5, borderRadius: 2, textTransform: "none" }}
          >
            {loading ? "Verifying..." : "Start Secure Verification"}
          </Button>
          {loading && (
            <Typography variant="caption" color="text.secondary">
              Please complete the verification in the Reclaim modal or app.
            </Typography>
          )}
        </Box>
      ) : (
        <Card
          sx={{
            bgcolor: "success.light",
            color: "success.contrastText",
            borderRadius: 2,
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ✅ Verification Complete
            </Typography>
            <Typography variant="body2" component="div">
              Proof received and verified for <strong>${amount}</strong> at{" "}
              <strong>{percent}%</strong> release.
              {txHash && (
                <Typography variant="body2" sx={{ mt: 1, fontWeight: "bold" }}>
                  Transaction Hash: {txHash}
                </Typography>
              )}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
