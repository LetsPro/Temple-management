/*
# Paid/Free Events, Event Plans, and Razorpay Event Registrations

Adds support for paid events with multiple pricing tiers (event plans),
Razorpay-based event registration payments, and an event-thumbnails
storage bucket for event cover images.

## 1. Events table changes
- Added `pricing_type` column (text, NOT NULL, default 'free') with a
  CHECK constraint limiting values to 'free' or 'paid'.

## 2. New table: event_plans
- `id` (uuid, primary key)
- `event_id` (uuid, foreign key to events, ON DELETE CASCADE)
- `name` (text, not null) — the plan/tier name
- `price` (numeric(10,2), not null, CHECK price > 0)
- `is_active` (boolean, not null, default true)
- `display_order` (integer, not null, default 0)
- `created_at`, `updated_at` (timestamptz)
- Index on (event_id, is_active, display_order) for efficient listing.
- RLS enabled.
- Policies:
  - Public/anon read of active plans belonging to published events.
  - Admin full CRUD (read, insert, update, delete) via public.is_admin().
- `updated_at` maintained via the existing update_updated_at() trigger.

## 3. event_registrations table changes
- Added `event_plan_id` (uuid, foreign key to event_plans, ON DELETE RESTRICT).
- Added `amount` (numeric(10,2), not null, default 0, CHECK amount >= 0).
- Added `payment_status` (text, not null, default 'not_required') with
  CHECK constraint limiting values to 'not_required', 'pending', 'paid',
  'failed', 'refunded'.
- Tightened `status` CHECK to 'pending', 'registered', 'cancelled', 'attended'.
- Replaced INSERT policy with one that enforces:
  - Free events: status='registered', payment_status='not_required',
    event_plan_id NULL, amount 0, event must be free/published/open.
  - Paid events: status='pending', payment_status='pending', event_plan_id
    must reference an active plan whose price equals the registration amount,
    event must be paid/published/open.
- Replaced UPDATE policy with the same constraints for self-service updates.

## 4. payments table changes
- Extended `payment_type` CHECK constraint to include 'event' alongside
  'booking', 'donation', 'membership'.

## 5. Storage
- Created public bucket `event-thumbnails` (5 MB limit, image MIME types).
- Storage policies:
  - Public read for anon/authenticated.
  - Admin-only insert, update, delete (via public.is_admin()).

## Security
- RLS enabled on event_plans.
- All admin-only operations gated through public.is_admin().
- Registration insert/update policies validate event state and plan price
  consistency to prevent price tampering or registration after close.
*/

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL DEFAULT 'free';

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_pricing_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_pricing_type_check CHECK (pricing_type IN ('free', 'paid'));

CREATE TABLE IF NOT EXISTS public.event_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_plans_event_idx
  ON public.event_plans(event_id, is_active, display_order);

ALTER TABLE public.event_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_plans_public_read" ON public.event_plans;
CREATE POLICY "event_plans_public_read" ON public.event_plans
  FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_plans.event_id
        AND events.is_published = true
    )
  );

DROP POLICY IF EXISTS "event_plans_admin_read" ON public.event_plans;
CREATE POLICY "event_plans_admin_read" ON public.event_plans
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "event_plans_admin_insert" ON public.event_plans;
CREATE POLICY "event_plans_admin_insert" ON public.event_plans
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "event_plans_admin_update" ON public.event_plans;
CREATE POLICY "event_plans_admin_update" ON public.event_plans
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "event_plans_admin_delete" ON public.event_plans;
CREATE POLICY "event_plans_admin_delete" ON public.event_plans
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

DROP TRIGGER IF EXISTS event_plans_updated_at ON public.event_plans;
CREATE TRIGGER event_plans_updated_at
  BEFORE UPDATE ON public.event_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS event_plan_id uuid REFERENCES public.event_plans(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required';

ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_amount_check;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_amount_check CHECK (amount >= 0);

ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_status_check;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('pending', 'registered', 'cancelled', 'attended'));

ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_payment_status_check;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_payment_status_check
  CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded'));

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
        AND EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'free'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (
              events.registration_closing_date IS NULL
              OR events.registration_closing_date > now()
            )
        )
      )
      OR
      (
        status = 'pending'
        AND payment_status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.events
          JOIN public.event_plans
            ON event_plans.event_id = events.id
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'paid'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (
              events.registration_closing_date IS NULL
              OR events.registration_closing_date > now()
            )
            AND event_plans.id = event_registrations.event_plan_id
            AND event_plans.is_active = true
            AND event_plans.price = event_registrations.amount
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
        AND EXISTS (
          SELECT 1 FROM public.events
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'free'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (
              events.registration_closing_date IS NULL
              OR events.registration_closing_date > now()
            )
        )
      )
      OR
      (
        status = 'pending'
        AND payment_status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.events
          JOIN public.event_plans
            ON event_plans.event_id = events.id
          WHERE events.id = event_registrations.event_id
            AND events.pricing_type = 'paid'
            AND events.registration_enabled = true
            AND events.is_published = true
            AND events.end_datetime > now()
            AND (
              events.registration_closing_date IS NULL
              OR events.registration_closing_date > now()
            )
            AND event_plans.id = event_registrations.event_plan_id
            AND event_plans.is_active = true
            AND event_plans.price = event_registrations.amount
        )
      )
    )
  );

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (
    payment_type IN ('booking', 'donation', 'membership', 'event')
  );

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'event-thumbnails',
  'event-thumbnails',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "event_thumbnails_public_read" ON storage.objects;
CREATE POLICY "event_thumbnails_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'event-thumbnails');

DROP POLICY IF EXISTS "event_thumbnails_admin_insert" ON storage.objects;
CREATE POLICY "event_thumbnails_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-thumbnails'
    AND (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "event_thumbnails_admin_update" ON storage.objects;
CREATE POLICY "event_thumbnails_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-thumbnails'
    AND (SELECT public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'event-thumbnails'
    AND (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "event_thumbnails_admin_delete" ON storage.objects;
CREATE POLICY "event_thumbnails_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-thumbnails'
    AND (SELECT public.is_admin())
  );
