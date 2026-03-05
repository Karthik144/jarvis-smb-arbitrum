# SMB Stablecoin Payment MVP - Design Document

**Date:** 2026-03-05
**Status:** Approved
**Target:** MVP - Core Functionality

## Overview

Build a Next.js web application that facilitates split stablecoin payments for SMB transactions on Arbitrum. Buyers pay sellers in two installments (configurable split) - upfront payment and final payment upon verified delivery. Delivery verification uses Reclaim Protocol's zkTLS proofs via FedEx tracking.

## Problem Statement

SMB transactions require trust between buyer and seller. Buyers want assurance that goods are delivered before releasing full payment. Sellers need upfront payment to cover costs. This MVP enables split payments with cryptographic proof of delivery using zkTLS, removing the need for intermediaries.

## Use Case

**Scenario:** Buyer purchases goods from seller. They agree on a payment split (e.g., 50% upfront, 50% on delivery).

**MVP Flow:**
1. Buyer creates payment with seller address, total amount, and split percentages
2. System creates mock escrow (console logs for now, real contract later)
3. Buyer pays upfront percentage (mocked)
4. When shipment arrives, buyer scans Reclaim QR code with phone
5. Reclaim verifies FedEx delivery via zkTLS proof
6. System releases remaining payment to seller (mocked)

## Architecture

### High-Level Components

```
Next.js Frontend (React)
    ↓
Next.js API Routes (Backend)
    ↓
Supabase (Database) + Reclaim Protocol (Verification)
    ↓
Mock Smart Contract Calls (Console Logs)
```

### Tech Stack

**Frontend:**
- Next.js 14 (App Router, TypeScript)
- Privy SDK (email authentication + embedded wallets)
- Reclaim Protocol JS SDK (QR generation, proof verification)
- TailwindCSS + shadcn/ui

**Backend:**
- Next.js API routes
- Supabase JS client (server-side operations)
- Reclaim SDK (server-side proof verification)

**Database:**
- Supabase (PostgreSQL)

**Blockchain (Future):**
- Target: Arbitrum Sepolia testnet
- Stablecoin: USDC
- Smart contract: Mocked for MVP (TypeScript interfaces + console logs)

### Project Structure

```
jarvis-smb-arbitrum/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Privy email login
│   │   └── layout.tsx                # Auth wrapper
│   ├── dashboard/page.tsx            # View all payments
│   ├── create-payment/page.tsx       # Create payment form
│   ├── verify-delivery/[paymentId]/page.tsx  # QR verification
│   ├── api/
│   │   ├── payments/
│   │   │   ├── route.ts              # GET all, POST create
│   │   │   └── [id]/route.ts         # GET one, PATCH update
│   │   ├── reclaim/
│   │   │   └── verify/route.ts       # Server-side proof verification
│   │   └── mock-contract/
│   │       ├── create-escrow/route.ts
│   │       └── release-payment/route.ts
│   ├── layout.tsx
│   └── page.tsx                      # Landing page
├── components/
│   ├── payment-form.tsx
│   ├── payment-card.tsx
│   ├── reclaim-qr.tsx
│   └── wallet-button.tsx
├── lib/
│   ├── privy.ts                      # Privy config
│   ├── supabase.ts                   # Server-side client
│   ├── supabase-client.ts            # Browser client
│   ├── reclaim.ts                    # Reclaim SDK wrapper
│   ├── mock-contract.ts              # Contract interfaces + mocks
│   └── types.ts                      # Shared types
└── src/                              # Existing zkfetch code (keep)
    └── zkfetch.ts
```

## Data Model

### Supabase Schema

**payments table:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  buyer_address TEXT NOT NULL,
  seller_address TEXT NOT NULL,
  total_amount DECIMAL NOT NULL,
  upfront_percentage INTEGER NOT NULL,
  remaining_percentage INTEGER NOT NULL,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reclaim_proof JSONB
);
```

**Status values:**
- `pending` - Payment created
- `escrow_created` - Mock contract called
- `upfront_paid` - First payment made (mocked)
- `delivered` - Reclaim proof verified
- `completed` - Final payment released (mocked)

### TypeScript Types

```typescript
export type PaymentStatus =
  | 'pending'
  | 'escrow_created'
  | 'upfront_paid'
  | 'delivered'
  | 'completed';

