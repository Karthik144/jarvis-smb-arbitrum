import { NextRequest, NextResponse } from 'next/server';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingNumber, paymentId } = body;

    if (!trackingNumber || !paymentId) {
      return NextResponse.json(
        { success: false, error: 'Missing trackingNumber or paymentId' },
        { status: 400 }
      );
    }

    // Get Reclaim credentials from environment
    const appId = process.env.RECLAIM_APP_ID;
    const appSecret = process.env.RECLAIM_APP_SECRET;
    const providerId = process.env.RECLAIM_PROVIDER_ID || 'fedex-tracking-custom';

    if (!appId || !appSecret) {
      return NextResponse.json(
        { success: false, error: 'Reclaim credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize ReclaimProofRequest
    const reclaimProofRequest = await ReclaimProofRequest.init(
      appId,
      appSecret,
      providerId
    );

    // Set context with payment ID
    reclaimProofRequest.setContext(paymentId, trackingNumber);

    // Set parameters for the tracking number
    reclaimProofRequest.setParams({
      trackingNumber: trackingNumber,
    });

    // Convert to JSON string for frontend
    const proofRequestObject = reclaimProofRequest.toJsonString();

    return NextResponse.json({
      success: true,
      proofRequest: proofRequestObject,
    });
  } catch (error) {
    console.error('Error initializing Reclaim proof request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize proof request' },
      { status: 500 }
    );
  }
}
