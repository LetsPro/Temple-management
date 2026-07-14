/*
# Temple Management System - Seed Data

## Overview
Inserts realistic development seed data including:
- Temple settings
- Darshan timings
- Sample pooja services with slots
- Featured events
- Announcements
- Gallery albums

All data is idempotent using INSERT ... ON CONFLICT DO NOTHING or ON CONFLICT DO UPDATE.
No real user accounts are created - those come through the auth flow.
*/

-- Temple Settings
INSERT INTO temple_settings (
  id, temple_name, tagline, address, phone, email, google_maps_url,
  history_text, mission_text, receipt_prefix, temple_registration_number,
  razorpay_key_id, social_media, booking_cancellation_hours, booking_advance_days
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Sri Mahalakshmi Temple',
  'A sacred space for devotion, community and divine grace',
  '12, Temple Street, Mylapore, Chennai - 600004, Tamil Nadu, India',
  '+91 44 2345 6789',
  'info@srimahalakshmi.org',
  'https://maps.google.com/?q=Sri+Mahalakshmi+Temple+Mylapore+Chennai',
  'Sri Mahalakshmi Temple was consecrated over 200 years ago by the great saint Swami Sivananda. Located in the heart of Mylapore, this sacred temple is dedicated to Goddess Mahalakshmi, the deity of prosperity, wisdom and auspiciousness. The temple follows the Agama Shastra traditions and conducts daily rituals as prescribed by the scriptures. Over the centuries, the temple has been a beacon of spiritual light and community service, providing annadanam (free meals), educational support and various social welfare activities.',
  'Our mission is to preserve ancient Hindu traditions and provide a welcoming spiritual home for all devotees. We are committed to performing daily rituals with sincerity, organizing festivals that bring the community together, and offering charitable services to those in need. We believe that a temple is not just a place of worship but a center of cultural heritage, community service and spiritual education.',
  'TMS',
  'HR/2024/TN/001234',
  '',
  '{"facebook": "https://facebook.com/srimahalakshmi", "instagram": "https://instagram.com/srimahalakshmi", "youtube": "https://youtube.com/@srimahalakshmi", "whatsapp": "+914423456789"}',
  24,
  90
) ON CONFLICT (id) DO UPDATE SET
  temple_name = EXCLUDED.temple_name,
  tagline = EXCLUDED.tagline;

-- Temple Timings
INSERT INTO temple_timings (day_type, label, morning_open, morning_close, evening_open, evening_close, display_order) VALUES
  ('weekday', 'Monday to Friday', '06:00', '12:30', '16:00', '20:30', 1),
  ('weekend', 'Saturday & Sunday', '05:30', '13:00', '16:00', '21:00', 2),
  ('holiday', 'Public Holidays', '05:00', '13:30', '15:30', '21:30', 3),
  ('special', 'Festival Days', '04:30', '14:00', '15:00', '22:00', 4)
ON CONFLICT DO NOTHING;

