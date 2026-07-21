/* Create guest event registrations through a validated server-side function. */

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

  SELECT * INTO target_event
  FROM public.events
  WHERE id = p_event_id;

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
      event_plan_id, participant_count, amount, payment_status, status
    ) VALUES (
      p_event_id, NULL, trim(p_guest_name), trim(p_guest_email), trim(p_guest_mobile),
      NULL, 1, 0, 'not_required', 'registered'
    )
    RETURNING id INTO registration_id;
  ELSE
    SELECT * INTO target_plan
    FROM public.event_plans
    WHERE id = p_event_plan_id
      AND event_id = p_event_id
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The selected event plan is unavailable.';
    END IF;

    INSERT INTO public.event_registrations (
      event_id, devotee_id, guest_name, guest_email, guest_mobile,
      event_plan_id, participant_count, amount, payment_status, status
    ) VALUES (
      p_event_id, NULL, trim(p_guest_name), trim(p_guest_email), trim(p_guest_mobile),
      target_plan.id, 1, target_plan.price, 'pending', 'pending'
    )
    RETURNING id INTO registration_id;
  END IF;

  RETURN registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_event_registration(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_event_registration(uuid, uuid, text, text, text) TO anon, authenticated;
