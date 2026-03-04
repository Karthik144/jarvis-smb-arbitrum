# zkTLS Package Tracking Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Node.js script that uses Reclaim Protocol's zkFetch to cryptographically prove Amazon package delivery status and generate blockchain-compatible proofs.

**Architecture:** Single TypeScript script that fetches Amazon tracking data via zkFetch, verifies the proof off-chain, transforms it for on-chain use, and outputs to JSON file. No database, no frontend - pure proof-of-concept.

**Tech Stack:** Node.js, TypeScript, Reclaim Protocol (zkFetch + js-sdk), dotenv

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Initialize Node.js project**

Run: `npm init -y`

Expected: Creates `package.json`

**Step 2: Install dependencies**

```bash
npm install @reclaimprotocol/zk-fetch @reclaimprotocol/js-sdk dotenv
npm install -D typescript @types/node ts-node
```

Expected: Dependencies installed, `package-lock.json` created

**Step 3: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
.env
output/
*.log
.DS_Store
```

**Step 5: Create .env.example**

Create `.env.example`:

```
RECLAIM_APP_ID=your_app_id_here
RECLAIM_APP_SECRET=your_app_secret_here
TRACKING_NUMBER=TBA326330626265
```

**Step 6: Add scripts to package.json**

Modify `package.json` to add:

```json
{
  "scripts": {
    "start": "ts-node src/index.ts",
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  }
}
```

**Step 7: Create directory structure**

Run: `mkdir -p src output`

Expected: Directories created

**Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore .env.example
git commit -m "feat: initialize Node.js project with TypeScript

Set up project structure with Reclaim Protocol dependencies,
TypeScript configuration, and environment variable template.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Environment Configuration Module

**Files:**
- Create: `src/config.ts`

**Step 1: Write configuration loader**

Create `src/config.ts`:

```typescript
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  reclaimAppId: string;
  reclaimAppSecret: string;
  trackingNumber: string;
}

export function loadConfig(): Config {
  const reclaimAppId = process.env.RECLAIM_APP_ID;
  const reclaimAppSecret = process.env.RECLAIM_APP_SECRET;
  const trackingNumber = process.env.TRACKING_NUMBER;

  if (!reclaimAppId) {
    throw new Error('RECLAIM_APP_ID is required in .env file');
  }

  if (!reclaimAppSecret) {
    throw new Error('RECLAIM_APP_SECRET is required in .env file');
  }

  if (!trackingNumber) {
    throw new Error('TRACKING_NUMBER is required in .env file');
  }

  return {
    reclaimAppId,
    reclaimAppSecret,
    trackingNumber,
  };
}
```

**Step 2: Verify module compiles**

Run: `npx tsc --noEmit`

Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: add environment configuration loader

Loads and validates required environment variables for Reclaim
Protocol authentication and tracking number.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: zkFetch Integration

**Files:**
- Create: `src/zkfetch.ts`

**Step 1: Write zkFetch wrapper**

Create `src/zkfetch.ts`:

```typescript
import { ReclaimClient } from '@reclaimprotocol/zk-fetch';

interface ZkFetchOptions {
  appId: string;
  appSecret: string;
  trackingNumber: string;
}

export async function fetchTrackingProof(options: ZkFetchOptions) {
  const { appId, appSecret, trackingNumber } = options;

  console.log(`Initializing Reclaim client...`);
  const client = new ReclaimClient(appId, appSecret);

  const url = `https://track.amazon.com/tracking/${trackingNumber}`;
  console.log(`Fetching tracking data from: ${url}`);

  const publicOptions = {
    method: 'GET',
    headers: {
      accept: 'text/html, */*',
    },
  };

  const privateOptions = {
    responseMatches: [
      {
        type: 'contains' as const,
        value: 'Delivered',
      },
    ],
  };

  console.log('Executing zkFetch...');
  const proof = await client.zkFetch(url, publicOptions, privateOptions);

  console.log('zkFetch completed successfully');
  return proof;
}
```

**Step 2: Verify module compiles**

Run: `npx tsc --noEmit`

Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/zkfetch.ts
git commit -m "feat: add zkFetch wrapper for Amazon tracking

Implements zkFetch call to Amazon tracking page with proof
generation for 'Delivered' status.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Proof Verification Module

**Files:**
- Create: `src/verify.ts`

**Step 1: Write proof verification function**

Create `src/verify.ts`:

```typescript
import { Reclaim } from '@reclaimprotocol/js-sdk';

