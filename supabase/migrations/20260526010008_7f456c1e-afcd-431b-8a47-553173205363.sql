
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  address_line text,
  city text,
  postal_code text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Profiles updatable by owner" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Profiles insertable by owner" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Admins view all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Auto profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Pets
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  breed text,
  age text,
  price numeric(10,2) not null default 0,
  image_url text,
  description text,
  vaccinated boolean not null default false,
  adoption boolean not null default false,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pets enable row level security;
create policy "Anyone can view pets" on public.pets for select using (true);
create policy "Admins manage pets" on public.pets for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger pets_updated_at before update on public.pets for each row execute function public.set_updated_at();

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10,2) not null default 0,
  image_url text,
  description text,
  stock integer not null default 0,
  rating numeric(2,1) not null default 5.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Anyone can view products" on public.products for select using (true);
create policy "Admins manage products" on public.products for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

-- Cart items (products only)
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.cart_items enable row level security;
create policy "Users manage own cart" on public.cart_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  total numeric(10,2) not null default 0,
  status text not null default 'pending',
  shipping_address jsonb,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "Users view own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "Users create own orders" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "Admins view all orders" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  item_type text not null check (item_type in ('product','pet')),
  item_id uuid not null,
  name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null default 1,
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;
create policy "Users view own order items" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "Users insert own order items" on public.order_items for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "Admins view all order items" on public.order_items for select to authenticated using (public.has_role(auth.uid(), 'admin'));
