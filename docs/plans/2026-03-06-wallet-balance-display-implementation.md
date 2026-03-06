# Wallet Balance Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add USDC wallet balance display card above payment lists on buyer and seller pages.

**Architecture:** Create a reusable BalanceCard component that fetches USDC balance using ethers.js, displays it in a prominent card matching PaymentCard styling, and integrates into both buyer/seller payment pages above their titles.

**Tech Stack:** React, TypeScript, Material-UI, ethers.js (already in dependencies), Arbitrum RPC

---

## Task 1: Create BalanceCard Component Structure

**Files:**
- Create: `app/components/balance-card/index.tsx`

**Step 1: Create component file with basic structure**

Create the file with imports and component skeleton:

```typescript
// app/components/balance-card/index.tsx
"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface BalanceCardProps {
  walletAddress: string;
}

export default function BalanceCard({ walletAddress }: BalanceCardProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Balance fetching logic will go here
    setLoading(false);
  }, [walletAddress]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #F0F0F0",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        px: 4,
        py: 3,
        mb: 4,
      }}
    >
      <Typography
        sx={{
          fontSize: "17px",
          fontWeight: 600,
          color: "#000000",
          fontFamily: "inherit",
        }}
      >
        Wallet Balance
      </Typography>
      <Typography
        sx={{
          fontSize: loading ? "14px" : "26px",
          fontWeight: loading ? 500 : 700,
          letterSpacing: loading ? "0" : "-0.5px",
          color: loading || !balance ? "#999999" : "#000000",
          fontFamily: "inherit",
        }}
      >
        {loading ? "Loading..." : balance || "Unavailable"}
      </Typography>
    </Box>
  );
}
```

**Step 2: Verify component structure**

Check that:
- File created at correct path
- TypeScript types are correct
- MUI imports work
- Component exports correctly

**Step 3: Commit**

```bash
git add app/components/balance-card/index.tsx
git commit -m "feat: add BalanceCard component structure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add USDC Balance Fetching Logic

**Files:**
- Modify: `app/components/balance-card/index.tsx:1-50`

**Step 1: Add ethers import and USDC contract constants**

Add at the top of the file after existing imports:

```typescript
import { ethers } from "ethers";

// USDC contract on Arbitrum mainnet
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDC_DECIMALS = 6;

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];
```

**Step 2: Implement balance fetching in useEffect**

Replace the useEffect hook with:

```typescript
useEffect(() => {
  async function fetchBalance() {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Create provider for Arbitrum
      const provider = new ethers.JsonRpcProvider(
        "https://arb1.arbitrum.io/rpc"
      );

      // Create contract instance
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        ERC20_ABI,
        provider
      );

      // Fetch balance
      const rawBalance = await usdcContract.balanceOf(walletAddress);

      // Format balance (USDC has 6 decimals)
      const balanceInUsdc = Number(rawBalance) / Math.pow(10, USDC_DECIMALS);
      const formattedBalance = `$${balanceInUsdc.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USDC`;

      setBalance(formattedBalance);
    } catch (error) {
      console.error("Failed to fetch USDC balance:", error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }

  fetchBalance();
}, [walletAddress]);
```

**Step 3: Test the component logic**

Verify:
- No TypeScript errors
- ethers imports correctly
- Contract ABI is valid
- Balance formatting logic is correct

**Step 4: Commit**

```bash
git add app/components/balance-card/index.tsx
git commit -m "feat: add USDC balance fetching logic

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Integrate BalanceCard into Buyer Page

**Files:**
- Modify: `app/payments/buyer/page.tsx:1-10`
- Modify: `app/payments/buyer/page.tsx:50-68`

**Step 1: Add import for BalanceCard**

Add to the imports section at the top:

```typescript
import BalanceCard from "@/app/components/balance-card";
```

**Step 2: Add BalanceCard above title row**

Find the Box containing the page content (around line 60) and add BalanceCard as the first element inside the gap container:

```typescript
<Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
  {/* Balance Card */}
  {buyerAddress && <BalanceCard walletAddress={buyerAddress} />}

  {/* Title row */}
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
```

**Step 3: Verify layout**

Check that:
- BalanceCard appears above title
- 32px gap exists between elements (gap: 4 = 32px in MUI)
- Conditional rendering works with buyerAddress

