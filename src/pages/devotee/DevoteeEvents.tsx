import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, CheckCircle, CreditCard, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { registerForEvent } from '../../lib/eventRegistration'
import { format, isFuture } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type EventPlan = Database['public']['Tables']['event_plans']['Row']
type EventRegistration = Pick<Database['public']['Tables']['event_registrations']['Row'], 'id' | 'status' | 'payment_status' | 'event_plan_id'>
type Event = Database['public']['Tables']['events']['Row'] & {
  event_registrations: EventRegistration[]
  event_plans: EventPlan[]
}

export default function DevoteeEvents() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({})

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*, event_registrations!left(id,status,payment_status,event_plan_id,devotee_id), event_plans(*)')
      .eq('is_published', true)
      .order('start_datetime')
    if (error) toast.error('Could not load events.')
    const eventsWithUserRegistration = (data || []).map((rawEvent: Record<string, unknown>) => {
      const eventPlans = ((rawEvent.event_plans as EventPlan[]) || []).filter(plan => plan.is_active).sort((a, b) => a.display_order - b.display_order)
      const registrations = ((rawEvent.event_registrations as (EventRegistration & { devotee_id: string })[]) || []).filter(registration => registration.devotee_id === user.id)
      return { ...rawEvent, event_plans: eventPlans, event_registrations: registrations }
    }) as unknown as Event[]
    setEvents(eventsWithUserRegistration)
    setSelectedPlans(current => {
      const next = { ...current }
      eventsWithUserRegistration.forEach(event => {
        next[event.id] = event.event_registrations[0]?.event_plan_id || next[event.id] || event.event_plans[0]?.id || ''
      })
      return next
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleRegister = async (event: Event) => {
    if (!user) return
    const plan = event.event_plans.find(item => item.id === selectedPlans[event.id])
    setRegistering(event.id)
    try {
      await registerForEvent({ event, plan, user, profile })
      toast.success(event.pricing_type === 'paid' ? 'Payment verified and registration confirmed! 🙏' : 'Registered successfully! 🙏')
      await load()
    } catch (error) {
      toast.error((error as Error).message || 'Registration failed.')
    } finally {
      setRegistering(null)
    }
  }

  const handleUnregister = async (event: Event) => {
    if (!user) return
    setRegistering(event.id)
    const { error } = await supabase.from('event_registrations').update({ status: 'cancelled' }).eq('event_id', event.id).eq('devotee_id', user.id)
    setRegistering(null)
    if (error) return toast.error('Could not cancel registration.')
    toast.success('Registration cancelled.')
    load()
  }

  const upcoming = events.filter(event => isFuture(new Date(event.end_datetime)))
  const past = events.filter(event => !isFuture(new Date(event.end_datetime)))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-temple-text">Festivals & Events</h1>
        <p className="text-temple-muted text-sm">Register for upcoming events and manage your registrations.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : upcoming.length === 0 ? (
        <EmptyState icon="🎊" title="No upcoming events" description="Check back soon for upcoming festivals and events." />
      ) : (
        <>
          <h3 className="font-bold text-temple-text">Upcoming ({upcoming.length})</h3>
          <div className="space-y-4">
            {upcoming.map(event => {
              const registration = event.event_registrations?.[0]
              const isRegistered = registration?.status === 'registered' && (event.pricing_type === 'free' || registration.payment_status === 'paid')
              const canRegister = event.registration_enabled && (!event.registration_closing_date || new Date(event.registration_closing_date) > new Date())
              const selectedPlan = event.event_plans.find(plan => plan.id === selectedPlans[event.id])
              return (
                <div key={event.id} className="card">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {event.banner_image_url ? <img src={event.banner_image_url} alt="" className="w-full sm:w-28 h-28 object-cover rounded-xl flex-shrink-0" /> : (
                      <div className="flex-shrink-0 w-14 text-center"><div className="bg-vermilion-50 rounded-xl p-2"><div className="text-vermilion-700 font-bold text-lg leading-none">{format(new Date(event.start_datetime), 'dd')}</div><div className="text-vermilion-500 text-xs">{format(new Date(event.start_datetime), 'MMM')}</div></div></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-bold text-temple-text">{event.title}</h4>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${event.pricing_type === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{event.pricing_type === 'paid' ? 'Paid' : 'Free'}</span>
                      </div>
                      <p className="text-temple-muted text-sm line-clamp-2 mb-2">{event.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-temple-muted mb-3">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {event.venue}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} /> {format(new Date(event.start_datetime), 'dd MMM, h:mm a')}</span>
                        {event.capacity && <span className="flex items-center gap-1"><Users size={11} /> {event.capacity} capacity</span>}
                      </div>

                      {canRegister && !isRegistered && event.pricing_type === 'paid' && event.event_plans.length > 0 && (
                        <select value={selectedPlans[event.id] || ''} onChange={change => setSelectedPlans(current => ({ ...current, [event.id]: change.target.value }))} className="input-field max-w-xs mb-3 py-2 text-sm" aria-label={`Select a plan for ${event.title}`}>
                          {event.event_plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · ₹{Number(plan.price).toLocaleString('en-IN')}</option>)}
                        </select>
                      )}

                      {canRegister && (isRegistered ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1.5 text-green-700 text-sm font-medium"><CheckCircle size={14} /> Registered</span>
                          {event.pricing_type === 'free' && <button onClick={() => handleUnregister(event)} disabled={registering === event.id} className="btn-ghost text-sm text-red-600 hover:bg-red-50">Cancel</button>}
                        </div>
                      ) : (
                        <button onClick={() => handleRegister(event)} disabled={registering === event.id || (event.pricing_type === 'paid' && !selectedPlan)} className="btn-primary text-sm py-1.5">
                          {event.pricing_type === 'paid' && <CreditCard size={14} />}
                          {registering === event.id ? 'Processing...' : event.pricing_type === 'paid' && selectedPlan ? `Pay ₹${Number(selectedPlan.price).toLocaleString('en-IN')} & Register` : 'Register for Free'}
                        </button>
                      ))}
                      {!event.registration_enabled && <span className="text-xs text-temple-muted bg-cream-100 px-2.5 py-1 rounded-full">Open to all — no registration needed</span>}
                      {event.pricing_type === 'paid' && event.event_plans.length === 0 && <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Plans not available</span>}
                    </div>
                  </div>
                  <Link to={`/festivals/${event.slug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-vermilion-700 mt-3">View event details <ArrowRight size={12} /></Link>
                </div>
              )
            })}
          </div>

          {past.length > 0 && (
            <>
              <h3 className="font-bold text-temple-text pt-4">Past Events ({past.length})</h3>
              <div className="space-y-3">{past.map(event => <div key={event.id} className="card opacity-70"><div className="flex items-center gap-3"><div className="flex-shrink-0 text-2xl">🎊</div><div><div className="font-semibold text-temple-text text-sm">{event.title}</div><div className="text-xs text-temple-muted">{format(new Date(event.start_datetime), 'dd MMMM yyyy')}</div></div></div></div>)}</div>
            </>
          )}
        </>
      )}
    </div>
  )
}
