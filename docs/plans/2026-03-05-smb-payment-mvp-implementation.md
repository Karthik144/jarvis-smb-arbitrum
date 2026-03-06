# SMB Stablecoin Payment MVP - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Next.js app with split stablecoin payments, Privy auth, Reclaim delivery verification, and Supabase storage.

**Architecture:** Next.js 14 App Router with API routes for server-side operations, Privy for email + embedded wallets, Reclaim JavaScript SDK for FedEx delivery proofs, Supabase for payment storage, mock contract calls.

**Tech Stack:** Next.js 14, TypeScript, Privy, Reclaim Protocol JS SDK, Supabase, TailwindCSS, shadcn/ui

---

## Prerequisites

### Environment Setup

Required credentials:
- Privy App ID (from https://dashboard.privy.io/)
- Reclaim App ID, App Secret, Provider ID (from https://dev.reclaimprotocol.org/)
- Supabase URL and Anon Key (from https://supabase.com/)

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json` (updated with dependencies)
- Create: `next.config.js`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `.env.local`
- Create: `.gitignore` (updated)

**Step 1: Initialize Next.js with TypeScript**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted:
- Would you like to use TypeScript? **Yes**
- Would you like to use ESLint? **Yes**
- Would you like to use Tailwind CSS? **Yes**
- Would you like to use `src/` directory? **No**
- Would you like to use App Router? **Yes**
- Would you like to customize the default import alias? **No**

**Step 2: Install dependencies**

```bash
npm install @reclaimprotocol/js-sdk @supabase/supabase-js @privy-io/react-auth ethers
```

**Step 3: Create environment file**

Create `.env.local`:

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Reclaim
NEXT_PUBLIC_RECLAIM_APP_ID=your_reclaim_app_id
RECLAIM_APP_SECRET=your_reclaim_app_secret
RECLAIM_PROVIDER_ID=your_fedex_provider_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Arbitrum (for future use)
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_USDC_ADDRESS=0x... # Arbitrum Sepolia USDC
```

**Step 4: Update .gitignore**

Add to `.gitignore`:

```
# Keep existing entries
.env.local
.env
output/
```

**Step 5: Verify setup**

```bash
npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000

**Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js 14 with TypeScript and Tailwind"
```

---

## Task 2: Set Up Supabase Database

**Files:**
- Create: `supabase/migrations/001_create_payments_table.sql`
- Create: `lib/supabase.ts`
- Create: `lib/supabase-client.ts`
- Create: `lib/types.ts`

**Step 1: Create Supabase migration**

Create `supabase/migrations/001_create_payments_table.sql`:

```sql
-- Create payments table
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

-- Create index on status for efficient queries
CREATE INDEX idx_payments_status ON payments(status);

-- Create index on buyer_address for user filtering
CREATE INDEX idx_payments_buyer ON payments(buyer_address);
```

**Step 2: Run migration in Supabase Dashboard**

1. Go to Supabase Dashboard → SQL Editor
2. Paste migration SQL
3. Run query
4. Verify table created in Table Editor

**Step 3: Create TypeScript types**

Create `lib/types.ts`:

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

export interface CreatePaymentRequest {
  buyer_address: string;
  seller_address: string;
  total_amount: number;
  upfront_percentage: number;
  remaining_percentage: number;
  tracking_number?: string;
}
```

**Step 4: Create server-side Supabase client**

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

**Step 5: Create browser Supabase client**

Create `lib/supabase-client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

**Step 6: Commit**

```bash
git add supabase/ lib/
git commit -m "feat: set up Supabase database schema and clients"
```

---

## Task 3: Configure Privy Authentication

**Files:**
- Create: `lib/privy.tsx`
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create Privy config**

Create `lib/privy.tsx`:

```typescript
'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { arbitrumSepolia } from 'viem/chains';

export function PrivyConfig({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: arbitrumSepolia,
        supportedChains: [arbitrumSepolia],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

**Step 2: Create providers wrapper**

Create `app/providers.tsx`:

```typescript
'use client';

import { PrivyConfig } from '@/lib/privy';

export function Providers({ children }: { children: React.ReactNode }) {
  return <PrivyConfig>{children}</PrivyConfig>;
}
```

**Step 3: Update root layout**

Modify `app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SMB Payments - Split Stablecoin Payments',
  description: 'Secure split payments with delivery verification',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add lib/privy.tsx app/providers.tsx app/layout.tsx
git commit -m "feat: configure Privy authentication with email + embedded wallets"
```

---

## Task 4: Create Mock Contract Interface

**Files:**
- Create: `lib/mock-contract.ts`

**Step 1: Create mock contract utilities**

Create `lib/mock-contract.ts`:

```typescript
export interface MockEscrowParams {
  paymentId: string;
  totalAmount: number;
  upfrontPercentage: number;
  sellerAddress: string;
  buyerAddress: string;
}

export interface MockReleaseParams {
  paymentId: string;
  sellerAddress: string;
  remainingAmount: number;
  proof: any;
}

export async function mockCreateEscrow(params: MockEscrowParams) {
  console.log('🔷 MOCK CONTRACT CALL: createEscrow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Payment ID:', params.paymentId);
  console.log('Total Amount:', params.totalAmount, 'USDC');
  console.log('Upfront %:', params.upfrontPercentage);
  console.log('Seller:', params.sellerAddress);
  console.log('Buyer:', params.buyerAddress);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Simulate transaction delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
  console.log('✅ Mock Transaction Hash:', mockTxHash);
  console.log('\n');

  return {
    success: true,
    txHash: mockTxHash,
  };
}

export async function mockReleasePayment(params: MockReleaseParams) {
  console.log('🔷 MOCK CONTRACT CALL: releasePayment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Payment ID:', params.paymentId);
  console.log('Seller:', params.sellerAddress);
  console.log('Remaining Amount:', params.remainingAmount, 'USDC');
  console.log('Proof verified:', !!params.proof);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Simulate transaction delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
  console.log('✅ Mock Transaction Hash:', mockTxHash);
  console.log('\n');

  return {
    success: true,
    txHash: mockTxHash,
  };
}
```

**Step 2: Commit**

```bash
git add lib/mock-contract.ts
git commit -m "feat: add mock smart contract interface"
```

---

## Task 5: Create Payment API Routes

**Files:**
- Create: `app/api/payments/route.ts`
- Create: `app/api/payments/[id]/route.ts`

**Step 1: Create GET all and POST create payments**

Create `app/api/payments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreatePaymentRequest, Payment } from '@/lib/types';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();

    // Basic validation
    if (body.upfront_percentage + body.remaining_percentage !== 100) {
      return NextResponse.json(
        { success: false, error: 'Percentages must sum to 100' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        buyer_address: body.buyer_address,
        seller_address: body.seller_address,
        total_amount: body.total_amount,
        upfront_percentage: body.upfront_percentage,
        remaining_percentage: body.remaining_percentage,
        tracking_number: body.tracking_number || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create GET one and PATCH update**

Create `app/api/payments/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('payments')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add app/api/payments/
git commit -m "feat: add payment CRUD API routes"
```

---

## Task 6: Create Mock Contract API Routes

**Files:**
- Create: `app/api/mock-contract/create-escrow/route.ts`
- Create: `app/api/mock-contract/release-payment/route.ts`

**Step 1: Create escrow route**

Create `app/api/mock-contract/create-escrow/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { mockCreateEscrow } from '@/lib/mock-contract';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId } = body;

    // Get payment details
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Call mock contract
    const result = await mockCreateEscrow({
      paymentId: payment.id,
      totalAmount: payment.total_amount,
      upfrontPercentage: payment.upfront_percentage,
      sellerAddress: payment.seller_address,
      buyerAddress: payment.buyer_address,
    });

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'escrow_created' })
      .eq('id', paymentId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error creating escrow:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create release payment route**

Create `app/api/mock-contract/release-payment/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { mockReleasePayment } from '@/lib/mock-contract';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, proof } = body;

    // Get payment details
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const remainingAmount =
      (payment.total_amount * payment.remaining_percentage) / 100;

    // Call mock contract
    const result = await mockReleasePayment({
      paymentId: payment.id,
      sellerAddress: payment.seller_address,
      remainingAmount,
      proof,
    });

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', paymentId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error releasing payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add app/api/mock-contract/
git commit -m "feat: add mock contract API routes"
```

---

## Task 7: Create Reclaim Verification API

**Files:**
- Create: `app/api/reclaim/config/route.ts`
- Create: `app/api/reclaim/verify/route.ts`

**Step 1: Create Reclaim config route**

Create `app/api/reclaim/config/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, trackingNumber } = body;

    const providerId = process.env.RECLAIM_PROVIDER_ID;
    if (!providerId) {
      throw new Error('Missing RECLAIM_PROVIDER_ID');
    }

    // Initialize Reclaim proof request
    const reclaimProofRequest = await ReclaimProofRequest.init(
      process.env.NEXT_PUBLIC_RECLAIM_APP_ID!,
      process.env.RECLAIM_APP_SECRET!,
      providerId
    );

    // Set context to identify this payment
    reclaimProofRequest.setContext(paymentId, trackingNumber);

    // Set tracking number parameter if provided
    if (trackingNumber) {
      reclaimProofRequest.setParams({ trackingNumber });
    }

    // Convert to JSON string for frontend
    const proofRequestObject = reclaimProofRequest.toJsonString();

    return NextResponse.json({
      success: true,
      proofRequest: proofRequestObject,
    });
  } catch (error) {
    console.error('Error creating Reclaim config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create proof request' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create verification route**

Create `app/api/reclaim/verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyProof } from '@reclaimprotocol/js-sdk';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, proofs } = body;

    if (!proofs || proofs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No proofs provided' },
        { status: 400 }
      );
    }

    // Verify proof signature
    const isValid = await verifyProof(proofs);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Proof verification failed' },
        { status: 400 }
      );
    }

    // Extract delivery status from proof
    const proof = proofs[0];
    const context = JSON.parse(proof.claimData.context);
    const { extractedParameters } = context;

    // Update payment with proof
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'delivered',
        reclaim_proof: proof,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery verified',
      extractedParameters,
      payment: data,
    });
  } catch (error) {
    console.error('Error verifying proof:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add app/api/reclaim/
git commit -m "feat: add Reclaim verification API routes"
```

---

## Task 8: Create UI Components

**Files:**
- Create: `components/wallet-button.tsx`
- Create: `components/payment-form.tsx`
- Create: `components/payment-card.tsx`

**Step 1: Create wallet button**

Create `components/wallet-button.tsx`:

```typescript
'use client';

import { usePrivy } from '@privy-io/react-auth';

export function WalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return <button disabled>Loading...</button>;
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Login
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <div className="font-medium">{user?.email?.address}</div>
        {user?.wallet?.address && (
          <div className="text-gray-600">
            {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
          </div>
        )}
      </div>
      <button
        onClick={logout}
        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
      >
        Logout
      </button>
    </div>
  );
}
```

**Step 2: Create payment form**

Create `components/payment-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

export function PaymentForm() {
  const router = useRouter();
  const { user } = usePrivy();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    seller_address: '',
    total_amount: '',
    upfront_percentage: '50',
    tracking_number: '',
  });

  const remainingPercentage = 100 - Number(formData.upfront_percentage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.wallet?.address) return;

    setLoading(true);

    try {
      // Create payment
      const paymentRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_address: user.wallet.address,
          seller_address: formData.seller_address,
          total_amount: Number(formData.total_amount),
          upfront_percentage: Number(formData.upfront_percentage),
          remaining_percentage: remainingPercentage,
          tracking_number: formData.tracking_number || null,
        }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentData.success) {
        alert('Failed to create payment');
        return;
      }

      // Create mock escrow
      await fetch('/api/mock-contract/create-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: paymentData.data.id }),
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Seller Address</label>
        <input
          type="text"
          required
          placeholder="0x..."
          value={formData.seller_address}
          onChange={(e) =>
            setFormData({ ...formData, seller_address: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Total Amount (USDC)</label>
        <input
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="100.00"
          value={formData.total_amount}
          onChange={(e) =>
            setFormData({ ...formData, total_amount: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Upfront Payment (%)
        </label>
        <input
          type="number"
          required
          min="0"
          max="100"
          value={formData.upfront_percentage}
          onChange={(e) =>
            setFormData({ ...formData, upfront_percentage: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-lg"
        />
        <p className="text-sm text-gray-600 mt-1">
          Remaining: {remainingPercentage}%
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          FedEx Tracking Number (Optional)
        </label>
        <input
          type="text"
          placeholder="889260101279"
          value={formData.tracking_number}
          onChange={(e) =>
            setFormData({ ...formData, tracking_number: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Creating...' : 'Create Payment'}
      </button>
    </form>
  );
}
```

**Step 3: Create payment card**

Create `components/payment-card.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { Payment } from '@/lib/types';

interface PaymentCardProps {
  payment: Payment;
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  escrow_created: 'bg-blue-100 text-blue-800',
  upfront_paid: 'bg-purple-100 text-purple-800',
  delivered: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export function PaymentCard({ payment }: PaymentCardProps) {
  const canVerify = payment.status === 'escrow_created' || payment.status === 'upfront_paid';

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {payment.total_amount} USDC
          </div>
          <div className="text-sm text-gray-600">
            {payment.upfront_percentage}% upfront / {payment.remaining_percentage}% on delivery
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[payment.status]}`}>
          {payment.status}
        </span>
      </div>

      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Seller:</span>
          <span className="font-mono text-xs">
            {payment.seller_address.slice(0, 6)}...{payment.seller_address.slice(-4)}
          </span>
        </div>
        {payment.tracking_number && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tracking:</span>
            <span className="font-mono text-xs">{payment.tracking_number}</span>
          </div>
        )}
      </div>

      {canVerify && (
        <Link
          href={`/verify-delivery/${payment.id}`}
          className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Verify Delivery
        </Link>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add components/
git commit -m "feat: add UI components for wallet, payment form, and payment cards"
```

---

## Task 9: Create Reclaim Verification Component

**Files:**
- Create: `components/reclaim-verifier.tsx`

**Step 1: Create Reclaim component**

Create `components/reclaim-verifier.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import { useRouter } from 'next/navigation';

interface ReclaimVerifierProps {
  paymentId: string;
  trackingNumber?: string;
}

export function ReclaimVerifier({ paymentId, trackingNumber }: ReclaimVerifierProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get proof request config from backend
      const configRes = await fetch('/api/reclaim/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, trackingNumber }),
      });

      const configData = await configRes.json();

      if (!configData.success) {
        throw new Error('Failed to get Reclaim config');
      }

      // Convert to ReclaimProofRequest
      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
        configData.proofRequest
      );

      // Trigger verification flow
      await reclaimProofRequest.triggerReclaimFlow();

      // Start session and wait for proof
      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          console.log('Proof received:', proofs);

          // Verify proof on backend
          const verifyRes = await fetch('/api/reclaim/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, proofs }),
          });

          const verifyData = await verifyRes.json();

          if (!verifyData.success) {
            throw new Error(verifyData.error || 'Verification failed');
          }

          // Release payment via mock contract
          await fetch('/api/mock-contract/release-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, proof: proofs[0] }),
          });

          alert('✅ Delivery verified and payment released!');
          router.push('/dashboard');
        },
        onError: (err) => {
          console.error('Reclaim error:', err);
          setError(err.message || 'Verification failed');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleVerify}
        disabled={loading}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
      >
        {loading ? 'Verifying Delivery...' : 'Verify Delivery with Reclaim'}
      </button>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-sm text-gray-600 space-y-2">
        <p><strong>How it works:</strong></p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click the button above</li>
          <li>Scan QR code with your phone</li>
          <li>View FedEx tracking page in the app</li>
          <li>Proof is generated automatically</li>
          <li>Payment is released to seller</li>
        </ol>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/reclaim-verifier.tsx
