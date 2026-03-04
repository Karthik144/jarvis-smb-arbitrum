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