-- Pooja Services
INSERT INTO pooja_services (id, name, category, slug, description, benefits, instructions, price, duration_minutes, capacity_per_slot, is_active, is_featured, display_order, available_days) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Abhishekam', 'Archana', 'abhishekam', 'A sacred ritual of bathing the deity with panchamrita (milk, honey, curds, ghee and sugar), followed by water, sandalwood paste and flower offering. The divine energy radiates blessings to all participants.', 'Cleanses sins, bestows prosperity, grants wishes, brings peace and harmony to the household.', 'Please arrive 15 minutes before the scheduled time. Wear traditional attire. Bring flowers, fruits and coconut as prasad offerings. Maintain silence during the ritual.', 501.00, 60, 5, true, true, 1, '[0,1,2,3,4,5,6]'),
  ('b0000000-0000-0000-0000-000000000002', 'Sahasranama Archana', 'Archana', 'sahasranama-archana', 'The chanting of 1008 sacred names of Goddess Mahalakshmi with flower offerings. Each name invokes a specific divine quality and bestows blessings on the devotee.', 'Fulfills desires, removes obstacles, brings wealth and prosperity, ensures success in endeavors.', 'Booking must be made at least 24 hours in advance. Devotees may participate along with the priest. Bring tulsi leaves and marigold flowers.', 251.00, 90, 3, true, true, 2, '[0,1,2,3,4,5,6]'),
  ('b0000000-0000-0000-0000-000000000003', 'Kalyanam (Divine Wedding)', 'Special Seva', 'kalyanam', 'A grand ritualistic celebration of the divine wedding of Lord and Goddess performed with vedic chants, flower decorations and traditional music. Extremely auspicious for newlyweds and those seeking a blessed marriage.', 'Blesses couples with a happy and prosperous married life. Highly recommended for those seeking a suitable life partner.', 'This is a group ceremony. Couples should register together. Traditional South Indian wedding attire is preferred. Venue will be decorated with flowers. Duration includes the full ceremony.', 2501.00, 180, 10, true, true, 3, '[6,0]'),
  ('b0000000-0000-0000-0000-000000000004', 'Vastra Samarpana', 'Special Seva', 'vastra-samarpana', 'The divine offering of sacred silk garments to the deity. One of the most revered sevas that directly adorns the Goddess and attracts her fullest blessings.', 'The deity wears the offered garment during the next pooja, bringing immense merit to the donor and their family.', 'The silk garments are provided by the temple after donation. You may optionally bring a personal garment (9-yard saree) for offering. The garment will be returned as prasad.', 1001.00, 30, 2, true, false, 4, '[0,1,2,3,4,5,6]'),
  ('b0000000-0000-0000-0000-000000000005', 'Homam (Fire Ritual)', 'Homam', 'homam', 'A powerful vedic fire ritual where sacred materials are offered into the consecrated fire as an offering to the divine. Conducted by experienced priests with specific mantras for the devotee''s intention.', 'Purifies the environment, removes negative energies, fulfills specific wishes, bestows divine protection on the family.', 'Please specify your intention (wish/prayer) at the time of booking. Bring ghee and coconut. The ritual takes place in the dedicated homam kund. Appropriate protective clothing will be provided.', 1001.00, 120, 8, true, true, 5, '[0,3,6]'),
  ('b0000000-0000-0000-0000-000000000006', 'Navagraha Pooja', 'Archana', 'navagraha-pooja', 'A comprehensive ritual to propitiate the nine planetary deities. Specific mantras, flowers, grains and incense are offered to each graha to neutralize negative planetary influences in the horoscope.', 'Reduces malefic effects of planets, brings career success, resolves health issues related to planetary doshas, improves overall fortune.', 'Bring your horoscope details if available. The priest will customize the ritual based on your planetary positions. Duration may extend based on complexity.', 751.00, 90, 6, true, false, 6, '[0,1,2,3,4,5,6]'),
  ('b0000000-0000-0000-0000-000000000007', 'Annadanam Sponsorship', 'Charity', 'annadanam-sponsorship', 'Sponsor a day of free meals for devotees and the needy visiting the temple. Annadanam (charity of food) is considered the highest form of charity in Hindu tradition.', 'Earns immense divine merit. The sponsor''s name is announced during the meal service. Accumulates virtue for the entire family.', 'The temple kitchen prepares a full meal including rice, dal, sambar, vegetables and sweets. Minimum sponsorship feeds 50 people. You may be present during the service.', 2501.00, 0, 1, true, false, 7, '[0,1,2,3,4,5,6]'),
  ('b0000000-0000-0000-0000-000000000008', 'Satyanarayan Katha', 'Katha & Pravachan', 'satyanarayan-katha', 'A beloved and auspicious ritual involving the recitation of Satyanarayan Katha (story of Lord Vishnu) followed by pooja and prasad distribution. Conducted for auspicious occasions like housewarmings, birthdays and anniversaries.', 'Brings peace and prosperity to the household, removes obstacles, ensures smooth completion of new ventures and celebrations.', 'This seva requires advance booking of minimum 7 days. The priest visits your home or can be conducted at the temple. Please mention the occasion. Prasad materials are included in the fee.', 1501.00, 180, 4, true, false, 8, '[0,1,2,3,4,5,6]')
ON CONFLICT (id) DO NOTHING;

-- Slots for Abhishekam
INSERT INTO pooja_service_slots (service_id, slot_time, days_of_week, max_capacity) VALUES
  ('b0000000-0000-0000-0000-000000000001', '06:30', '[0,1,2,3,4,5,6]', 5),
  ('b0000000-0000-0000-0000-000000000001', '08:00', '[0,1,2,3,4,5,6]', 5),
  ('b0000000-0000-0000-0000-000000000001', '10:00', '[0,1,2,3,4,5,6]', 5),
  ('b0000000-0000-0000-0000-000000000001', '17:00', '[0,1,2,3,4,5,6]', 5),
  ('b0000000-0000-0000-0000-000000000001', '18:30', '[0,1,2,3,4,5,6]', 5)
