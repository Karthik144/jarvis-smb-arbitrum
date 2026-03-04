import { ReclaimClient, type Proof } from '@reclaimprotocol/zk-fetch';

interface ZkFetchOptions {
  appId: string;
  appSecret: string;
  trackingNumber: string;
}

/**
 * Fetches a cryptographic proof of package delivery status from Amazon tracking.
 *
 * Uses Reclaim Protocol's zkFetch to generate a zero-knowledge proof that
 * the tracking page contains "Delivered" status.
 *
 * @param options - Configuration for zkFetch operation
 * @returns Promise resolving to cryptographic proof of delivery
 * @throws {Error} If zkFetch fails or returns no proof
 */
export async function fetchTrackingProof(options: ZkFetchOptions): Promise<Proof> {
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

  try {
    console.log('Executing zkFetch...');
    const proof = await client.zkFetch(url, publicOptions, privateOptions);

    if (!proof) {
      throw new Error('zkFetch returned no proof - verification may have failed');
    }

    console.log('zkFetch completed successfully');
    return proof;
  } catch (error) {
    console.error('zkFetch failed:', error);
    throw new Error(
      `Failed to fetch tracking proof: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
