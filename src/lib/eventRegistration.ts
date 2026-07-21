import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { payWithRazorpay } from './razorpay'
import type { Database } from './database.types'

type Event = Database['public']['Tables']['events']['Row']
type EventPlan = Database['public']['Tables']['event_plans']['Row']

async function sendFreeEventConfirmation(registrationId: string) {
  const { error } = await supabase.functions.invoke('send-confirmation-email', {
    body: { confirmation_type: 'event', reference_id: registrationId },
  })
  if (error) console.error('Event confirmation email could not be sent:', error.message)
}

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

  if (!user) {
    if (event.pricing_type === 'paid' && !plan) throw new Error('Select a plan to continue.')
    const { data: registrationId, error } = await supabase.rpc('create_guest_event_registration', {
      p_event_id: event.id,
      p_event_plan_id: plan?.id || null,
      p_guest_name: guest!.name.trim(),
      p_guest_email: guest!.email.trim(),
      p_guest_mobile: guest!.mobile.trim(),
    })
    if (error || !registrationId) throw error || new Error('Could not create event registration.')
    if (event.pricing_type === 'free') {
      await sendFreeEventConfirmation(registrationId as string)
      return registrationId as string
    }

    await payWithRazorpay({
      paymentType: 'event',
      referenceId: registrationId as string,
      title: 'Shri Tripura Sundari Lalithambe Trust',
      description: `${event.title} · ${plan!.name}`,
      prefill: { name: guest!.name, email: guest!.email, contact: guest!.mobile },
    })
    return registrationId as string
  }

  let existing: { id: string; status: string; payment_status: string } | null = null
  const { data, error: existingError } = await supabase
    .from('event_registrations')
    .select('id,status,payment_status')
    .eq('event_id', event.id)
    .eq('devotee_id', user.id)
    .maybeSingle()
  if (existingError) throw existingError
  existing = data

  if (event.pricing_type === 'free') {
    if (existing) {
      const { error } = await supabase.from('event_registrations').update({
        event_plan_id: null,
        amount: 0,
        payment_status: 'not_required',
        status: 'registered',
      }).eq('id', existing.id)
      if (error) throw error
      await sendFreeEventConfirmation(existing.id)
      return existing.id
    }
    const { data: registration, error } = await supabase.from('event_registrations').insert({
      event_id: event.id,
      devotee_id: user.id,
      event_plan_id: null,
      participant_count: 1,
      amount: 0,
      payment_status: 'not_required',
      status: 'registered',
    }).select('id').single()
    if (error || !registration) throw error || new Error('Could not create event registration.')
    await sendFreeEventConfirmation(registration.id)
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
      devotee_id: user.id,
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
