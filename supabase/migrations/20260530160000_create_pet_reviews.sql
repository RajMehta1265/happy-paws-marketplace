-- Create Pet Reviews Table
create table if not exists public.pet_reviews (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  author text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  text text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.pet_reviews enable row level security;

-- Policies
create policy "Anyone can view pet reviews" on public.pet_reviews
  for select to anon, authenticated using (true);

create policy "Anyone can submit pet reviews" on public.pet_reviews
  for insert to anon, authenticated with check (true);

create policy "Anyone can update pet reviews" on public.pet_reviews
  for update to anon, authenticated using (true) with check (true);

create policy "Anyone can delete pet reviews" on public.pet_reviews
  for delete to anon, authenticated using (true);
