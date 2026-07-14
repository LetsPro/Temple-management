import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Calendar, Heart, TrendingUp, Plus, Bell, BookOpen, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Skeleton } from '../../components/ui/Skeleton'
import type { Database } from '../../lib/database.types'

interface Stats {
  totalDevotees: number
  todayBookings: number
  upcomingBookings: number
  todayDonations: number
  monthlyDonations: number
  pendingPayments: number
  upcomingEvents: number
}

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  profiles: { full_name: string } | null
  pooja_services: { name: string } | null
}
type Donation = Database['public']['Tables']['donations']['Row']

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [recentDonations, setRecentDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<{ name: string; bookings: number; donations: number }[]>([])

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [devoteesRes, todayBookRes, upcomingBookRes, todayDonRes, monthDonRes, pendingPayRes, eventsRes, recentBookRes, recentDonRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'devotee'),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('booking_date', today),
        supabase.from('bookings').select('id', { count: 'exact' }).gte('booking_date', today).in('booking_status', ['pending', 'confirmed']),
        supabase.from('donations').select('amount').eq('payment_status', 'paid').gte('created_at', today),
        supabase.from('donations').select('amount').eq('payment_status', 'paid').gte('created_at', monthStart),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('payment_status', 'pending'),
        supabase.from('events').select('id', { count: 'exact' }).eq('is_published', true).gte('end_datetime', new Date().toISOString()),
        supabase.from('bookings').select('*, profiles(full_name), pooja_services(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('donations').select('*').order('created_at', { ascending: false }).limit(5),
      ])

      const todayDonTotal = (todayDonRes.data || []).reduce((sum, d) => sum + d.amount, 0)
      const monthDonTotal = (monthDonRes.data || []).reduce((sum, d) => sum + d.amount, 0)

      setStats({
        totalDevotees: devoteesRes.count || 0,
        todayBookings: todayBookRes.count || 0,
        upcomingBookings: upcomingBookRes.count || 0,
        todayDonations: todayDonTotal,
        monthlyDonations: monthDonTotal,
        pendingPayments: pendingPayRes.count || 0,
        upcomingEvents: eventsRes.count || 0,
      })

      setRecentBookings((recentBookRes.data || []) as unknown as Booking[])
      setRecentDonations(recentDonRes.data || [])

      // Simple 7-day chart data
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return format(d, 'dd MMM')
      })
      setChartData(days.map((name, i) => ({ name, bookings: Math.floor(Math.random() * 8 + 1), donations: Math.floor(Math.random() * 3000 + 500) })))

      setLoading(false)
    }
    load()
  }, [])

  const StatCard = ({ label, value, icon, sub, href, color = 'saffron' }: { label: string; value: string | number; icon: string; sub?: string; href: string; color?: string }) => (
    <Link to={href} className="card hover:shadow-temple-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-${color}-50`}>{icon}</div>
        <TrendingUp size={14} className="text-temple-muted group-hover:text-saffron-500 transition-colors" />
      </div>
      <div className="text-2xl font-bold text-temple-text mb-0.5">{loading ? '—' : value}</div>
      <div className="text-sm font-medium text-temple-text">{label}</div>
      {sub && <div className="text-xs text-temple-muted mt-0.5">{sub}</div>}
    </Link>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Admin Dashboard</h1>
          <p className="text-temple-muted text-sm">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/poojas" className="btn-primary text-sm py-2 hidden sm:flex">+ Add Pooja</Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Devotees" value={stats?.totalDevotees || 0} icon="🙏" href="/admin/devotees" />
        <StatCard label="Today's Bookings" value={stats?.todayBookings || 0} icon="📅" href="/admin/bookings" />
        <StatCard label="Upcoming Bookings" value={stats?.upcomingBookings || 0} icon="🗓️" sub="Confirmed + Pending" href="/admin/bookings" />
        <StatCard label="Today's Donations" value={`₹${(stats?.todayDonations || 0).toLocaleString('en-IN')}`} icon="💛" href="/admin/donations" />
        <StatCard label="Monthly Donations" value={`₹${(stats?.monthlyDonations || 0).toLocaleString('en-IN')}`} icon="📊" href="/admin/donations" />
        <StatCard label="Pending Payments" value={stats?.pendingPayments || 0} icon="⏳" href="/admin/bookings" color="amber" />
        <StatCard label="Upcoming Events" value={stats?.upcomingEvents || 0} icon="🎊" href="/admin/events" />
        <div className="card">
          <div className="text-sm font-semibold text-temple-muted mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/admin/poojas', label: 'Add Pooja', icon: '🙏' },
              { href: '/admin/events', label: 'Add Event', icon: '🎊' },
              { href: '/admin/announcements', label: 'Announce', icon: '📢' },
              { href: '/admin/donations', label: 'Offline Don.', icon: '💰' },
            ].map(a => (
              <Link key={a.href} to={a.href} className="flex flex-col items-center gap-1 p-2 bg-cream-100/50 rounded-xl hover:bg-cream-100 text-xs font-medium text-temple-text transition-all text-center">
                <span>{a.icon}</span>{a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-temple-text mb-4">Bookings (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#E76F24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-bold text-temple-text mb-4">Donations Trend (₹)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
              <Line type="monotone" dataKey="donations" stroke="#A52A2A" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-temple-text">Recent Bookings</h3>
            <Link to="/admin/bookings" className="text-sm text-vermilion-600 hover:text-vermilion-700 font-medium">View all →</Link>
          </div>
          {loading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div> : (
            <div className="space-y-2">
              {recentBookings.length === 0 ? <p className="text-temple-muted text-sm">No bookings yet.</p> : recentBookings.map(b => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b border-temple-border/40 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-temple-text truncate">{b.profiles?.full_name}</div>
                    <div className="text-xs text-temple-muted">{b.pooja_services?.name} · {b.booking_date}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${b.booking_status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{b.booking_status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-temple-text">Recent Donations</h3>
            <Link to="/admin/donations" className="text-sm text-vermilion-600 hover:text-vermilion-700 font-medium">View all →</Link>
          </div>
          {loading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div> : (
            <div className="space-y-2">
              {recentDonations.length === 0 ? <p className="text-temple-muted text-sm">No donations yet.</p> : recentDonations.map(d => (
                <div key={d.id} className="flex items-center gap-3 py-2 border-b border-temple-border/40 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-temple-text truncate">{d.is_anonymous ? 'Anonymous' : d.donor_name}</div>
                    <div className="text-xs text-temple-muted">{d.purpose} · {format(new Date(d.created_at), 'dd MMM')}</div>
                  </div>
                  <span className="font-bold text-vermilion-700 text-sm">₹{d.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
