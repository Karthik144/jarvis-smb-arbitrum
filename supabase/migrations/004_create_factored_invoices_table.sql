-- Create factored_invoices table
create table if not exists factored_invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  seller_address text not null,
  lender_offer_id text not null,
  invoice_id text not null unique, -- bytes32 hash used on-chain
  total_invoice_amount text not null,
  upfront_paid text not null,
  factored_amount text not null,
  payout_to_seller text not null,
  discount_rate smallint not null check (discount_rate in (5, 10)),
  status text not null default 'pending' check (status in ('pending', 'matched', 'settled', 'failed')),
  tx_hash text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index on seller_address for faster lookups
create index idx_factored_invoices_seller on factored_invoices(seller_address);

-- Create index on lender_offer_id for faster lookups
create index idx_factored_invoices_lender_offer on factored_invoices(lender_offer_id);

-- Create index on payment_id for faster lookups
create index idx_factored_invoices_payment on factored_invoices(payment_id);

-- Create index on status for filtering
create index idx_factored_invoices_status on factored_invoices(status);

-- Enable RLS
alter table factored_invoices enable row level security;

-- Allow anyone to read factored invoices
create policy "Anyone can read factored invoices"
  on factored_invoices for select
  using (true);

-- Allow sellers to insert their own factored invoices
create policy "Sellers can insert their factored invoices"
  on factored_invoices for insert
  with check (true);

-- Allow sellers to update their own factored invoices
create policy "Sellers can update their factored invoices"
  on factored_invoices for update
  using (true);
