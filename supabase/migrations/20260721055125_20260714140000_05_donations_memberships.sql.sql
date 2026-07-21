/* Admin-managed donation purposes and paid membership subscriptions. */

CREATE TABLE IF NOT EXISTS public.donation_purposes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🪷',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.donation_purposes (name, description, icon, display_order) VALUES
  ('Annadanam', 'Free meals for devotees and the needy', '🍛', 1),
  ('Temple Development', 'Temple renovation and maintenance', '🏗️', 2),
  ('Goshala', 'Care and nourishment of sacred cows', '🐄', 3),
  ('Festival Fund', 'Festivals and special celebrations', '🎊', 4),
  ('General Donation', 'Used wherever the trust needs it most', '🪷', 5)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.donation_purposes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donation_purposes_public_read" ON public.donation_purposes FOR SELECT TO anon, authenticated USING (is_active OR (SELECT public.is_admin()));
CREATE POLICY "donation_purposes_admin_insert" ON public.donation_purposes FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "donation_purposes_admin_update" ON public.donation_purposes FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "donation_purposes_admin_delete" ON public.donation_purposes FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  duration_months integer NOT NULL CHECK (duration_months > 0),
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.membership_plans (name, amount, duration_months, benefits, display_order) VALUES
  ('Annual Patron', 3511, 12, '["Special seva passes on Guru Pournami","Abhisheka and puja on birthday","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","1 gemology consultation","1 vaastu consultation","Go-puja","Virtual yoga class on International Yoga Day","Naturopathy on full moon day","Annaprasadam for 20 people"]', 1),
  ('Half-Yearly Patron', 2511, 6, '["Special seva passes on Guru Pournami","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","1 gemology consultation","Go-puja","Virtual yoga class on International Yoga Day","Annaprasadam for 15 people"]', 2),
  ('Quarterly Patron', 1611, 3, '["Special seva passes on Guru Pournami","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","Go-puja","Virtual yoga class on International Yoga Day","Annaprasadam for 10 people"]', 3)
ON CONFLICT DO NOTHING;

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membership_plans_public_read" ON public.membership_plans FOR SELECT TO anon, authenticated USING (is_active OR (SELECT public.is_admin()));
CREATE POLICY "membership_plans_admin_write" ON public.membership_plans FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq START 1001;
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_number text UNIQUE NOT NULL DEFAULT ('MEM' || LPAD(nextval('public.membership_number_seq')::text, 6, '0')),
  devotee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.membership_plans(id),
  full_name text NOT NULL,
  spouse_name text NOT NULL DEFAULT '',
  date_of_birth date NOT NULL,
  rashi text NOT NULL DEFAULT '',
  nakshatra text NOT NULL DEFAULT '',
  address text NOT NULL,
  mobile text NOT NULL,
  declaration_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_devotee_idx ON public.memberships(devotee_id);
CREATE INDEX IF NOT EXISTS memberships_status_idx ON public.memberships(status, expires_at);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_select_own" ON public.memberships FOR SELECT TO authenticated USING ((SELECT auth.uid()) = devotee_id OR (SELECT public.is_admin()));
CREATE POLICY "memberships_insert_own" ON public.memberships FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = devotee_id);
CREATE POLICY "memberships_admin_update" ON public.memberships FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN ('booking','donation','membership','event'));

DROP TRIGGER IF EXISTS donation_purposes_updated_at ON public.donation_purposes;
CREATE TRIGGER donation_purposes_updated_at BEFORE UPDATE ON public.donation_purposes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER membership_plans_updated_at BEFORE UPDATE ON public.membership_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS memberships_updated_at ON public.memberships;
CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
