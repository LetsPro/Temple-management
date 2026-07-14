import { useState, useEffect } from 'react'
import { Search, Eye, X, CheckCircle, XCircle, Download, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  profiles: { full_name: string; mobile: string; email: string } | null
  pooja_services: { name: string } | null
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [updating, setUpdating] = useState(false)
  const [adminNote, setAdminNote] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*, profiles(full_name, mobile, email), pooja_services(name)')
      .order('created_at', { ascending: false })
    setBookings((data || []) as unknown as Booking[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = bookings.filter(b => {
    const matchSearch = !search || (b.profiles?.full_name || b.guest_name || '').toLowerCase().includes(search.toLowerCase()) || b.booking_number.includes(search) || (b.pooja_services?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.booking_status === statusFilter
    return matchSearch && matchStatus
  })

  const updateStatus = async (booking: Booking, status: string) => {
    setUpdating(true)
    const { error } = await supabase.from('bookings').update({ booking_status: status as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled', admin_notes: adminNote || booking.admin_notes }).eq('id', booking.id)
    setUpdating(false)
    if (error) { toast.error('Update failed.'); return }
    toast.success(`Booking ${status}.`)
    setSelected(null)
    load()
  }

  const statusColor = (s: string) => ({ confirmed: 'text-green-700 bg-green-50 border-green-200', pending: 'text-amber-700 bg-amber-50 border-amber-200', cancelled: 'text-red-700 bg-red-50 border-red-200', completed: 'text-blue-700 bg-blue-50 border-blue-200', rescheduled: 'text-purple-700 bg-purple-50 border-purple-200' }[s] || 'text-gray-700 bg-gray-50')

  const exportCSV = () => {
    const header = 'Booking No,Devotee,Service,Date,Time,Participants,Amount,Payment,Status'
    const rows = filtered.map(b => `${b.booking_number},${b.profiles?.full_name || b.guest_name || ''},${b.pooja_services?.name || ''},${b.booking_date},${b.slot_time},${b.participant_count},${b.total_amount},${b.payment_status},${b.booking_status}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Booking Management</h1>
          <p className="text-temple-muted text-sm">{bookings.length} total bookings</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm"><Download size={14} /> Export</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-temple-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by booking #, name, service..." className="input-field pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${statusFilter === s ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white text-temple-muted border-temple-border hover:border-vermilion-300'}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📅" title="No bookings found" />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-temple-border text-left">
                  {['Booking', 'Devotee', 'Service', 'Date & Time', 'Amount', 'Payment', 'Status', 'Actions'].map(h => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold text-temple-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-temple-border/40">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-cream-100/30 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-vermilion-600 font-bold">{b.booking_number}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-temple-text">{b.profiles?.full_name || b.guest_name}</div>
                      <div className="text-xs text-temple-muted">{b.profiles?.mobile || b.guest_mobile}</div>
                    </td>
                    <td className="py-3 pr-4 text-temple-text">{b.pooja_services?.name}</td>
                    <td className="py-3 pr-4">
                      <div>{format(new Date(b.booking_date), 'dd MMM yyyy')}</div>
                      <div className="text-xs text-temple-muted">{b.slot_time} · {b.participant_count} pax</div>
                    </td>
                    <td className="py-3 pr-4 font-bold text-vermilion-700">₹{b.total_amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 pr-4 capitalize">
                      <span className={`text-xs font-semibold ${b.payment_status === 'paid' ? 'text-green-700' : 'text-amber-600'}`}>{b.payment_status}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor(b.booking_status)}`}>{b.booking_status}</span>
                    </td>
                    <td className="py-3">
                      <button onClick={() => { setSelected(b); setAdminNote(b.admin_notes || '') }} className="p-1.5 hover:bg-cream-100 rounded-lg text-temple-muted">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(b => (
              <div key={b.id} className="card" onClick={() => { setSelected(b); setAdminNote(b.admin_notes || '') }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-temple-text text-sm">{b.profiles?.full_name || b.guest_name}</div>
                    <div className="text-xs text-saffron-600 font-medium mt-0.5">{b.booking_number}</div>
                    <div className="text-xs text-temple-muted mt-1">{b.pooja_services?.name} · {format(new Date(b.booking_date), 'dd MMM')} · {b.slot_time}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-vermilion-700">₹{b.total_amount.toLocaleString('en-IN')}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor(b.booking_status)}`}>{b.booking_status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-temple-text">Booking Details</h3>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button>
              </div>

              <div className="space-y-2 text-sm mb-5">
                {[['Booking No.', selected.booking_number], ['Devotee', selected.profiles?.full_name || selected.guest_name || ''], ['Mobile', selected.profiles?.mobile || selected.guest_mobile || ''], ['Email', selected.profiles?.email || selected.guest_email || ''], ['Service', selected.pooja_services?.name || ''], ['Date', format(new Date(selected.booking_date), 'dd MMMM yyyy')], ['Time', selected.slot_time], ['Participants', `${selected.participant_count}`], ['Amount', `₹${selected.total_amount.toLocaleString('en-IN')}`], ['Payment', selected.payment_status], ['Status', selected.booking_status]].map(([l, v]) => (
                  <div key={l} className="flex justify-between"><span className="text-temple-muted">{l}</span><span className="font-semibold capitalize">{v}</span></div>
                ))}
              </div>

              {selected.special_notes && (
                <div className="mb-4 p-3 bg-cream-100 rounded-xl text-sm">
                  <div className="text-xs text-temple-muted mb-1">Special Notes</div>
                  <div className="text-temple-text">{selected.special_notes}</div>
                </div>
              )}

              <div className="mb-4">
                <label className="label">Admin Notes</label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} className="input-field resize-none text-sm" placeholder="Internal notes..." />
              </div>

              {selected.booking_status === 'pending' && (
                <div className="flex gap-2 mb-2">
                  <button onClick={() => updateStatus(selected, 'confirmed')} disabled={updating} className="btn-primary flex-1 justify-center text-sm gap-1.5 bg-green-600 hover:bg-green-700 from-green-600 to-green-600">
                    <CheckCircle size={14} /> Confirm
                  </button>
                  <button onClick={() => updateStatus(selected, 'cancelled')} disabled={updating} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50">
                    <XCircle size={14} /> Cancel
                  </button>
                </div>
              )}
              {selected.booking_status === 'confirmed' && (
                <button onClick={() => updateStatus(selected, 'completed')} disabled={updating} className="btn-primary w-full justify-center text-sm mb-2">Mark Completed</button>
              )}
              <button onClick={() => setSelected(null)} className="btn-secondary w-full justify-center text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