ON CONFLICT DO NOTHING;

-- Slots for Sahasranama Archana
INSERT INTO pooja_service_slots (service_id, slot_time, days_of_week, max_capacity) VALUES
  ('b0000000-0000-0000-0000-000000000002', '07:00', '[0,1,2,3,4,5,6]', 3),
  ('b0000000-0000-0000-0000-000000000002', '09:30', '[0,1,2,3,4,5,6]', 3),
  ('b0000000-0000-0000-0000-000000000002', '17:30', '[0,1,2,3,4,5,6]', 3)
ON CONFLICT DO NOTHING;

-- Slots for Homam
INSERT INTO pooja_service_slots (service_id, slot_time, days_of_week, max_capacity) VALUES
  ('b0000000-0000-0000-0000-000000000005', '07:00', '[0,3,6]', 8),
  ('b0000000-0000-0000-0000-000000000005', '16:00', '[0,3,6]', 8)
ON CONFLICT DO NOTHING;

-- Events
INSERT INTO events (id, title, slug, description, start_datetime, end_datetime, venue, registration_enabled, capacity, is_published, is_featured) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'Brahmotsavam 2025 - 10-Day Grand Festival',
   'brahmotsavam-2025',
   'The annual Brahmotsavam is the grandest festival of our temple spanning 10 magnificent days. This year''s celebration will feature elaborate processions with the deity being taken around the temple streets on various decorated vahanas (vehicles) including Garuda, Simha, Elephant and the grand Ratham (chariot). Hundreds of devotees participate in this ancient tradition dating back centuries. Special deeparadhana, cultural programs, Harikatha, Carnatic music concerts and traditional dance performances are planned throughout the festival period.',
   '2025-03-15 05:00:00+05:30',
   '2025-03-24 22:00:00+05:30',
   'Sri Mahalakshmi Temple, Mylapore, Chennai',
   false,
   null,
   true,
   true),
  ('c0000000-0000-0000-0000-000000000002',
   'Navratri Celebrations 2025',
   'navratri-2025',
   'Nine nights of divine celebration honoring the nine manifestations of Goddess Durga. Each day features unique decorations of the deity (Golu arrangement), special poojas dedicated to different forms of the Goddess, devotional songs by local artists, and cultural performances by children and youth. Grand Saraswati Pooja on Ashtami and Vijayadasami celebrations conclude the festival with Ayudha Pooja.',
   '2025-10-02 18:00:00+05:30',
   '2025-10-12 21:00:00+05:30',
   'Sri Mahalakshmi Temple Main Hall, Mylapore',
   true,
   500,
   true,
   true),
  ('c0000000-0000-0000-0000-000000000003',
   'Karthigai Deepam - Festival of Lights',
   'karthigai-deepam-2025',
   'The magnificent festival of lights celebrated on the full moon day of the Tamil month Karthigai. The entire temple is illuminated with thousands of earthen diyas (lamps). A grand deepa pradhakshina (circumambulation with lamps) is performed by devotees around the temple. The sight of the temple aglow with thousands of lamps is spiritually uplifting and visually breathtaking.',
   '2025-12-04 17:00:00+05:30',
   '2025-12-04 22:00:00+05:30',
   'Sri Mahalakshmi Temple & Temple Street',
   false,
   null,
   true,
   false),
  ('c0000000-0000-0000-0000-000000000004',
   'Vedic Chanting Workshop - Beginners',
   'vedic-chanting-workshop-jan-2025',
   'A 4-week beginner-friendly workshop on Vedic chanting and Sanskrit pronunciation conducted by Pandit Raghavendra Sharma. Learn the basics of Rigveda recitation, understand the significance of sacred mantras, and practice proper pronunciation and intonation. Suitable for all age groups. Session materials will be provided.',
   '2025-08-01 09:00:00+05:30',
   '2025-08-22 11:00:00+05:30',
   'Temple Learning Hall, 2nd Floor',
   true,
   30,
   true,
   false)
ON CONFLICT (id) DO NOTHING;

