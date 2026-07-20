/*
# Guest Checkout for Seva Bookings and Event Registrations (idempotent re-apply)

Allows unauthenticated guests to book sevas and register for events by
making `devotee_id` nullable and capturing guest contact details.

## 1. bookings table changes
- `devotee_id` is now nullable (guest bookings have no logged-in user).
- Added `guest_name`, `guest_email`, `guest_mobile` (text, NOT NULL,
  default '') for guest contact details.

## 2. RLS policy: bookings_guest_insert
- Allows the `anon` role to insert a booking only when:
  - `devotee_id` IS NULL (true guest booking).
  - `guest_name` >= 2 non-space chars.
  - `guest_email` >= 5 non-space chars.
  - `guest_mobile` >= 10 digits after stripping non-digits.

## 3. Helper function: public.is_guest_booking(uuid)
- SECURITY DEFINER, STABLE SQL function returning true if a booking has
  `devotee_id IS NULL`.
- EXECUTE granted to anon and authenticated only.

## 4. RLS policy: participants_guest_insert
- Allows `anon` to insert booking_participants only when the parent
  booking is a guest booking (verified via is_guest_booking()).

## 5. event_registrations table changes
- `devotee_id` is now nullable.
- Added `guest_name`, `guest_email`, `guest_mobile` (text, NOT NULL,
  default '').

## 6. RLS policy: event_reg_guest_insert
- Allows `anon` to insert an event registration only when:
  - `devotee_id` IS NULL.
  - Guest contact fields pass length/digit validation.
  - Free events: status='registered', payment_status='not_required',
    event_plan_id NULL, amount 0, event is free/published/open.
  - Paid events: status='pending', payment_status='pending',
    event_plan_id references an active plan whose price equals the
    registration amount, event is paid/published/open.

## Security
- Guest inserts scoped to anon with devotee_id IS NULL and valid contact data.
- is_guest_booking is SECURITY DEFINER with minimal grants.
- Event/plan consistency checks mirrored from the authenticated policy.
*/

ALTER TABLE public.bookings
  ALTER COLUMN devotee_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_mobile text NOT NULL DEFAULT '';

DROP POLICY IF EXISTS "bookings_guest_insert" ON public.bookings;
CREATE POLICY "bookings_guest_insert" ON public.bookings
  FOR INSERT TO anon
  WITH CHECK (
    devotee_id IS NULL
    AND char_length(trim(guest_name)) >= 2
    AND char_length(trim(guest_email)) >= 5
    AND char_length(regexp_replace(guest_mobile, '\D', '', 'g')) >= 10
  );

CREATE OR REPLACE FUNCTION public.is_guest_booking(target_booking_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE id = target_booking_id AND devotee_id IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_guest_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_guest_booking(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "participants_guest_insert" ON public.booking_participants;
CREATE POLICY "participants_guest_insert" ON public.booking_participants
  FOR INSERT TO anon
  WITH CHECK (public.is_guest_booking(booking_id));

ALTER TABLE public.event_registrations
  ALTER COLUMN devotee_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_mobile text NOT NULL DEFAULT '';

DROP POLICY IF EXISTS "event_reg_guest_insert" ON public.event_registrations;
CREATE POLICY "event_reg_guest_insert" ON public.event_registrations
  FOR INSERT TO anon
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
        AND EXISTS (
          SELECT 1
          FROM public.events
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
        )
      )
    )
  );
