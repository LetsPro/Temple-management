/* India/International event plans with INR/USD checkout support. */

ALTER TABLE public.event_plans
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'india',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';

UPDATE public.event_plans
SET market = 'india', currency = 'INR'
WHERE market IS NULL OR currency IS NULL;

ALTER TABLE public.event_plans DROP CONSTRAINT IF EXISTS event_plans_market_check;
ALTER TABLE public.event_plans
  ADD CONSTRAINT event_plans_market_check
  CHECK (market IN ('india', 'international'));

ALTER TABLE public.event_plans DROP CONSTRAINT IF EXISTS event_plans_currency_check;
ALTER TABLE public.event_plans
  ADD CONSTRAINT event_plans_currency_check
  CHECK (currency IN ('INR', 'USD'));

ALTER TABLE public.event_plans DROP CONSTRAINT IF EXISTS event_plans_market_currency_check;
ALTER TABLE public.event_plans
  ADD CONSTRAINT event_plans_market_currency_check
  CHECK (
    (market = 'india' AND currency = 'INR')
    OR (market = 'international' AND currency = 'USD')
  );

CREATE INDEX IF NOT EXISTS event_plans_market_idx
  ON public.event_plans(event_id, market, is_active, display_order);

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';

ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_currency_check;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_currency_check
  CHECK (currency IN ('INR', 'USD'));

DROP POLICY IF EXISTS "event_reg_insert" ON public.event_registrations;
CREATE POLICY "event_reg_insert" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = devotee_id
    AND (
      (
        status = 'registered'
        AND payment_status = 'not_required'
        AND event_plan_id IS NULL
        AND amount = 0
        AND currency = 'INR'
        AND EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'free'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
        )
      )
      OR
      (
        status = 'pending'
        AND payment_status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.events
          JOIN public.event_plans ON event_plans.event_id = events.id
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'paid'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
            AND event_plans.id = event_registrations.event_plan_id
            AND event_plans.is_active = true
            AND event_plans.price = event_registrations.amount
            AND event_plans.currency = event_registrations.currency
        )
      )
    )
  );

DROP POLICY IF EXISTS "event_reg_update_own" ON public.event_registrations;
CREATE POLICY "event_reg_update_own" ON public.event_registrations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = devotee_id)
  WITH CHECK (
    (SELECT auth.uid()) = devotee_id
    AND (
      (
        status IN ('registered', 'cancelled')
        AND payment_status = 'not_required'
        AND event_plan_id IS NULL
        AND amount = 0
        AND currency = 'INR'
        AND EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'free'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
        )
      )
      OR
      (
        status = 'pending'
        AND payment_status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.events
          JOIN public.event_plans ON event_plans.event_id = events.id
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'paid'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
            AND event_plans.id = event_registrations.event_plan_id
            AND event_plans.is_active = true
            AND event_plans.price = event_registrations.amount
            AND event_plans.currency = event_registrations.currency
        )
      )
    )
  );

DROP POLICY IF EXISTS "event_reg_guest_insert" ON public.event_registrations;
CREATE POLICY "event_reg_guest_insert" ON public.event_registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    devotee_id IS NULL
    AND char_length(trim(guest_name)) >= 2
    AND char_length(trim(guest_email)) >= 5
    AND char_length(regexp_replace(guest_mobile, '\D', '', 'g')) >= 10
    AND (
      (
        status = 'registered'
        AND payment_status = 'not_required'
        AND event_plan_id IS NULL
        AND amount = 0
        AND currency = 'INR'
        AND EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'free'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
        )
      )
      OR
      (
        status = 'pending'
        AND payment_status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.events
          JOIN public.event_plans ON event_plans.event_id = events.id
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'paid'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (events.registration_closing_date IS NULL OR events.registration_closing_date > now())
            AND event_plans.id = event_registrations.event_plan_id
            AND event_plans.is_active = true
            AND event_plans.price = event_registrations.amount
            AND event_plans.currency = event_registrations.currency
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_guest_event_registration(
  p_event_id uuid,
  p_event_plan_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_mobile text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event public.events%ROWTYPE;
  target_plan public.event_plans%ROWTYPE;
  registration_id uuid;
BEGIN
  IF char_length(trim(coalesce(p_guest_name, ''))) < 2
    OR char_length(trim(coalesce(p_guest_email, ''))) < 5
    OR char_length(regexp_replace(coalesce(p_guest_mobile, ''), '\D', '', 'g')) < 10
  THEN
    RAISE EXCEPTION 'Enter valid guest registration details.';
  END IF;

  SELECT * INTO target_event FROM public.events WHERE id = p_event_id;

  IF NOT FOUND
    OR NOT target_event.is_published
    OR NOT target_event.registration_enabled
    OR target_event.end_datetime <= now()
    OR (target_event.registration_closing_date IS NOT NULL AND target_event.registration_closing_date <= now())
  THEN
    RAISE EXCEPTION 'Registration for this event is closed.';
  END IF;

  IF target_event.pricing_type = 'free' THEN
    INSERT INTO public.event_registrations (
      event_id, devotee_id, guest_name, guest_email, guest_mobile,
      event_plan_id, participant_count, amount, currency, payment_status, status
    ) VALUES (
      p_event_id, NULL, trim(p_guest_name), trim(p_guest_email), trim(p_guest_mobile),
      NULL, 1, 0, 'INR', 'not_required', 'registered'
    ) RETURNING id INTO registration_id;
  ELSE
    SELECT * INTO target_plan
    FROM public.event_plans
    WHERE id = p_event_plan_id AND event_id = p_event_id AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The selected event plan is unavailable.';
    END IF;

    INSERT INTO public.event_registrations (
      event_id, devotee_id, guest_name, guest_email, guest_mobile,
      event_plan_id, participant_count, amount, currency, payment_status, status
    ) VALUES (
      p_event_id, NULL, trim(p_guest_name), trim(p_guest_email), trim(p_guest_mobile),
      target_plan.id, 1, target_plan.price, target_plan.currency, 'pending', 'pending'
    ) RETURNING id INTO registration_id;
  END IF;

  RETURN registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_event_registration(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_event_registration(uuid, uuid, text, text, text) TO anon, authenticated;