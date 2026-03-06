import { NextRequest, NextResponse } from 'next/server';
import { mockCreateEscrow } from '@/lib/mock-contract';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId } = body;

    // Get payment details
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Call mock contract
    const result = await mockCreateEscrow({
      paymentId: payment.id,
      totalAmount: payment.total_amount,
      upfrontPercentage: payment.upfront_percentage,
      sellerAddress: payment.seller_address,
      buyerAddress: payment.buyer_address,
    });

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'escrow_created' })
      .eq('id', paymentId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error creating escrow:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
