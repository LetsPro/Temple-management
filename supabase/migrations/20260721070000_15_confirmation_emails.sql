/* Track transactional confirmation emails and prevent duplicate sends. */

CREATE TABLE IF NOT EXISTS public.confirmation_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_type text NOT NULL CHECK (confirmation_type IN ('booking', 'membership', 'event')),
  reference_id uuid NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (confirmation_type, reference_id)
);

CREATE INDEX IF NOT EXISTS confirmation_emails_status_idx
  ON public.confirmation_emails (status, updated_at);

ALTER TABLE public.confirmation_emails ENABLE ROW LEVEL SECURITY;

-- No client policies are intentionally defined. Confirmation delivery is
-- performed only by Edge Functions using the service-role client.

