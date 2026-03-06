export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// TODO: integrate Supabase
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ success: true, data: { id } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json({ success: true, data: { id, ...body } });
}
