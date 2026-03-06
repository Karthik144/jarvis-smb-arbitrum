import { NextRequest, NextResponse } from 'next/server';
import { mockReleasePayment } from '@/lib/mock-contract';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, proof } = body;

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

    const remainingAmount =
      (payment.total_amount * payment.remaining_percentage) / 100;

    // Call mock contract
    const result = await mockReleasePayment({
      paymentId: payment.id,
      sellerAddress: payment.seller_address,
      remainingAmount,
      proof,
    });

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', paymentId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error releasing payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
