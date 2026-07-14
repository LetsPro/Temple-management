import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, ChevronDown, Printer, X, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  pooja_services: { name: string; price: number } | null
}

type Tab = 'upcoming' | 'completed' | 'cancelled'

export default function DevoteeBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*, pooja_services(name, price)')
      .eq('devotee_id', user.id)
      .order('booking_date', { ascending: false })
    setBookings((data || []) as unknown as Booking[])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const now = new Date().toISOString().split('T')[0]
  const tabs: { key: Tab; label: string; filter: (b: Booking) => boolean }[] = [
    { key: 'upcoming', label: 'Upcoming', filter: b => (b.booking_status === 'pending' || b.booking_status === 'confirmed') && b.booking_date >= now },
    { key: 'completed', label: 'Completed', filter: b => b.booking_status === 'completed' || b.booking_date < now },
    { key: 'cancelled', label: 'Cancelled', filter: b => b.booking_status === 'cancelled' || b.booking_status === 'rescheduled' },
  ]

  const displayed = bookings.filter(tabs.find(t => t.key === tab)!.filter)

  const cancelBooking = async (booking: Booking) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    setCancellingId(booking.id)
    const { error } = await supabase.from('bookings').update({ booking_status: 'cancelled', cancellation_reason: 'Cancelled by devotee' }).eq('id', booking.id)
    setCancellingId(null)
    if (error) { toast.error('Failed to cancel booking.'); return }
    toast.success('Booking cancelled.')
    load()
  }

  const statusColor = (s: string) => ({
    confirmed: 'text-green-700 bg-green-50 border-green-200',
    pending: 'text-amber-700 bg-amber-50 border-amber-200',
    cancelled: 'text-red-700 bg-red-50 border-red-200',
    completed: 'text-blue-700 bg-blue-50 border-blue-200',
    rescheduled: 'text-purple-700 bg-purple-50 border-purple-200',
  }[s] || 'text-gray-700 bg-gray-50 border-gray-200')

  const paymentColor = (s: string) => s === 'paid' ? 'text-green-600' : s === 'failed' ? 'text-red-600' : 'text-amber-600'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">My Bookings</h1>
          <p className="text-temple-muted text-sm">Manage your pooja and seva bookings.</p>
        </div>
        <Link to="/portal/book" className="btn-primary text-sm">+ Book Pooja</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-temple-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${tab === t.key ? 'border-vermilion-700 text-vermilion-700' : 'border-transparent text-temple-muted hover:text-temple-text'}`}>
            {t.label} ({loading ? '…' : bookings.filter(t.filter).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : displayed.length === 0 ? (
        <EmptyState icon="📅" title={`No ${tab} bookings`} description={tab === 'upcoming' ? 'Book a pooja or seva to see it here.' : 'Nothing to show here.'}
          action={tab === 'upcoming' ? <Link to="/portal/book" className="btn-primary text-sm">Book Now</Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {displayed.map(b => (
            <div key={b.id} className="card hover:shadow-temple-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-shrink-0 sm:w-14 flex sm:flex-col sm:items-center sm:justify-center sm:bg-vermilion-50 sm:rounded-xl sm:p-2 text-sm font-bold text-vermilion-700">
                  <span>{format(new Date(b.booking_date), 'dd MMM')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-temple-text">{b.pooja_services?.name}</div>
                      <div className="text-sm text-temple-muted mt-0.5 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock size={12} /> {b.slot_time}</span>
                        <span>#{b.booking_number}</span>
                        <span>{b.participant_count} {b.participant_count === 1 ? 'person' : 'people'}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-vermilion-700">₹{b.total_amount.toLocaleString('en-IN')}</div>
                      <div className={`text-xs font-medium ${paymentColor(b.payment_status)}`}>{b.payment_status}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${statusColor(b.booking_status)}`}>
                    {b.booking_status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-temple-border/50">
                <button onClick={() => setSelectedBooking(b)} className="btn-ghost text-xs">View Details</button>
                <button onClick={() => { setSelectedBooking(b); window.print() }} className="btn-ghost text-xs">
                  <Printer size={12} /> Receipt
                </button>
                {(b.booking_status === 'pending' || b.booking_status === 'confirmed') && b.booking_date >= now && (
                  <button
                    onClick={() => cancelBooking(b)}
                    disabled={cancellingId === b.id}
                    className="btn-ghost text-xs text-red-600 hover:bg-red-50 ml-auto"
                  >
                    <X size={12} /> {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} id="booking-receipt">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-temple-text text-lg">Booking Details</h3>
                <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button>
              </div>

              {/* Receipt content */}
              <div className="text-center border-b border-temple-border pb-4 mb-4">
                <div className="text-2xl mb-1">🛕</div>
                <div className="font-bold">Shri Tripura Sundari Lalithambe Trust</div>
                <div className="text-xs text-temple-muted">Booking Receipt</div>
              </div>

              <div className="space-y-2.5 text-sm">
                {[
                  ['Booking No.', selectedBooking.booking_number],
                  ['Service', selectedBooking.pooja_services?.name || ''],
                  ['Date', format(new Date(selectedBooking.booking_date), 'dd MMMM yyyy')],
                  ['Time', selectedBooking.slot_time],
                  ['Participants', `${selectedBooking.participant_count}`],
                  ['Amount', `₹${selectedBooking.total_amount.toLocaleString('en-IN')}`],
                  ['Payment', selectedBooking.payment_status],
                  ['Status', selectedBooking.booking_status],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-temple-muted">{label}</span>
                    <span className="font-semibold text-temple-text capitalize">{value}</span>
                  </div>
                ))}
                {selectedBooking.special_notes && (
                  <div className="pt-2 border-t border-temple-border">
                    <div className="text-temple-muted text-xs">Notes</div>
                    <div className="text-temple-text text-sm">{selectedBooking.special_notes}</div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-2">
                <button onClick={() => window.print()} className="btn-secondary flex-1 justify-center text-sm">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setSelectedBooking(null)} className="btn-primary flex-1 justify-center text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
