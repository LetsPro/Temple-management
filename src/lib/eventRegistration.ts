import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { payWithRazorpay } from './razorpay'
import type { Database } from './database.types'

type Event = Database['public']['Tables']['events']['Row']
type EventPlan = Database['public']['Tables']['event_plans']['Row']

export async function registerForEvent(input: {
  event: Event
  plan?: EventPlan
  user?: User | null
  profile?: { full_name?: string; email?: string; mobile?: string } | null
  guest?: { name: string; email: string; mobile: string }
}) {
  const { event, plan, user, profile, guest } = input
  if (!user && (!guest?.name.trim() || !guest.email.includes('@') || guest.mobile.replace(/\D/g, '').length < 10)) {
    throw new Error('Enter your name, email and valid mobile number to continue.')
  }

  let existing: { id: string; status: string; payment_status: string } | null = null
  if (user) {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id,status,payment_status')
      .eq('event_id', event.id)
      .eq('devotee_id', user.id)
      .maybeSingle()
    if (error) throw error
    existing = data
  }

  const registrant = {
    devotee_id: user?.id || null,
    guest_name: user ? '' : guest!.name.trim(),
    guest_email: user ? '' : guest!.email.trim(),
    guest_mobile: user ? '' : guest!.mobile.trim(),
  }

  if (event.pricing_type === 'free') {
    if (existing) {
      const { error } = await supabase.from('event_registrations').update({
        event_plan_id: null,
        amount: 0,
        payment_status: 'not_required',
        status: 'registered',
      }).eq('id', existing.id)
      if (error) throw error
      return existing.id
    }
    const { data: registration, error } = await supabase.from('event_registrations').insert({
      event_id: event.id,
      ...registrant,
      event_plan_id: null,
      participant_count: 1,
      amount: 0,
      payment_status: 'not_required',
      status: 'registered',
    }).select('id').single()
    if (error || !registration) throw error || new Error('Could not create event registration.')
    return registration.id
  }

  if (!plan) throw new Error('Select a plan to continue.')
  if (existing?.status === 'registered' && existing.payment_status === 'paid') return existing.id

  let registrationId = existing?.id
  if (existing) {
    const { error } = await supabase.from('event_registrations').update({
      event_plan_id: plan.id,
      amount: Number(plan.price),
      payment_status: 'pending',
      status: 'pending',
    }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { data: registration, error } = await supabase.from('event_registrations').insert({
      event_id: event.id,
      ...registrant,
      event_plan_id: plan.id,
      participant_count: 1,
      amount: Number(plan.price),
      payment_status: 'pending',
      status: 'pending',
    }).select('id').single()
    if (error || !registration) throw error || new Error('Could not create event registration.')
    registrationId = registration.id
  }

  if (!registrationId) throw new Error('Could not create event registration.')
  await payWithRazorpay({
    paymentType: 'event',
    referenceId: registrationId,
    title: 'Shri Tripura Sundari Lalithambe Trust',
    description: `${event.title} · ${plan.name}`,
    prefill: {
      name: user ? (profile?.full_name || user.user_metadata?.full_name || '') : guest!.name,
      email: user ? (profile?.email || user.email) : guest!.email,
      contact: user ? (profile?.mobile || '') : guest!.mobile,
    },
  })
  return registrationId
}
