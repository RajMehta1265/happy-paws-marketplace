-- Add pet_type and price columns to hostelling_bookings table
alter table public.hostelling_bookings 
  add column if not exists pet_type text not null default 'Dog',
  add column if not exists price integer not null default 0;
