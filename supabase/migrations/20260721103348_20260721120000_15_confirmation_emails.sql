/*
# Create confirmation_emails table

1. Purpose
- Track transactional confirmation emails sent for bookings, memberships, and event registrations.
- Prevent duplicate sends via a unique constraint on (confirmation_type, reference_id).

2. New Tables
- `public.confirmation_emails`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `confirmation_type` (text, not null) — one of 'booking', 'membership', 'event'
  - `reference_id` (uuid, not null) — the booking/membership/event row this email confirms
  - `recipient_email` (text, not null)
  - `status` (text, not null, default 'sending') — one of 'sending', 'sent', 'failed'
  - `provider_message_id` (text, nullable) — message id returned by the email provider
  - `error_message` (text, nullable) — populated when status = 'failed'
  - `sent_at` (timestamptz, nullable)
  - `created_at` (timestamptz, not null, default now())
  - `updated_at` (timestamptz, not null, default now())
  - UNIQUE (confirmation_type, reference_id) — enforces one confirmation email per referenced record

3. Indexes
- `confirmation_emails_status_idx` on (status, updated_at) — supports queries for in-flight / retryable sends.

4. Security
- RLS ENABLED on `confirmation_emails`.
- No client policies are intentionally defined: the table is locked to anon/authenticated access.
  Confirmation delivery is performed only by Edge Functions using the service-role client,
  which bypasses RLS. This keeps transactional email audit data out of the browser.

5. Notes
- Idempotent: uses IF NOT EXISTS for the table and index so re-running is safe.
- No DROP / DELETE / column type changes — purely additive.
*/

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