-- Add subscription tracking to profiles
alter table profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists subscription_id text unique,
  add column if not exists subscription_status text not null default 'free';

create index if not exists idx_profiles_stripe_customer_id
  on profiles (stripe_customer_id)
  where stripe_customer_id is not null;
