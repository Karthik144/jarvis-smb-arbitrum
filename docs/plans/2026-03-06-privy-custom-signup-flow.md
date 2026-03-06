# Privy Custom Signup Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Privy email authentication into the get-started modal with multi-step OTP verification and Supabase user storage.

**Architecture:** Transform existing GetStartedModal into a three-step flow (business info → OTP verification → account creation). Use Privy's `useLoginWithEmail` for headless email auth, create embedded wallet, and store user data in Supabase users table.

**Tech Stack:** Privy React Auth SDK, Supabase client, MUI components, Next.js App Router

---

## Task 1: Add User Type to Database Types

**Files:**
- Modify: `lib/database.types.ts`

**Step 1: Add User type definition**

Add the User interface to database types:

```typescript
// After the Payment import
export interface User {
  id: string;
  created_at: string;
  company_name: string;
  email: string;
  wallet_address: string;
  type: 'buyer' | 'seller';
  privy_user_id: string;
}
```

**Step 2: Add users table to Database schema**

In the `Database.public.Tables` object, add:

```typescript
users: {
  Row: User;
  Insert: Omit<User, 'id' | 'created_at'> & {
    id?: string;
    created_at?: string;
  };
  Update: Partial<Omit<User, 'id' | 'created_at'>> & {
    created_at?: string;
  };
};
```

**Step 3: Verify types compile**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add lib/database.types.ts
git commit -m "feat: add User type to database schema"
```

---

## Task 2: Create User API Utility

**Files:**
- Create: `lib/api/users.ts`

**Step 1: Create users API file**

Create new file with Supabase insert function:

```typescript
import { supabaseClient } from '@/lib/supabase-client';
import { Database } from '@/lib/database.types';

type UserInsert = Database['public']['Tables']['users']['Insert'];

export class DuplicateEmailError extends Error {
  constructor() {
    super('An account with this email already exists. Please login.');
    this.name = 'DuplicateEmailError';
  }
}

