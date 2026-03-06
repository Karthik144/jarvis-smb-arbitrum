"use client";

import { useState, useCallback } from "react";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { submitProofToChain } from "@/app/actions/verify";
import { getReclaimConfig } from "@/app/actions/config";

export function useReclaimVerification() {
  const [proofs, setProofs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const startVerification = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const jsonRequest = await getReclaimConfig();

      const reclaimReq = await ReclaimProofRequest.fromJsonString(jsonRequest);

      await reclaimReq.triggerReclaimFlow();

      await reclaimReq.startSession({
        onSuccess: async (receivedProofs) => {
          console.log("SDK: Proof generated successfully.");

          let normalized: any[] = [];
          if (receivedProofs) {
            normalized = Array.isArray(receivedProofs)
              ? receivedProofs
              : [receivedProofs];
          }

          if (normalized.length === 0) {
            setError("No proof data returned from SDK.");
            setLoading(false);
            return;
          }

          const result = await submitProofToChain(normalized);

          if (result.success) {
            setProofs(normalized);
            setTxHash(result.txHash || null);
            console.log("Backend: Verification and submission successful.");
          } else {
            setError(result.message || "Backend verification failed.");
          }

          setLoading(false);
        },
        onError: (err) => {
          console.error("SDK: Session error", err);
          setError(err.message || "Verification process interrupted.");
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error("Hook: Initialization error", err);
      setError(err.message || "Failed to initialize Reclaim SDK.");
      setLoading(false);
    }
  }, []);

  return {
    startVerification,
    proofs,
    loading,
    error,
    txHash,
  };
}
