# Payments Pages Design

**Date:** 2026-03-05
**Source:** jarvis-smb.pen — "Scheduled Payments - Buyer" (QRRdW), "Scheduled Payments - Seller" (IAz5p), "New Payment Modal" (mVeFD), "Badge" (etg5s)

## Overview

Implement two authenticated payment pages (`/payments/buyer`, `/payments/seller`) plus a `NewPaymentModal`. Extract reusable `Badge` and `PaymentCard` components shared across both pages. Update the global `Navbar` to show "Sign Out" on `/payments/*` routes. Update `/dashboard` to redirect to `/payments/buyer`.

## Routing

| Route | Purpose |
|-------|---------|
| `/dashboard` | Redirects to `/payments/buyer` (hardcoded; role-based logic added later) |
| `/payments/buyer` | Scheduled Payments - Buyer view |
| `/payments/seller` | Scheduled Payments - Seller (Incoming Payments) view |

## Component Architecture

### Reusable: `Badge` — `app/components/badge/index.tsx`

Props: `label: string`

- MUI `Box`: `borderRadius: 20px`, `backgroundColor: #F5F5F5`, `border: 1px solid #EBEBEB`, `padding: 4px 12px`
- Typography: 12px, `#555555`, fontWeight 500

### Reusable: `PaymentCard` — `app/components/payment-card/index.tsx`

Props:
```ts
interface PaymentCardProps {
  variant: "buyer" | "seller";
  company: string;        // "Acme Inc." / "From: Buyer Corp"
  terms: string;          // "25% at start, 75% on delivery"
  amount: string;         // "$5,000"
  badges: string[];       // ["Initial Paid", "Awaiting Delivery"]
  // buyer only:
  paid?: string;          // "$1,250 paid"
  // seller only:
  remaining?: string;     // "$3,750 remaining"
  onClaim?: () => void;
}
```

Layout:
- White card, `borderRadius: 12px`, `boxShadow: 0 2px 16px rgba(0,0,0,0.06)`, `border: 1px solid #F0F0F0`, `padding: 24px 32px`
- Flex row, `justifyContent: space-between`, `alignItems: center`
- **Left column** (vertical, gap 8px):
  - Company name: 17px, fontWeight 600, black
  - Terms: 14px, `#777777`
  - Badge row: flex row, gap 8px, maps `badges` → `<Badge>`
- **Right column** (vertical, gap 4/12px, alignItems end):
  - Amount: 26px, fontWeight 700, `letterSpacing: -0.5px`, black
  - `variant="buyer"`: paid sub-text (13px, `#999999`)
  - `variant="seller"`: remaining sub-text (13px, `#999999`) + black "Claim" button below (borderRadius 8px, padding 8px 20px, textTransform none, fontSize 14px)

### New: `NewPaymentModal` — `app/components/new-payment-modal/index.tsx`

Props: `{ open: boolean; onClose: () => void }`

- MUI Dialog: `borderRadius: 16px`, `boxShadow: 0 4px 32px rgba(0,0,0,0.12)`, `border: 1px solid #F0F0F0`, `width: 480px`, `padding: 48px`
- Header: "New payment" (26px, 700, `letterSpacing: -0.5px`) + "Set up a scheduled payment to a seller." (15px, `#777777`), gap 8px
- Five inputs (same `#F5F5F5` style as GetStartedModal, `borderRadius: 10px`, no border at rest), gap 20px:
  1. Payment To (placeholder: "Acme Inc.")
  2. Seller Wallet Address (placeholder: "0x...")
  3. Total Amount (USD) (placeholder: "$5,000")
  4. Initial Payment (%) (placeholder: "25")
  5. FedEx Tracking Number (placeholder: "1234567890")
- "Create Payment" full-width black button (`borderRadius: 10px`, UI shell only)

## Page Designs

### `/payments/buyer` — `app/payments/buyer/page.tsx`

- `"use client"`
- Background: `#FAFAFA`, `minHeight: calc(100vh - 64px)`, padding `48px 56px`
- Content gap: 32px
- **Title row**: "Scheduled Payments" (26px, 700, `letterSpacing: -0.5px`) left + black "New Payment" outlined button right → opens `NewPaymentModal`
- **Card list**: `<PaymentCard variant="buyer" />` with mock data:
  - `company="Acme Inc."`, `terms="25% at start, 75% on delivery"`, `amount="$5,000"`, `badges={["Initial Paid", "Awaiting Delivery"]}`, `paid="$1,250 paid"`

### `/payments/seller` — `app/payments/seller/page.tsx`

- `"use client"`
- Background: `#FAFAFA`, same layout shell
- **Title row**: "Incoming Payments" (26px, 700) — no New Payment button
- **Card list**: `<PaymentCard variant="seller" />` with mock data:
  - `company="From: Buyer Corp"`, `terms="25% paid upfront, 75% on delivery verification"`, `amount="$5,000"`, `badges={["Pending Claim"]}`, `remaining="$3,750 remaining"`, `onClaim={() => {}}`
- **Helper text** below cards: "Clicking Claim will open a QR code. Scan it with your phone to verify delivery via FedEx tracking through Reclaim Protocol." (13px, `#888888`, `lineHeight: 1.6`, `maxWidth: 500px`)

## Navbar Update — `app/components/navbar/index.tsx`

Add `usePathname()` and `useLogout` from Privy.

Logic:
```
isPaymentsRoute = pathname.startsWith('/payments')

if isPaymentsRoute && authenticated:
  button label = "Sign Out"
  onClick = logout() + router.push('/')
  AppBar borderBottom = '1px solid #E0E0E0'
else:
  existing Login / Dashboard logic
  AppBar borderBottom = 'none'
```

## Dashboard Update — `app/dashboard/page.tsx`

```ts
import { redirect } from 'next/navigation';
export default function Dashboard() {
  redirect('/payments/buyer');
}
```

## Design Token Reference

| Token | Value |
|-------|-------|
| Page background | #FAFAFA |
| Card background | #FFFFFF |
| Card border | #F0F0F0 |
| Card shadow | 0 2px 16px rgba(0,0,0,0.06) |
| Card border radius | 12px |
| Badge background | #F5F5F5 |
| Badge border | #EBEBEB |
| Amount color | #000000 |
| Sub-text color | #999999 |
| Terms color | #777777 |
| Helper text color | #888888 |
| Primary button | #171717 |
| Input background | #F5F5F5 |
| Navbar border (payments) | 1px solid #E0E0E0 |

## File Changes

| File | Action |
|------|--------|
| `app/components/navbar/index.tsx` | Update — add Sign Out logic for /payments/* |
| `app/components/badge/index.tsx` | Create |
| `app/components/payment-card/index.tsx` | Create |
| `app/components/new-payment-modal/index.tsx` | Create |
| `app/payments/buyer/page.tsx` | Create |
| `app/payments/seller/page.tsx` | Create |
| `app/dashboard/page.tsx` | Update — redirect to /payments/buyer |
