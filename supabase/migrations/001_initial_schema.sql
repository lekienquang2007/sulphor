-- Profiles (extends Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  business_name text,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- Stripe connections
create table stripe_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  stripe_account_id text not null,
  access_token text not null,
  refresh_token text,
  livemode boolean default false,
  status text default 'active',
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id)
);

-- Stripe payouts
create table stripe_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  stripe_payout_id text unique not null,
  amount integer not null,
  currency text default 'usd',
  arrival_date date not null,
  status text not null,
  description text,
  created_at timestamptz default now()
);

-- Stripe balance snapshots
create table stripe_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  available_amount integer not null,
  pending_amount integer not null,
  currency text default 'usd',
  snapshot_at timestamptz default now()
);

-- Allocation rules
create table allocation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  bucket_name text not null,
  label text not null,
  rule_type text not null,
  value numeric not null,
  priority integer not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Virtual buckets
create table virtual_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  bucket_name text not null,
  label text not null,
  current_balance integer default 0,
  created_at timestamptz default now(),
  unique (user_id, bucket_name)
);

-- Payout plans (defined before virtual_bucket_entries due to FK)
create table payout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  stripe_payout_id uuid references stripe_payouts(id),
  payout_amount integer not null,
  spendable_amount integer not null,
  status text default 'pending',
  ai_summary text,
  rules_snapshot jsonb,
  created_at timestamptz default now(),
  approved_at timestamptz,
  unique (user_id, stripe_payout_id)
);

-- Virtual bucket entries
create table virtual_bucket_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  bucket_id uuid references virtual_buckets(id) on delete cascade,
  payout_plan_id uuid references payout_plans(id),
  amount integer not null,
  description text,
  created_at timestamptz default now()
);

-- Payout plan items
create table payout_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  payout_plan_id uuid references payout_plans(id) on delete cascade,
  bucket_name text not null,
  label text not null,
  amount integer not null,
  rule_type text not null,
  rule_value numeric not null
);

-- Plan approvals
create table plan_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  payout_plan_id uuid references payout_plans(id),
  action text not null,
  notes text,
  created_at timestamptz default now()
);

-- Event logs
create table event_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table stripe_connections enable row level security;
alter table stripe_payouts enable row level security;
alter table stripe_balance_snapshots enable row level security;
alter table allocation_rules enable row level security;
alter table virtual_buckets enable row level security;
alter table virtual_bucket_entries enable row level security;
alter table payout_plans enable row level security;
alter table payout_plan_items enable row level security;
alter table plan_approvals enable row level security;
alter table event_logs enable row level security;

-- RLS Policies
create policy "Users see own data" on profiles for all using (auth.uid() = id);
create policy "Users see own data" on stripe_connections for all using (auth.uid() = user_id);
create policy "Users see own data" on stripe_payouts for all using (auth.uid() = user_id);
create policy "Users see own data" on stripe_balance_snapshots for all using (auth.uid() = user_id);
create policy "Users see own data" on allocation_rules for all using (auth.uid() = user_id);
create policy "Users see own data" on virtual_buckets for all using (auth.uid() = user_id);
create policy "Users see own data" on virtual_bucket_entries for all using (auth.uid() = user_id);
create policy "Users see own data" on payout_plans for all using (auth.uid() = user_id);
create policy "Users see own data" on payout_plan_items for all using (auth.uid() = user_id);
create policy "Users see own data" on plan_approvals for all using (auth.uid() = user_id);
create policy "Users see own data" on event_logs for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