export async function createUser(userData: UserInsert) {
  const { data, error } = await supabaseClient
    .from('users')
    .insert([userData])
    .select()
    .single();

  // Handle duplicate email (Postgres unique constraint violation)
  if (error?.code === '23505') {
    throw new DuplicateEmailError();
  }

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error('Failed to create user account. Please try again.');
  }

  return data;
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add lib/api/users.ts
git commit -m "feat: add createUser API utility"
```

---

## Task 3: Update GetStartedModal - Add State Management

**Files:**
- Modify: `app/components/get-started-modal/index.tsx`

**Step 1: Add imports**

Add these imports at the top of the file:

```typescript
import React, { useState, useEffect } from "react";
import { useLoginWithEmail, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { createUser, DuplicateEmailError } from "@/lib/api/users";
```

**Step 2: Add state variables**

Inside the component, replace the existing `const [role, setRole] = useState` with:

```typescript
const router = useRouter();
const { user } = usePrivy();
const { sendCode, loginWithCode, state: privyState } = useLoginWithEmail({
  onError: (error) => {
    console.error('Privy login error:', error);
    setError(error.message || 'Authentication failed. Please try again.');
  },
});

const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
const [formData, setFormData] = useState({
  companyName: '',
  email: '',
  type: 'buyer' as 'buyer' | 'seller',
});
const [otpCode, setOtpCode] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Step 3: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: add state management for multi-step signup flow"
```

---

## Task 4: Update GetStartedModal - Add Step 1 UI

**Files:**
- Modify: `app/components/get-started-modal/index.tsx`

**Step 1: Add form validation handler**

Add this function before the return statement:

```typescript
const handleStep1Continue = async () => {
  // Reset error
  setError(null);

  // Validate fields
  if (!formData.companyName.trim()) {
    setError('Please enter your company name');
    return;
  }

  if (!formData.email.trim()) {
    setError('Please enter your email address');
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    setError('Please enter a valid email address');
    return;
  }

  try {
    setLoading(true);
    await sendCode({ email: formData.email });
    setCurrentStep(2);
  } catch (err: any) {
    setError(err.message || 'Unable to send verification code. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

**Step 2: Update Step 1 form fields**

Replace the existing form fields section (lines 76-151) with:

```typescript
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
```

**Step 3: Test Step 1 UI renders**

Run: `npm run dev`
Navigate to the page with the modal and verify:
- Form fields display correctly
- Buyer/Seller toggle works
- Continue button shows spinner when loading

**Step 4: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: implement Step 1 UI with validation"
```

---

## Task 5: Update GetStartedModal - Add Step 2 OTP UI

**Files:**
- Modify: `app/components/get-started-modal/index.tsx`

**Step 1: Add OTP submission handler**

Add this function before the return statement:

```typescript
const handleStep2Submit = async () => {
  setError(null);

  if (!otpCode || otpCode.length !== 6) {
    setError('Please enter the 6-digit code');
    return;
  }

  try {
    setLoading(true);
    await loginWithCode({ code: otpCode });
    // Success handled by Privy's onComplete, move to step 3
    setCurrentStep(3);
  } catch (err: any) {
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
    setError(null); // Clear any previous errors
    // Show success feedback
    setTimeout(() => setLoading(false), 1000);
  } catch (err: any) {
    setError('Failed to resend code. Please try again.');
    setLoading(false);
  }
};
```

**Step 2: Add Step 2 UI**

Add this section after the Step 1 UI closing bracket:

```typescript
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
```

**Step 3: Test Step 2 UI**

Run: `npm run dev`
- Fill Step 1 form
- Click Continue (should send real OTP if Privy configured)
- Verify Step 2 shows email address
- Test OTP input accepts only numbers, max 6 digits
- Test Resend and Change email buttons

**Step 4: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: implement Step 2 OTP verification UI"
```

---

## Task 6: Update GetStartedModal - Add Step 3 and Account Creation

**Files:**
- Modify: `app/components/get-started-modal/index.tsx`

**Step 1: Add account creation handler**

Add this useEffect to handle account creation after Privy auth:

```typescript
// Add after state declarations, before handler functions
useEffect(() => {
  async function createAccount() {
    if (currentStep !== 3 || !user) return;

    try {
      // Get embedded wallet address
      const embeddedWallet = user.linkedAccounts.find(
        (account) => account.type === 'wallet' && account.walletClientType === 'privy'
      );

      if (!embeddedWallet || !('address' in embeddedWallet)) {
        throw new Error('Embedded wallet not found');
      }

      // Create user in Supabase
      await createUser({
        company_name: formData.companyName,
        email: formData.email,
        wallet_address: embeddedWallet.address,
        type: formData.type,
        privy_user_id: user.id,
      });

      // Redirect based on type
      const redirectPath = formData.type === 'buyer' ? '/payments/buyer' : '/payments/seller';
      router.push(redirectPath);
    } catch (err: any) {
      if (err instanceof DuplicateEmailError) {
        setError(err.message);
      } else {
        setError('Unable to create account. Please try again.');
      }
      setCurrentStep(2); // Go back to allow retry
    }
  }

  createAccount();
}, [currentStep, user, formData, router]);
```

**Step 2: Add Step 3 loading UI**

Add this section after Step 2 UI:

```typescript
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
```

**Step 3: Test full flow**

Run: `npm run dev`
- Complete Step 1 and Step 2
- Verify Step 3 shows loading
- Check console for any errors
- Verify redirect happens (will fail if Supabase not configured)

**Step 4: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: implement Step 3 account creation and redirect"
```

---

## Task 7: Add Modal Reset on Close

**Files:**
- Modify: `app/components/get-started-modal/index.tsx`

**Step 1: Add reset handler**

Add this function before the return statement:

```typescript
const handleClose = () => {
  // Reset all state when modal closes
  setCurrentStep(1);
  setFormData({ companyName: '', email: '', type: 'buyer' });
  setOtpCode('');
  setError(null);
  setLoading(false);
  onClose();
};
```

**Step 2: Update Dialog onClose**

In the Dialog component props, change:

```typescript
onClose={onClose}
```

to:

```typescript
onClose={handleClose}
```

**Step 3: Test modal reset**

Run: `npm run dev`
- Open modal, fill some fields
- Close modal
- Reopen and verify all fields are cleared

**Step 4: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: reset modal state on close"
```

---

## Task 8: Update Modal Header with Step Indicator

**Files:**
- Modify: `app/components/get-started-modal/index.tsx`

**Step 1: Update header section**

Replace the header section (lines 56-73) with:

```typescript
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
```

**Step 2: Test header changes**

Run: `npm run dev`
- Verify Step 1 shows "Step 1 of 2" and "Get started"
- Move to Step 2, verify it shows "Step 2 of 2" and "Verify your email"
- Step 3 should not show step indicator

**Step 3: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: add dynamic header with step indicator"
```

---

## Task 9: Add Environment Variable Validation

**Files:**
- Modify: `app/components/get-started-modal/index.tsx`

**Step 1: Add validation at top of component**

Right after the component function declaration and state setup, add:

```typescript
// Validate required env vars
useEffect(() => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables');
  }
}, []);
```

**Step 2: Commit**

```bash
git add app/components/get-started-modal/index.tsx
git commit -m "feat: add environment variable validation"
```

---

## Task 10: Integration Testing

**Files:**
- Test: `app/components/get-started-modal/index.tsx`
- Reference: `.env.local` (ensure vars are set)

**Step 1: Verify environment variables**

Check `.env.local` has:
```
NEXT_PUBLIC_PRIVY_APP_ID=...
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Step 2: Test complete signup flow**

Run: `npm run dev`

Test cases:
1. Empty fields validation
2. Invalid email format
3. Send OTP code (check email inbox)
4. Wrong OTP code
5. Correct OTP code
6. Account creation
7. Redirect to correct dashboard
8. Duplicate email error (try signing up twice with same email)

**Step 3: Check Supabase users table**

Open Supabase dashboard:
- Verify user record created
- Check all fields populated correctly
- Verify wallet_address is an Ethereum address (0x...)
- Verify type is 'buyer' or 'seller'

**Step 4: Test modal close/reset**

- Open modal
- Fill step 1
- Close modal
- Reopen - verify reset to step 1 with empty fields

**Step 5: Document any issues**

Create `TESTING.md` if needed to track issues

**Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify complete signup flow integration"
```

---

## Task 11: Update Documentation

**Files:**
- Create: `docs/PRIVY_SIGNUP_FLOW.md`

**Step 1: Create documentation**

```markdown
# Privy Custom Signup Flow

## Overview

Custom multi-step signup modal integrating Privy email authentication with Supabase user storage.

## Flow

1. User fills company name, email, and selects buyer/seller type
2. Privy sends 6-digit OTP to email
3. User enters OTP code
4. Privy authenticates and creates embedded wallet
5. User data saved to Supabase users table
6. Redirect to /payments/buyer or /payments/seller

## Components

- `app/components/get-started-modal/index.tsx` - Main modal component
- `lib/api/users.ts` - User creation API
- `lib/database.types.ts` - TypeScript types

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_PRIVY_APP_ID` - From Privy dashboard
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

## Database Schema

Table: `users`
- `id` (uuid, primary key)
- `created_at` (timestamp)
- `company_name` (text)
- `email` (text, unique)
- `wallet_address` (text)
- `type` (text - 'buyer' or 'seller')
- `privy_user_id` (text)

## Error Handling

- Duplicate email: Shows error prompting to login
- Invalid OTP: Shows inline error with retry
- Network errors: Generic retry message
- Missing env vars: Console warning

## Future Enhancements

- Login flow for existing users
- Password recovery
- Additional user profile fields
```

**Step 2: Commit documentation**

```bash
git add docs/PRIVY_SIGNUP_FLOW.md
git commit -m "docs: add Privy signup flow documentation"
```

---

## Summary

**Total Tasks:** 11
**Estimated Time:** 1.5-2 hours
**Key Files Modified:**
- `lib/database.types.ts`
- `app/components/get-started-modal/index.tsx`
- `lib/api/users.ts` (new)
- `docs/PRIVY_SIGNUP_FLOW.md` (new)

**Testing Strategy:**
- Manual testing at each step
- Integration test of full flow
- Verify Supabase data integrity

**Prerequisites:**
- Privy app configured with email login method enabled
- Supabase users table exists with correct schema
- Environment variables set in `.env.local`