git commit -m "feat: add Reclaim verification component"
```

---

## Task 10: Create App Pages

**Files:**
- Create: `app/page.tsx`
- Create: `app/dashboard/page.tsx`
- Create: `app/create-payment/page.tsx`
- Create: `app/verify-delivery/[paymentId]/page.tsx`

**Step 1: Create landing page**

Create `app/page.tsx`:

```typescript
import Link from 'next/link';
import { WalletButton } from '@/components/wallet-button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">SMB Payments</h1>
          <WalletButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold mb-6">
          Secure Split Payments for SMBs
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Pay suppliers in installments. Release final payment automatically when shipment arrives.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/create-payment"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Payment
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-bold mb-2">Split Payments</h3>
            <p className="text-gray-600">
              Pay part upfront, part on delivery. Customize the split percentage.
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🔐</div>
            <h3 className="font-bold mb-2">Cryptographic Proof</h3>
            <p className="text-gray-600">
              zkTLS proofs verify delivery without exposing sensitive data.
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold mb-2">On Arbitrum</h3>
            <p className="text-gray-600">
              Fast, low-cost transactions using USDC on Arbitrum Sepolia.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Create dashboard page**

Create `app/dashboard/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet-button';
import { PaymentCard } from '@/components/payment-card';
import { Payment } from '@/lib/types';

export default function Dashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            SMB Payments
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Payment Dashboard</h1>
          <Link
            href="/create-payment"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + New Payment
          </Link>
        </div>

        {loading ? (
          <p>Loading payments...</p>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No payments yet</p>
            <Link
              href="/create-payment"
              className="text-blue-600 hover:underline"
            >
              Create your first payment
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {payments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 3: Create payment form page**

Create `app/create-payment/page.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/wallet-button';
import { PaymentForm } from '@/components/payment-form';
import { usePrivy } from '@privy-io/react-auth';

