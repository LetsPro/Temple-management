/* Restore the three public membership plans and their access policies. */

WITH desired(name, amount, duration_months, benefits, display_order) AS (
  VALUES
    ('Annual Patron', 3511::numeric, 12, '["Special seva passes on Guru Pournami","Abhisheka and puja on birthday","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","1 gemology consultation","1 vaastu consultation","Go-puja","Virtual yoga class on International Yoga Day","Naturopathy on full moon day","Annaprasadam for 20 people"]'::jsonb, 1),
    ('Half-Yearly Patron', 2511::numeric, 6, '["Special seva passes on Guru Pournami","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","1 gemology consultation","Go-puja","Virtual yoga class on International Yoga Day","Annaprasadam for 15 people"]'::jsonb, 2),
    ('Quarterly Patron', 1611::numeric, 3, '["Special seva passes on Guru Pournami","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","Go-puja","Virtual yoga class on International Yoga Day","Annaprasadam for 10 people"]'::jsonb, 3)
)
UPDATE public.membership_plans AS plan
SET amount = desired.amount,
    duration_months = desired.duration_months,
    benefits = desired.benefits,
    is_active = true,
    display_order = desired.display_order,
    updated_at = now()
FROM desired
WHERE plan.name = desired.name;

WITH desired(name, amount, duration_months, benefits, display_order) AS (
  VALUES
    ('Annual Patron', 3511::numeric, 12, '["Special seva passes on Guru Pournami","Abhisheka and puja on birthday","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","1 gemology consultation","1 vaastu consultation","Go-puja","Virtual yoga class on International Yoga Day","Naturopathy on full moon day","Annaprasadam for 20 people"]'::jsonb, 1),
    ('Half-Yearly Patron', 2511::numeric, 6, '["Special seva passes on Guru Pournami","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","1 gemology consultation","Go-puja","Virtual yoga class on International Yoga Day","Annaprasadam for 15 people"]'::jsonb, 2),
    ('Quarterly Patron', 1611::numeric, 3, '["Special seva passes on Guru Pournami","Abhisheka and puja for family special occasions","4 seva passes on Vaikunta Ekadashi","1 astrology consultation","Go-puja","Virtual yoga class on International Yoga Day","Annaprasadam for 10 people"]'::jsonb, 3)
)
INSERT INTO public.membership_plans (name, amount, duration_months, benefits, is_active, display_order)
SELECT desired.name, desired.amount, desired.duration_months, desired.benefits, true, desired.display_order
FROM desired
WHERE NOT EXISTS (
  SELECT 1 FROM public.membership_plans WHERE membership_plans.name = desired.name
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_plans_public_read" ON public.membership_plans;
CREATE POLICY "membership_plans_public_read" ON public.membership_plans
  FOR SELECT TO anon, authenticated
  USING (is_active OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "membership_plans_admin_write" ON public.membership_plans;
CREATE POLICY "membership_plans_admin_write" ON public.membership_plans
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
