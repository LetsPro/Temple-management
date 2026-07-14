import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { format, isFuture } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Event = Database['public']['Tables']['events']['Row'] & {
  event_registrations: { id: string; status: string }[]
}

export default function DevoteeEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select(`*, event_registrations!left(id, status, devotee_id)`)
      .eq('is_published', true)
      .order('start_datetime')
    // Filter registrations to current user only
    const eventsWithUserReg = (data || []).map((e: Record<string, unknown>) => ({
      ...e,
      event_registrations: ((e.event_registrations as { devotee_id: string }[]) || []).filter(r => r.devotee_id === user.id),
    }))
    setEvents(eventsWithUserReg as unknown as Event[])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleRegister = async (eventId: string) => {
    if (!user) return
    setRegistering(eventId)
    const { error } = await supabase.from('event_registrations').insert({ event_id: eventId, devotee_id: user.id, participant_count: 1 })
    setRegistering(null)
    if (error) { toast.error('Registration failed.'); return }
    toast.success('Registered successfully! 🙏')
    load()
  }

  const handleUnregister = async (eventId: string) => {
    if (!user) return
    setRegistering(eventId)
    await supabase.from('event_registrations').update({ status: 'cancelled' }).eq('event_id', eventId).eq('devotee_id', user.id)
    setRegistering(null)
    toast.success('Registration cancelled.')
    load()
  }

  const upcoming = events.filter(e => isFuture(new Date(e.end_datetime)))
  const past = events.filter(e => !isFuture(new Date(e.end_datetime)))

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
              const isRegistered = event.event_registrations?.some(r => r.status === 'registered')
              const canRegister = event.registration_enabled && (!event.registration_closing_date || new Date(event.registration_closing_date) > new Date())
              return (
                <div key={event.id} className="card">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="bg-vermilion-50 rounded-xl p-2">
                        <div className="text-vermilion-700 font-bold text-lg leading-none">{format(new Date(event.start_datetime), 'dd')}</div>
                        <div className="text-vermilion-500 text-xs">{format(new Date(event.start_datetime), 'MMM')}</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-temple-text mb-1">{event.title}</h4>
                      <p className="text-temple-muted text-sm line-clamp-2 mb-2">{event.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-temple-muted mb-3">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {event.venue}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} /> {format(new Date(event.start_datetime), 'h:mm a')}</span>
                        {event.capacity && <span className="flex items-center gap-1"><Users size={11} /> {event.capacity} capacity</span>}
                      </div>
                      {canRegister && (
                        isRegistered ? (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-green-700 text-sm font-medium"><CheckCircle size={14} /> Registered</span>
                            <button onClick={() => handleUnregister(event.id)} disabled={registering === event.id} className="btn-ghost text-sm text-red-600 hover:bg-red-50">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleRegister(event.id)} disabled={registering === event.id} className="btn-primary text-sm py-1.5">
                            {registering === event.id ? 'Registering...' : 'Register'}
                          </button>
                        )
                      )}
                      {!event.registration_enabled && <span className="text-xs text-temple-muted bg-cream-100 px-2.5 py-1 rounded-full">Open to all — no registration needed</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {past.length > 0 && (
            <>
              <h3 className="font-bold text-temple-text pt-4">Past Events ({past.length})</h3>
              <div className="space-y-3">
                {past.map(e => (
                  <div key={e.id} className="card opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 text-2xl">🎊</div>
                      <div>
                        <div className="font-semibold text-temple-text text-sm">{e.title}</div>
                        <div className="text-xs text-temple-muted">{format(new Date(e.start_datetime), 'dd MMMM yyyy')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