**Step 4: Commit**

```bash
git add app/payments/buyer/page.tsx
git commit -m "feat: integrate BalanceCard into buyer page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Integrate BalanceCard into Seller Page

**Files:**
- Modify: `app/payments/seller/page.tsx:1-10`
- Modify: `app/payments/seller/page.tsx:62-84`

**Step 1: Add import for BalanceCard**

Add to the imports section at the top:

```typescript
import BalanceCard from "@/app/components/balance-card";
```

**Step 2: Add BalanceCard above title**

Find the Box containing the page content and add BalanceCard as the first element:

```typescript
<Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
  {/* Balance Card */}
  {sellerAddress && <BalanceCard walletAddress={sellerAddress} />}

  <Typography
    component="h1"
    sx={{
      fontSize: "26px",
      fontWeight: 700,
      letterSpacing: "-0.5px",
      color: "#000000",
      fontFamily: "inherit",
    }}
  >
    Incoming Payments
  </Typography>
```

**Step 3: Verify layout**

Check that:
- BalanceCard appears above "Incoming Payments" title
- Gap spacing is correct
- Conditional rendering works with sellerAddress
- Claim status banner appears after title (unchanged)

**Step 4: Commit**

```bash
git add app/payments/seller/page.tsx
git commit -m "feat: integrate BalanceCard into seller page

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Manual Testing and Verification

**Files:**
- None (testing only)

**Step 1: Start development server**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000 with no errors

**Step 2: Test buyer page**

Navigate to `/payments/buyer` and verify:
- BalanceCard appears above "Scheduled Payments"
- Shows "Loading..." initially
- Balance appears after 1-2 seconds as "$X.XX USDC"
- Styling matches PaymentCard components
- If balance fetch fails, shows "Unavailable"

**Step 3: Test seller page**

Navigate to `/payments/seller` and verify:
- BalanceCard appears above "Incoming Payments"
- Same loading and display behavior as buyer page
- Claim status banner (if present) appears below title
- Balance card doesn't interfere with claim flow

**Step 4: Test edge cases**

Verify:
- Zero balance displays as "$0.00 USDC"
- Card only appears when wallet is connected
- Balance updates when navigating between pages
- RPC errors show "Unavailable" gracefully

**Step 5: Visual verification**

Confirm styling matches design specs:
- Card background: white
- Border: 1px solid #F0F0F0
- Border radius: 12px
- Shadow: subtle
- Typography sizes and weights correct
- 32px gap between card and content below

---

## Notes

**Dependencies:**
- `ethers` is already in package.json (version 6.16.0)
- No additional packages needed

**RPC Endpoint:**
- Using public Arbitrum RPC: `https://arb1.arbitrum.io/rpc`
- For production, consider using a dedicated RPC provider (Alchemy, Infura)
- Rate limits may apply to public RPC

**USDC Contract:**
- Mainnet address: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- If testing on testnet, update USDC_ADDRESS constant

**Error Handling:**
- Minimal for MVP: show "Unavailable" on any error
- Errors logged to console for debugging
- No retry logic or loading spinners beyond initial state

**Balance Updates:**
- Fetches once on component mount
- Refetches when walletAddress prop changes
- Natural refresh happens on page navigation
- No polling or manual refresh for MVP

---

## Success Criteria

Implementation is complete when:

1. ✅ BalanceCard component created with correct structure
2. ✅ USDC balance fetching works using ethers.js
3. ✅ Balance displays correctly formatted as "$X.XX USDC"
4. ✅ Loading state shows "Loading..." while fetching
5. ✅ Error state shows "Unavailable" on RPC failures
6. ✅ Component integrated into buyer page above title
7. ✅ Component integrated into seller page above title
8. ✅ Visual styling matches PaymentCard design
9. ✅ No TypeScript errors
10. ✅ No console errors during normal operation
11. ✅ Balance updates when navigating between pages
12. ✅ Works for both buyer and seller roles

---

## Estimated Time

- Task 1 (Component Structure): 3-5 minutes
- Task 2 (Balance Fetching): 5-7 minutes
- Task 3 (Buyer Integration): 2-3 minutes
- Task 4 (Seller Integration): 2-3 minutes
- Task 5 (Testing): 5-10 minutes

**Total: 20-30 minutes**