export interface Payment {
  id: string;
  created_at: string;
  buyer_address: string;
  seller_address: string;
  total_amount: number;
  upfront_percentage: number;
  remaining_percentage: number;
  tracking_number: string | null;
  status: PaymentStatus;
  reclaim_proof: any | null;
}
```

## User Flows

### Flow 1: Create Payment

1. User logs in with email (Privy creates embedded wallet)
2. User navigates to "Create Payment"
3. User fills form:
   - Seller address
   - Total amount (USDC)
   - Upfront percentage
   - Remaining percentage (auto-calculated)
   - FedEx tracking number
4. Frontend calls `POST /api/payments`
5. API validates data, inserts into Supabase
6. Frontend calls `POST /api/mock-contract/create-escrow`
7. API logs mock contract call, updates status to `escrow_created`
8. User redirected to dashboard

### Flow 2: View Payments

1. User visits dashboard
2. Frontend calls `GET /api/payments`
3. API queries Supabase, returns all payments
4. Frontend displays payment cards with status badges
5. User can click "Verify Delivery" on eligible payments

### Flow 3: Verify Delivery

1. User clicks "Verify Delivery" on payment
2. Frontend navigates to `/verify-delivery/[paymentId]`
3. Frontend calls `GET /api/payments/[id]` to load payment
4. Frontend generates Reclaim QR code using existing FedEx provider
5. User scans QR with phone, opens App Clip
6. User enters tracking number in App Clip
7. Reclaim generates zkTLS proof of delivery
8. Frontend receives proof (via polling or callback)
9. Frontend calls `POST /api/reclaim/verify` with proof
10. API verifies proof signature using Reclaim SDK
11. API updates payment: status = `delivered`, stores proof
12. Frontend calls `POST /api/mock-contract/release-payment`
13. API logs mock contract call, updates status to `completed`
14. User sees success message, redirected to dashboard

## API Routes

### POST /api/payments
- Body: `{ buyer_address, seller_address, total_amount, upfront_percentage, remaining_percentage, tracking_number }`
- Returns: Payment object
- Minimal validation (percentages sum to 100)

### GET /api/payments
- Returns: Array of all payments

### GET /api/payments/[id]
- Returns: Single payment object

### PATCH /api/payments/[id]
- Body: `{ status?, reclaim_proof? }`
- Returns: Updated payment object

### POST /api/reclaim/verify
- Body: `{ paymentId, proof }`
- Verifies proof using Reclaim SDK
- Updates payment with proof + status
- Returns: `{ success: true/false }`

### POST /api/mock-contract/create-escrow
- Body: `{ paymentId, amount, seller }`
- Logs to console what would be sent to contract
- Updates payment status
- Returns: `{ success: true, txHash: "mock_0x..." }`

### POST /api/mock-contract/release-payment
- Body: `{ paymentId, proof }`
- Logs to console what would be sent to contract
- Updates payment status
- Returns: `{ success: true, txHash: "mock_0x..." }`

## Key Components

### 1. Payment Form
- Inputs for seller address, amount, split percentages, tracking number
- Basic validation (addresses, percentages sum to 100)
- Calls API to create payment and mock escrow

### 2. Payment Dashboard
- Fetches and displays all payments
- Shows status badges
- "Verify Delivery" button for eligible payments

### 3. Reclaim QR Component
- Generates QR code using Reclaim SDK
- Uses existing FedEx provider from reclaim-javascript-sdk-guide.md
- Polls for verification result
- Calls API to verify and release payment

### 4. Wallet Button
- Privy email login/logout
- Shows embedded wallet address
- Handles authentication state

## Technology Choices

### Why Next.js with API Routes?
- Full-stack in one framework
- Server-side operations keep API keys secure
- Easy deployment (Vercel)
- Can refactor later without changing structure

### Why Privy?
- Email authentication lowers barrier to entry
- Embedded wallets for non-crypto users
- Simple SDK integration

### Why Supabase?
- Quick setup, no backend infrastructure
- PostgreSQL with good TypeScript support
- Row-level security for future multi-tenancy

### Why Mock Contract?
- Faster MVP iteration
- Validate UX before blockchain complexity
- Easy to swap with real contract later

## Error Handling

Keep minimal for MVP:

**Client-side:**
- Basic try/catch around API calls
- Simple toast notifications for errors
- Inline validation for critical fields (address format, percentages)

**Server-side:**
- Standard response format: `{ success: boolean, data?, error? }`
- Basic HTTP status codes (400, 404, 500)
- Console.log errors for debugging

**No Extensive Error Recovery:**
- User manually retries failed operations
- No retry queues or background jobs
- Focus on happy path

## MVP Scope

### In Scope
- Email authentication with Privy (embedded wallets)
- Create payment with configurable split
- Store payments in Supabase
- Generate Reclaim QR for FedEx tracking
- Verify delivery via zkTLS proof
- Mock smart contract calls (console logs)
- Basic UI with TailwindCSS

### Out of Scope (Future)
- Real smart contract integration
- Actual USDC transfers
- Production error handling
- Form validation polish
- Tests
- Admin panel
- Multi-user/multi-tenancy features
- Email notifications
- Payment history/analytics

## Success Criteria

MVP is successful when:
1. User can create payment with custom split percentages
2. Payment is saved to Supabase
3. User can generate Reclaim QR code for verification
4. User can scan QR, verify FedEx delivery
5. Proof is verified and stored
6. Mock contract calls are logged correctly
7. Payment status updates through full lifecycle
8. UI is functional (doesn't need to be polished)

## Next Steps

1. Set up Next.js project with TypeScript
2. Configure Privy authentication
3. Set up Supabase database + schema
4. Build payment creation flow
5. Implement dashboard view
6. Integrate Reclaim QR generation (reference existing FedEx provider)
7. Build verification flow
8. Add mock contract interfaces
9. Basic styling with TailwindCSS
10. Test full user journey

## Notes

- Reference `docs/reclaim-javascript-sdk-guide.md` for Reclaim integration
- Keep existing `src/zkfetch.ts` code intact
- No need for extensive testing/validation for MVP
- Focus on core functionality over polish
