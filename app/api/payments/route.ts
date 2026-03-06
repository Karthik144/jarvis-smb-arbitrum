import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreatePaymentRequest, Payment } from '@/lib/types';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();

    // Basic validation
    if (body.upfront_percentage + body.remaining_percentage !== 100) {
      return NextResponse.json(
        { success: false, error: 'Percentages must sum to 100' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        buyer_address: body.buyer_address,
        seller_address: body.seller_address,
        total_amount: body.total_amount,
        upfront_percentage: body.upfront_percentage,
        remaining_percentage: body.remaining_percentage,
        tracking_number: body.tracking_number || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
