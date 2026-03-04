# zkTLS Package Tracking Verification - Design Document

**Date:** 2026-03-03
**Status:** Approved
**Target:** MVP - Proof of Concept

## Overview

Build a Node.js script that uses zkTLS (via Reclaim Protocol's zkFetch) to cryptographically prove that a package delivery status was confirmed on Amazon's tracking website. The script generates a blockchain-compatible proof that can later be integrated with a smart contract for automated payment release.

## Problem Statement

When an importer receives goods, they need to trigger stablecoin payment to the exporter. The current manual process lacks trust and automation. zkTLS allows cryptographic proof that a delivery occurred without exposing sensitive session data or requiring API access from carriers.

## Use Case

**Scenario:** Importer orders goods from exporter. When package is delivered, payment should be automatically released.

**MVP Goal:** Prove that zkTLS can verify Amazon delivery status and generate on-chain compatible proofs. The actual smart contract integration and payment logic will be handled by another team member.

## Architecture

```
[Amazon Tracking Page]
    ↓ (zkFetch)
[zkTLS Verification Script]
    ↓ (verify proof)
[Validated Proof]
    ↓ (transform for onchain)
[Onchain-Ready Proof]
    ↓ (save to file)
[proof-output.json]
```

### Flow
1. Initialize Reclaim client with credentials
2. Use zkFetch to fetch Amazon tracking data for test package (TBA326330626265)
3. Verify the proof signature off-chain
4. Transform the proof into blockchain-compatible format
5. Output proof to console and save to JSON file

## Components

### File Structure
```
jarvis-smb-arbitrum/
├── src/
│   └── index.ts           # Main script
├── output/
│   └── proof-output.json  # Generated proof (gitignored)
├── .env                   # Configuration (gitignored)
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── README.md              # Setup instructions
```

### Dependencies
- `@reclaimprotocol/zk-fetch` - zkFetch functionality
- `@reclaimprotocol/js-sdk` - Proof verification and transformation
- `typescript` + `ts-node` - TypeScript support
- `dotenv` - Environment variable management

### Configuration (.env)
```
RECLAIM_APP_ID=<your_app_id>
RECLAIM_APP_SECRET=<your_app_secret>
TRACKING_NUMBER=TBA326330626265
```

## Data Flow

### Step 1: Initialize Reclaim Client
```typescript
const client = new ReclaimClient(
  process.env.RECLAIM_APP_ID,
  process.env.RECLAIM_APP_SECRET
);
```

### Step 2: Fetch Amazon Tracking with zkFetch
```typescript
const publicOptions = {
  method: 'GET',
  headers: { accept: 'text/html, */*' }
};

const privateOptions = {
  responseMatches: [{
    type: 'contains',
    value: 'Delivered'  // Verify "Delivered" appears in response
  }]
};

const proof = await client.zkFetch(
  `https://track.amazon.com/tracking/${trackingNumber}`,
  publicOptions,
  privateOptions
);
```

### Step 3: Verify Proof Off-Chain
```typescript
const isValid = await Reclaim.verifySignedProof(proof);
console.log('Proof valid:', isValid);
```

### Step 4: Transform for On-Chain
```typescript
const onchainProof = Reclaim.transformForOnchain(proof);
```

### Step 5: Output Results
- Log proof details to console
- Save `onchainProof` to `output/proof-output.json`
- Display success message with file location

## Error Handling

The script handles common failure scenarios:

1. **Missing environment variables**
   - Check for required env vars at startup
   - Exit with clear error message if missing

2. **zkFetch failures**
   - Catch network errors or timeouts
   - Log error and exit gracefully

3. **Proof verification failures**
   - If `verifySignedProof()` returns false, log error
   - Don't proceed to transformation if verification fails

4. **File write errors**
   - Create `output/` directory if it doesn't exist
   - Handle file write permission issues

All errors logged to console with clear debugging messages.

## Testing Approach

Manual testing for MVP:

1. **Happy path**: Run script with valid tracking number → generates valid proof
2. **Verification test**: Confirm `isValid` is `true` in console output
3. **Output test**: Check `proof-output.json` exists and contains transformed proof
4. **Invalid tracking**: Try with fake tracking number → handles gracefully

Automated tests can be added in future iterations.

## Technology Choices

### Why Reclaim Protocol?
- zkFetch SDK simplifies zkTLS proof generation
- Built-in proof verification and blockchain transformation
- Good documentation and examples
- JavaScript/TypeScript support

### Why Amazon Tracking?
- Have real tracking number for testing (TBA326330626265)
- Publicly accessible (no authentication required)
- Proves concept equally well as UPS/FedEx
- Can expand to other carriers later

### Why Arbitrum Testnet?
- Low transaction fees
- Fast confirmation times
- EVM compatible
- Good for MVP testing

## MVP Scope

### In Scope
- zkFetch implementation for Amazon tracking
- Off-chain proof verification
- On-chain proof transformation
- Console and file output

### Out of Scope (Future Work)
- Smart contract integration (handled by team member)
- Actual blockchain transaction posting
- Payment logic
- Automated scheduling (GitHub Actions)
- Frontend UI
- Multiple carrier support
- Database/persistence
- Production deployment

## Success Criteria

MVP is successful when:
1. Script successfully fetches Amazon tracking data via zkFetch
2. Proof verification returns `true`
3. Transformed proof is generated and saved to file
4. Teammate can use the proof format for smart contract integration

## Next Steps

1. Set up Node.js/TypeScript project structure
2. Install Reclaim Protocol dependencies
3. Implement zkFetch logic
4. Add proof verification and transformation
5. Test with real Amazon tracking number
6. Document usage in README
7. Share proof format with smart contract developer

## Future Enhancements

- Add GitHub Actions for scheduled checking
- Support multiple carriers (UPS, FedEx, DHL)
- Integrate with smart contract for actual payment triggers
- Add frontend for manual verification
- Store tracking numbers in JSON/database
- Add comprehensive error handling and retries
- Implement logging and monitoring
