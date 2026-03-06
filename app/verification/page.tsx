"use client";

import React from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { useReclaimVerification } from "./useReclaimVerification";

export default function Verification() {
  const { startVerification, proofs, loading, error } =
    useReclaimVerification();

  const handleStart = () => {
    startVerification();
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Jarvis Verification
      </Typography>

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
              Proof received and verified successfully.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
