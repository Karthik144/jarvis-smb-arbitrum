import { loadConfig } from './config';
import { fetchTrackingProof } from './zkfetch';
import { verifyProof, transformProofForOnchain } from './verify';
import { saveProofToFile, displayProofSummary } from './output';

async function main() {
  console.log('='.repeat(60));
  console.log('zkTLS Package Tracking Verification');
  console.log('='.repeat(60) + '\n');

  try {
    // Load configuration
    console.log('Step 1: Loading configuration...');
    const config = loadConfig();
    console.log('✓ Configuration loaded\n');

    // Fetch tracking proof
    console.log('Step 2: Fetching tracking proof via zkFetch...');
    const proof = await fetchTrackingProof({
      appId: config.reclaimAppId,
      appSecret: config.reclaimAppSecret,
      trackingNumber: config.trackingNumber,
    });
    console.log('✓ Proof generated\n');

    // Verify proof
    console.log('Step 3: Verifying proof...');
    const isValid = await verifyProof(proof);

    if (!isValid) {
      console.error('✗ Proof verification failed. Exiting.');
      process.exit(1);
    }
    console.log();

    // Transform for on-chain
    console.log('Step 4: Transforming proof for blockchain...');
    const onchainProof = transformProofForOnchain(proof);
    console.log();

    // Display summary
    console.log('Step 5: Displaying proof summary...');
    displayProofSummary(onchainProof);

    // Save to file
    console.log('Step 6: Saving proof to file...');
    saveProofToFile(onchainProof);
    console.log();

    console.log('='.repeat(60));
    console.log('SUCCESS: Proof generation complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Check output/proof-output.json for the proof');
    console.log('2. Share this proof with your smart contract developer');
    console.log('3. The proof can be verified on-chain using Reclaim Protocol');
    console.log();

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('ERROR: Application failed');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Run the application
main();
