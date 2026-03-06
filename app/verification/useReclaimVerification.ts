"use client";

import { useState, useCallback } from "react";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { verifyProofLocally } from "@/app/actions/verify";
import { getReclaimConfig } from "@/app/actions/config";

export function useReclaimVerification() {
  const [proofs, setProofs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startVerification = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const jsonRequest = await getReclaimConfig();
      const reclaimReq = await ReclaimProofRequest.fromJsonString(jsonRequest);
      await reclaimReq.triggerReclaimFlow();

      await reclaimReq.startSession({
        onSuccess: async (receivedProofs) => {
          console.log("SDK: Proof generated successfully.");

          const normalized = receivedProofs
            ? Array.isArray(receivedProofs)
              ? receivedProofs
              : [receivedProofs]
            : [];

          if (normalized.length === 0) {
            setError("No proof data returned from SDK.");
            setLoading(false);
            return;
          }

          const result = await verifyProofLocally(normalized);

          if (result.success) {
            setProofs(normalized);
            console.log("Backend: Proof verified successfully.");
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

  return { startVerification, proofs, loading, error };
}
