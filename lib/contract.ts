import { ethers } from 'ethers';

export const FEDEX_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS!;
export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
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

  const escrow = new ethers.Contract(FEDEX_ESCROW_ADDRESS, FEDEX_ESCROW_ABI, signer);
  const tx = await escrow.releasePayment(paymentId, onChainProof);
  const receipt = await tx.wait();
  return receipt.hash;
}
