"use server";

import { verifyProof } from "@reclaimprotocol/js-sdk";

/**
 * Verifies a Reclaim proof locally (cryptographic signature check).
 * Returns success + the proof object so the client can submit it on-chain.
 */
export async function verifyProofLocally(
  proofs: any[]
): Promise<{ success: boolean; message?: string; proof?: any }> {
  if (!proofs || proofs.length === 0) {
    return { success: false, message: "No proof data provided." };
  }

  const proof = proofs[0];

  try {
    const isValid = await verifyProof(proof);
    if (!isValid) {
      return { success: false, message: "Invalid cryptographic signature." };
    }
    return { success: true, proof };
  } catch (error: any) {
    return { success: false, message: error.message || "Proof verification failed." };
  }
}
