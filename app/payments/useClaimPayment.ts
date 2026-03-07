"use client";

import { useState, useCallback } from "react";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { getReclaimConfig } from "@/app/actions/config";
import { verifyProofLocally } from "@/app/actions/verify";
import { releasePayment } from "@/lib/contract";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { Payment } from "@/lib/types";

export type ClaimState = "idle" | "scanning" | "verifying" | "submitting" | "done" | "error";

export function useClaimPayment() {
  const { wallets } = useWallets();
  const [state, setState] = useState<ClaimState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claimPayment = useCallback(
    async (payment: Payment) => {
      setState("scanning");
      setError(null);
      setTxHash(null);

      try {
        const wallet = wallets.find((w) => w.walletClientType === "privy");
        if (!wallet) throw new Error("No wallet connected. Please log in again.");

        // Ensure we're on Arbitrum Sepolia for the FedExEscrow contract
        await wallet.switchChain(421614);
        const switchCheckProvider = new ethers.BrowserProvider(await wallet.getEthereumProvider());
        const switchedNetwork = await switchCheckProvider.getNetwork();
        if (Number(switchedNetwork.chainId) !== 421614) {
          throw new Error(`Chain switch failed. Expected Arbitrum Sepolia (421614), got ${switchedNetwork.chainId}. Please switch manually and try again.`);
        }

        const jsonRequest = await getReclaimConfig();
        const reclaimReq = await ReclaimProofRequest.fromJsonString(jsonRequest);
        await reclaimReq.triggerReclaimFlow();

        await reclaimReq.startSession({
          onSuccess: async (receivedProofs) => {
            try {
              setState("verifying");

              const proofList = Array.isArray(receivedProofs)
                ? receivedProofs
                : [receivedProofs];
              if (!proofList.length) throw new Error("No proof returned.");

              // Verify proof signature server-side before submitting on-chain
              const verification = await verifyProofLocally(proofList);
              if (!verification.success) {
                throw new Error(verification.message || "Proof verification failed.");
              }

              setState("submitting");

              // Get ethers signer from Privy embedded wallet
              const provider = await wallet.getEthereumProvider();
              const ethersProvider = new ethers.BrowserProvider(provider);
              const signer = await ethersProvider.getSigner();

              // Submit proof to contract — releases remaining USDC to seller
              const hash = await releasePayment(signer, {
                paymentId: payment.id,
                proof: verification.proof,
              });

              // Update Supabase status
              await fetch(`/api/payments/${payment.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "completed",
                  reclaim_proof: verification.proof,
                }),
              });

              setTxHash(hash);
              setState("done");
            } catch (err: any) {
              setError(err.message || "Failed to release payment.");
              setState("error");
            }
          },
          onError: (err) => {
            setError(err.message || "Verification process interrupted.");
            setState("error");
          },
        });
      } catch (err: any) {
        setError(err.message || "Failed to start claim process.");
        setState("error");
      }
    },
    [wallets]
  );

  function reset() {
    setState("idle");
    setTxHash(null);
    setError(null);
  }

  return { claimPayment, state, txHash, error, reset };
}
