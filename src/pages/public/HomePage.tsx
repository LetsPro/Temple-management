import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, Phone, ArrowRight, ChevronRight, Bell, Star, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { format } from 'date-fns'
import { Skeleton } from '../../components/ui/Skeleton'

type Service = Database['public']['Tables']['pooja_services']['Row']
type Event = Database['public']['Tables']['events']['Row']
type Announcement = Database['public']['Tables']['announcements']['Row']
type GalleryImage = Database['public']['Tables']['gallery_images']['Row']

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [templeName, setTempleName] = useState('Sri Mahalakshmi Temple')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [settingsRes, servicesRes, eventsRes, announcementsRes, galleryRes] = await Promise.all([
        supabase.from('temple_settings').select('temple_name, tagline, phone, address').maybeSingle(),
        supabase.from('pooja_services').select('*').eq('is_featured', true).eq('is_active', true).order('display_order').limit(6),
        supabase.from('events').select('*').eq('is_published', true).gte('end_datetime', new Date().toISOString()).order('start_datetime').limit(4),
        supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(4),
        supabase.from('gallery_images').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(6),
      ])
      if (settingsRes.data) setTempleName(settingsRes.data.temple_name)
      setServices(servicesRes.data || [])
      setEvents(eventsRes.data || [])
      setAnnouncements(announcementsRes.data || [])
      setGallery(galleryRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const priorityBadge = (priority: string) => {
    if (priority === 'urgent') return <span className="badge-urgent">Urgent</span>
    if (priority === 'important') return <span className="badge-important">Important</span>
    return null
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[580px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d0a06] via-[#7a1e1e] to-[#b85c1a]" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(245,185,66,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 40%)' }}
        />
        {/* Decorative arch pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(245,185,66,0.5) 40px, rgba(245,185,66,0.5) 42px)' }}
        />

        <div className="relative page-container py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
              <span>🪷</span> Faith, Service & Community
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-[1.08] text-white">
              {templeName}
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-lg">
              A sacred space for devotion, community and divine grace. Book poojas, make donations, and stay connected with temple celebrations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/poojas" className="inline-flex items-center gap-2 bg-white text-vermilion-700 font-bold px-6 py-3 rounded-xl hover:bg-cream-100 transition-all shadow-lg hover:shadow-xl">
                Book Pooja / Seva <ArrowRight size={16} />
              </Link>
              <Link to="/donate" className="inline-flex items-center gap-2 bg-gold-500 text-[#2d0a06] font-bold px-6 py-3 rounded-xl hover:bg-gold-400 transition-all">
                🪔 Donate Now
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-semibold px-5 py-3 rounded-xl hover:bg-white/20 transition-all">
                View Timings
              </Link>
            </div>
          </div>

          {/* Quick info card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Clock size={18} className="text-gold-400" /> Today's Timings
            </h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70 text-sm">Morning Darshan</span>
                <span className="font-semibold text-sm">6:00 AM – 12:30 PM</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/70 text-sm">Evening Darshan</span>
                <span className="font-semibold text-sm">4:00 PM – 8:30 PM</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/70 text-sm">Abhishekam</span>
                <span className="font-semibold text-sm">6:30 AM, 8:00 AM, 5:00 PM</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-white/70">
                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gold-400" />
                <span>12, Temple Street, Mylapore, Chennai - 600004</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Phone size={14} className="flex-shrink-0 text-gold-400" />
                <a href="tel:+914423456789" className="hover:text-white">+91 44 2345 6789</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="bg-gradient-to-r from-vermilion-700 to-saffron-500 py-6">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Daily Devotees', value: '2,000+', icon: '🙏' },
              { label: 'Poojas & Sevas', value: '25+', icon: '🪔' },
              { label: 'Annual Festivals', value: '15+', icon: '🎊' },
              { label: 'Years of Service', value: '200+', icon: '🛕' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-3 text-white">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <div className="font-bold text-lg">{stat.value}</div>
                  <div className="text-white/75 text-xs">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Poojas */}
      <section className="py-16 page-container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-1.5">Sacred Services</div>
            <h2 className="section-title">Featured Poojas & Sevas</h2>
          </div>
          <Link to="/poojas" className="btn-secondary hidden sm:flex items-center gap-1.5">
            View All <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse space-y-3">
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}

        <div className="mt-6 text-center sm:hidden">
          <Link to="/poojas" className="btn-secondary">View All Poojas & Sevas</Link>
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="py-12 bg-amber-50/50 border-y border-amber-100">
          <div className="page-container">
            <div className="flex items-center gap-2 mb-6">
              <Bell size={20} className="text-saffron-500" />
              <h2 className="text-xl font-bold text-temple-text">Latest Announcements</h2>
            </div>
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-white rounded-2xl border border-amber-100 p-4 flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">{priorityBadge(ann.priority)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-temple-text text-sm mb-1 line-clamp-1">{ann.title}</h4>
                    <p className="text-temple-muted text-sm line-clamp-2 leading-relaxed">{ann.content}</p>
                  </div>
                  <div className="text-xs text-temple-muted flex-shrink-0 pt-0.5">
                    {format(new Date(ann.created_at), 'dd MMM')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section className="py-16 page-container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-1.5">Community</div>
              <h2 className="section-title">Upcoming Festivals & Events</h2>
            </div>
            <Link to="/festivals" className="btn-secondary hidden sm:flex items-center gap-1.5">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Gallery preview */}
      {gallery.length > 0 && (
        <section className="py-14 bg-cream-100/80 border-y border-temple-border">
          <div className="page-container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-1.5">Visual Stories</div>
                <h2 className="section-title">Temple Gallery</h2>
              </div>
              <Link to="/gallery" className="btn-secondary hidden sm:flex items-center gap-1.5">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.slice(0, 6).map((img, i) => (
                <Link key={img.id} to="/gallery" className={`group overflow-hidden rounded-2xl ${i === 0 ? 'row-span-2' : ''}`}>
                  <img
                    src={img.image_url}
                    alt={img.caption}
                    className="w-full h-full object-cover aspect-video group-hover:scale-105 transition-transform duration-500"
                    style={{ minHeight: i === 0 ? '280px' : '130px' }}
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Donation CTA */}
      <section className="py-16 bg-gradient-to-br from-[#1a0a04] to-[#3C2415] text-white">
        <div className="page-container text-center max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🙏</div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">Support the Temple</h2>
          <p className="text-white/70 leading-relaxed mb-8">
            Your generous contributions help maintain the temple, support annadanam, fund festivals and provide community services. Every donation, big or small, is a sacred offering.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/donate" className="inline-flex items-center gap-2 bg-gold-500 text-[#2d0a06] font-bold px-8 py-3.5 rounded-xl hover:bg-gold-400 transition-all text-base">
              🪔 Make a Donation
            </Link>
            <Link to="/poojas?category=Charity" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all">
              Sponsor Annadanam
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[['Annadanam', '🍛'], ['Temple Development', '🏗️'], ['Goshala', '🐄']].map(([label, icon]) => (
              <div key={label} className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs text-white/60 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="py-12 page-container">
        <div className="bg-white rounded-3xl border border-temple-border p-6 overflow-hidden">
          <h3 className="font-bold text-lg text-temple-text mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-vermilion-600" /> Find Us
          </h3>
          <div className="rounded-2xl bg-cream-100 border border-temple-border h-64 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} className="text-vermilion-400 mx-auto mb-2" />
              <p className="text-temple-muted text-sm font-medium">12, Temple Street, Mylapore</p>
              <p className="text-temple-muted text-sm">Chennai – 600004, Tamil Nadu</p>
              <a
                href="https://maps.google.com/?q=Mylapore+Chennai"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-vermilion-600 font-medium hover:text-vermilion-700"
              >
                Open in Google Maps <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Link to={`/poojas/${service.slug}`} className="card hover:shadow-temple-md transition-all duration-200 group flex flex-col">
      {service.image_url ? (
        <img src={service.image_url} alt={service.name} className="w-full h-40 object-cover rounded-xl mb-4 group-hover:scale-[1.02] transition-transform" loading="lazy" />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-cream-200 to-saffron-100 rounded-xl mb-4 flex items-center justify-center text-4xl">🪔</div>
      )}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-saffron-600 bg-saffron-50 px-2.5 py-0.5 rounded-full">{service.category}</span>
          {service.is_featured && <Star size={14} className="text-gold-500 fill-gold-500" />}
        </div>
        <h3 className="font-bold text-temple-text mb-1.5 group-hover:text-vermilion-700 transition-colors">{service.name}</h3>
        <p className="text-temple-muted text-sm line-clamp-2 leading-relaxed flex-1">{service.description}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-temple-border/50">
          <div>
            <span className="text-vermilion-700 font-bold text-lg">₹{service.price.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-temple-muted">
            <Clock size={12} />
            {service.duration_minutes} min
          </div>
        </div>
      </div>
    </Link>
  )
}

function EventCard({ event }: { event: Event }) {
  const start = new Date(event.start_datetime)
  return (
    <Link to={`/festivals/${event.slug}`} className="card hover:shadow-temple-md transition-all duration-200 group flex gap-4">
      <div className="flex-shrink-0 w-16 text-center">
        <div className="bg-vermilion-50 rounded-xl p-2">
          <div className="text-vermilion-700 font-bold text-xl leading-none">{format(start, 'dd')}</div>
          <div className="text-vermilion-500 text-xs font-semibold uppercase">{format(start, 'MMM')}</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-temple-text mb-1 group-hover:text-vermilion-700 transition-colors line-clamp-1">{event.title}</h3>
        <p className="text-temple-muted text-sm line-clamp-2 leading-relaxed mb-2">{event.description}</p>
        <div className="flex items-center gap-1 text-xs text-temple-muted">
          <MapPin size={11} />
          <span className="truncate">{event.venue}</span>
        </div>
      </div>
    </Link>
  )
}
