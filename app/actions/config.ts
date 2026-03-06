"use server";

import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";

export async function getReclaimConfig() {
  const appId = process.env.NEXT_PUBLIC_RECLAIM_APP_ID;
  const appSecret = process.env.RECLAIM_APP_SECRET;
  const providerId = "62ef2098-1cfe-45e5-9fec-34f3fa0aafb9";

  if (!appId || !appSecret || !providerId) {
    throw new Error("Missing Reclaim credentials on the server.");
  }

  const reclaimProofRequest = await ReclaimProofRequest.init(
    appId,
    appSecret,
    providerId
  );

  return reclaimProofRequest.toJsonString();
}
