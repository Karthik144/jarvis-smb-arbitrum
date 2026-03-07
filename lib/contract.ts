import { ethers } from 'ethers';

export const FEDEX_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!;
export const INVOICE_FACTORING_ADDRESS = '0x207CaC4B8B14Ef28a962B419959AA23fF94c2191';
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
export const USAT_MOCK_ROBINHOOD = '0x026671bE3F475c9003fc0eBc3d77e9FA44dA5f55';
export const USDC_DECIMALS = 6;

export const FEDEX_ESCROW_ABI = [
  {
    name: 'createEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentId', type: 'bytes32' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'upfrontPct', type: 'uint8' },
      { name: 'seller', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'releasePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentId', type: 'bytes32' },
      {
        name: 'proof',
        type: 'tuple',
        components: [
          {
            name: 'claimInfo',
            type: 'tuple',
            components: [
              { name: 'provider', type: 'string' },
              { name: 'parameters', type: 'string' },
              { name: 'context', type: 'string' },
            ],
          },
          {
            name: 'signedClaim',
            type: 'tuple',
            components: [
              {
                name: 'claim',
                type: 'tuple',
                components: [
                  { name: 'identifier', type: 'bytes32' },
                  { name: 'owner', type: 'address' },
                  { name: 'timestampS', type: 'uint32' },
                  { name: 'epoch', type: 'uint32' },
                ],
              },
              { name: 'signatures', type: 'bytes[]' },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'cancelEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'getEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'buyer', type: 'address' },
          { name: 'seller', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'remainingAmount', type: 'uint256' },
          { name: 'upfrontPct', type: 'uint8' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
] as const;

export const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/** Converts a UUID string to the bytes32 paymentId used on-chain. */
export function toPaymentId(uuid: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(uuid));
}

/** Converts a human-readable USDC amount (e.g. 5000) to raw 6-decimal units. */
export function parseUSDC(amount: number): bigint {
  return ethers.parseUnits(amount.toString(), USDC_DECIMALS);
}

/**
 * Transforms a Reclaim JS SDK proof object into the Solidity Reclaim.Proof
 * tuple that ethers.js encodes when calling releasePayment.
 */
export function transformProofForChain(proof: any) {
  return {
    claimInfo: {
      provider: proof.claimData.provider,
      parameters: proof.claimData.parameters,
      context: proof.claimData.context,
    },
    signedClaim: {
      claim: {
        identifier: proof.claimData.identifier,
        owner: proof.claimData.owner,
        timestampS: proof.claimData.timestampS,
        epoch: proof.claimData.epoch,
      },
      signatures: proof.signatures,
    },
  };
}

/**
 * Approves USDC spend and calls createEscrow on the FedExEscrow contract.
 * Returns the transaction hash.
 */
export async function createEscrow(
  signer: ethers.Signer,
  params: {
    paymentId: string;    // Supabase UUID — converted to bytes32 internally
    totalAmountUSD: number;
    upfrontPct: number;
    seller: string;
  }
): Promise<string> {
  const rawAmount = parseUSDC(params.totalAmountUSD);
  const paymentId = toPaymentId(params.paymentId);

  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
  const approveTx = await usdc.approve(FEDEX_ESCROW_ADDRESS, rawAmount);
  await approveTx.wait();

  const escrow = new ethers.Contract(FEDEX_ESCROW_ADDRESS, FEDEX_ESCROW_ABI, signer);
  const tx = await escrow.createEscrow(paymentId, rawAmount, params.upfrontPct, params.seller);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Transforms the Reclaim proof and calls releasePayment on the FedExEscrow contract.
 * Returns the transaction hash.
 */
export async function releasePayment(
  signer: ethers.Signer,
  params: {
    paymentId: string;  // Supabase UUID — converted to bytes32 internally
    proof: any;
  }
): Promise<string> {
  const paymentId = toPaymentId(params.paymentId);
  const onChainProof = transformProofForChain(params.proof);

  console.log('[releasePayment] raw proof:', JSON.stringify(params.proof, null, 2));
  console.log('[releasePayment] paymentId (bytes32):', paymentId);
  console.log('[releasePayment] onChainProof:', JSON.stringify(onChainProof, null, 2));

  const escrow = new ethers.Contract(FEDEX_ESCROW_ADDRESS, FEDEX_ESCROW_ABI, signer);
  const tx = await escrow.releasePayment(paymentId, onChainProof);
  const receipt = await tx.wait();
  return receipt.hash;
}

// InvoiceFactoring Contract
export const INVOICE_FACTORING_ABI = [
  {
    name: 'createOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'discountRate', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'offerId', type: 'uint256' }],
  },
  {
    name: 'cancelOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'offerId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawFromOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'offerId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getOffer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'offerId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'lender', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'availableAmount', type: 'uint256' },
          { name: 'discountRate', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getLenderOffers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'lender', type: 'address' }],
    outputs: [{ type: 'uint256[]' }],
  },
] as const;

/**
 * Creates a lending offer on the InvoiceFactoring contract.
 * Returns the offer ID and transaction hash.
 */
export async function createLendingOffer(
  signer: ethers.Signer,
  params: {
    discountRate: number; // 5 or 10
    amountUSD: number;
  }
): Promise<{ offerId: string; txHash: string }> {
  const rawAmount = parseUSDC(params.amountUSD);
  const signerAddress = await signer.getAddress();

  console.log('[createLendingOffer] Starting...');
  console.log('[createLendingOffer] Signer address:', signerAddress);
  console.log('[createLendingOffer] Discount rate:', params.discountRate);
  console.log('[createLendingOffer] Amount USD:', params.amountUSD);
  console.log('[createLendingOffer] Raw amount (with decimals):', rawAmount.toString());

  // Check network
  const provider = signer.provider;
  if (provider) {
    const network = await provider.getNetwork();
    console.log('[createLendingOffer] Network:', network.chainId.toString());
    if (network.chainId !== 46630n) {
      throw new Error(`Wrong network! Please switch to Robinhood Chain Testnet (chainId: 46630). Current: ${network.chainId}`);
    }
  }

  // Check USAT balance
  const usdc = new ethers.Contract(USAT_MOCK_ROBINHOOD, USDC_ABI, signer);
  const balance = await usdc.balanceOf(signerAddress);
  console.log('[createLendingOffer] USAT balance:', ethers.formatUnits(balance, USDC_DECIMALS));

  if (balance < rawAmount) {
    throw new Error(`Insufficient USAT balance. Need ${ethers.formatUnits(rawAmount, USDC_DECIMALS)} but have ${ethers.formatUnits(balance, USDC_DECIMALS)}`);
  }

  // Approve USAT spend
  console.log('[createLendingOffer] Approving USAT spend...');
  const approveTx = await usdc.approve(INVOICE_FACTORING_ADDRESS, rawAmount);
  console.log('[createLendingOffer] Approve tx sent:', approveTx.hash);
  await approveTx.wait();
  console.log('[createLendingOffer] Approve confirmed');

  // Verify allowance
  const allowance = await usdc.allowance(signerAddress, INVOICE_FACTORING_ADDRESS);
  console.log('[createLendingOffer] Allowance after approve:', ethers.formatUnits(allowance, USDC_DECIMALS));

  // Create offer
  console.log('[createLendingOffer] Creating offer...');
  const factoring = new ethers.Contract(INVOICE_FACTORING_ADDRESS, INVOICE_FACTORING_ABI, signer);

  // Try static call first to get revert reason if it fails
  try {
    await factoring.createOffer.staticCall(params.discountRate, rawAmount);
    console.log('[createLendingOffer] Static call succeeded, proceeding with transaction...');
  } catch (error: any) {
    console.error('[createLendingOffer] Static call failed:', error);
    throw new Error(`Contract call would fail: ${error.message || error.reason || 'Unknown error'}`);
  }

  const tx = await factoring.createOffer(params.discountRate, rawAmount);
  console.log('[createLendingOffer] CreateOffer tx sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('[createLendingOffer] CreateOffer confirmed');

  // Extract offerId from event logs
  const offerCreatedEvent = receipt.logs.find((log: any) => {
    try {
      const parsed = factoring.interface.parseLog(log);
      return parsed?.name === 'OfferCreated';
    } catch {
      return false;
    }
  });

  let offerId = '0';
  if (offerCreatedEvent) {
    const parsed = factoring.interface.parseLog(offerCreatedEvent);
    offerId = parsed?.args?.offerId?.toString() || '0';
  }

  console.log('[createLendingOffer] Offer ID:', offerId);
  return { offerId, txHash: receipt.hash };
}

/**
 * Withdraws funds from a lending offer.
 */
export async function withdrawFromLendingOffer(
  signer: ethers.Signer,
  params: {
    offerId: string;
    amountUSD: number;
  }
): Promise<string> {
  const rawAmount = parseUSDC(params.amountUSD);
  const factoring = new ethers.Contract(INVOICE_FACTORING_ADDRESS, INVOICE_FACTORING_ABI, signer);
  const tx = await factoring.withdrawFromOffer(params.offerId, rawAmount);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Gets lender offer details from the blockchain.
 */
export async function getLenderOffer(
  provider: ethers.Provider,
  offerId: string
): Promise<{
  lender: string;
  totalAmount: string;
  availableAmount: string;
  discountRate: number;
  active: boolean;
}> {
  const factoring = new ethers.Contract(INVOICE_FACTORING_ADDRESS, INVOICE_FACTORING_ABI, provider);
  const offer = await factoring.getOffer(offerId);
  return {
    lender: offer.lender,
    totalAmount: ethers.formatUnits(offer.totalAmount, USDC_DECIMALS),
    availableAmount: ethers.formatUnits(offer.availableAmount, USDC_DECIMALS),
    discountRate: Number(offer.discountRate),
    active: offer.active,
  };
}
