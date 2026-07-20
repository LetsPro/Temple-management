import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { format, isFuture, isPast } from 'date-fns'
import { Skeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

type EventPlan = Database['public']['Tables']['event_plans']['Row']
type Event = Database['public']['Tables']['events']['Row'] & { event_plans: EventPlan[] }

export default function FestivalsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    supabase.from('events').select('*, event_plans(*)').eq('is_published', true).order('start_datetime').then(({ data }) => {
      setEvents((data || []) as Event[])
      setLoading(false)
    })
  }, [])

  const upcoming = events.filter(e => isFuture(new Date(e.end_datetime)))
  const past = events.filter(e => isPast(new Date(e.end_datetime)))
  const displayed = tab === 'upcoming' ? upcoming : past

  return (
    <div className="page-container py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Celebrations</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-temple-text mb-3 font-serif">Festivals & Events</h1>
        <p className="text-temple-muted leading-relaxed">
          Join us in celebrating sacred festivals, cultural events and community programmes throughout the year.
        </p>
      </div>

      <div className="flex gap-3 mb-8 border-b border-temple-border">
        <button
          onClick={() => setTab('upcoming')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${tab === 'upcoming' ? 'border-vermilion-700 text-vermilion-700' : 'border-transparent text-temple-muted hover:text-temple-text'}`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${tab === 'past' ? 'border-vermilion-700 text-vermilion-700' : 'border-transparent text-temple-muted hover:text-temple-text'}`}
        >
          Past Events ({past.length})
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState icon="🎊" title={tab === 'upcoming' ? 'No upcoming events' : 'No past events'} description="Check back soon for new festivals and events." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayed.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: Event }) {
  const start = new Date(event.start_datetime)
  const end = new Date(event.end_datetime)
  const isMultiDay = format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')
  const activePlans = (event.event_plans || []).filter(plan => plan.is_active)
  const lowestPrice = activePlans.length ? Math.min(...activePlans.map(plan => Number(plan.price))) : null

  return (
    <div className="card hover:shadow-temple-md transition-all duration-200">
      {event.banner_image_url ? (
        <img src={event.banner_image_url} alt={event.title} className="w-full h-48 object-cover rounded-xl mb-4" loading="lazy" />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-vermilion-50 to-saffron-50 rounded-xl mb-4 flex items-center justify-center text-5xl">🎊</div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-cream-200 text-temple-muted px-2.5 py-0.5 rounded-full font-medium">
          {format(start, 'dd MMM yyyy')} {isMultiDay && `– ${format(end, 'dd MMM yyyy')}`}
        </span>
        {event.registration_enabled && (
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full font-medium">Registration Open</span>
        )}
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${event.pricing_type === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {event.pricing_type === 'paid' ? lowestPrice ? `From ₹${lowestPrice.toLocaleString('en-IN')}` : 'Paid' : 'Free'}
        </span>
      </div>

      <h3 className="font-bold text-temple-text text-lg mb-2">{event.title}</h3>
      <p className="text-temple-muted text-sm line-clamp-3 leading-relaxed mb-4">{event.description}</p>

      <div className="space-y-1.5 text-sm text-temple-muted mb-4">
        <div className="flex items-center gap-2"><MapPin size={13} className="text-saffron-500" /> {event.venue}</div>
        <div className="flex items-center gap-2"><Calendar size={13} className="text-saffron-500" /> {format(start, 'h:mm a')} – {format(end, 'h:mm a')}</div>
        {event.capacity && <div className="flex items-center gap-2"><Users size={13} className="text-saffron-500" /> Capacity: {event.capacity}</div>}
      </div>

      <Link to={`/festivals/${event.slug}`} className="btn-secondary w-full justify-center">
        View Details <ArrowRight size={14} />
      </Link>
    </div>
  )
}
