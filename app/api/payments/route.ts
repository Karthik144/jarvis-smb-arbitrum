export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// TODO: integrate Supabase
export async function GET() {
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ success: true, data: { id: 'stub', ...body } });
}
