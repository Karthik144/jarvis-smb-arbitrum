export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// TODO: integrate Supabase + mock contract
export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ success: true, paymentId: body.paymentId, escrowId: 'stub-escrow' });
}
