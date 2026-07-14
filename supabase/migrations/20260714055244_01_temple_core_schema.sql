/*
# Temple Management System - Core Schema

## Overview
Creates all core tables for the Temple Management System, a multi-user application with:
- Admin and Devotee roles via profiles linked to auth.users
- Temple settings and timings management
- Pooja/Seva services with slots and bookings
- Donations with receipts
- Events and registrations
- Announcements, gallery, notifications, and contact messages

## New Tables

### profiles
- Linked to auth.users (uuid FK)
- role: 'admin' | 'devotee'
- full_name, mobile, email, address, city, state, pincode, avatar_url
- is_active: boolean for account status
- devotee_number: auto-generated unique ID

### temple_settings
- Temple name, tagline, logo_url, favicon_url, hero_image_url
- address, phone, email, google_maps_url
- social_media links (JSON)
- receipt_prefix, receipt_footer_note, temple_registration_number
- booking_cancellation_hours, booking_advance_days
- razorpay_key_id (public key only)

### temple_timings
- day_type: 'weekday' | 'weekend' | 'holiday'
- morning_open, morning_close, evening_open, evening_close
- is_closed, notes

### pooja_services
- name, category, slug, description, benefits, instructions
- price (numeric), duration_minutes
- image_url, capacity_per_slot
- booking_start_date, booking_end_date
- available_days (JSON array), is_active, is_featured

### pooja_service_slots
- service_id FK, slot_time (time), days_of_week (JSON)
- max_capacity, is_active

### blocked_service_dates
- service_id FK, blocked_date, reason

### bookings
- booking_number (unique, auto-generated), devotee_id FK, service_id FK
- booking_date, slot_id FK
- total_amount, payment_status, booking_status
- participant_count, special_notes
- cancellation_reason, rescheduled_from_booking_id

### booking_participants
- booking_id FK, name, age, gotram, nakshatra, rashi

### payments
- payment_type: 'booking' | 'donation'
- reference_id (booking_id or donation_id)
- razorpay_order_id, razorpay_payment_id, razorpay_signature
- amount, currency, payment_status, paid_at

### donations
- donation_number (unique), devotee_id (nullable for anonymous)
- donor_name, donor_email, donor_mobile, donor_address
- purpose, custom_purpose, amount
- is_anonymous, payment_status
- offline_reference, notes

### donation_receipts
- receipt_number (unique), donation_id FK
- generated_at, receipt_url

### events
- title, slug, banner_image_url, description
- start_datetime, end_datetime, venue
- registration_enabled, capacity, registration_closing_date
- is_published, is_featured

### event_registrations
- event_id FK, devotee_id FK, participant_count
- notes, status: 'registered' | 'cancelled' | 'attended'

### announcements
- title, content, image_url, attachment_url
- priority: 'normal' | 'important' | 'urgent'
- is_published, publish_at, expires_at
- created_by FK (admin profile)

### gallery_albums
- name, slug, description, cover_image_url, display_order, is_active

### gallery_images
- album_id FK, image_url, caption, display_order, is_active

### notifications
- user_id FK (profiles), title, message, type
- reference_type, reference_id, is_read, read_at

### admin_activity_logs
- admin_id FK, action, entity_type, entity_id, details (JSON)

### contact_messages
- name, email, mobile, subject, message, is_read, admin_notes

## Security
- RLS enabled on ALL tables
- Devotees can only access their own data
- Admins (role='admin') have full access via service_role patterns
- Public data (temple_settings, timings, services, events, announcements) readable by anon
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'devotee' CHECK (role IN ('admin', 'devotee')),
  full_name text NOT NULL DEFAULT '',
  mobile text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  pincode text DEFAULT '',
  avatar_url text DEFAULT '',
  devotee_number text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Auto-generate devotee number
CREATE OR REPLACE FUNCTION generate_devotee_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.devotee_number IS NULL THEN
    NEW.devotee_number := 'DEV' || LPAD(nextval('devotee_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS devotee_number_seq START 1000;

DROP TRIGGER IF EXISTS set_devotee_number ON profiles;
CREATE TRIGGER set_devotee_number
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_devotee_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TEMPLE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS temple_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_name text NOT NULL DEFAULT 'Sri Mahalakshmi Temple',
  tagline text DEFAULT 'A sacred space for devotion, community and service',
  logo_url text DEFAULT '',
  favicon_url text DEFAULT '',
  hero_image_url text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  google_maps_url text DEFAULT '',
  social_media jsonb DEFAULT '{}',
  receipt_prefix text DEFAULT 'TMS',
  receipt_footer_note text DEFAULT 'Thank you for your generous contribution. May the Lord bless you and your family.',
  temple_registration_number text DEFAULT '',
  booking_cancellation_hours int DEFAULT 24,
  booking_advance_days int DEFAULT 90,
  razorpay_key_id text DEFAULT '',
  history_text text DEFAULT '',
  mission_text text DEFAULT '',
  about_image_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE temple_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "temple_settings_public_read" ON temple_settings;
CREATE POLICY "temple_settings_public_read" ON temple_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "temple_settings_admin_update" ON temple_settings;
CREATE POLICY "temple_settings_admin_update" ON temple_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "temple_settings_admin_insert" ON temple_settings;
CREATE POLICY "temple_settings_admin_insert" ON temple_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS temple_settings_updated_at ON temple_settings;
CREATE TRIGGER temple_settings_updated_at
  BEFORE UPDATE ON temple_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TEMPLE TIMINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS temple_timings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_type text NOT NULL CHECK (day_type IN ('weekday', 'weekend', 'holiday', 'special')),
  label text NOT NULL DEFAULT '',
  morning_open time,
  morning_close time,
  evening_open time,
  evening_close time,
  is_closed boolean DEFAULT false,
  notes text DEFAULT '',
  display_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE temple_timings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timings_public_read" ON temple_timings;
CREATE POLICY "timings_public_read" ON temple_timings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "timings_admin_write" ON temple_timings;
CREATE POLICY "timings_admin_write" ON temple_timings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "timings_admin_update" ON temple_timings;
CREATE POLICY "timings_admin_update" ON temple_timings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "timings_admin_delete" ON temple_timings;
CREATE POLICY "timings_admin_delete" ON temple_timings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- POOJA SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS pooja_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  benefits text DEFAULT '',
  instructions text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes int NOT NULL DEFAULT 60,
  image_url text DEFAULT '',
  capacity_per_slot int NOT NULL DEFAULT 10,
  booking_start_date date,
  booking_end_date date,
  available_days jsonb DEFAULT '[0,1,2,3,4,5,6]',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  display_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pooja_services_active ON pooja_services(is_active);
CREATE INDEX IF NOT EXISTS idx_pooja_services_category ON pooja_services(category);

ALTER TABLE pooja_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_public_read" ON pooja_services;
CREATE POLICY "services_public_read" ON pooja_services FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "services_admin_read_all" ON pooja_services;
CREATE POLICY "services_admin_read_all" ON pooja_services FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "services_admin_insert" ON pooja_services;
CREATE POLICY "services_admin_insert" ON pooja_services FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "services_admin_update" ON pooja_services;
CREATE POLICY "services_admin_update" ON pooja_services FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "services_admin_delete" ON pooja_services;
CREATE POLICY "services_admin_delete" ON pooja_services FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS pooja_services_updated_at ON pooja_services;
CREATE TRIGGER pooja_services_updated_at
  BEFORE UPDATE ON pooja_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- POOJA SERVICE SLOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS pooja_service_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES pooja_services(id) ON DELETE CASCADE,
  slot_time time NOT NULL,
  days_of_week jsonb DEFAULT '[0,1,2,3,4,5,6]',
  max_capacity int NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slots_service ON pooja_service_slots(service_id);

ALTER TABLE pooja_service_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slots_public_read" ON pooja_service_slots;
CREATE POLICY "slots_public_read" ON pooja_service_slots FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "slots_admin_write" ON pooja_service_slots;
CREATE POLICY "slots_admin_write" ON pooja_service_slots FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "slots_admin_update" ON pooja_service_slots;
CREATE POLICY "slots_admin_update" ON pooja_service_slots FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "slots_admin_delete" ON pooja_service_slots;
CREATE POLICY "slots_admin_delete" ON pooja_service_slots FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- BLOCKED SERVICE DATES
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_service_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES pooja_services(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blocked_service_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_dates_public_read" ON blocked_service_dates;
CREATE POLICY "blocked_dates_public_read" ON blocked_service_dates FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "blocked_dates_admin_write" ON blocked_service_dates;
CREATE POLICY "blocked_dates_admin_write" ON blocked_service_dates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "blocked_dates_admin_delete" ON blocked_service_dates;
CREATE POLICY "blocked_dates_admin_delete" ON blocked_service_dates FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 10001;

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL DEFAULT ('BK' || LPAD(nextval('booking_number_seq')::text, 6, '0')),
  devotee_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES pooja_services(id),
  booking_date date NOT NULL,
  slot_id uuid REFERENCES pooja_service_slots(id),
  slot_time text NOT NULL DEFAULT '',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  booking_status text NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
  participant_count int NOT NULL DEFAULT 1,
  special_notes text DEFAULT '',
  cancellation_reason text DEFAULT '',
  rescheduled_from_booking_id uuid REFERENCES bookings(id),
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_devotee ON bookings(devotee_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = devotee_id);

DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = devotee_id);

DROP POLICY IF EXISTS "bookings_update_own" ON bookings;
CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = devotee_id) WITH CHECK (auth.uid() = devotee_id);

DROP POLICY IF EXISTS "bookings_admin_all" ON bookings;
CREATE POLICY "bookings_admin_all" ON bookings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "bookings_admin_update" ON bookings;
CREATE POLICY "bookings_admin_update" ON bookings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BOOKING PARTICIPANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name text NOT NULL,
  age text DEFAULT '',
  gotram text DEFAULT '',
  nakshatra text DEFAULT '',
  rashi text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_select" ON booking_participants;
CREATE POLICY "participants_select" ON booking_participants FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.devotee_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
  );

DROP POLICY IF EXISTS "participants_insert" ON booking_participants;
CREATE POLICY "participants_insert" ON booking_participants FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.devotee_id = auth.uid())
  );

DROP POLICY IF EXISTS "participants_delete" ON booking_participants;
CREATE POLICY "participants_delete" ON booking_participants FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.devotee_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type text NOT NULL CHECK (payment_type IN ('booking', 'donation')),
  reference_id uuid NOT NULL,
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  razorpay_order_id text DEFAULT '',
  razorpay_payment_id text DEFAULT '',
  razorpay_signature text DEFAULT '',
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  payment_status text NOT NULL DEFAULT 'created' CHECK (payment_status IN ('created', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_own" ON payments;
CREATE POLICY "payments_select_own" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_insert_own" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_admin_all" ON payments;
CREATE POLICY "payments_admin_all" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONATIONS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS donation_number_seq START 20001;

CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_number text UNIQUE NOT NULL DEFAULT ('DN' || LPAD(nextval('donation_number_seq')::text, 6, '0')),
  devotee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name text NOT NULL DEFAULT 'Anonymous',
  donor_email text DEFAULT '',
  donor_mobile text DEFAULT '',
  donor_address text DEFAULT '',
  purpose text NOT NULL DEFAULT 'General Donation',
  custom_purpose text DEFAULT '',
  amount numeric(10,2) NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'offline')),
  offline_reference text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_devotee ON donations(devotee_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(payment_status);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donations_select_own" ON donations;
CREATE POLICY "donations_select_own" ON donations FOR SELECT
  TO authenticated USING (auth.uid() = devotee_id);

DROP POLICY IF EXISTS "donations_anon_insert" ON donations;
CREATE POLICY "donations_anon_insert" ON donations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "donations_admin_all" ON donations;
CREATE POLICY "donations_admin_all" ON donations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "donations_admin_update" ON donations;
CREATE POLICY "donations_admin_update" ON donations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS donations_updated_at ON donations;
CREATE TRIGGER donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONATION RECEIPTS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 30001;

CREATE TABLE IF NOT EXISTS donation_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL DEFAULT ('RCP' || LPAD(nextval('receipt_number_seq')::text, 6, '0')),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  receipt_url text DEFAULT ''
);

ALTER TABLE donation_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipts_select" ON donation_receipts;
CREATE POLICY "receipts_select" ON donation_receipts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM donations d WHERE d.id = donation_id AND (d.devotee_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')))
  );

DROP POLICY IF EXISTS "receipts_insert" ON donation_receipts;
CREATE POLICY "receipts_insert" ON donation_receipts FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  banner_image_url text DEFAULT '',
  description text DEFAULT '',
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  venue text DEFAULT '',
  registration_enabled boolean NOT NULL DEFAULT false,
  capacity int,
  registration_closing_date timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  display_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_datetime);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read" ON events;
CREATE POLICY "events_public_read" ON events FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "events_admin_read_all" ON events;
CREATE POLICY "events_admin_read_all" ON events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "events_admin_insert" ON events;
CREATE POLICY "events_admin_insert" ON events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "events_admin_update" ON events;
CREATE POLICY "events_admin_update" ON events FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "events_admin_delete" ON events;
CREATE POLICY "events_admin_delete" ON events FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- EVENT REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  devotee_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  participant_count int NOT NULL DEFAULT 1,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'attended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, devotee_id)
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_reg_select_own" ON event_registrations;
CREATE POLICY "event_reg_select_own" ON event_registrations FOR SELECT
  TO authenticated USING (auth.uid() = devotee_id);

DROP POLICY IF EXISTS "event_reg_insert" ON event_registrations;
CREATE POLICY "event_reg_insert" ON event_registrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = devotee_id);

DROP POLICY IF EXISTS "event_reg_update_own" ON event_registrations;
CREATE POLICY "event_reg_update_own" ON event_registrations FOR UPDATE
  TO authenticated USING (auth.uid() = devotee_id) WITH CHECK (auth.uid() = devotee_id);

DROP POLICY IF EXISTS "event_reg_admin_all" ON event_registrations;
CREATE POLICY "event_reg_admin_all" ON event_registrations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  attachment_url text DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  is_published boolean NOT NULL DEFAULT false,
  publish_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, publish_at);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_public_read" ON announcements;
CREATE POLICY "announcements_public_read" ON announcements FOR SELECT
  TO anon, authenticated USING (is_published = true AND publish_at <= now() AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "announcements_admin_read_all" ON announcements;
CREATE POLICY "announcements_admin_read_all" ON announcements FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "announcements_admin_insert" ON announcements;
CREATE POLICY "announcements_admin_insert" ON announcements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "announcements_admin_update" ON announcements;
CREATE POLICY "announcements_admin_update" ON announcements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "announcements_admin_delete" ON announcements;
CREATE POLICY "announcements_admin_delete" ON announcements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS announcements_updated_at ON announcements;
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- GALLERY ALBUMS
-- ============================================================
CREATE TABLE IF NOT EXISTS gallery_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  cover_image_url text DEFAULT '',
  display_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "albums_public_read" ON gallery_albums;
CREATE POLICY "albums_public_read" ON gallery_albums FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "albums_admin_write" ON gallery_albums;
CREATE POLICY "albums_admin_write" ON gallery_albums FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "albums_admin_update" ON gallery_albums;
CREATE POLICY "albums_admin_update" ON gallery_albums FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "albums_admin_delete" ON gallery_albums;
CREATE POLICY "albums_admin_delete" ON gallery_albums FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- GALLERY IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text DEFAULT '',
  display_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "images_public_read" ON gallery_images;
CREATE POLICY "images_public_read" ON gallery_images FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "images_admin_write" ON gallery_images;
CREATE POLICY "images_admin_write" ON gallery_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "images_admin_update" ON gallery_images;
CREATE POLICY "images_admin_update" ON gallery_images FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "images_admin_delete" ON gallery_images;
CREATE POLICY "images_admin_delete" ON gallery_images FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'booking', 'donation', 'event')),
  reference_type text DEFAULT '',
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ADMIN ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_admin ON admin_activity_logs(admin_id);

ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_admin_select" ON admin_activity_logs;
CREATE POLICY "activity_admin_select" ON admin_activity_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "activity_admin_insert" ON admin_activity_logs;
CREATE POLICY "activity_admin_insert" ON admin_activity_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- CONTACT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  mobile text DEFAULT '',
  subject text NOT NULL DEFAULT '',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_anon_insert" ON contact_messages;
CREATE POLICY "contact_anon_insert" ON contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contact_admin_select" ON contact_messages;
CREATE POLICY "contact_admin_select" ON contact_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "contact_admin_update" ON contact_messages;
CREATE POLICY "contact_admin_update" ON contact_messages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- HELPER FUNCTION: Check slot availability
-- ============================================================
CREATE OR REPLACE FUNCTION get_slot_bookings_count(
  p_service_id uuid,
  p_slot_id uuid,
  p_booking_date date
)
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(participant_count), 0)
    FROM bookings
    WHERE service_id = p_service_id
      AND slot_id = p_slot_id
      AND booking_date = p_booking_date
      AND booking_status NOT IN ('cancelled', 'rescheduled')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
