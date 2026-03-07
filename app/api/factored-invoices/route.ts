import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sellerAddress = searchParams.get('seller_address');
    const lenderOfferId = searchParams.get('lender_offer_id');

    let query = supabase.from('factored_invoices').select('*');

    if (sellerAddress) {
      query = query.eq('seller_address', sellerAddress);
    }

    if (lenderOfferId) {
      query = query.eq('lender_offer_id', lenderOfferId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching factored invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let lenderOfferId = '0';
    let status = 'pending';

    // If lender_address is provided (from smart contract), find their position
    if (body.lender_address) {
      const { data: positions, error: posError } = await supabase
        .from('lender_positions')
        .select('*')
        .eq('lender_address', body.lender_address.toLowerCase())
        .eq('discount_rate', body.discount_rate)
        .eq('status', 'active')
        .gte('amount_available', body.factored_amount)
        .order('created_at', { ascending: true })
        .limit(1);

      if (posError) throw posError;

      if (positions && positions.length > 0) {
        const position = positions[0];
        lenderOfferId = position.offer_id;
        status = 'matched';

        // Update lender position: reduce available, increase lent
        const newAmountAvailable = (
          parseFloat(position.amount_available) - parseFloat(body.factored_amount)
        ).toString();
        const newAmountLent = (
          parseFloat(position.amount_lent) + parseFloat(body.factored_amount)
        ).toString();
        const newStatus =
          parseFloat(newAmountAvailable) === 0 ? 'fully_deployed' : 'active';

        const { error: updateError } = await supabase
          .from('lender_positions')
          .update({
            amount_available: newAmountAvailable,
            amount_lent: newAmountLent,
            status: newStatus,
          })
          .eq('id', position.id);

        if (updateError) throw updateError;
      }
    }

    // Create the factored invoice
    const { data, error } = await supabase
      .from('factored_invoices')
      .insert({
        payment_id: body.payment_id,
        seller_address: body.seller_address,
        lender_offer_id: lenderOfferId,
        invoice_id: body.invoice_id,
        total_invoice_amount: body.total_invoice_amount,
        upfront_paid: body.upfront_paid,
        factored_amount: body.factored_amount,
        payout_to_seller: body.payout_to_seller,
        discount_rate: body.discount_rate,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating factored invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
