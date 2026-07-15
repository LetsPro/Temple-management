import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Bell, BookOpen, ChevronRight, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { format, isFuture } from 'date-fns'
import type { Database } from '../../lib/database.types'
import { Skeleton } from '../../components/ui/Skeleton'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  pooja_services: { name: string } | null
}
type Announcement = Database['public']['Tables']['announcements']['Row']

export default function DevoteeDashboard() {
  const { user, profile } = useAuth()
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [bookingsRes, announcementsRes, notifRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, pooja_services(name)')
          .eq('devotee_id', user!.id)
          .gte('booking_date', new Date().toISOString().split('T')[0])
          .in('booking_status', ['pending', 'confirmed'])
          .order('booking_date')
          .limit(3),
        supabase
          .from('announcements')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', user!.id)
          .eq('is_read', false),
      ])
      setUpcomingBookings((bookingsRes.data || []) as unknown as Booking[])
      setAnnouncements(announcementsRes.data || [])
      setUnreadCount(notifRes.count || 0)
      setLoading(false)
    }
    load()
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const statusColor = (status: string) => {
    if (status === 'confirmed') return 'text-green-700 bg-green-50 border-green-200'
    if (status === 'pending') return 'text-amber-700 bg-amber-50 border-amber-200'
    if (status === 'cancelled') return 'text-red-700 bg-red-50 border-red-200'
    return 'text-gray-700 bg-gray-50 border-gray-200'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-vermilion-700 to-saffron-500 rounded-3xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-white/70 text-sm mb-1">{greeting()},</div>
            <h1 className="text-2xl font-bold mb-1">{profile?.full_name || 'Devotee'} 🙏</h1>
            {profile?.devotee_number && (
              <div className="text-white/70 text-xs">Devotee ID: {profile.devotee_number}</div>
            )}
          </div>
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl">
            {profile?.full_name?.[0]?.toUpperCase() || '🛕'}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/portal/book" className="inline-flex items-center gap-1.5 bg-white text-vermilion-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-cream-100 transition-all">
            <BookOpen size={14} /> Book Pooja
          </Link>
          {unreadCount > 0 && (
            <Link to="/portal/notifications" className="inline-flex items-center gap-1.5 bg-white/15 border border-white/30 text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/20 transition-all">
              <Bell size={14} /> {unreadCount} New
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming Bookings', value: upcomingBookings.length, icon: '📅', href: '/portal/bookings' },
          { label: 'Notifications', value: unreadCount, icon: '🔔', href: '/portal/notifications' },
          { label: 'Profile Complete', value: profile?.city ? '100%' : '60%', icon: '👤', href: '/portal/profile' },
        ].map(stat => (
          <Link key={stat.label} to={stat.href} className="card hover:shadow-temple-md transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <ChevronRight size={14} className="text-temple-muted group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-xl font-bold text-temple-text">{loading ? '—' : stat.value}</div>
            <div className="text-xs text-temple-muted mt-0.5">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-temple-text flex items-center gap-2">
              <Calendar size={16} className="text-saffron-500" /> Upcoming Bookings
            </h3>
            <Link to="/portal/bookings" className="text-sm text-vermilion-600 font-medium hover:text-vermilion-700">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-temple-muted text-sm mb-3">No upcoming bookings</p>
              <Link to="/portal/book" className="btn-primary text-sm py-2">Book a Pooja</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 bg-cream-100/60 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-vermilion-50 flex flex-col items-center justify-center flex-shrink-0">
                    <div className="text-vermilion-700 font-bold text-sm leading-none">{format(new Date(b.booking_date), 'dd')}</div>
                    <div className="text-vermilion-400 text-[10px]">{format(new Date(b.booking_date), 'MMM')}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-temple-text text-sm truncate">{b.pooja_services?.name}</div>
                    <div className="text-xs text-temple-muted flex items-center gap-1">
                      <Clock size={10} /> {b.slot_time} · #{b.booking_number}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor(b.booking_status)}`}>
                    {b.booking_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-temple-text mb-4 flex items-center gap-2">
            <Bell size={16} className="text-saffron-500" /> Temple Announcements
          </h3>
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className={`p-4 rounded-xl border ${a.priority === 'urgent' ? 'bg-red-50 border-red-100' : a.priority === 'important' ? 'bg-amber-50 border-amber-100' : 'bg-cream-100/50 border-temple-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-temple-text text-sm mb-0.5">{a.title}</div>
                    <p className="text-temple-muted text-xs line-clamp-2 leading-relaxed">{a.content}</p>
                  </div>
                  {a.priority !== 'normal' && (
                    <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full capitalize ${a.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="card">
        <h3 className="font-bold text-temple-text mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/portal/book', icon: '🙏', label: 'Book Pooja' },
            { href: '/portal/bookings', icon: '📋', label: 'My Bookings' },
            { href: '/portal/profile', icon: '👤', label: 'My Profile' },
          ].map(a => (
            <Link key={a.href} to={a.href} className="flex flex-col items-center gap-2 p-4 bg-cream-100/50 hover:bg-cream-100 rounded-2xl border border-temple-border hover:border-saffron-300 transition-all group">
              <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
              <span className="text-xs font-semibold text-temple-text">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
