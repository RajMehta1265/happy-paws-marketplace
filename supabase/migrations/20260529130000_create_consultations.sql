-- Drop foreign key constraint on product_id in cart_items table
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

-- Create consultations table
CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  pet_type text NOT NULL,
  price_min numeric(10,2) NOT NULL,
  price_max numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Enable anyone to insert/select consultations (both authenticated and anonymous users)
CREATE POLICY "Anyone can submit consultations" ON public.consultations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view consultations" ON public.consultations
  FOR SELECT TO anon, authenticated USING (true);
