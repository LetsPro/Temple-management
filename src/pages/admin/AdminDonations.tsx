import { useState, useEffect } from 'react'
import { Search, Plus, X, Eye, Printer, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Donation = Database['public']['Tables']['donations']['Row']

const PURPOSES = ['Annadanam', 'Temple Development', 'Goshala', 'Festival Fund', 'General Donation', 'Custom']

const offlineSchema = z.object({
  donor_name: z.string().min(2),
  donor_email: z.string().email().or(z.literal('')),
  donor_mobile: z.string().min(10),
  purpose: z.string().min(1),
  custom_purpose: z.string().optional(),
  amount: z.number().min(1),
  offline_reference: z.string().optional(),
  notes: z.string().optional(),
  is_anonymous: z.boolean(),
})
type OfflineForm = z.infer<typeof offlineSchema>

export default function AdminDonations() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Donation | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<OfflineForm>({
    resolver: zodResolver(offlineSchema),
    defaultValues: { is_anonymous: false, amount: 0, purpose: 'General Donation' },
  })

  const selectedPurpose = watch('purpose')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('donations').select('*').order('created_at', { ascending: false })
    setDonations(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = donations.filter(d => {
    const matchSearch = !search || d.donor_name.toLowerCase().includes(search.toLowerCase()) || d.donation_number.includes(search) || d.purpose.toLowerCase().includes(search.toLowerCase())
    const matchPurpose = purposeFilter === 'all' || d.purpose === purposeFilter
    return matchSearch && matchPurpose
  })

  const totalAmount = filtered.reduce((sum, d) => sum + (d.payment_status === 'paid' || d.payment_status === 'offline' ? d.amount : 0), 0)

  const addOffline = async (data: OfflineForm) => {
    setSubmitting(true)
    const { error } = await supabase.from('donations').insert({
      donor_name: data.is_anonymous ? 'Anonymous Devotee' : data.donor_name,
      donor_email: data.donor_email || '',
      donor_mobile: data.donor_mobile,
      purpose: data.purpose,
      custom_purpose: data.custom_purpose || '',
      amount: data.amount,
      is_anonymous: data.is_anonymous,
      payment_status: 'offline',
      offline_reference: data.offline_reference || '',
      notes: data.notes || '',
      devotee_id: null,
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Offline donation recorded.')
    reset()
    setShowForm(false)
    load()
  }

  const exportCSV = () => {
    const header = 'Donation No,Donor,Purpose,Amount,Status,Date'
    const rows = filtered.map(d => `${d.donation_number},${d.is_anonymous ? 'Anonymous' : d.donor_name},${d.purpose},${d.amount},${d.payment_status},${format(new Date(d.created_at), 'dd/MM/yyyy')}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'donations.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const statusColor = (s: string) => s === 'paid' || s === 'offline' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Donation Management</h1>
          <p className="text-temple-muted text-sm">Total (filtered): ₹{totalAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm"><Download size={14} /></button>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm"><Plus size={15} /> Offline Donation</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-temple-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search donor, donation #, purpose..." className="input-field pl-9" />
        </div>
        <select value={purposeFilter} onChange={e => setPurposeFilter(e.target.value)} className="input-field sm:w-48">
          <option value="all">All Purposes</option>
          {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="💛" title="No donations found" />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-temple-border text-left">
                  {['Donation No.', 'Donor', 'Purpose', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="pb-3 pr-4 text-xs font-semibold text-temple-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-temple-border/40">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-cream-100/30 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-vermilion-600 font-bold">{d.donation_number}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{d.is_anonymous ? 'Anonymous' : d.donor_name}</div>
                      {!d.is_anonymous && <div className="text-xs text-temple-muted">{d.donor_mobile}</div>}
                    </td>
                    <td className="py-3 pr-4 text-temple-text">{d.purpose === 'Custom' ? d.custom_purpose || 'Custom' : d.purpose}</td>
                    <td className="py-3 pr-4 font-bold text-vermilion-700">₹{d.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 pr-4"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(d.payment_status)}`}>{d.payment_status}</span></td>
                    <td className="py-3 pr-4 text-temple-muted">{format(new Date(d.created_at), 'dd MMM yyyy')}</td>
                    <td className="py-3"><button onClick={() => setSelected(d)} className="p-1.5 hover:bg-cream-100 rounded-lg text-temple-muted"><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="card" onClick={() => setSelected(d)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center text-lg flex-shrink-0">🪔</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-temple-text">{d.is_anonymous ? 'Anonymous' : d.donor_name}</div>
                    <div className="text-xs text-temple-muted">{d.purpose} · {d.donation_number}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-vermilion-700">₹{d.amount.toLocaleString('en-IN')}</div>
                    <span className={`text-xs font-semibold ${statusColor(d.payment_status)}`}>{d.payment_status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Receipt modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md" onClick={e => e.stopPropagation()} id="donation-receipt">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold">Donation Receipt</h3><button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button></div>
              <div className="text-center border-b border-temple-border pb-4 mb-4"><div className="text-2xl">🛕</div><div className="font-bold">Sri Mahalakshmi Temple</div><div className="text-xs text-temple-muted">Donation Receipt</div></div>
              <div className="space-y-2 text-sm mb-4">
                {[['Receipt No.', selected.donation_number], ['Donor', selected.is_anonymous ? 'Anonymous' : selected.donor_name], ['Purpose', selected.purpose === 'Custom' ? selected.custom_purpose || 'Custom' : selected.purpose], ['Amount', `₹${selected.amount.toLocaleString('en-IN')}`], ['Status', selected.payment_status], ['Date', format(new Date(selected.created_at), 'dd MMM yyyy')]].map(([l, v]) => (
                  <div key={l} className="flex justify-between"><span className="text-temple-muted">{l}</span><span className="font-semibold capitalize">{v}</span></div>
                ))}
                {selected.offline_reference && <div className="flex justify-between"><span className="text-temple-muted">Reference</span><span className="font-semibold">{selected.offline_reference}</span></div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="btn-secondary flex-1 justify-center text-sm"><Printer size={14} /></button>
                <button onClick={() => setSelected(null)} className="btn-primary flex-1 justify-center text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline donation form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-xl text-temple-text">Add Offline Donation</h3><button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button></div>
              <form onSubmit={handleSubmit(addOffline)} className="space-y-4">
                <label className="flex items-center gap-2"><input {...register('is_anonymous')} type="checkbox" className="w-4 h-4 rounded" /><span className="text-sm font-medium">Anonymous donation</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1"><label className="label">Donor Name *</label><input {...register('donor_name')} className="input-field" /></div>
                  <div><label className="label">Mobile *</label><input {...register('donor_mobile')} className="input-field" /></div>
                  <div className="col-span-2"><label className="label">Email</label><input {...register('donor_email')} type="email" className="input-field" /></div>
                  <div><label className="label">Purpose</label><select {...register('purpose')} className="input-field">{PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                  <div><label className="label">Amount (₹) *</label><input {...register('amount', { valueAsNumber: true })} type="number" min="1" className="input-field" /></div>
                  {selectedPurpose === 'Custom' && <div className="col-span-2"><label className="label">Specify Purpose</label><input {...register('custom_purpose')} className="input-field" /></div>}
                  <div className="col-span-2"><label className="label">Reference (Cheque/DD/Cash)</label><input {...register('offline_reference')} className="input-field" placeholder="Cheque no. or transaction reference" /></div>
                  <div className="col-span-2"><label className="label">Notes</label><textarea {...register('notes')} rows={2} className="input-field resize-none" /></div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">{submitting ? 'Saving...' : 'Record Donation'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
