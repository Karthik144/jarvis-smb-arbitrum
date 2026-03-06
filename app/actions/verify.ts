"use server";

import { verifyProof } from "@reclaimprotocol/js-sdk";

export async function submitProofToChain(proofs: any[]) {
  if (!proofs || proofs.length === 0) {
    return { success: false, message: "No proof data provided." };
  }

  const proof = proofs[0];

  try {
    const isLocalValid = await verifyProof(proof);

    if (!isLocalValid) {
      console.error("Local proof verification failed.");
      return { success: false, message: "Invalid cryptographic signature." };
    }

    const context = JSON.parse(proof.claimData.context);
    const extractedData = context.extractedParameters;

    console.log("--- Verification Payload ---");
    console.log("Verified Data:", extractedData);

    console.log(
      "Simulating contract call: verifyAndRelease(proof, amount, percent)..."
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const fakeTxHash =
      "0x" + Math.random().toString(16).substring(2, 42).padEnd(40, "0");

    return {
      success: true,
      data: {
        verifiedData: extractedData,
      },
      txHash: fakeTxHash,
    };
  } catch (error: any) {
    console.error("Server action execution error:", error);
    return {
      success: false,
      message:
        "Failed to process secure verification. Please check server logs.",
    };
  }
}
