create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  owner_address text not null,
  name text not null,
  wallet_address text not null
);

create index if not exists contacts_owner_address_idx on contacts (owner_address);
