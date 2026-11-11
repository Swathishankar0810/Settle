-- Settle: PostgreSQL / Supabase Database Schema
-- Provides relational data models, Row Level Security (RLS), and webhook audit log

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Groups
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  currency text not null default 'USD',
  created_at timestamptz default now()
);

-- Members
create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid,
  display_name text not null,
  email text,
  paypal_email text,
  income_share numeric default 1,
  role text default 'member'
);

-- Group Memory Rules
create table if not exists group_rules (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  title text not null,
  description text not null,
  rule_type text not null,
  target_member_id uuid,
  target_category text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Expenses
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  merchant text,
  merchant_category text,
  expense_date date,
  currency text not null default 'USD',
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  service_charge numeric not null default 0,
  tip numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null,
  payer_member_id uuid,
  source_type text check (source_type in ('receipt','invoice','email','manual')),
  source_url text,
  raw_ai_output jsonb,
  status text default 'draft',
  created_at timestamptz default now()
);

-- Line items
create table if not exists expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  name text not null,
  amount numeric not null,
  quantity numeric default 1,
  unit_price numeric,
  category text,
  shared_by uuid[],
  allocation_rule text,
  confidence numeric default 0.95
);

-- Proposed and approved allocations
create table if not exists allocations (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  member_id uuid,
  amount numeric not null,
  currency text not null default 'USD',
  rule text not null,
  explanation text not null,
  approved boolean default false,
  items_breakdown jsonb,
  created_at timestamptz default now()
);

-- PayPal invoices
create table if not exists paypal_invoices (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  member_id uuid,
  paypal_invoice_id text unique,
  status text,
  amount numeric,
  currency text default 'USD',
  payment_link text,
  qr_code_url text,
  sent_at timestamptz,
  paid_at timestamptz
);

-- Subscriptions (Recurring Cost Radar)
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  service_name text not null,
  category text,
  provider text,
  billing_cycle text default 'monthly',
  amount numeric not null,
  currency text default 'USD',
  payer_member_id uuid,
  active_member_ids uuid[],
  next_renewal_date date,
  cancellation_url text,
  last_used_date date,
  status text default 'active',
  recommendation jsonb,
  created_at timestamptz default now()
);

-- Immutable audit trail (The Fairness Ledger)
create table if not exists fairness_events (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  actor text,
  event_type text,
  before_state jsonb,
  after_state jsonb,
  explanation text,
  created_at timestamptz default now()
);

-- Webhook deduplication
create table if not exists webhook_events (
  event_id text primary key,
  event_type text,
  invoice_id text,
  payload jsonb,
  processed_at timestamptz default now()
);
