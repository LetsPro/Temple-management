export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'devotee'
          full_name: string
          mobile: string
          email: string
          address: string
          city: string
          state: string
          pincode: string
          avatar_url: string
          devotee_number: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'devotee_number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      temple_settings: {
        Row: {
          id: string
          temple_name: string
          tagline: string
          logo_url: string
          favicon_url: string
          hero_image_url: string
          address: string
          phone: string
          email: string
          google_maps_url: string
          social_media: Json
          receipt_prefix: string
          receipt_footer_note: string
          temple_registration_number: string
          booking_cancellation_hours: number
          booking_advance_days: number
          razorpay_key_id: string
          history_text: string
          mission_text: string
          about_image_url: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['temple_settings']['Row']>
        Update: Partial<Database['public']['Tables']['temple_settings']['Row']>
      }
      temple_timings: {
        Row: {
          id: string
          day_type: 'weekday' | 'weekend' | 'holiday' | 'special'
          label: string
          morning_open: string | null
          morning_close: string | null
          evening_open: string | null
          evening_close: string | null
          is_closed: boolean
          notes: string
          display_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['temple_timings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['temple_timings']['Insert']>
      }
      pooja_services: {
        Row: {
          id: string
          name: string
          category: string
          slug: string
          description: string
          benefits: string
          instructions: string
          price: number
          duration_minutes: number
          image_url: string
          capacity_per_slot: number
          booking_start_date: string | null
          booking_end_date: string | null
          available_days: Json
          is_active: boolean
          is_featured: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pooja_services']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['pooja_services']['Insert']>
      }
      pooja_service_slots: {
        Row: {
          id: string
          service_id: string
          slot_time: string
          days_of_week: Json
          max_capacity: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pooja_service_slots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pooja_service_slots']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          booking_number: string
          devotee_id: string
          service_id: string
          booking_date: string
          slot_id: string | null
          slot_time: string
          total_amount: number
          payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
          booking_status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled'
          participant_count: number
          special_notes: string
          cancellation_reason: string
          rescheduled_from_booking_id: string | null
          admin_notes: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'booking_number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      booking_participants: {
        Row: {
          id: string
          booking_id: string
          name: string
          age: string
          gotram: string
          nakshatra: string
          rashi: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['booking_participants']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['booking_participants']['Insert']>
      }
      payments: {
        Row: {
          id: string
          payment_type: 'booking' | 'donation' | 'membership'
          reference_id: string
          user_id: string | null
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
          amount: number
          currency: string
          payment_status: 'created' | 'paid' | 'failed' | 'refunded'
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      donations: {
        Row: {
          id: string
          donation_number: string
          devotee_id: string | null
          donor_name: string
          donor_email: string
          donor_mobile: string
          donor_address: string
          purpose: string
          custom_purpose: string
          amount: number
          is_anonymous: boolean
          payment_status: 'pending' | 'paid' | 'failed' | 'offline'
          offline_reference: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['donations']['Row'], 'id' | 'donation_number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['donations']['Insert']>
      }
      donation_purposes: {
        Row: { id: string; name: string; description: string; icon: string; is_active: boolean; display_order: number; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['donation_purposes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['donation_purposes']['Insert']>
      }
      membership_plans: {
        Row: { id: string; name: string; amount: number; duration_months: number; benefits: Json; is_active: boolean; display_order: number; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['membership_plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['membership_plans']['Insert']>
      }
      memberships: {
        Row: { id: string; membership_number: string; devotee_id: string; plan_id: string; full_name: string; spouse_name: string; date_of_birth: string; rashi: string; nakshatra: string; address: string; mobile: string; declaration_accepted: boolean; status: 'pending' | 'active' | 'expired' | 'cancelled'; payment_status: 'pending' | 'paid' | 'failed' | 'refunded'; starts_at: string | null; expires_at: string | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['memberships']['Row'], 'id' | 'membership_number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['memberships']['Insert']>
      }
      donation_receipts: {
        Row: {
          id: string
          receipt_number: string
          donation_id: string
          generated_at: string
          receipt_url: string
        }
        Insert: Omit<Database['public']['Tables']['donation_receipts']['Row'], 'id' | 'receipt_number' | 'generated_at'>
        Update: Partial<Database['public']['Tables']['donation_receipts']['Insert']>
      }
      events: {
        Row: {
          id: string
          title: string
          slug: string
          banner_image_url: string
          description: string
          start_datetime: string
          end_datetime: string
          venue: string
          registration_enabled: boolean
          capacity: number | null
          registration_closing_date: string | null
          is_published: boolean
          is_featured: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string
          devotee_id: string
          participant_count: number
          notes: string
          status: 'registered' | 'cancelled' | 'attended'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['event_registrations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['event_registrations']['Insert']>
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          image_url: string
          attachment_url: string
          priority: 'normal' | 'important' | 'urgent'
          is_published: boolean
          publish_at: string
          expires_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
      }
      gallery_albums: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          cover_image_url: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['gallery_albums']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['gallery_albums']['Insert']>
      }
      gallery_images: {
        Row: {
          id: string
          album_id: string
          image_url: string
          caption: string
          display_order: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['gallery_images']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['gallery_images']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'donation' | 'event'
          reference_type: string
          reference_id: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      admin_activity_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          entity_type: string
          entity_id: string | null
          details: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_activity_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_activity_logs']['Insert']>
      }
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          mobile: string
          subject: string
          message: string
          is_read: boolean
          admin_notes: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['contact_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['contact_messages']['Insert']>
      }
      blocked_service_dates: {
        Row: {
          id: string
          service_id: string | null
          blocked_date: string
          reason: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['blocked_service_dates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['blocked_service_dates']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: {
      get_slot_bookings_count: {
        Args: { p_service_id: string; p_slot_id: string; p_booking_date: string }
        Returns: number
      }
    }
    Enums: Record<string, never>
  }
}
