"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLoginWithEmail, usePrivy, useCreateWallet } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { createUser, DuplicateEmailError } from "@/lib/api/users";

interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ open, onClose }: GetStartedModalProps) {
  const router = useRouter();
  const { user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { sendCode, loginWithCode } = useLoginWithEmail({
    onError: (error) => {
      console.error('Privy login error:', error);
      setError('Authentication failed. Please try again.');
    },
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    type: 'buyer' as 'buyer' | 'seller' | 'lender',
  });
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accountCreationStarted = useRef(false);

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

  // Validate required env vars
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
    }
  }, []);

  // Handle account creation after Privy auth
  useEffect(() => {
    async function createAccount() {
      if (currentStep !== 3 || !user || accountCreationStarted.current) return;
      accountCreationStarted.current = true;

      try {
        // Create the embedded wallet (or retrieve it if one already exists)
        let walletAddress: string;
        const existingWallet = user.linkedAccounts.find(
          (account) => account.type === 'wallet' && account.walletClientType === 'privy'
        );

        if (existingWallet && 'address' in existingWallet) {
          walletAddress = existingWallet.address as string;
        } else {
          const wallet = await createWallet();
          walletAddress = wallet.address;
        }

        await createUser({
          company_name: formData.companyName,
          email: formData.email,
          wallet_address: walletAddress,
          type: formData.type,
          privy_user_id: user.id,
        });

        const redirectPath =
          formData.type === 'buyer'
            ? '/payments/buyer'
            : formData.type === 'seller'
            ? '/payments/seller'
            : '/payments/lender';
        router.push(redirectPath);
      } catch (err: unknown) {
        accountCreationStarted.current = false;
        if (err instanceof DuplicateEmailError) {
          setError(err.message);
        } else {
          console.error('Account creation error:', err);
          setError('Unable to create account. Please try again.');
        }
        setCurrentStep(2);
      }
    }

    createAccount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, user]);

  const handleStep1Continue = async () => {
    setError(null);

    if (!formData.companyName.trim()) {
      setError('Please enter your company name');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await sendCode({ email: formData.email });
      setCurrentStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to send verification code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async () => {
    setError(null);

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    try {
      setLoading(true);
      await loginWithCode({ code: otpCode });
      setCurrentStep(3);
    } catch {
      setError('Invalid code. Please check and try again.');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setOtpCode('');

    try {
      setLoading(true);
      await sendCode({ email: formData.email });
      setTimeout(() => setLoading(false), 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({ companyName: '', email: '', type: 'buyer' });
    setOtpCode('');
    setError(null);
    setLoading(false);
    accountCreationStarted.current = false;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          {currentStep !== 3 && (
            <Typography
              sx={{
                fontSize: "13px",
                color: "#999999",
                fontFamily: "inherit",
                mb: 2,
                fontWeight: 500,
              }}
            >
              Step {currentStep} of 2
            </Typography>
          )}
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
            {currentStep === 1 && "Get started"}
            {currentStep === 2 && "Verify your email"}
            {currentStep === 3 && "Almost there"}
          </Typography>
          <Typography sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit" }}>
            {currentStep === 1 && "Tell us about your business."}
            {currentStep === 2 && "Enter the code we sent to your email."}
            {currentStep === 3 && "Setting up your account..."}
          </Typography>
        </Box>

        {/* Step 1 */}
        {currentStep === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Company Name"
              placeholder="Acme Inc."
              fullWidth
              variant="outlined"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              sx={inputSx}
            />

            <TextField
              label="Email"
              placeholder="you@company.com"
              type="email"
              fullWidth
              variant="outlined"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  onClick={() => setFormData({ ...formData, type: 'buyer' })}
                  sx={{
                    borderRadius: "10px",
                    py: 1.5,
                    textTransform: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    backgroundColor: formData.type === "buyer" ? "#171717" : "#FFFFFF",
                    color: formData.type === "buyer" ? "#FFFFFF" : "#000000",
                    border: formData.type === "buyer" ? "none" : "1px solid #E0E0E0",
                    boxShadow: formData.type === "buyer" ? "0 1px 3px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.06)",
                    "&:hover": {
                      backgroundColor: formData.type === "buyer" ? "#2a2a2a" : "#F5F5F5",
                    },
                  }}
                >
                  Buyer
                </Button>
                <Button
                  fullWidth
                  onClick={() => setFormData({ ...formData, type: 'seller' })}
                  sx={{
                    borderRadius: "10px",
                    py: 1.5,
                    textTransform: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    backgroundColor: formData.type === "seller" ? "#171717" : "#FFFFFF",
                    color: formData.type === "seller" ? "#FFFFFF" : "#000000",
                    border: formData.type === "seller" ? "none" : "1px solid #E0E0E0",
                    boxShadow: formData.type === "seller" ? "0 1px 3px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.06)",
                    "&:hover": {
                      backgroundColor: formData.type === "seller" ? "#2a2a2a" : "#F5F5F5",
                    },
                  }}
                >
                  Seller
                </Button>
                <Button
                  fullWidth
                  onClick={() => setFormData({ ...formData, type: 'lender' })}
                  sx={{
                    borderRadius: "10px",
                    py: 1.5,
                    textTransform: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    backgroundColor: formData.type === "lender" ? "#171717" : "#FFFFFF",
                    color: formData.type === "lender" ? "#FFFFFF" : "#000000",
                    border: formData.type === "lender" ? "none" : "1px solid #E0E0E0",
                    boxShadow: formData.type === "lender" ? "0 1px 3px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.06)",
                    "&:hover": {
                      backgroundColor: formData.type === "lender" ? "#2a2a2a" : "#F5F5F5",
                    },
                  }}
                >
                  Lender
                </Button>
              </Box>
            </Box>

            {/* Continue button */}
            <Button
              fullWidth
              onClick={handleStep1Continue}
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
                "&:disabled": { backgroundColor: "#CCCCCC" },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: "#FFFFFF" }} /> : "Continue"}
            </Button>
          </Box>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Typography sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit", mb: 1 }}>
              We sent a 6-digit code to <strong>{formData.email}</strong>
            </Typography>

            {error && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Verification Code"
              placeholder="000000"
              fullWidth
              variant="outlined"
              value={otpCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtpCode(value);
              }}
              inputProps={{ maxLength: 6, style: { fontSize: '18px', letterSpacing: '4px', textAlign: 'center' } }}
              sx={inputSx}
              autoFocus
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                onClick={handleResendCode}
                disabled={loading}
                sx={{
                  textTransform: "none",
                  fontSize: "14px",
                  color: "#171717",
                  fontFamily: "inherit",
                  "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                }}
              >
                Resend code
              </Button>
              <Button
                onClick={() => setCurrentStep(1)}
                sx={{
                  textTransform: "none",
                  fontSize: "14px",
                  color: "#777777",
                  fontFamily: "inherit",
                  "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
                }}
              >
                Change email
              </Button>
            </Box>

            <Button
              fullWidth
              onClick={handleStep2Submit}
              disabled={loading || otpCode.length !== 6}
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
                "&:disabled": { backgroundColor: "#CCCCCC" },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: "#FFFFFF" }} /> : "Verify"}
            </Button>
          </Box>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              py: 4,
            }}
          >
            <CircularProgress size={48} sx={{ color: "#171717" }} />
            <Typography sx={{ fontSize: "16px", color: "#333333", fontFamily: "inherit" }}>
              Creating your account...
            </Typography>
            {error && (
              <Alert severity="error" sx={{ borderRadius: "10px", width: "100%" }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
