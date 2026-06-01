-- Create Exotic Pets Table
create table if not exists public.exotic_pets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Exotic',
  breed text,
  age text,
  price numeric(10,2) not null default 0,
  image_url text,
  description text,
  vaccinated boolean not null default false,
  adoption boolean not null default false,
  status text not null default 'available',
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.exotic_pets enable row level security;

-- Policies
create policy "Anyone can view exotic pets" on public.exotic_pets for select using (true);
create policy "Admins manage exotic pets" on public.exotic_pets for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
create trigger exotic_pets_updated_at before update on public.exotic_pets for each row execute function public.set_updated_at();