export async function verifyProof(proof: any): Promise<boolean> {
  console.log('Verifying proof signature...');

  try {
    const isValid = await Reclaim.verifySignedProof(proof);

    if (isValid) {
      console.log('✓ Proof verification successful');
    } else {
      console.log('✗ Proof verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('Error during proof verification:', error);
    return false;
  }
}

export function transformProofForOnchain(proof: any): any {
  console.log('Transforming proof for on-chain use...');

  const onchainProof = Reclaim.transformForOnchain(proof);

  console.log('✓ Proof transformed for blockchain');
  return onchainProof;
}
```

**Step 2: Verify module compiles**

Run: `npx tsc --noEmit`

Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/verify.ts
git commit -m "feat: add proof verification and transformation

Implements off-chain proof verification and on-chain transformation
using Reclaim Protocol SDK.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Output Module

**Files:**
- Create: `src/output.ts`

**Step 1: Write output functions**

Create `src/output.ts`:

```typescript
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'output';
const OUTPUT_FILE = 'proof-output.json';

export function saveProofToFile(proof: any): void {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);

  console.log(`Saving proof to ${outputPath}...`);

  try {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(proof, null, 2),
      'utf-8'
    );

    console.log(`✓ Proof saved successfully to ${outputPath}`);
  } catch (error) {
    console.error('Error saving proof to file:', error);
    throw error;
  }
}

export function displayProofSummary(proof: any): void {
  console.log('\n' + '='.repeat(60));
  console.log('PROOF SUMMARY');
  console.log('='.repeat(60));

  // Display key proof information
  if (proof.identifier) {
    console.log(`Identifier: ${proof.identifier}`);
  }

  if (proof.claimData) {
    console.log(`Claim Data: ${JSON.stringify(proof.claimData, null, 2)}`);
  }

  if (proof.signatures) {
    console.log(`Signatures: ${proof.signatures.length} signature(s) included`);
  }

  console.log('='.repeat(60) + '\n');
}
```

**Step 2: Verify module compiles**

Run: `npx tsc --noEmit`

Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/output.ts
git commit -m "feat: add proof output and display functions

Implements file saving and console display for generated proofs.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Main Application Entry Point

**Files:**
- Create: `src/index.ts`

**Step 1: Write main application logic**

Create `src/index.ts`:

```typescript
import { loadConfig } from './config';
import { fetchTrackingProof } from './zkfetch';
import { verifyProof, transformProofForOnchain } from './verify';
import { saveProofToFile, displayProofSummary } from './output';

