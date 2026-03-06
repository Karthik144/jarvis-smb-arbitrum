# Reclaim JavaScript SDK - Complete Implementation Guide

**Date:** 2026-03-05
**Project:** zkTLS Package Tracking Verification
**Purpose:** Generate cryptographic proofs of package delivery status for automated stablecoin payments

---

## Table of Contents

1. [Overview](#overview)
2. [Why Reclaim JavaScript SDK?](#why-reclaim-javascript-sdk)
3. [Installation](#installation)
4. [Three-Step Integration Process](#three-step-integration-process)
5. [Step 1: Backend - Preparing Proof Request](#step-1-backend---preparing-proof-request)
6. [Step 2: Frontend - User Generates Proof](#step-2-frontend---user-generates-proof)
7. [Step 3: Backend - Verifying the Proof](#step-3-backend---verifying-the-proof)
8. [Custom Provider Setup](#custom-provider-setup)
9. [Smart Contract Integration](#smart-contract-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Reclaim Protocol?

Reclaim Protocol enables **zero-knowledge Transport Layer Security (zkTLS)** proofs. Users can cryptographically prove they saw specific data on a website without exposing sensitive session data.

### Use Case: Package Tracking Verification

**Goal:** When an importer receives a package, automatically release stablecoin payment to the exporter.

**Flow:**
1. Importer visits FedEx/UPS/Amazon tracking page
2. Reclaim SDK captures delivery status ("Delivered")
3. Generates cryptographic proof
4. Proof verified on backend
5. Smart contract releases payment on Arbitrum testnet

---

## Why Reclaim JavaScript SDK?

### Why Not zkFetch?

We initially tried using `@reclaimprotocol/zk-fetch` (server-side scraping), but encountered issues:

**Problem 1: Dynamic JavaScript Loading**
- Amazon tracking page loads "Delivered" status via JavaScript
- zkFetch only gets initial HTML (no JavaScript execution)
- Response doesn't contain delivery status

**Problem 2: Web Application Firewall (WAF) Blocking**
- FedEx blocks automated requests
- Returns 403 error page instead of tracking data
- Carriers protect against bots/scrapers

### Solution: JavaScript SDK with Custom Provider

**Advantages:**
- ✅ **Real user** visits tracking page (no WAF blocking)
- ✅ **JavaScript executes** in user's browser (sees "Delivered")
- ✅ **Captures API requests** the page makes
- ✅ **Generates proof** of actual delivery status
- ✅ **Works with any carrier** (Amazon, FedEx, UPS, DHL)

**Tradeoff:**
- ❌ Not fully automated (user must click button)
- ✅ Still much better than manual payment process

---

## Installation

```bash
npm install @reclaimprotocol/js-sdk
```

### Prerequisites

Before using the SDK, obtain credentials from [Reclaim DevTool](https://dev.reclaimprotocol.org/):

1. **APP_ID** - Your application identifier
2. **APP_SECRET** - Your application secret key
3. **PROVIDER_ID** - The proof type (or create custom provider)

---

## Three-Step Integration Process

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Backend - Prepare Proof Request                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ReclaimProofRequest.init(APP_ID, SECRET, PROVIDER_ID) │ │
│  │ Returns: proofRequestObject (JSON string)              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Frontend - User Generates Proof                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ User clicks "Verify Delivery"                          │ │
│  │ → triggerReclaimFlow() opens tracking page            │ │
│  │ → User sees "Delivered" status                         │ │
│  │ → Proof generated automatically                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Backend - Verify Proof                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ verifyProof(proofs) → returns true/false               │ │
│  │ Extract delivery status from proof                     │ │
│  │ Send to smart contract for payment release            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Backend - Preparing Proof Request

### Quickstart

**Import the library:**

```typescript
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
```

**Setup request on backend:**

```typescript
const reclaimProofRequest = await ReclaimProofRequest.init(
  'APP_ID',
  'APP_SECRET',
  'PROVIDER_ID'
);
```

**Send to frontend:**

```typescript
const proofRequestObject = reclaimProofRequest.toJsonString();
```

### Sample Implementation (Next.js)

```typescript
// app/api/reclaim/config/route.ts
import { NextResponse } from 'next/server';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

export async function GET(request) {
  // Your custom FedEx tracking provider ID
  const providerId = 'YOUR_FEDEX_PROVIDER_ID';

  const proofRequestOptions = {
    // Optional: disable AppClip if not on enterprise plan
    useAppClip: false,
    customSharePageUrl: 'https://portal.reclaimprotocol.org'
  };

  // Initialize SDK with environment variables
  const reclaimProofRequest = await ReclaimProofRequest.init(
    process.env.RECLAIM_APP_ID!,
    process.env.RECLAIM_APP_SECRET!,
    providerId,
    proofRequestOptions
  );

  // Optional: Set context to identify user
  reclaimProofRequest.setContext(
    request.headers.get('user-wallet-address') || 'unknown',
    JSON.stringify({ sessionId: 'abc123' })
  );

  // Convert to JSON string
  const proofRequestObject = reclaimProofRequest.toJsonString();

  return NextResponse.json({
    success: true,
    proofRequest: proofRequestObject
  });
}
```

### Advanced Options

#### Set Context

Identify the proof request when you receive it back:

```typescript
// Simple context
reclaimProofRequest.setContext('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'order-12345');

// JSON context
reclaimProofRequest.setJsonContext({
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  orderId: 'order-12345',
  importerEmail: 'importer@example.com',
  exporterEmail: 'exporter@example.com'
});
```

⚠️ **Warning:** `setContext` and `setJsonContext` overwrite each other.

#### Set Callback URLs

**Success Callback:**

```typescript
reclaimProofRequest.setAppCallbackUrl(
  'https://yourapp.com/api/reclaim/verify',
  true // Send as JSON instead of form-encoded
);
```

When proof is generated, Reclaim sends POST request to your callback URL.

**Cancel Callback:**

```typescript
reclaimProofRequest.setCancelCallbackUrl(
  'https://yourapp.com/api/reclaim/cancel'
);
```

Handles user cancellations or errors.

**What triggers cancel callback?**

| Exception Name | Description |
|----------------|-------------|
| `ReclaimVerificationAbortedException` | User clicked cancel button |
| `ReclaimVerificationProviderScriptException` | Provider script error (e.g., login failed) |

#### Redirect After Proof Generation

**Success Redirect:**

```typescript
// Redirect to success page
reclaimProofRequest.setRedirectUrl('https://yourapp.com/verification/success');

// Or deep link to mobile app
reclaimProofRequest.setRedirectUrl('yourapp://verification-complete');
```

**Cancel Redirect:**

```typescript
reclaimProofRequest.setCancelRedirectUrl('https://yourapp.com/verification/cancelled');
```

#### Set Expected Parameters

If you know what value to expect (e.g., specific tracking number):

```typescript
reclaimProofRequest.setParams({
  trackingNumber: '889260101279'
});
```

Proof generation fails if extracted value doesn't match.

#### Customize UI Theme

```typescript
const proofRequest = await ReclaimProofRequest.init(
  APP_ID,
  APP_SECRET,
  PROVIDER_ID,
  {
    metadata: { theme: 'dark' },
    preferredLocale: 'en-US'
  }
);
```

---

## Step 2: Frontend - User Generates Proof

### Quickstart

**Get proof request from backend:**

```typescript
const response = await fetch('/api/reclaim/config');
const { proofRequest } = await response.json();
```

**Convert to ReclaimProofRequest:**

```typescript
const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(proofRequest);
```

**Trigger proof generation:**

```typescript
await reclaimProofRequest.triggerReclaimFlow();
```

This automatically:
- Shows QR code on desktop (user scans with phone)
- Opens tracking page on mobile
- Uses browser extension if available

**Listen for completion:**

```typescript
await reclaimProofRequest.startSession({
  onSuccess: (proofs) => {
    // Upload proofs to backend for verification
    await fetch('/api/reclaim/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proofs)
    });
  },
  onError: (err) => {
    console.error('Proof generation failed:', err);
  }
});
```

⚠️ **Important:** Always verify proofs on backend! Client-side verification is not secure.

### React Hook Example

```typescript
// hooks/useReclaim.ts
import { useState, useCallback } from 'react';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

export function useReclaim() {
  const [proofs, setProofs] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const startVerification = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch config from backend
      const response = await fetch('/api/reclaim/config');
      const { proofRequest } = await response.json();

      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
        proofRequest
      );

      await reclaimProofRequest.triggerReclaimFlow();

      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          setProofs(proofs);

          // Upload to backend for verification
          await fetch('/api/reclaim/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proofs)
          });

          setIsLoading(false);
        },
        onError: (err) => {
          setError(err.message);
          setIsLoading(false);
        }
      });
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  return { proofs, isLoading, error, startVerification };
}
```

**Usage in component:**

```tsx
// components/DeliveryVerification.tsx
import { useReclaim } from '../hooks/useReclaim';

export function DeliveryVerification() {
  const { proofs, isLoading, error, startVerification } = useReclaim();

  return (
    <div>
      <h1>Verify Package Delivery</h1>
      <button onClick={startVerification} disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify Delivery & Release Payment'}
      </button>
      {error && <p className="error">{error}</p>}
      {proofs && <p className="success">✓ Delivery verified! Payment released.</p>}
    </div>
  );
}
```

### Advanced Options

#### Custom UI

Get verification URL instead of using built-in UI:

```typescript
const requestUrl = await reclaimProofRequest.getRequestUrl();
// Display QR code with your own UI
```

#### Check for Browser Extension

```typescript
const hasExtension = await reclaimProofRequest.isBrowserExtensionAvailable();
if (hasExtension) {
  // Use extension (best UX)
  reclaimProofRequest.triggerReclaimFlow();
} else {
  // Show QR code or other flow
}
```

#### Show Progress

```typescript
const statusUrl = reclaimProofRequest.getStatusUrl();
// Poll this URL to show verification progress
```

#### Customize Modal UI

```typescript
await reclaimProofRequest.triggerReclaimFlow({
  theme: 'dark',
  modalTitle: 'Verify Package Delivery',
  modalSubtitle: 'Scan QR code with your phone',
  autoCloseModal: true,
  autoCloseDelay: 3000,
  showExtensionPrompt: true,
  onModalOpen: () => console.log('Modal opened'),
  onModalClose: () => console.log('Modal closed')
});
```

---

## Step 3: Backend - Verifying the Proof

### Why Verify on Backend?

⚠️ **Critical:** Proof generation is client-side. Malicious users can bypass frontend checks. **Always verify proofs on your backend.**

Verification is lightweight - just verifying digital signatures.

### Quickstart

**Setup callback endpoint:**

```typescript
// app/api/reclaim/verify/route.ts
import { NextResponse } from 'next/server';
import { verifyProof } from '@reclaimprotocol/js-sdk';

export async function POST(request) {
  try {
    // Parse proof from request body
    const proofs = await request.json();

    // Verify cryptographic signatures
    const isValid = await verifyProof(proofs);

    if (!isValid) {
      return NextResponse.json({
        success: false,
        message: 'Proof verification failed'
      }, { status: 400 });
    }

    // Extract context and parameters
    const proof = proofs[0];
    const context = JSON.parse(proof.claimData.context);
    const { contextAddress, contextMessage, extractedParameters } = context;

    // Validate proof matches expectations
    const deliveryStatus = extractedParameters.deliveryStatus;

    if (deliveryStatus !== 'Delivered') {
      return NextResponse.json({
        success: false,
        message: 'Package not delivered yet'
      }, { status: 400 });
    }

    // TODO: Send to smart contract for payment release
    // const txHash = await releasePayment(contextAddress, proof);

    return NextResponse.json({
      success: true,
      message: 'Proof verified and payment released',
      deliveryStatus,
      userAddress: contextAddress
    });

  } catch (error) {
    console.error('Proof verification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Proof verification failed'
    }, { status: 500 });
  }
}
```

### Extract Data from Proof

**Context:**

```typescript
const { contextAddress, contextMessage } = JSON.parse(proofs[0].claimData.context);
```

**Extracted Parameters:**

```typescript
const { extractedParameters } = JSON.parse(proofs[0].claimData.context);

// Example extracted data
const {
  deliveryStatus,    // "Delivered"
  trackingNumber,    // "889260101279"
  deliveryDate,      // "2026-03-05"
  carrier            // "FedEx"
} = extractedParameters;
```

### Proof Structure

```typescript
{
  "identifier": "0x...",
  "claimData": {
    "provider": "fedex-tracking-custom",
    "parameters": "...",
    "owner": "0x...",
    "timestampS": 1709668236,
    "context": "{
      \"contextAddress\": \"0x742d35Cc...\",
      \"contextMessage\": \"order-12345\",
      \"extractedParameters\": {
        \"deliveryStatus\": \"Delivered\",
        \"trackingNumber\": \"889260101279\"
      },
      \"providerHash\": \"0x...\"
    }",
    "identifier": "...",
    "epoch": 1
  },
  "signatures": ["0x..."],
  "witnesses": [
    {
      "id": "...",
      "url": "https://witness.reclaimprotocol.org"
    }
  ],
  "taskId": "...",
  "publicData": "{}"
}
```

---

## Custom Provider Setup

### Why Custom Provider?

Pre-built providers exist for common services (GitHub, Twitter, Uber), but **package tracking requires a custom provider** since carriers don't have official Reclaim providers.

### Creating FedEx Tracking Provider

1. **Go to** [Reclaim DevTool](https://dev.reclaimprotocol.org/)
2. **Click** "Create Custom Provider"
3. **Configure:**

#### Basic Settings

- **Name:** "FedEx Package Tracking"
- **Description:** "Verify FedEx package delivery status"
- **Login URL:** `https://www.fedex.com/fedextrack/?trknbr={{trackingNumber}}`

#### Network Request Monitoring

**Option:** Monitor network requests (recommended over DOM scraping)

**Request URL Pattern:**
```
https://api.fedex.com/track/v2/shipments
```

This is the API call FedEx's tracking page makes to get delivery data.

#### Variable Extraction

Define what data to extract from the API response:

**Variable 1: Delivery Status**
- **Variable Name:** `deliveryStatus`
- **JsonPath:** `$.output.completeTrackResults[0].trackResults[0].latestStatusDetail.description`
- **Match Type:** `contains`
- **Match Value:** `Delivered`

**Variable 2: Tracking Number** (optional)
- **Variable Name:** `trackingNumber`
- **JsonPath:** `$.output.completeTrackResults[0].trackResults[0].trackingNumber`

**Variable 3: Delivery Date** (optional)
- **Variable Name:** `deliveryDate`
- **JsonPath:** `$.output.completeTrackResults[0].trackResults[0].deliveryDetails.actualDeliveryTimestamp`

#### Advanced Settings

**Write Redaction Mode:** `ZK` (Zero-Knowledge)
- Hides sensitive auth headers/cookies
- Still proves request was made to FedEx
- Recommended for privacy

**Credentials:** `include`
- Sends browser cookies with request
- FedEx API needs session cookies to return data
- Required for tracking to work

**JS Injection:** Leave empty (not needed when monitoring API requests)

### Finding the Right JsonPath

1. Open FedEx tracking page in browser
2. Open DevTools (F12) → Network tab
3. Refresh page
4. Find request to `api.fedex.com/track/v2/shipments`
5. Click → Response tab
6. Find where "Delivered" appears in JSON
7. Use that path in JsonPath field

Example response structure:
```json
{
  "output": {
    "completeTrackResults": [
      {
        "trackResults": [
          {
            "trackingNumber": "889260101279",
            "latestStatusDetail": {
              "description": "Delivered"  // ← This is what we extract
            },
            "deliveryDetails": {
              "actualDeliveryTimestamp": "2026-03-05T14:30:00Z"
            }
          }
        ]
      }
    ]
  }
}
```

### Testing Your Provider

1. **Save provider** → Get PROVIDER_ID
2. **Update .env:**
   ```
   RECLAIM_PROVIDER_ID=your_fedex_provider_id
   ```
3. **Test with real tracking number**
4. **Verify proof** contains correct delivery status

---

## Smart Contract Integration

### Overview

Once proof is verified on backend, send it to your smart contract on Arbitrum testnet to release payment.

### Proof Format for Smart Contract

```typescript
import { Reclaim } from '@reclaimprotocol/js-sdk';

// Transform proof for on-chain use
const onchainProof = Reclaim.transformForOnchain(proofs[0]);
```

### Example Smart Contract Call

```typescript
import { ethers } from 'ethers';

async function releasePayment(proof: any, walletAddress: string) {
  const provider = new ethers.JsonRpcProvider('https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const contractAddress = '0x...'; // Your smart contract
  const contractABI = [...]; // Your contract ABI

  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  // Call smart contract function to release payment
  const tx = await contract.releasePaymentOnDelivery(
    proof,
    walletAddress
  );

  await tx.wait();
  return tx.hash;
}
```

### Smart Contract Interface (Solidity)

Your friend's smart contract should implement something like:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IReclaimVerifier {
    function verify(bytes memory proof) external view returns (bool);
}

contract PackagePaymentEscrow {
    IReclaimVerifier public reclaimVerifier;

    mapping(string => uint256) public escrowBalances;
    mapping(string => address) public exporters;

    function releasePaymentOnDelivery(
        bytes memory proof,
        string memory trackingNumber
    ) public {
        // Verify proof using Reclaim verifier
        require(
            reclaimVerifier.verify(proof),
            "Invalid delivery proof"
        );

        // Extract delivery status from proof
        // (proof structure depends on Reclaim SDK format)

        // Release payment to exporter
        address exporter = exporters[trackingNumber];
        uint256 amount = escrowBalances[trackingNumber];

        require(amount > 0, "No escrow balance");

        // Transfer stablecoins
        IERC20(stablecoinAddress).transfer(exporter, amount);

        escrowBalances[trackingNumber] = 0;
    }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Application not found"

**Problem:** Invalid `APP_ID` or `APP_SECRET`

**Solution:**
- Verify credentials from [DevTool](https://dev.reclaimprotocol.org/)
- Check .env file has correct values
- Ensure no extra spaces or quotes

#### 2. "Provider not found"

**Problem:** Invalid `PROVIDER_ID`

**Solution:**
- Check provider ID from DevTool
- Ensure custom provider is published
- Verify spelling/casing

#### 3. Proof verification fails

**Problem:** `verifyProof()` returns false

**Solution:**
- Check proof structure is correct
- Ensure proof hasn't been modified
- Verify network connection
- Check Reclaim service status

#### 4. "Response does not contain expected value"

**Problem:** JsonPath doesn't match API response

**Solution:**
- Inspect actual API response in DevTools
- Verify JsonPath syntax
- Check if API response structure changed
- Test with different tracking numbers

#### 5. WAF blocking requests

**Problem:** "You don't have permission to view this webpage"

**Solution:**
- ✅ Using JavaScript SDK (user's browser = not blocked)
- ❌ Don't use zkFetch for carrier websites

#### 6. Empty `extractedParameters`

**Problem:** Proof generated but no data extracted

**Solution:**
- Check JsonPath is correct
- Verify API request URL pattern matches
- Ensure credentials setting is `include`
- Check if JS injection is needed

### Getting Help

- **Documentation:** https://docs.reclaimprotocol.org/
- **DevTool:** https://dev.reclaimprotocol.org/
- **Discord:** [Reclaim Protocol Discord]
- **GitHub Issues:** https://github.com/reclaimprotocol/

---

## Best Practices

### Security

1. ✅ **Always verify proofs on backend** (never trust client)
2. ✅ **Use ZK write redaction** for privacy
3. ✅ **Validate extracted parameters** match expectations
4. ✅ **Use HTTPS** for all callbacks
5. ✅ **Store APP_SECRET securely** (environment variables, never commit)

### UX

1. ✅ **Show clear instructions** to users
2. ✅ **Handle errors gracefully** with user-friendly messages
3. ✅ **Use redirect URLs** for smooth flow
4. ✅ **Show progress indicators** during verification
5. ✅ **Auto-close modals** after success

### Performance

1. ✅ **Cache proof requests** (valid for session)
2. ✅ **Use backend callbacks** instead of polling
3. ✅ **Implement timeouts** for verification
4. ✅ **Rate limit API endpoints**

### Testing

1. ✅ **Test with multiple carriers** (if supporting more than one)
2. ✅ **Test on different devices** (desktop, mobile, tablet)
3. ✅ **Test different browsers** (Chrome, Safari, Firefox)
4. ✅ **Test network failures** and timeouts
5. ✅ **Test with invalid/old tracking numbers**

---

## Next Steps

1. ✅ **Set up Reclaim account** and get credentials
2. ✅ **Create custom FedEx provider** (or other carriers)
3. ✅ **Build simple React frontend** with proof generation
4. ✅ **Implement backend verification** endpoint
5. ✅ **Integrate with smart contract** (coordinate with blockchain dev)
6. ✅ **Test end-to-end flow** on Arbitrum testnet
7. ✅ **Deploy to production** when ready

---

## Additional Resources

- **Reclaim Protocol Docs:** https://docs.reclaimprotocol.org/
- **JavaScript SDK Reference:** https://docs.reclaimprotocol.org/js-sdk
- **Provider List:** https://providers.reclaimprotocol.org/
- **DevTool:** https://dev.reclaimprotocol.org/
- **Example Projects:** https://github.com/reclaimprotocol/examples

---

**Last Updated:** 2026-03-05
**Version:** 1.0.0
