import { useEffect, useState } from 'react'
import { Check, CreditCard, Crown, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { payWithRazorpay } from '../../lib/razorpay'
import toast from 'react-hot-toast'

type Plan = { id: string; name: string; amount: number; duration_months: number; benefits: string[] }
const fallbackPlans: Plan[] = [
  { id: 'annual', name: 'Annual Patron', amount: 3511, duration_months: 12, benefits: ['Special seva passes on Guru Pournami', 'Birthday abhisheka and puja', 'Family special-occasion puja', '4 Vaikunta Ekadashi seva passes', 'Astrology, gemology and vaastu consultations', 'Go-puja and virtual yoga', 'Full moon naturopathy', 'Annaprasadam for 20 people'] },
  { id: 'half-yearly', name: 'Half-Yearly Patron', amount: 2511, duration_months: 6, benefits: ['Special seva passes on Guru Pournami', 'Family special-occasion puja', '4 Vaikunta Ekadashi seva passes', 'Astrology and gemology consultations', 'Go-puja and virtual yoga', 'Annaprasadam for 15 people'] },
  { id: 'quarterly', name: 'Quarterly Patron', amount: 1611, duration_months: 3, benefits: ['Special seva passes on Guru Pournami', 'Family special-occasion puja', '4 Vaikunta Ekadashi seva passes', 'Astrology consultation', 'Go-puja and virtual yoga', 'Annaprasadam for 10 people'] },
]

export default function MembershipPage() {
  const { user, profile } = useAuth()
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans)
  const [selected, setSelected] = useState<Plan>(fallbackPlans[0])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ full_name: '', spouse_name: '', date_of_birth: '', rashi: '', nakshatra: '', address: '', mobile: '', declaration_accepted: false })

  useEffect(() => {
    supabase.from('membership_plans').select('id,name,amount,duration_months,benefits').eq('is_active', true).order('display_order').then(({ data }) => {
      if (data?.length) { const typed = data.map(item => ({ ...item, amount: Number(item.amount), benefits: Array.isArray(item.benefits) ? item.benefits.map(String) : [] })); setPlans(typed); setSelected(typed[0]) }
    })
  }, [])
  useEffect(() => {
    if (profile) setForm(current => ({ ...current, full_name: profile.full_name, address: profile.address, mobile: profile.mobile }))
  }, [profile])
  const set = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }))

  const join = async () => {
    if (!user) return toast.error('Please sign in before applying for membership.')
    if (!form.full_name || !form.date_of_birth || !form.address || form.mobile.replace(/\D/g, '').length < 10) return toast.error('Complete all required membership details.')
    if (!form.declaration_accepted) return toast.error('Please accept the declaration.')
    if (selected.id === 'annual' || selected.id === 'half-yearly' || selected.id === 'quarterly') return toast.error('Membership plans must be activated in the database before payment.')
    setSubmitting(true)
    try {
      const { data: membership, error } = await supabase.from('memberships').insert({ devotee_id: user.id, plan_id: selected.id, ...form, status: 'pending', payment_status: 'pending', starts_at: null, expires_at: null }).select('id,membership_number').single()
      if (error || !membership) throw new Error(error?.message || 'Could not create membership application.')
      await payWithRazorpay({ paymentType: 'membership', referenceId: membership.id, title: 'Shri Tripura Sundari Lalithambe Trust', description: `${selected.name} Membership`, prefill: { name: form.full_name, email: profile?.email, contact: form.mobile } })
      toast.success(`Membership ${membership.membership_number} is now active.`)
    } catch (error) { toast.error((error as Error).message) } finally { setSubmitting(false) }
  }

  return <div className="membership-page">
    <section className="membership-hero"><div className="page-container"><span>Devotion · Service · Belonging</span><h1>Patron Membership</h1><p>Join the Trust family and participate more deeply in sacred sevas, celebrations and community service.</p></div></section>
    <section className="page-container py-14">
      <div className="section-heading centered-heading"><span>Choose your membership</span><h2>Membership plans</h2><p>Benefits and fees are based on the supplied Trust membership form.</p></div>
      <div className="membership-plans">{plans.map((plan, index) => <button key={plan.id} onClick={() => setSelected(plan)} className={selected.id === plan.id ? 'selected' : ''}>{index === 0 && <em>Most complete</em>}<Crown /><h3>{plan.name}</h3><strong>₹{plan.amount.toLocaleString('en-IN')}</strong><span>{plan.duration_months === 12 ? '1 year' : `${plan.duration_months} months`}</span><ul>{plan.benefits.map(benefit => <li key={benefit}><Check />{benefit}</li>)}</ul><b>{selected.id === plan.id ? 'Selected' : 'Select plan'}</b></button>)}</div>
    </section>
    <section className="membership-form-section"><div className="page-container membership-form-grid"><div><span className="eyebrow">Membership application</span><h2>Complete your devotional profile</h2><p>These details follow the uploaded membership application. Your active plan and renewal date will appear in My Profile after verified payment.</p><div className="secure-note"><ShieldCheck /><div><strong>Secure Razorpay payment</strong><small>Your subscription activates only after server-side signature verification.</small></div></div></div>
      <div className="membership-form">
        {!user && <div className="signin-notice"><p>Please sign in so this membership can be connected to your profile.</p><Link to="/login" className="btn-primary">Sign in to continue</Link></div>}
        <div className="selected-plan"><span>{selected.name}</span><strong>₹{selected.amount.toLocaleString('en-IN')} · {selected.duration_months} months</strong></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name *" value={form.full_name} onChange={value => set('full_name', value)} />
          <Field label="Spouse name" value={form.spouse_name} onChange={value => set('spouse_name', value)} />
          <Field label="Date of birth *" type="date" value={form.date_of_birth} onChange={value => set('date_of_birth', value)} />
          <Field label="Mobile number *" value={form.mobile} onChange={value => set('mobile', value)} />
          <Field label="Rashi" value={form.rashi} onChange={value => set('rashi', value)} />
          <Field label="Nakshatra" value={form.nakshatra} onChange={value => set('nakshatra', value)} />
          <label className="sm:col-span-2"><span className="label">Address *</span><textarea className="input-field" rows={3} value={form.address} onChange={event => set('address', event.target.value)} /></label>
        </div>
        <label className="declaration"><input type="checkbox" checked={form.declaration_accepted} onChange={event => set('declaration_accepted', event.target.checked)} /><span>I declare that the information above is correct to the best of my knowledge.</span></label>
        <button onClick={join} disabled={!user || submitting} className="btn-primary w-full py-3.5 text-base"><CreditCard /> {submitting ? 'Processing membership...' : `Join for ₹${selected.amount.toLocaleString('en-IN')}`}</button>
      </div>
    </div></section>
  </div>
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="label">{label}</span><input className="input-field" type={type} value={value} onChange={event => onChange(event.target.value)} /></label>
}
