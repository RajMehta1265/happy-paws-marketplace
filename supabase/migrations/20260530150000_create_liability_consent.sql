-- Create Liability and Consent Table
create table if not exists public.liability_consent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  pet_id uuid,
  pet_name text not null,
  liability_accepted boolean not null default true,
  consent_given boolean not null default true,
  signature_data_url text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.liability_consent enable row level security;

-- Policies
create policy "Anyone can submit liability consent" on public.liability_consent
  for insert to anon, authenticated with check (true);

create policy "Admins can view liability consent" on public.liability_consent
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
