-- Delete all default pets from pets table
DELETE FROM public.pets
WHERE LOWER(name) IN ('milo', 'luna', 'biscuit', 'kiwi', 'rosie', 'mochi', 'snowy');

-- Delete all default exotic pets from exotic_pets table
DELETE FROM public.exotic_pets
WHERE LOWER(name) IN ('major', 'ziggy', 'peanut');

-- Delete all default products from products table
DELETE FROM public.products
WHERE LOWER(name) IN (
  'heritage grain-free kibble',
  'cloud wool pet bed',
  'hand-knotted rope toy',
  'botanical grooming set',
  'linen travel carrier',
  'forest chew bundle'
);

-- Promote woolf.indiaa@gmail.com and woolf.india@gmail.com to admin role case-insensitively
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE LOWER(email) IN ('woolf.indiaa@gmail.com', 'woolf.india@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update the handle_new_user trigger function to be case-insensitive
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(new.email) IN ('woolf.indiaa@gmail.com', 'woolf.india@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user') ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END; $$;
