import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Clock3,
  HandHeart,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { Skeleton } from '../../components/ui/Skeleton'

type Service = Database['public']['Tables']['pooja_services']['Row']
type Event = Database['public']['Tables']['events']['Row']
type Announcement = Database['public']['Tables']['announcements']['Row']
type GalleryImage = Database['public']['Tables']['gallery_images']['Row']

const TRUST_NAME = 'Shri Tripura Sundari Lalithambe Trust'

const quickLinks = [
  {
    title: 'Daily Poojas',
    copy: 'Participate in daily poojas and receive divine blessings.',
    action: 'View Pooja Schedule',
    href: '/poojas',
    icon: Sparkles,
  },
  {
    title: 'Upcoming Events',
    copy: 'Stay updated with festivals, sevas and special celebrations.',
    action: 'View All Events',
    href: '/festivals',
    icon: CalendarDays,
  },
  {
    title: 'Online Donations',
    copy: 'Support the trust and its sacred community initiatives.',
    action: 'Donate Now',
    href: '/donate',
    icon: HandHeart,
  },
  {
    title: 'Annadanam',
    copy: 'Help us offer prasadam and nourishing meals to devotees.',
    action: 'Support Annadanam',
    href: '/donate',
    icon: UtensilsCrossed,
  },
  {
    title: 'Temple Timings',
    copy: 'Plan your visit with daily opening and pooja timings.',
    action: 'View Timings',
    href: '/contact',
    icon: Clock3,
  },
  {
    title: 'Devotee Services',
    copy: 'Everything you need for a peaceful, blessed temple visit.',
    action: 'Explore Services',
    href: '/poojas',
    icon: UsersRound,
  },
]

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [servicesRes, eventsRes, announcementsRes, galleryRes] = await Promise.all([
        supabase.from('pooja_services').select('*').eq('is_featured', true).eq('is_active', true).order('display_order').limit(3),
        supabase.from('events').select('*').eq('is_published', true).gte('end_datetime', new Date().toISOString()).order('start_datetime').limit(2),
        supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
        supabase.from('gallery_images').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
      ])
      setServices(servicesRes.data || [])
      setEvents(eventsRes.data || [])
      setAnnouncements(announcementsRes.data || [])
      setGallery(galleryRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="temple-home">
      <section className="hero-shell page-container">
        <div className="hero-panel">
          <img src="/lalithambe-hero.png" alt="Goddess Lalithambika in a golden shrine at sunrise" className="hero-art" />
          <div className="hero-wash" />
          <div className="hero-copy">
            <p className="hero-kicker"><span /> Welcome to <span /></p>
            <h1>{TRUST_NAME}</h1>
            <div className="hero-lotus" aria-hidden="true">⌇ ❀ ⌇</div>
            <p className="hero-description">
              A divine abode of Maa Lalithambike.<br />
              Seek blessings, perform sevas and be part of our spiritual community.
            </p>
            <div className="hero-actions">
              <Link to="/poojas" className="btn-primary hero-button"><CalendarDays size={19} /> Book Seva</Link>
              <Link to="/donate" className="hero-donate"><HandHeart size={19} /> Donate Now</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container quick-grid" aria-label="Temple services">
        {quickLinks.map(({ title, copy, action, href, icon: Icon }) => (
          <Link to={href} key={title} className="quick-card group">
            <div className="quick-icon"><Icon size={26} strokeWidth={1.8} /></div>
            <h2>{title}</h2>
            <p>{copy}</p>
            <span>{action} <ArrowRight size={14} /></span>
          </Link>
        ))}
      </section>

      <section className="page-container support-strip">
        <div className="support-item">
          <div className="support-icon"><BellRing size={25} /></div>
          <div><strong>Stay Connected</strong><p>Receive updates on events and sevas.</p></div>
        </div>
        <div className="support-item">
          <div className="support-icon"><Phone size={25} /></div>
          <div><strong>Need Help?</strong><p>Our support team is here for you.</p></div>
        </div>
        <div className="support-item">
          <div className="support-icon"><ShieldCheck size={25} /></div>
          <div><strong>Secure & Trusted</strong><p>Your information is always protected.</p></div>
        </div>
        <div className="blessing">
          <span className="diya" aria-hidden="true">🪔</span>
          <div><strong>“Sarve Jana Sukhino Bhavantu”</strong><p>May all beings be happy.</p></div>
        </div>
      </section>

      <section className="page-container content-section">
        <div className="section-heading centered-heading">
          <span>Sacred offerings</span>
          <h2>Featured Poojas & Sevas</h2>
          <p>Offer your prayers through traditional sevas performed with devotion and care.</p>
        </div>
        {loading ? (
          <div className="feature-grid">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card"><Skeleton className="h-44 w-full" /><Skeleton className="h-5 w-2/3 mt-4" /><Skeleton className="h-4 w-full mt-3" /></div>)}
          </div>
        ) : services.length > 0 ? (
          <div className="feature-grid">
            {services.map(service => <ServiceCard key={service.id} service={service} />)}
          </div>
        ) : (
          <div className="fallback-offerings feature-grid">
            {['Lalitha Sahasranama', 'Kumkumarchana', 'Sri Chakra Pooja'].map((name, i) => (
              <Link to="/poojas" className="offering-card" key={name}>
                <div className={`offering-symbol symbol-${i + 1}`}>🪷</div>
                <span>Daily Seva</span><h3>{name}</h3><p>Traditional worship offered with flowers, kumkuma and sacred chants.</p>
                <b>Explore Seva <ArrowRight size={14} /></b>
              </Link>
            ))}
          </div>
        )}
      </section>

      {(announcements.length > 0 || events.length > 0) && (
        <section className="warm-section">
          <div className="page-container community-grid">
            {announcements.length > 0 && (
              <div>
                <div className="section-heading"><span>Temple news</span><h2>Latest Announcements</h2></div>
                <div className="announcement-list">
                  {announcements.map(announcement => (
                    <article key={announcement.id}>
                      <BellRing size={18} /><div><h3>{announcement.title}</h3><p>{announcement.content}</p></div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {events.length > 0 && (
              <div>
                <div className="section-heading"><span>Mark your calendar</span><h2>Upcoming Events</h2></div>
                <div className="event-list">
                  {events.map(event => <EventCard key={event.id} event={event} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="page-container content-section">
          <div className="section-heading centered-heading"><span>Divine moments</span><h2>Temple Gallery</h2></div>
          <div className="gallery-mosaic">
            {gallery.map((image, index) => (
              <Link to="/gallery" key={image.id} className={index === 0 ? 'gallery-feature' : ''}>
                <img src={image.image_url} alt={image.caption || 'Temple celebration'} loading="lazy" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="page-container visit-card">
        <div>
          <span>Plan your visit</span>
          <h2>Come, receive the blessings of Lalithambike</h2>
          <p><MapPin size={17} /> Padmanabhanagar, Bengaluru, Karnataka</p>
        </div>
        <div className="visit-actions">
          <Link to="/contact" className="btn-secondary">Temple Timings</Link>
          <Link to="/poojas" className="btn-primary">Book a Seva <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  )
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Link to={`/poojas/${service.slug}`} className="service-card group">
      <div className="service-image">
        {service.image_url ? <img src={service.image_url} alt={service.name} loading="lazy" /> : <span>🪷</span>}
        <small>{service.category}</small>
      </div>
      <div className="service-body">
        <h3>{service.name}</h3>
        <p>{service.description}</p>
        <div><strong>₹{service.price.toLocaleString('en-IN')}</strong><span><Clock3 size={13} /> {service.duration_minutes} min</span></div>
      </div>
    </Link>
  )
}

function EventCard({ event }: { event: Event }) {
  const date = new Date(event.start_datetime)
  return (
    <Link to={`/festivals/${event.slug}`} className="event-card">
      <time><strong>{format(date, 'dd')}</strong><span>{format(date, 'MMM')}</span></time>
      <div><h3>{event.title}</h3><p>{event.description}</p><span><MapPin size={13} /> {event.venue}</span></div>
      <ArrowRight size={18} />
    </Link>
  )
}
