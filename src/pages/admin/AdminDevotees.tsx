import { useState, useEffect } from 'react'
import { Search, Filter, Eye, UserCheck, UserX, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function AdminDevotees() {
  const [devotees, setDevotees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [selected, setSelected] = useState<Profile | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('role', 'devotee').order('created_at', { ascending: false })
    setDevotees(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleStatus = async (profile: Profile) => {
    await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id)
    toast.success(`Account ${profile.is_active ? 'deactivated' : 'activated'}.`)
    load()
  }

  const filtered = devotees.filter(d => {
    const matchSearch = !search || d.full_name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase()) || (d.devotee_number || '').includes(search) || d.mobile.includes(search)
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? d.is_active : !d.is_active)
    return matchSearch && matchActive
  })

  const exportCSV = () => {
    const header = 'Devotee Number,Name,Email,Mobile,City,State,Active,Registered'
    const rows = filtered.map(d => `${d.devotee_number || ''},${d.full_name},${d.email},${d.mobile},${d.city},${d.state},${d.is_active},${format(new Date(d.created_at), 'dd/MM/yyyy')}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'devotees.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Devotee Management</h1>
          <p className="text-temple-muted text-sm">{devotees.length} registered devotees</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm"><Download size={14} /> Export CSV</button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-temple-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, mobile, ID..." className="input-field pl-9" />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setFilterActive(f)} className={`px-3 py-2 rounded-xl text-sm font-semibold border capitalize transition-all ${filterActive === f ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white text-temple-muted border-temple-border hover:border-vermilion-300'}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👥" title="No devotees found" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-temple-border text-left">
                  <th className="pb-3 text-xs font-semibold text-temple-muted uppercase tracking-wide">Devotee</th>
                  <th className="pb-3 text-xs font-semibold text-temple-muted uppercase tracking-wide">Contact</th>
                  <th className="pb-3 text-xs font-semibold text-temple-muted uppercase tracking-wide">Location</th>
                  <th className="pb-3 text-xs font-semibold text-temple-muted uppercase tracking-wide">Registered</th>
                  <th className="pb-3 text-xs font-semibold text-temple-muted uppercase tracking-wide">Status</th>
                  <th className="pb-3 text-xs font-semibold text-temple-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-temple-border/40">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-cream-100/40 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vermilion-100 to-saffron-100 flex items-center justify-center font-bold text-xs text-vermilion-700 flex-shrink-0">
                          {d.full_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-temple-text">{d.full_name}</div>
                          <div className="text-xs text-saffron-600">{d.devotee_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-temple-text">{d.email}</div>
                      <div className="text-xs text-temple-muted">{d.mobile}</div>
                    </td>
                    <td className="py-3 pr-4 text-temple-muted">{[d.city, d.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="py-3 pr-4 text-temple-muted">{format(new Date(d.created_at), 'dd MMM yyyy')}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setSelected(d)} className="p-1.5 hover:bg-cream-100 rounded-lg text-temple-muted"><Eye size={14} /></button>
                        <button onClick={() => toggleStatus(d)} className={`p-1.5 rounded-lg ${d.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`}>
                          {d.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vermilion-100 to-saffron-100 flex items-center justify-center font-bold text-sm text-vermilion-700 flex-shrink-0">
                    {d.full_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-temple-text">{d.full_name}</div>
                    <div className="text-xs text-temple-muted">{d.devotee_number} · {d.email}</div>
                  </div>
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${d.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(d)} className="btn-ghost text-xs flex-1 justify-center"><Eye size={12} /> View</button>
                  <button onClick={() => toggleStatus(d)} className={`btn-ghost text-xs flex-1 justify-center ${d.is_active ? 'text-red-600' : 'text-green-600'}`}>
                    {d.is_active ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Devotee detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-vermilion-100 to-saffron-100 flex items-center justify-center font-bold text-xl text-vermilion-700">
                  {selected.full_name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-temple-text text-lg">{selected.full_name}</div>
                  <div className="text-saffron-600 text-sm font-medium">{selected.devotee_number}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[['Email', selected.email], ['Mobile', selected.mobile], ['Address', selected.address || '—'], ['City', selected.city || '—'], ['State', selected.state || '—'], ['Pincode', selected.pincode || '—'], ['Registered', format(new Date(selected.created_at), 'dd MMM yyyy')], ['Status', selected.is_active ? '✅ Active' : '❌ Inactive']].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-4">
                    <span className="text-temple-muted">{l}</span>
                    <span className="font-medium text-temple-text text-right">{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setSelected(null)} className="btn-secondary w-full justify-center mt-5">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
