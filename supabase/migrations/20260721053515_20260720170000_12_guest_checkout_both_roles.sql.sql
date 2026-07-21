/*
# Recreate Guest Checkout Policies for Both Request Roles

A browser can briefly retain an authenticated JWT even after the public UI
has switched to guest mode. The row checks remain strict (devotee_id IS NULL,
valid guest contact fields, event/plan consistency), but allowing both the
anon and authenticated roles on the guest INSERT policies prevents that
session transition window from blocking a valid guest checkout.

## Policies recreated
- bookings_guest_insert: now TO anon, authenticated (was anon only).
- participants_guest_insert: now TO anon, authenticated (was anon only).
- event_reg_guest_insert: now TO anon, authenticated (was anon only).

All WITH CHECK predicates are unchanged — only the allowed roles expanded.
*/

DROP POLICY IF EXISTS "bookings_guest_insert" ON public.bookings;
CREATE POLICY "bookings_guest_insert" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    devotee_id IS NULL
    AND char_length(trim(guest_name)) >= 2
    AND char_length(trim(guest_email)) >= 5
    AND char_length(regexp_replace(guest_mobile, '\D', '', 'g')) >= 10
  );

DROP POLICY IF EXISTS "participants_guest_insert" ON public.booking_participants;
CREATE POLICY "participants_guest_insert" ON public.booking_participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_guest_booking(booking_id));

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
