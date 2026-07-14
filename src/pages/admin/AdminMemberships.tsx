import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

type Membership = Database['public']['Tables']['memberships']['Row']
type Plan = Database['public']['Tables']['membership_plans']['Row']

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [search, setSearch] = useState('')
  useEffect(() => { Promise.all([supabase.from('memberships').select('*').order('created_at', { ascending: false }), supabase.from('membership_plans').select('*')]).then(([members, planRows]) => { setMemberships(members.data || []); setPlans(Object.fromEntries((planRows.data || []).map(plan => [plan.id, plan]))) }) }, [])
  const filtered = memberships.filter(item => !search || item.full_name.toLowerCase().includes(search.toLowerCase()) || item.membership_number.toLowerCase().includes(search.toLowerCase()))
  return <div className="space-y-6 animate-fade-in"><div><h1 className="text-2xl font-bold text-temple-text">Memberships</h1><p className="text-temple-muted text-sm">Review patron subscriptions, payment status and renewal dates.</p></div>
    <div className="card grid grid-cols-3 gap-4"><div><small className="text-temple-muted">Total members</small><strong className="block text-2xl">{memberships.length}</strong></div><div><small className="text-temple-muted">Active</small><strong className="block text-2xl text-green-700">{memberships.filter(m => m.status === 'active').length}</strong></div><div><small className="text-temple-muted">Pending</small><strong className="block text-2xl text-amber-700">{memberships.filter(m => m.status === 'pending').length}</strong></div></div>
    <div className="relative"><Search className="absolute left-3 top-3 text-temple-muted" size={17}/><input className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member or membership number" /></div>
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{['Member','Plan','Status','Payment','Start','Renewal'].map(h => <th key={h} className="text-left py-3 pr-4 text-xs uppercase text-temple-muted">{h}</th>)}</tr></thead><tbody className="divide-y">{filtered.map(item => <tr key={item.id}><td className="py-4 pr-4"><b>{item.full_name}</b><small className="block text-temple-muted">{item.membership_number} · {item.mobile}</small></td><td className="pr-4">{plans[item.plan_id]?.name || 'Plan'}</td><td className="pr-4 capitalize">{item.status}</td><td className="pr-4 capitalize">{item.payment_status}</td><td className="pr-4">{item.starts_at ? format(new Date(item.starts_at), 'dd MMM yyyy') : '—'}</td><td>{item.expires_at ? format(new Date(item.expires_at), 'dd MMM yyyy') : '—'}</td></tr>)}</tbody></table>{!filtered.length && <div className="py-12 text-center text-temple-muted"><Users className="mx-auto mb-2"/>No memberships found</div>}</div>
  </div>
}
