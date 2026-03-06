export interface MockEscrowParams {
  paymentId: string;
  totalAmount: number;
  upfrontPercentage: number;
  sellerAddress: string;
  buyerAddress: string;
}

export interface MockReleaseParams {
  paymentId: string;
  sellerAddress: string;
  remainingAmount: number;
  proof: any;
}

export async function mockCreateEscrow(params: MockEscrowParams) {
  console.log('🔷 MOCK CONTRACT CALL: createEscrow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Payment ID:', params.paymentId);
  console.log('Total Amount:', params.totalAmount, 'USDC');
  console.log('Upfront %:', params.upfrontPercentage);
  console.log('Seller:', params.sellerAddress);
  console.log('Buyer:', params.buyerAddress);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Simulate transaction delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
  console.log('✅ Mock Transaction Hash:', mockTxHash);
  console.log('\n');

  return {
    success: true,
    txHash: mockTxHash,
  };
}

export async function mockReleasePayment(params: MockReleaseParams) {
  console.log('🔷 MOCK CONTRACT CALL: releasePayment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Payment ID:', params.paymentId);
  console.log('Seller:', params.sellerAddress);
  console.log('Remaining Amount:', params.remainingAmount, 'USDC');
  console.log('Proof verified:', !!params.proof);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Simulate transaction delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
  console.log('✅ Mock Transaction Hash:', mockTxHash);
  console.log('\n');

  return {
    success: true,
    txHash: mockTxHash,
  };
}
