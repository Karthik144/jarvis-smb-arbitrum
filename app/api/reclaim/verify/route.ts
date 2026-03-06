export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// TODO: integrate Reclaim + Supabase
export async function POST(_request: NextRequest) {
  return NextResponse.json({ success: true, message: 'Proof verified (stub)' });
}