-- Announcements
INSERT INTO announcements (id, title, content, priority, is_published, publish_at) VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'Special Abhishekam on Fridays during Aadi Month',
   'As a special religious observance during the auspicious Tamil month of Aadi (July-August), the temple will conduct additional Abhishekam sessions every Friday at 6:00 AM and 7:30 PM. Devotees are encouraged to attend and seek the blessings of Goddess Mahalakshmi during this spiritually significant period. No prior booking required for Friday 6 AM session.',
   'important',
   true,
   now() - interval '5 days'),
  ('d0000000-0000-0000-0000-000000000002',
   'Temple Renovation - East Wing Temporarily Closed',
   'As part of our ongoing temple beautification and structural strengthening project, the East Wing (including the secondary shrine and meditation hall) will be closed for renovation from 1st August to 31st October 2025. All main temple functions, including daily poojas, will continue uninterrupted. We apologize for any inconvenience and thank you for your patience and support.',
   'urgent',
   true,
   now() - interval '2 days'),
  ('d0000000-0000-0000-0000-000000000003',
   'Online Booking System Now Available',
   'We are delighted to announce the launch of our new online temple management system. Devotees can now book poojas and sevas, make donations, and register for events from the comfort of their homes. The system accepts secure online payments through Razorpay. For any assistance with online booking, please contact our help desk at info@srimahalakshmi.org or call +91 44 2345 6789 during office hours (9 AM to 5 PM, Monday to Saturday).',
   'normal',
   true,
   now() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000004',
   'Annadanam Service Expanded to 7 Days a Week',
   'By the grace of Goddess Mahalakshmi and the generous support of our devotees, the temple''s Annadanam (free meal) service has been expanded from 5 days to 7 days a week starting from 1st July 2025. Meals are served daily at 12:30 PM. Any devotee or visitor may partake in this prasad. Those wishing to sponsor a day of Annadanam can do so through the online booking system or by contacting the temple office.',
   'normal',
   true,
   now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- Gallery Albums
INSERT INTO gallery_albums (id, name, slug, description, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Brahmotsavam 2024', 'brahmotsavam-2024', 'Highlights from the grand annual Brahmotsavam celebrations spanning 10 days', 1),
  ('e0000000-0000-0000-0000-000000000002', 'Temple Architecture', 'temple-architecture', 'The magnificent architecture and sacred spaces of our ancient temple', 2),
  ('e0000000-0000-0000-0000-000000000003', 'Navratri 2024', 'navratri-2024', 'Nine nights of divine celebration - Golu decorations, cultural programs and festival events', 3),
  ('e0000000-0000-0000-0000-000000000004', 'Daily Rituals', 'daily-rituals', 'Sacred daily rituals performed by our dedicated priests', 4)
ON CONFLICT (id) DO NOTHING;

-- Gallery Images (using Pexels stock photos with temple/spirituality themes)
INSERT INTO gallery_images (album_id, image_url, caption, display_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=800', 'Grand procession on day one of Brahmotsavam', 1),
  ('e0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/3214958/pexels-photo-3214958.jpeg?auto=compress&cs=tinysrgb&w=800', 'Garuda Vahana Seva - the celestial eagle procession', 2),
  ('e0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/1694524/pexels-photo-1694524.jpeg?auto=compress&cs=tinysrgb&w=800', 'Thousands of devotees gathered for the grand Rathotsavam', 3),
  ('e0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/8828464/pexels-photo-8828464.jpeg?auto=compress&cs=tinysrgb&w=800', 'The magnificent gopuram (tower) of our temple', 4),
  ('e0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=800', 'The sacred mandapam decorated for festivals', 5),
  ('e0000000-0000-0000-0000-000000000003', 'https://images.pexels.com/photos/8817756/pexels-photo-8817756.jpeg?auto=compress&cs=tinysrgb&w=800', 'Navratri Golu display with 9 steps of dolls', 6),
  ('e0000000-0000-0000-0000-000000000003', 'https://images.pexels.com/photos/8828455/pexels-photo-8828455.jpeg?auto=compress&cs=tinysrgb&w=800', 'Evening aarti during Navratri celebrations', 7),
  ('e0000000-0000-0000-0000-000000000004', 'https://images.pexels.com/photos/6204046/pexels-photo-6204046.jpeg?auto=compress&cs=tinysrgb&w=800', 'Morning abhishekam performed by the head priest', 8),
  ('e0000000-0000-0000-0000-000000000004', 'https://images.pexels.com/photos/6204034/pexels-photo-6204034.jpeg?auto=compress&cs=tinysrgb&w=800', 'Sacred lamps lit during deeparadhana', 9)
ON CONFLICT DO NOTHING;
