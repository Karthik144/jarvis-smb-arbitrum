-- Create payments table for split payment tracking
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  buyer_address TEXT NOT NULL,
  seller_address TEXT NOT NULL,
  total_amount TEXT NOT NULL,
  upfront_percentage INTEGER NOT NULL,
  remaining_percentage INTEGER NOT NULL,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reclaim_proof JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_buyer_address ON payments(buyer_address);
CREATE INDEX IF NOT EXISTS idx_payments_seller_address ON payments(seller_address);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_number ON payments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE payments IS 'Stores split payment information with zkTLS proof verification';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, escrow_created, upfront_paid, delivered, completed';
COMMENT ON COLUMN payments.reclaim_proof IS 'JSON proof from Reclaim Protocol for package delivery verification';
