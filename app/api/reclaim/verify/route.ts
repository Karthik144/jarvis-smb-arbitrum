import { NextRequest, NextResponse } from 'next/server';
import { verifyProof } from '@reclaimprotocol/js-sdk';
import { supabase } from '@/lib/supabase';
import { ReclaimProof } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Parse proof from request body
    const proofs = await request.json();

    if (!proofs || !Array.isArray(proofs) || proofs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid proof data' },
        { status: 400 }
      );
    }

    // Verify cryptographic signatures
    const isValid = await verifyProof(proofs);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Proof verification failed' },
        { status: 400 }
      );
    }

    // Extract context and parameters from the first proof
    const proof = proofs[0] as ReclaimProof;
    const context = JSON.parse(proof.claimData.context);
    const { extractedParameters } = context;

    // Validate delivery status
    const deliveryStatus = extractedParameters?.deliveryStatus;
    const trackingNumber = extractedParameters?.trackingNumber;

    if (!deliveryStatus || !trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing delivery information in proof' },
        { status: 400 }
      );
    }

    if (!deliveryStatus.toLowerCase().includes('delivered')) {
      return NextResponse.json(
        { success: false, error: 'Package not delivered yet' },
        { status: 400 }
      );
    }

    // Update payment status in database
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found for this tracking number' },
        { status: 404 }
      );
    }

    // Update payment with proof and status
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'delivered',
        reclaim_proof: proof,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Proof verified and payment updated',
      data: {
        paymentId: updatedPayment.id,
        deliveryStatus,
        trackingNumber,
      },
    });
  } catch (error) {
    console.error('Proof verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Proof verification failed' },
      { status: 500 }
    );
  }
}
