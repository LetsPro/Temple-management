import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Printer, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'

type Donation = Database['public']['Tables']['donations']['Row']

export default function DevoteeDonations() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Donation | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('donations').select('*').eq('devotee_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      setDonations(data || [])
      setLoading(false)
    })
  }, [user])

  const statusColor = (s: string) => s === 'paid' ? 'text-green-700 bg-green-50' : s === 'offline' ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">My Donations</h1>
          <p className="text-temple-muted text-sm">View your donation history and receipts.</p>
        </div>
        <Link to="/donate" className="btn-primary text-sm">+ Donate</Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : donations.length === 0 ? (
        <EmptyState icon="💛" title="No donations yet" description="Make your first donation to support the temple's sacred services."
          action={<Link to="/donate" className="btn-primary text-sm">Donate Now</Link>} />
      ) : (
        <div className="space-y-3">
          {donations.map(d => (
            <div key={d.id} className="card hover:shadow-temple-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center text-lg flex-shrink-0">🪔</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-temple-text">{d.is_anonymous ? 'Anonymous Donation' : d.purpose}</div>
                  <div className="text-xs text-temple-muted">{format(new Date(d.created_at), 'dd MMM yyyy, h:mm a')} · #{d.donation_number}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-vermilion-700 text-lg">₹{d.amount.toLocaleString('en-IN')}</div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(d.payment_status)}`}>{d.payment_status}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-temple-border/50">
                <button onClick={() => setSelected(d)} className="btn-ghost text-xs">View Receipt</button>
                <button onClick={() => { setSelected(d); setTimeout(() => window.print(), 100) }} className="btn-ghost text-xs">
                  <Printer size={12} /> Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receipt modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md" onClick={e => e.stopPropagation()} id="donation-receipt">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg text-temple-text">Donation Receipt</h3>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button>
              </div>

              <div className="text-center border-b border-temple-border pb-4 mb-4">
                <div className="text-3xl mb-1">🛕</div>
                <div className="font-bold text-temple-text text-lg">Shri Tripura Sundari Lalithambe Trust</div>
                <div className="text-xs text-temple-muted">Donation Receipt</div>
              </div>

              <div className="space-y-2.5 text-sm">
                {[
                  ['Receipt No.', selected.donation_number],
                  ['Donor', selected.is_anonymous ? 'Anonymous Devotee' : selected.donor_name],
                  ['Purpose', selected.purpose === 'Custom' ? selected.custom_purpose : selected.purpose],
                  ['Amount', `₹${selected.amount.toLocaleString('en-IN')}`],
                  ['Status', selected.payment_status],
                  ['Date', format(new Date(selected.created_at), 'dd MMMM yyyy, h:mm a')],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-temple-muted">{l}</span>
                    <span className="font-semibold text-temple-text capitalize">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-temple-border text-xs text-temple-muted text-center">
                Thank you for your generous contribution. May the Lord bless you and your family.
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => window.print()} className="btn-secondary flex-1 justify-center text-sm"><Printer size={14} /> Print</button>
                <button onClick={() => setSelected(null)} className="btn-primary flex-1 justify-center text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
