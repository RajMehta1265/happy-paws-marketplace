-- Create training_bookings table
create table if not exists public.training_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  owner_name text not null,
  pet_name text not null,
  breed text,
  age text,
  training_type text not null,
  preferred_date date not null,
  selected_commands text[] not null default '{}',
  medical_conditions text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create hostelling_bookings table
create table if not exists public.hostelling_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  pet_name text not null,
  pet_breed text not null,
  pet_gender text not null,
  pet_age text not null,
  medical_conditions text,
  medical_image text,
  temperament text not null,
  aggression_details text,
  urine_trained boolean not null default false,
  potty_trained boolean not null default false,
  check_in_date date not null,
  check_out_date date not null,
  num_days integer not null default 1,
  signature_data_url text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.training_bookings enable row level security;
alter table public.hostelling_bookings enable row level security;

-- Policies for training_bookings
create policy "Anyone can insert training bookings" on public.training_bookings
  for insert to anon, authenticated with check (true);

create policy "Users can view own training bookings" on public.training_bookings
  for select to authenticated using (auth.uid() = user_id);

create policy "Admins can manage training bookings" on public.training_bookings
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Policies for hostelling_bookings
create policy "Anyone can insert hostelling bookings" on public.hostelling_bookings
  for insert to anon, authenticated with check (true);

create policy "Users can view own hostelling bookings" on public.hostelling_bookings
  for select to authenticated using (auth.uid() = user_id);

create policy "Admins can manage hostelling bookings" on public.hostelling_bookings
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Function to get date counts securely without exposing personal details
create or replace function public.get_training_date_counts()
returns table (preferred_date date, booking_count bigint)
language sql stable security definer as $$
  select preferred_date, count(*) as booking_count
  from public.training_bookings
  group by preferred_date;
$$;

-- Triggers for updated_at
create or replace trigger training_bookings_updated_at before update on public.training_bookings
  for each row execute function public.set_updated_at();

create or replace trigger hostelling_bookings_updated_at before update on public.hostelling_bookings
  for each row execute function public.set_updated_at();
