create extension if not exists "pgcrypto";

create table if not exists public.stock_analyses (
  id uuid primary key default gen_random_uuid(),
  stock_code text not null,
  stock_name text,
  raw_data jsonb not null,
  normalized_data jsonb not null,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists stock_analyses_created_at_idx
  on public.stock_analyses (created_at desc);

create index if not exists stock_analyses_stock_code_idx
  on public.stock_analyses (stock_code);