export default function CreatePayment() {
  const { authenticated } = usePrivy();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            SMB Payments
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Create New Payment</h1>

        {!authenticated ? (
          <div className="p-6 bg-yellow-50 text-yellow-800 rounded-lg">
            Please login to create a payment
          </div>
        ) : (
          <PaymentForm />
        )}
      </main>
    </div>
  );
}
```

**Step 4: Create verification page**

Create `app/verify-delivery/[paymentId]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet-button';
import { ReclaimVerifier } from '@/components/reclaim-verifier';
import { Payment } from '@/lib/types';

export default function VerifyDelivery({
  params,
}: {
  params: { paymentId: string };
}) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, []);

  const fetchPayment = async () => {
    try {
      const res = await fetch(`/api/payments/${params.paymentId}`);
      const data = await res.json();
      if (data.success) {
        setPayment(data.data);
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            SMB Payments
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-6">Verify Delivery</h1>

        {loading ? (
          <p>Loading payment...</p>
        ) : !payment ? (
          <p className="text-red-600">Payment not found</p>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="font-bold mb-4">Payment Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">{payment.total_amount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining to Pay:</span>
                  <span className="font-medium">
                    {(payment.total_amount * payment.remaining_percentage) / 100} USDC ({payment.remaining_percentage}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seller:</span>
                  <span className="font-mono text-xs">
                    {payment.seller_address.slice(0, 6)}...{payment.seller_address.slice(-4)}
                  </span>
                </div>
                {payment.tracking_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking Number:</span>
                    <span className="font-mono text-xs">{payment.tracking_number}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="font-bold mb-4">Verify Shipment Delivery</h2>
              <ReclaimVerifier
                paymentId={payment.id}
                trackingNumber={payment.tracking_number || undefined}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add app/
git commit -m "feat: add all app pages (landing, dashboard, create payment, verify delivery)"
```

---

## Task 11: Final Testing and Cleanup

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Update `README.md` to include setup instructions for the new MVP:

```markdown
# SMB Stablecoin Payment MVP

Split stablecoin payments for SMB transactions with automated delivery verification using zkTLS proofs.

## Features

- **Split Payments**: Configurable payment splits (e.g., 50% upfront, 50% on delivery)
- **Email Authentication**: Privy integration with embedded wallets
- **Delivery Verification**: Reclaim Protocol zkTLS proofs for FedEx tracking
- **Mock Contracts**: Smart contract interface ready for Arbitrum integration

## Tech Stack

- Next.js 14 (App Router)
- Privy (Email + Embedded Wallets)
- Reclaim Protocol (zkTLS Proofs)
- Supabase (Database)
- TailwindCSS
- TypeScript

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```env
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Reclaim
NEXT_PUBLIC_RECLAIM_APP_ID=your_reclaim_app_id
RECLAIM_APP_SECRET=your_reclaim_app_secret
RECLAIM_PROVIDER_ID=your_fedex_provider_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Supabase Database

Run the migration in Supabase SQL Editor:

```sql
-- See supabase/migrations/001_create_payments_table.sql
```

### 4. Create Reclaim FedEx Provider

1. Go to https://dev.reclaimprotocol.org/
2. Create custom provider for FedEx tracking
3. See `docs/reclaim-javascript-sdk-guide.md` for detailed setup

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## User Flow

1. **Login**: User logs in with email (Privy creates embedded wallet)
2. **Create Payment**: Enter seller address, amount, split percentages, tracking number
3. **Mock Escrow**: System creates mock escrow (logs to console)
4. **Verify Delivery**: User scans QR code, verifies FedEx delivery via Reclaim
5. **Release Payment**: System releases remaining payment (mock contract call)

## Project Structure

```
├── app/
│   ├── (routes)/              # Next.js pages
│   └── api/                   # API routes
├── components/                # React components
├── lib/                       # Utilities and configs
├── supabase/                  # Database migrations
└── docs/                      # Documentation
```

## Documentation

- [Design Document](./docs/plans/2026-03-05-smb-stablecoin-payment-mvp-design.md)
- [Reclaim SDK Guide](./docs/reclaim-javascript-sdk-guide.md)
- [Implementation Plan](./docs/plans/2026-03-05-smb-payment-mvp-implementation.md)

## Future Work

- Integrate real smart contract on Arbitrum Sepolia
- Add actual USDC transfers
- Support multiple carriers (UPS, DHL, USPS)
- Add payment analytics dashboard
- Email notifications

## License

MIT
```

**Step 2: Test the application**

Manual testing checklist:

1. Run `npm run dev`
2. Visit http://localhost:3000
3. Login with email via Privy
4. Create a test payment
5. Check console logs for mock contract call
6. Visit dashboard and verify payment appears
7. Click "Verify Delivery" on a payment
8. Attempt Reclaim flow (requires valid FedEx tracking number)

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with MVP setup and usage instructions"
```

---

## Execution Complete

All tasks completed! The MVP includes:

✅ Next.js 14 with TypeScript and TailwindCSS
✅ Privy authentication (email + embedded wallets)
✅ Supabase database with payments table
✅ Payment CRUD API routes
✅ Mock smart contract interface
✅ Reclaim Protocol integration for FedEx verification
✅ Complete UI flow (landing, dashboard, create payment, verify delivery)
✅ Documentation

## Next Steps

1. **Get Credentials**:
   - Sign up for Privy: https://dashboard.privy.io/
   - Sign up for Reclaim: https://dev.reclaimprotocol.org/
   - Sign up for Supabase: https://supabase.com/

2. **Create FedEx Provider**:
   - Follow `docs/reclaim-javascript-sdk-guide.md`
   - Configure FedEx tracking provider in Reclaim DevTool

3. **Test Full Flow**:
   - Create payment with real FedEx tracking number
   - Scan QR code and verify delivery
   - Check console logs for mock contract calls

4. **Add Real Smart Contract** (future):
   - Deploy escrow contract to Arbitrum Sepolia
   - Replace mock functions with real contract calls
   - Integrate USDC transfers
