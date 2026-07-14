import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, Clock, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

type Event = Database['public']['Tables']['events']['Row']

export default function EventDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [registered, setRegistered] = useState(false)
  const [registrationLoading, setRegistrationLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('events').select('*').eq('slug', slug!).eq('is_published', true).maybeSingle()
      if (!data) { navigate('/festivals'); return }
      setEvent(data)

      if (user) {
        const { data: reg } = await supabase.from('event_registrations').select('id').eq('event_id', data.id).eq('devotee_id', user.id).maybeSingle()
        setRegistered(!!reg)
      }
      setLoading(false)
    }
    if (slug) load()
  }, [slug, user, navigate])

  const handleRegister = async () => {
    if (!user) { navigate('/login'); return }
    if (!event) return
    setRegistrationLoading(true)
    const { error } = await supabase.from('event_registrations').insert({ event_id: event.id, devotee_id: user.id, participant_count: 1 })
    setRegistrationLoading(false)
    if (error) { toast.error('Registration failed. Please try again.'); return }
    setRegistered(true)
    toast.success('Successfully registered! 🙏')
  }

  const handleUnregister = async () => {
    if (!user || !event) return
    setRegistrationLoading(true)
    await supabase.from('event_registrations').update({ status: 'cancelled' }).eq('event_id', event.id).eq('devotee_id', user.id)
    setRegistrationLoading(false)
    setRegistered(false)
    toast.success('Registration cancelled.')
  }

  if (loading) return <div className="page-container py-10 text-center text-temple-muted">Loading...</div>
  if (!event) return null

  const start = new Date(event.start_datetime)
  const end = new Date(event.end_datetime)
  const isMultiDay = format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')
  const canRegister = event.registration_enabled && (!event.registration_closing_date || new Date(event.registration_closing_date) > new Date())

  return (
    <div className="page-container py-10">
      <Link to="/festivals" className="inline-flex items-center gap-1.5 text-temple-muted hover:text-temple-text text-sm mb-6 group">
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Festivals
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {event.banner_image_url ? (
            <img src={event.banner_image_url} alt={event.title} className="w-full h-72 object-cover rounded-3xl mb-6" loading="lazy" />
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-vermilion-50 to-saffron-50 rounded-3xl mb-6 flex items-center justify-center text-7xl">🎊</div>
          )}

          <h1 className="text-3xl font-bold font-serif text-temple-text mb-4">{event.title}</h1>
          <p className="text-temple-muted leading-relaxed text-base">{event.description}</p>
        </div>

        <div className="card sticky top-20 self-start">
          <h3 className="font-bold text-temple-text mb-4">Event Details</h3>
          <div className="space-y-3 text-sm mb-5">
            <div className="flex gap-3">
              <Calendar size={16} className="text-saffron-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-temple-text">
                  {format(start, 'dd MMMM yyyy')}
                  {isMultiDay && ` – ${format(end, 'dd MMMM yyyy')}`}
                </div>
                <div className="text-temple-muted">{format(start, 'h:mm a')} – {format(end, 'h:mm a')}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin size={16} className="text-saffron-500 flex-shrink-0 mt-0.5" />
              <span className="text-temple-text">{event.venue}</span>
            </div>
            {event.capacity && (
              <div className="flex gap-3">
                <Users size={16} className="text-saffron-500 flex-shrink-0" />
                <span className="text-temple-text">Capacity: {event.capacity} people</span>
              </div>
            )}
          </div>

          {canRegister && (
            <>
              {registered ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3 text-sm font-medium">
                    <CheckCircle size={16} /> You are registered
                  </div>
                  <button onClick={handleUnregister} disabled={registrationLoading} className="btn-secondary w-full justify-center text-sm">
                    Cancel Registration
                  </button>
                </div>
              ) : (
                <button onClick={handleRegister} disabled={registrationLoading} className="btn-primary w-full justify-center py-2.5">
                  {registrationLoading ? 'Registering...' : 'Register for Event'}
                </button>
              )}
              {!user && <p className="mt-2 text-xs text-center text-temple-muted">Please <Link to="/login" className="text-vermilion-600 font-medium">sign in</Link> to register</p>}
            </>
          )}

          {!event.registration_enabled && (
            <div className="bg-cream-100 rounded-xl p-3 text-sm text-temple-muted text-center">
              No registration required — open to all devotees
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
