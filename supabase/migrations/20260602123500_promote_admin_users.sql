-- Promote woolf.indiaa@gmail.com and woolf.india@gmail.com to admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email IN ('woolf.indiaa@gmail.com', 'woolf.india@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update handle_new_user trigger function to automatically assign admin role to these emails on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  IF new.email IN ('woolf.indiaa@gmail.com', 'woolf.india@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user') ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END; $$;
