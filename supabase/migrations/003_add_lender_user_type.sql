-- Add lender type to users table
-- First, drop the existing check constraint if it exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_type_check;

-- Add new check constraint with lender type
ALTER TABLE public.users
  ADD CONSTRAINT users_type_check CHECK (type IN ('buyer', 'seller', 'lender'));
