/* Allow idempotent confirmation email tracking for paid donations. */

ALTER TABLE public.confirmation_emails
  DROP CONSTRAINT IF EXISTS confirmation_emails_confirmation_type_check;

ALTER TABLE public.confirmation_emails
  ADD CONSTRAINT confirmation_emails_confirmation_type_check
  CHECK (confirmation_type IN ('booking', 'membership', 'event', 'donation'));
