import { supabaseClient } from "@/lib/supabase-client";
import { Database } from "@/lib/database.types";

type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists. Please login.");
    this.name = "DuplicateEmailError";
  }
}

export async function createUser(userData: UserInsert) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any)
    .from("users")
    .insert([userData])
    .select()
    .single();

  // Handle duplicate email (Postgres unique constraint violation)
  if (error?.code === "23505") {
    throw new DuplicateEmailError();
  }

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to create user account. Please try again.");
  }

  return data;
}

export async function getUserByWalletAddress(walletAddress: string) {
  console.log("WALLET ADDRESS IN GET USER:", walletAddress);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any)
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress)
    .single();

  if (error) {
    console.error("Supabase select error:", error);
    throw new Error("Failed to retrieve user account. Please try again.");
  }

  return data;
}
