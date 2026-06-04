-- Alter training_bookings table to include liability consent and signature fields
alter table public.training_bookings add column if not exists liability_accepted boolean not null default false;
alter table public.training_bookings add column if not exists consent_given boolean not null default false;
alter table public.training_bookings add column if not exists signature_data_url text;
