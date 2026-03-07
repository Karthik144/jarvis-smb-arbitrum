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

    // Find a matching lender position with the same discount rate and enough available funds
    const { data: positions, error: posError } = await supabase
      .from('lender_positions')
      .select('*')
      .eq('discount_rate', body.discount_rate)
      .eq('status', 'active')
      .gte('amount_available', body.factored_amount)
      .order('created_at', { ascending: true }) // First come, first served
      .limit(1);

    if (posError) throw posError;

    let lenderOfferId = '0';
    let status = 'pending';

    // If we found a matching lender position, update it
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

    // Create the factored invoice with the matched lender or pending
    const { data, error } = await supabase
      .from('factored_invoices')
      .insert({
        ...body,
        lender_offer_id: lenderOfferId,
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
