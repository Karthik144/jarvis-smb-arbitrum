-- Create lender_positions table
CREATE TABLE IF NOT EXISTS public.lender_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  offer_id TEXT NOT NULL,
  lender_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  discount_rate INTEGER NOT NULL CHECK (discount_rate IN (5, 10)),
  amount_available TEXT NOT NULL,
  amount_lent TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'fully_deployed'))
);

-- Create index on lender_address for faster queries
CREATE INDEX IF NOT EXISTS idx_lender_positions_lender_address ON public.lender_positions(lender_address);

-- Create index on offer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_lender_positions_offer_id ON public.lender_positions(offer_id);

-- Enable Row Level Security
ALTER TABLE public.lender_positions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own positions
CREATE POLICY "Users can view their own lender positions"
  ON public.lender_positions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create policy to allow users to insert their own positions
CREATE POLICY "Users can create lender positions"
  ON public.lender_positions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy to allow users to update their own positions
CREATE POLICY "Users can update their own lender positions"
  ON public.lender_positions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Update the updated_at timestamp on every update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lender_positions_updated_at
  BEFORE UPDATE ON public.lender_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
