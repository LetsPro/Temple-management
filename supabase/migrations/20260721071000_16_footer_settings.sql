/* Allow administrators to manage the opening-hours line shown in the footer. */

ALTER TABLE public.temple_settings
  ADD COLUMN IF NOT EXISTS footer_hours text NOT NULL DEFAULT 'Mon – Sun: 6:00 AM – 9:00 PM';

