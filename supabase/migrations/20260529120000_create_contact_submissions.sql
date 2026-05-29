-- Create contact submissions table
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.contact_submissions enable row level security;

-- Enable anyone (anon and authenticated) to insert submissions
create policy "Anyone can submit contact forms" on public.contact_submissions
  for insert to anon, authenticated with check (true);

-- Enable only admins to view submissions
create policy "Admins can view contact submissions" on public.contact_submissions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
