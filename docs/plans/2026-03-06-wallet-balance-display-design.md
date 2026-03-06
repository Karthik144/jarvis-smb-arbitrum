# Wallet Balance Display - Design Document

**Date:** 2026-03-06
**Status:** Approved
**Target:** MVP Enhancement

## Overview

Add a wallet balance display showing the user's current USDC balance on both buyer and seller payment pages. The balance appears in a prominent card positioned above the page title, using the same visual style as existing PaymentCard components.

## Problem Statement

Users need visibility into their available USDC balance when managing payments. Buyers need to know if they have sufficient funds for new payments, and sellers need to track their wallet balance as they claim payments.

## Requirements

**What to display:**
- User's USDC wallet balance on Arbitrum
- USDC only (no other tokens)
- Formatted as USD (e.g., "$1,234.56 USDC")

**Where to display:**
- Buyer page: Above "Scheduled Payments" title
- Seller page: Above "Incoming Payments" title
- Not in navbar or other pages

**Behavior:**
- Fetch balance once on page load
- Show loading state while fetching
- Show "Unavailable" if fetch fails
- No auto-refresh or polling (MVP simplicity)

## Component Architecture

### New Component: `BalanceCard` — `app/components/balance-card/index.tsx`

**Purpose:** Reusable component that fetches and displays USDC balance for a given wallet address.

**Props:**
```typescript
interface BalanceCardProps {
  walletAddress: string;
}
```

**Responsibilities:**
1. Fetch USDC balance from Arbitrum using viem
2. Format balance with proper decimals and thousands separators
3. Handle loading and error states
4. Display in styled card matching PaymentCard design

**Component State:**
```typescript
const [balance, setBalance] = useState<string | null>(null);
const [loading, setLoading] = useState<boolean>(true);
```

## Data Fetching

**USDC Contract:**
- Mainnet: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- Testnet: Use appropriate Arbitrum testnet USDC address
- Decimals: 6

**Fetch Implementation:**
1. Use `viem` to create public client for Arbitrum
2. Call ERC-20 `balanceOf(address)` function
3. Divide result by 1,000,000 (6 decimals)
4. Format as currency: `toLocaleString()` with 2 decimal places
5. Add " USDC" suffix

**Error Handling:**
- RPC failure → Display "Unavailable"
- No wallet address → Don't render component
- Zero balance → Display "$0.00 USDC" normally

**When to fetch:**
- On component mount (`useEffect` with wallet address dependency)
- On page navigation (natural refresh)
- No polling or manual refresh for MVP

## Page Integration

### Buyer Page (`app/payments/buyer/page.tsx`)

**Insert location:** Above the title row (before "Scheduled Payments")

**Layout order:**
1. `<BalanceCard walletAddress={buyerAddress} />`
2. Gap: 32px
3. Title row with "Scheduled Payments" + "New Payment" button
4. Gap: 32px
5. Payment cards list

**Conditional rendering:**
```typescript
{buyerAddress && <BalanceCard walletAddress={buyerAddress} />}
```

### Seller Page (`app/payments/seller/page.tsx`)

**Insert location:** Above the page title (before "Incoming Payments")

**Layout order:**
1. `<BalanceCard walletAddress={sellerAddress} />`
2. Gap: 32px
3. "Incoming Payments" title
4. Claim status banner (if active)
5. Payment cards list

**Conditional rendering:**
```typescript
{sellerAddress && <BalanceCard walletAddress={sellerAddress} />}
```

## Visual Design

### Card Styling

**Container:**
- Background: `#FFFFFF`
- Border: `1px solid #F0F0F0`
- Border radius: `12px`
- Box shadow: `0 2px 16px rgba(0,0,0,0.06)`
- Padding: `24px 32px`
- Display: flex row
- Justify content: space-between
- Align items: center

### Typography

**Label ("Wallet Balance"):**
- Font size: `17px`
- Font weight: `600`
- Color: `#000000`
- Font family: `inherit`

**Amount (e.g., "$1,234.56 USDC"):**
- Font size: `26px`
- Font weight: `700`
- Letter spacing: `-0.5px`
- Color: `#000000`
- Font family: `inherit`

**Loading State:**
- Text: "Loading..."
- Font size: `14px`
- Color: `#999999`

**Error State:**
- Text: "Unavailable"
- Font size: `14px`
- Color: `#999999`

### Spacing

- Margin bottom: `32px` (gap to next element)
- Internal padding: `24px 32px` (matches PaymentCard)

## Design Token Reference

| Token | Value |
|-------|-------|
| Card background | #FFFFFF |
| Card border | #F0F0F0 |
| Card shadow | 0 2px 16px rgba(0,0,0,0.06) |
| Card border radius | 12px |
| Label color | #000000 |
| Amount color | #000000 |
| Loading/Error text | #999999 |

## File Changes

| File | Action |
|------|--------|
| `app/components/balance-card/index.tsx` | Create |
| `app/payments/buyer/page.tsx` | Update — add BalanceCard above title |
| `app/payments/seller/page.tsx` | Update — add BalanceCard above title |

## Technical Notes

**Dependencies:**
- `viem` (already in project via Privy)
- USDC contract ABI (only need `balanceOf` function)

**ERC-20 ABI snippet:**
```typescript
const usdcAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
```

**Network:**
- Use Arbitrum chain ID and RPC
- Privy handles network switching

## MVP Scope

### In Scope
- Display USDC balance on buyer/seller pages
- Fetch balance on page load
- Clean visual design matching existing components
- Basic error handling (show "Unavailable")

### Out of Scope
- Balance polling or auto-refresh
- Manual refresh button
- Multiple token balances
- Historical balance tracking
- Balance in navbar
- Transaction notifications

## Success Criteria

Feature is successful when:
1. BalanceCard component displays correctly on both pages
2. USDC balance fetches and formats properly
3. Loading state shows while fetching
4. Error state handles RPC failures gracefully
5. Visual design matches existing PaymentCard style
6. Balance updates naturally when navigating between pages
7. Works for both buyer and seller roles

## Next Steps

1. Create BalanceCard component with viem integration
2. Add USDC contract address and ABI constants
3. Integrate into buyer page above title
4. Integrate into seller page above title
5. Test balance fetching with real wallet
6. Verify styling matches design specs
7. Test error states (disconnect wallet, RPC failure)
