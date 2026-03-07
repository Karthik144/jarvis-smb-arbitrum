// app/api/lender-positions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lenderAddress = searchParams.get("lender_address");

  if (!lenderAddress) {
    return NextResponse.json(
      { success: false, error: "lender_address required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("lender_positions")
    .select("*")
    .eq("lender_address", lenderAddress)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching lender positions:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("lender_positions")
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error("Error creating lender position:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