async function main() {
  console.log('='.repeat(60));
  console.log('zkTLS Package Tracking Verification');
  console.log('='.repeat(60) + '\n');

  try {
    // Load configuration
    console.log('Step 1: Loading configuration...');
    const config = loadConfig();
    console.log('✓ Configuration loaded\n');

    // Fetch tracking proof
    console.log('Step 2: Fetching tracking proof via zkFetch...');
    const proof = await fetchTrackingProof({
      appId: config.reclaimAppId,
      appSecret: config.reclaimAppSecret,
      trackingNumber: config.trackingNumber,
    });
    console.log('✓ Proof generated\n');

    // Verify proof
    console.log('Step 3: Verifying proof...');
    const isValid = await verifyProof(proof);

    if (!isValid) {
      console.error('✗ Proof verification failed. Exiting.');
      process.exit(1);
    }
    console.log();

    // Transform for on-chain
    console.log('Step 4: Transforming proof for blockchain...');
    const onchainProof = transformProofForOnchain(proof);
    console.log();

    // Display summary
    console.log('Step 5: Displaying proof summary...');
    displayProofSummary(onchainProof);

    // Save to file
    console.log('Step 6: Saving proof to file...');
    saveProofToFile(onchainProof);
    console.log();

    console.log('='.repeat(60));
    console.log('SUCCESS: Proof generation complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Check output/proof-output.json for the proof');
    console.log('2. Share this proof with your smart contract developer');
    console.log('3. The proof can be verified on-chain using Reclaim Protocol');
    console.log();

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('ERROR: Application failed');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Run the application
main();
```

**Step 2: Verify module compiles**

Run: `npx tsc --noEmit`

Expected: No compilation errors

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add main application entry point

Orchestrates the complete flow: config loading, zkFetch, proof
verification, transformation, and output.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Documentation

**Files:**
- Create: `README.md`

**Step 1: Write comprehensive README**

Create `README.md`:

```markdown
# zkTLS Package Tracking Verification

Proof-of-concept script that uses Reclaim Protocol's zkFetch to cryptographically prove Amazon package delivery status and generate blockchain-compatible proofs.

## Overview

This script demonstrates how zkTLS (zero-knowledge Transport Layer Security) can be used to verify package delivery without requiring API access or exposing sensitive session data. It generates cryptographic proofs that can be verified on-chain.

## Use Case

When an importer receives goods, they need to trigger stablecoin payment to the exporter. This script proves that a package was delivered by:

1. Fetching Amazon tracking data via zkFetch
2. Generating a cryptographic proof of the response
3. Verifying the proof off-chain
4. Transforming the proof for on-chain verification
5. Outputting the proof for smart contract integration

## Prerequisites

- Node.js 18+
- npm or yarn
- Reclaim Protocol credentials (APP_ID and APP_SECRET)
- Amazon tracking number

## Setup

1. **Clone the repository**

```bash
git clone <repo-url>
cd jarvis-smb-arbitrum
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```
RECLAIM_APP_ID=your_app_id_here
RECLAIM_APP_SECRET=your_app_secret_here
TRACKING_NUMBER=TBA326330626265
```

**Getting Reclaim credentials:**
- Visit [Reclaim Protocol](https://dev.reclaimprotocol.org/)
- Sign up for a developer account
- Create a new application
- Copy your APP_ID and APP_SECRET

4. **Run the script**

```bash
npm start
```

## Output

The script will:
- Display progress in the console
- Verify the proof signature
- Save the on-chain proof to `output/proof-output.json`

Example output:

```
============================================================
zkTLS Package Tracking Verification
============================================================

Step 1: Loading configuration...
✓ Configuration loaded

Step 2: Fetching tracking proof via zkFetch...
Initializing Reclaim client...
Fetching tracking data from: https://track.amazon.com/tracking/TBA326330626265
Executing zkFetch...
zkFetch completed successfully
✓ Proof generated

Step 3: Verifying proof...
Verifying proof signature...
✓ Proof verification successful

Step 4: Transforming proof for blockchain...
Transforming proof for on-chain use...
✓ Proof transformed for blockchain

Step 5: Displaying proof summary...
[Proof details...]

Step 6: Saving proof to file...
Saving proof to output/proof-output.json...
✓ Proof saved successfully

============================================================
SUCCESS: Proof generation complete!
============================================================

Next steps:
1. Check output/proof-output.json for the proof
2. Share this proof with your smart contract developer
3. The proof can be verified on-chain using Reclaim Protocol
```

## Project Structure

```
jarvis-smb-arbitrum/
├── src/
│   ├── index.ts       # Main application entry point
│   ├── config.ts      # Environment configuration
│   ├── zkfetch.ts     # zkFetch integration
│   ├── verify.ts      # Proof verification and transformation
│   └── output.ts      # File output and display
├── output/
│   └── proof-output.json  # Generated proof (gitignored)
├── docs/
│   └── plans/         # Design and implementation docs
├── .env               # Environment variables (gitignored)
├── .env.example       # Environment template
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## How It Works

### zkFetch

The script uses Reclaim Protocol's zkFetch to:
- Make a TLS request to Amazon's tracking page
- Generate a zero-knowledge proof of the response
- Prove that "Delivered" appears in the response without revealing session data

### Proof Verification

The proof is verified off-chain using `Reclaim.verifySignedProof()` to ensure:
- The proof signature is valid
- The data hasn't been tampered with
- The proof was generated by Reclaim Protocol

### On-Chain Transformation

The proof is transformed into a format suitable for blockchain verification using `Reclaim.transformForOnchain()`. This format can be passed to a smart contract for on-chain verification.

## Next Steps

### Smart Contract Integration

The generated proof in `output/proof-output.json` can be used with a smart contract that:

1. Accepts the proof as input
2. Verifies the proof on-chain using Reclaim's verifier contract
3. Triggers payment release if proof is valid

Example smart contract flow (to be implemented):

```solidity
function releasePaymentOnDelivery(bytes memory proof) public {
    bool isValid = reclaimVerifier.verify(proof);
    require(isValid, "Invalid delivery proof");

    // Release stablecoins to exporter
    stablecoin.transfer(exporter, amount);
}
```

### Future Enhancements

- Add support for multiple carriers (UPS, FedEx, DHL)
- Implement automated checking via GitHub Actions
- Add frontend UI for manual verification
- Store tracking numbers in database
- Integrate directly with smart contract
- Add comprehensive error handling and retries

## Troubleshooting

**Error: "RECLAIM_APP_ID is required"**
- Make sure you've created a `.env` file with your credentials

**Error: "zkFetch failed"**
- Check your internet connection
- Verify the tracking number is valid
- Ensure Reclaim Protocol service is available

**Error: "Proof verification failed"**
- The proof signature is invalid
- Try generating a new proof
- Contact Reclaim Protocol support

## Resources

- [Reclaim Protocol Documentation](https://docs.reclaimprotocol.org/)
- [zkFetch SDK](https://github.com/reclaimprotocol/zk-fetch)
- [Design Document](./docs/plans/2026-03-03-zktls-tracking-verification-design.md)

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README

Includes setup instructions, usage guide, project structure,
troubleshooting, and next steps for smart contract integration.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Testing & Validation

**Files:**
- Modify: `.env` (user creates this from .env.example)

**Step 1: Create .env file**

Run: `cp .env.example .env`

Then manually edit `.env` to add real Reclaim credentials.

**Step 2: Run the script**

Run: `npm start`

Expected output:
- Configuration loads successfully
- zkFetch executes without errors
- Proof verification returns `true`
- Proof is transformed for on-chain use
- File is saved to `output/proof-output.json`
- Console displays success message

**Step 3: Verify output file exists**

Run: `cat output/proof-output.json | head -20`

Expected: JSON file with proof data

**Step 4: Test with invalid tracking number (optional)**

Edit `.env` to use tracking number: `INVALID123`

Run: `npm start`

Expected: Script should handle gracefully (may fail at zkFetch or verification step)

**Step 5: Document any issues found**

If errors occur, document them and fix as needed.

---

## Implementation Complete

After completing all tasks, the MVP will:

✓ Fetch Amazon tracking data via zkFetch
✓ Generate cryptographic proof of "Delivered" status
✓ Verify proof signature off-chain
✓ Transform proof for blockchain compatibility
✓ Output proof to console and JSON file
✓ Provide clear error messages
✓ Include comprehensive documentation

The generated `output/proof-output.json` can be shared with the smart contract developer for integration.

---

## Notes

- **Testing:** This MVP uses manual testing. Automated tests can be added later.
- **Error Handling:** Basic error handling is included. Production use would need more robust retry logic.
- **Carriers:** Currently Amazon only. Expanding to UPS/FedEx requires minimal code changes.
- **Automation:** GitHub Actions scheduling can be added in future iterations.
- **Smart Contract:** Integration with Arbitrum testnet is the next phase after this MVP.
