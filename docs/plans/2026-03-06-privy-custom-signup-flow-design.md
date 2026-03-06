# Custom Privy Sign-Up Flow Design

**Date:** 2026-03-06
**Status:** Approved

## Overview

Integrate Privy email authentication into the existing get-started modal to create a custom sign-up flow that collects business information, authenticates users via email OTP, and stores user data in Supabase.

## User Flow

1. User clicks "Get Started" button → modal opens
2. **Step 1**: User fills company name, email, and selects type (buyer/seller)
3. User clicks "Continue" → Privy sends 6-digit OTP to email
4. **Step 2**: User enters OTP code in modal
5. Privy authenticates user → creates embedded wallet
6. **Step 3**: Loading state while saving to Supabase
7. Redirect to `/payments/buyer` or `/payments/seller` based on user type

## Architecture

### Multi-Step Modal Approach

Transform the existing `GetStartedModal` component into a three-step flow:

- **Step 1 - Business Info**: Collect company name, email, type (buyer/seller)
- **Step 2 - Email Verification**: OTP input with resend option
- **Step 3 - Creating Account**: Loading state while saving data

### Component Structure

**File:** `app/components/get-started-modal/index.tsx`

**Props:**
```typescript
interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (userId: string, userType: 'buyer' | 'seller') => void;
}
```

**State:**
```typescript
- currentStep: 1 | 2 | 3
- formData: { companyName: string, email: string, type: 'buyer' | 'seller' }
- otpCode: string
- loading: boolean
- error: string | null
```

### Visual Design

- Use MUI components throughout
- Maintain existing style theme (grays, border-radius, fonts)
- Step indicator at top (subtle dots or "Step 1 of 2")
- Remove wallet address input field (auto-generated from Privy)
- Smooth transitions between steps
- Same button styles: #171717 with hover #2a2a2a

## Data Flow

### Step 1 → Step 2: Send OTP

```typescript
// Use Privy hook
const { sendCode, loginWithCode, state } = useLoginWithEmail();

// On Continue button click:
1. Validate form fields (company name, email, type)
2. await sendCode({ email: formData.email })
3. If success → move to Step 2
4. If error → show error, stay on Step 1
```

### Step 2 → Step 3: Verify OTP & Create Account

```typescript
// On OTP submission:
1. await loginWithCode({ code: otpCode })
2. Privy authenticates user
3. Get user.id (Privy user ID)
4. Get user.wallet.address (embedded wallet)
5. Move to Step 3 (loading)
6. Insert to Supabase users table
7. Redirect based on type
```

### Supabase Integration

**Table:** `users`

**Fields:**
- `id` (primary key, auto)
- `created_at` (timestamp, auto)
- `company_name` (text)
- `email` (text, unique)
- `wallet_address` (text)
- `type` (text - "buyer" or "seller")
- `privy_user_id` (text)

**Insert data:**
```typescript
{
  company_name: formData.companyName,
  email: formData.email,
  wallet_address: user.wallet.address,
  type: formData.type,
  privy_user_id: user.id
}
```

**Redirect:**
- If type === "buyer" → `/payments/buyer`
- If type === "seller" → `/payments/seller`

## Error Handling

### Step 1 Errors
- Empty fields → Inline validation messages
- Invalid email format → "Please enter a valid email address"
- sendCode fails → "Unable to send verification code. Please try again."

### Step 2 Errors
- Wrong OTP → "Invalid code. Please check and try again."
- Expired OTP (10 min) → "Code expired. Please request a new one."
- Network error → "Connection error. Please try again."

### Step 3 Errors
- Supabase insert fails → "Unable to create account. Please try again."
- Duplicate email (23505 error) → "Account already exists. Please login." (prompt to login - implementation deferred)

### Edge Cases
- User closes modal during Step 2 → Reset to Step 1 on reopen
- Resend code → Clear OTP input, call sendCode again, show success message
- Embedded wallet not ready → Wait for wallet creation before Supabase insert

### Error Display
- Use MUI Alert component with severity="error"
- Errors appear below relevant field/section
- Loading states: CircularProgress spinner on buttons
- Step 3: Full loading screen with "Creating your account..."

## Technical Implementation

### Dependencies

**Already installed:**
- `@privy-io/react-auth` v3.16.0
- `@supabase/supabase-js` v2.98.0
- `@mui/material` v7.3.9

**Hooks to use:**
- `useLoginWithEmail` from Privy (sendCode, loginWithCode, state)
- `usePrivy` to access authenticated user data
- `useRouter` from Next.js for redirects

### New Files

**`lib/supabase.ts`** (if doesn't exist):
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**`lib/api/users.ts`**:
```typescript
async function createUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select();

  if (error?.code === '23505') {
    throw new Error('DUPLICATE_EMAIL');
  }

  if (error) throw error;
  return data[0];
}
```

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_PRIVY_APP_ID=<already set>
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Styling

- Reuse existing `inputSx` styles for consistency
- Step indicator: Small dots in #777777
- OTP input: Single TextField with maxLength={6} or 6 individual boxes
- Maintain 48px modal padding, 2.5 gap between fields
- Button styles: Same as existing (#171717, hover #2a2a2a)
- Alert styling: Light, matches existing theme

## Privy State Tracking

Privy's `useLoginWithEmail` provides state values:
- `initial`
- `sending-code`
- `awaiting-code-input`
- `submitting-code`
- `success`
- `error`

Use these to show appropriate UI feedback.

## Success Criteria

- User can complete signup flow without leaving modal
- OTP verification works smoothly with clear feedback
- User data saves correctly to Supabase
- Embedded wallet auto-generates and stores
- User redirects to correct dashboard based on type
- Errors display clearly with recovery options
- Existing modal styling maintained throughout

## Future Enhancements

- Implement login flow for existing users (deferred)
- Add password recovery/account management
- Email verification for existing accounts
- Additional user profile fields
