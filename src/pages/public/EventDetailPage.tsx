import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, ArrowLeft, CheckCircle, CreditCard, Ticket } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { registerForEvent } from '../../lib/eventRegistration'
import toast from 'react-hot-toast'

type EventPlan = Database['public']['Tables']['event_plans']['Row']
type Event = Database['public']['Tables']['events']['Row'] & { event_plans: EventPlan[] }

export default function EventDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [registered, setRegistered] = useState(false)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [guest, setGuest] = useState({ name: '', email: '', mobile: '' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*, event_plans(*)')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle()
      if (!data) { navigate('/events'); return }
      const typedEvent = data as Event
      typedEvent.event_plans = (typedEvent.event_plans || []).filter(plan => plan.is_active).sort((a, b) => a.display_order - b.display_order)
      setEvent(typedEvent)
      setSelectedPlanId(typedEvent.event_plans[0]?.id || '')

      if (user) {
        const { data: registration } = await supabase
          .from('event_registrations')
          .select('status,payment_status,event_plan_id')
          .eq('event_id', typedEvent.id)
          .eq('devotee_id', user.id)
          .maybeSingle()
        setRegistered(registration?.status === 'registered' && (typedEvent.pricing_type === 'free' || registration.payment_status === 'paid'))
        if (registration?.event_plan_id) setSelectedPlanId(registration.event_plan_id)
      }
      setLoading(false)
    }
    if (slug) load()
  }, [slug, user, navigate])

  const handleRegister = async () => {
    if (!event) return
    const selectedPlan = event.event_plans.find(plan => plan.id === selectedPlanId)
    setRegistrationLoading(true)
    try {
      await registerForEvent({ event, plan: selectedPlan, user, profile, guest })
      setRegistered(true)
      toast.success(event.pricing_type === 'paid' ? 'Payment verified and registration confirmed! 🙏' : 'Successfully registered! 🙏')
    } catch (error) {
      toast.error((error as Error).message || 'Registration failed. Please try again.')
    } finally {
      setRegistrationLoading(false)
    }
  }

  const handleUnregister = async () => {
    if (!user || !event) return
    setRegistrationLoading(true)
    const { error } = await supabase.from('event_registrations').update({ status: 'cancelled' }).eq('event_id', event.id).eq('devotee_id', user.id)
    setRegistrationLoading(false)
    if (error) return toast.error('Could not cancel registration.')
    setRegistered(false)
    toast.success('Registration cancelled.')
  }

  if (loading) return <div className="page-container py-10 text-center text-temple-muted">Loading...</div>
  if (!event) return null

  const start = new Date(event.start_datetime)
  const end = new Date(event.end_datetime)
  const isMultiDay = format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')
  const canRegister = event.registration_enabled && (!event.registration_closing_date || new Date(event.registration_closing_date) > new Date())
  const selectedPlan = event.event_plans.find(plan => plan.id === selectedPlanId)

  return (
    <div className="page-container py-10">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-temple-muted hover:text-temple-text text-sm mb-6 group">
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {event.banner_image_url ? (
            <div className="relative w-full aspect-video max-h-[32rem] overflow-hidden rounded-3xl mb-6 bg-cream-100">
              <img src={event.banner_image_url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30" />
              <img src={event.banner_image_url} alt={event.title} className="relative w-full h-full object-contain" loading="lazy" />
            </div>
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-vermilion-50 to-saffron-50 rounded-3xl mb-6 flex items-center justify-center text-7xl">🎊</div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${event.pricing_type === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {event.pricing_type === 'paid' ? 'Paid event' : 'Free event'}
            </span>
          </div>
          <h1 className="text-3xl font-bold font-serif text-temple-text mb-4">{event.title}</h1>
          <p className="text-temple-muted leading-relaxed text-base">{event.description}</p>
        </div>

        <div className="card sticky top-20 self-start">
          <h3 className="font-bold text-temple-text mb-4">Event Details</h3>
          <div className="space-y-3 text-sm mb-5">
            <div className="flex gap-3">
              <Calendar size={16} className="text-saffron-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-temple-text">{format(start, 'dd MMMM yyyy')}{isMultiDay && ` – ${format(end, 'dd MMMM yyyy')}`}</div>
                <div className="text-temple-muted">{format(start, 'h:mm a')} – {format(end, 'h:mm a')}</div>
              </div>
            </div>
            <div className="flex gap-3"><MapPin size={16} className="text-saffron-500 flex-shrink-0 mt-0.5" /><span className="text-temple-text">{event.venue}</span></div>
            {event.capacity && <div className="flex gap-3"><Users size={16} className="text-saffron-500 flex-shrink-0" /><span className="text-temple-text">Capacity: {event.capacity} people</span></div>}
          </div>

          {canRegister && !registered && event.pricing_type === 'paid' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 font-semibold text-sm text-temple-text mb-2"><Ticket size={15} /> Select a plan</div>
              <div className="space-y-2">
                {event.event_plans.map(plan => <label key={plan.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer ${selectedPlanId === plan.id ? 'border-vermilion-600 bg-vermilion-50' : 'border-temple-border'}`}>
                  <span className="flex items-center gap-2"><input type="radio" name="event-plan" checked={selectedPlanId === plan.id} onChange={() => setSelectedPlanId(plan.id)} className="accent-vermilion-700" /><span className="text-sm font-medium text-temple-text">{plan.name}</span></span>
                  <strong className="text-sm text-vermilion-700">₹{Number(plan.price).toLocaleString('en-IN')}</strong>
                </label>)}
                {event.event_plans.length === 0 && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">Paid plans are not available yet.</p>}
              </div>
            </div>
          )}

          {canRegister && !registered && !user && (
            <div className="mb-4 rounded-xl border border-temple-border bg-cream-50 p-3">
              <div className="font-semibold text-sm text-temple-text mb-2">Guest registration details</div>
              <div className="space-y-2">
                <label className="block"><span className="label text-xs">Full Name *</span><input value={guest.name} onChange={change => setGuest(current => ({ ...current, name: change.target.value }))} className="input-field py-2 text-sm" autoComplete="name" /></label>
                <label className="block"><span className="label text-xs">Mobile Number *</span><input value={guest.mobile} onChange={change => setGuest(current => ({ ...current, mobile: change.target.value }))} className="input-field py-2 text-sm" inputMode="tel" autoComplete="tel" /></label>
                <label className="block"><span className="label text-xs">Email Address *</span><input type="email" value={guest.email} onChange={change => setGuest(current => ({ ...current, email: change.target.value }))} className="input-field py-2 text-sm" autoComplete="email" /></label>
              </div>
              <p className="text-xs text-temple-muted mt-2">No account or sign in is required.</p>
            </div>
          )}

          {canRegister && (
            registered ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3 text-sm font-medium"><CheckCircle size={16} /> You are registered</div>
                {event.pricing_type === 'free' ? <button onClick={handleUnregister} disabled={registrationLoading} className="btn-secondary w-full justify-center text-sm">Cancel Registration</button> : <p className="text-xs text-temple-muted text-center">Please contact the temple office for cancellation or refund assistance.</p>}
              </div>
            ) : (
              <button onClick={handleRegister} disabled={registrationLoading || (event.pricing_type === 'paid' && !selectedPlan)} className="btn-primary w-full justify-center py-2.5">
                {event.pricing_type === 'paid' && <CreditCard size={16} />}
                {registrationLoading ? 'Processing...' : event.pricing_type === 'paid' && selectedPlan ? `Pay ₹${Number(selectedPlan.price).toLocaleString('en-IN')} & Register` : 'Register for Free'}
              </button>
            )
          )}

          {!event.registration_enabled && <div className="bg-cream-100 rounded-xl p-3 text-sm text-temple-muted text-center">No registration required — open to all devotees</div>}
        </div>
      </div>
    </div>
  )
}
