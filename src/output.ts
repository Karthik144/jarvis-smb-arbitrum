import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = 'output';
const OUTPUT_FILE = 'proof-output.json';

export function saveProofToFile(proof: any): void {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);

  console.log(`Saving proof to ${outputPath}...`);

  try {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(proof, null, 2),
      'utf-8'
    );

    console.log(`✓ Proof saved successfully to ${outputPath}`);
  } catch (error) {
    console.error('Error saving proof to file:', error);
    throw error;
  }
}

export function displayProofSummary(proof: any): void {
  console.log('\n' + '='.repeat(60));
  console.log('PROOF SUMMARY');
  console.log('='.repeat(60));

  // Display key proof information
  if (proof.identifier) {
    console.log(`Identifier: ${proof.identifier}`);
  }

  if (proof.claimData) {
    console.log(`Claim Data: ${JSON.stringify(proof.claimData, null, 2)}`);
  }

  if (proof.signatures) {
    console.log(`Signatures: ${proof.signatures.length} signature(s) included`);
  }

  console.log('='.repeat(60) + '\n');
}
