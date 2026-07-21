import { useEffect, useState } from 'react'
import { Search, Users, Crown } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import toast from 'react-hot-toast'

type Membership = Database['public']['Tables']['memberships']['Row']
type Plan = Database['public']['Tables']['membership_plans']['Row']

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [search, setSearch] = useState('')
  const load = () => Promise.all([supabase.from('memberships').select('*').order('created_at', { ascending: false }), supabase.from('membership_plans').select('*').order('display_order')]).then(([members, planRows]) => { setMemberships(members.data || []); setPlans(Object.fromEntries((planRows.data || []).map(plan => [plan.id, plan]))) })
  useEffect(() => { load() }, [])
  const togglePlan = async (plan: Plan) => {
    const { error } = await supabase.from('membership_plans').update({ is_active: !plan.is_active }).eq('id', plan.id)
    if (error) return toast.error('Could not update the membership plan.')
    toast.success(`${plan.name} ${plan.is_active ? 'disabled' : 'activated'}.`)
    await load()
  }
  const filtered = memberships.filter(item => !search || item.full_name.toLowerCase().includes(search.toLowerCase()) || item.membership_number.toLowerCase().includes(search.toLowerCase()))
  return <div className="space-y-6 animate-fade-in"><div><h1 className="text-2xl font-bold text-temple-text">Memberships</h1><p className="text-temple-muted text-sm">Review patron subscriptions, payment status and renewal dates.</p></div>
    <div className="card grid grid-cols-3 gap-4"><div><small className="text-temple-muted">Total members</small><strong className="block text-2xl">{memberships.length}</strong></div><div><small className="text-temple-muted">Active</small><strong className="block text-2xl text-green-700">{memberships.filter(m => m.status === 'active').length}</strong></div><div><small className="text-temple-muted">Pending</small><strong className="block text-2xl text-amber-700">{memberships.filter(m => m.status === 'pending').length}</strong></div></div>
    <div className="card"><div className="flex items-center gap-2 mb-4"><Crown size={18} className="text-saffron-500"/><h2 className="font-bold text-temple-text">Membership plans</h2></div><div className="grid md:grid-cols-3 gap-3">{Object.values(plans).map(plan => <div key={plan.id} className="rounded-xl border border-temple-border p-4"><div className="flex items-start justify-between gap-3"><div><strong className="block text-temple-text">{plan.name}</strong><span className="text-sm text-temple-muted">₹{Number(plan.amount).toLocaleString('en-IN')} · {plan.duration_months} months</span></div><span className={`text-xs font-semibold px-2 py-1 rounded-full ${plan.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span></div><button onClick={() => togglePlan(plan)} className="btn-secondary text-xs mt-3 py-1.5">{plan.is_active ? 'Disable' : 'Activate'}</button></div>)}</div>{!Object.keys(plans).length && <p className="text-sm text-amber-700">No membership plans are configured. Apply the membership plan repair migration.</p>}</div>
    <div className="relative"><Search className="absolute left-3 top-3 text-temple-muted" size={17}/><input className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member or membership number" /></div>
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{['Member','Plan','Status','Payment','Start','Renewal'].map(h => <th key={h} className="text-left py-3 pr-4 text-xs uppercase text-temple-muted">{h}</th>)}</tr></thead><tbody className="divide-y">{filtered.map(item => <tr key={item.id}><td className="py-4 pr-4"><b>{item.full_name}</b><small className="block text-temple-muted">{item.membership_number} · {item.mobile}</small></td><td className="pr-4">{plans[item.plan_id]?.name || 'Plan'}</td><td className="pr-4 capitalize">{item.status}</td><td className="pr-4 capitalize">{item.payment_status}</td><td className="pr-4">{item.starts_at ? format(new Date(item.starts_at), 'dd MMM yyyy') : '—'}</td><td>{item.expires_at ? format(new Date(item.expires_at), 'dd MMM yyyy') : '—'}</td></tr>)}</tbody></table>{!filtered.length && <div className="py-12 text-center text-temple-muted"><Users className="mx-auto mb-2"/>No memberships found</div>}</div>
  </div>
}
