import { verifyProof as verifyProofSDK, transformForOnchain as transformSDK } from '@reclaimprotocol/js-sdk';

export async function verifyProof(proof: any): Promise<boolean> {
  console.log('Verifying proof signature...');

  try {
    const isValid = await verifyProofSDK(proof);

    if (isValid) {
      console.log('✓ Proof verification successful');
    } else {
      console.log('✗ Proof verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('Error during proof verification:', error);
    return false;
  }
}

export function transformProofForOnchain(proof: any): any {
  console.log('Transforming proof for on-chain use...');

  const onchainProof = transformSDK(proof);

  console.log('✓ Proof transformed for blockchain');
  return onchainProof;
}
