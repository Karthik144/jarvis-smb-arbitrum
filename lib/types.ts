// Payment status types
export type PaymentStatus =
  | 'pending'
  | 'escrow_created'
  | 'upfront_paid'
  | 'delivered'
  | 'completed';

// Reclaim proof structure
export interface ReclaimProof {
  identifier: string;
  claimData: {
    provider: string;
    parameters: string;
    context: string;
  };
  signatures: string[];
  witnesses: Array<{
    id: string;
    url: string;
  }>;
  [key: string]: unknown; // Allow additional fields from Reclaim SDK
}

// Payment interface matching database schema
export interface Payment {
  id: string;
  created_at: string;
  buyer_address: string;
  seller_address: string;
  total_amount: string;
  upfront_percentage: number;
  remaining_percentage: number;
  tracking_number: string;
  status: PaymentStatus;
  reclaim_proof: ReclaimProof | null;
  updated_at: string;
}

// Payment creation input (subset of Payment)
export interface CreatePaymentInput {
  buyer_address: string;
  seller_address: string;
  total_amount: string;
  upfront_percentage: number;
  remaining_percentage: number;
  tracking_number: string;
}

// Payment update input
export interface UpdatePaymentInput {
  status?: PaymentStatus;
  reclaim_proof?: ReclaimProof;
}
