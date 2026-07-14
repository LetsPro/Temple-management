import { FormEvent, useEffect, useState } from 'react'
import { Check, CreditCard, Crown, Eye, EyeOff, ShieldCheck, X } from 'lucide-react'
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
  const { user, profile, signIn } = useAuth()
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [login, setLogin] = useState({ email: '', password: '' })
  const [form, setForm] = useState({ full_name: '', spouse_name: '', date_of_birth: '', rashi: '', nakshatra: '', address: '', mobile: '', declaration_accepted: false })

  useEffect(() => {
    supabase.from('membership_plans').select('id,name,amount,duration_months,benefits').eq('is_active', true).order('display_order').then(({ data }) => {
      if (data?.length) { const typed = data.map(item => ({ ...item, amount: Number(item.amount), benefits: Array.isArray(item.benefits) ? item.benefits.map(String) : [] })); setPlans(typed) }
    })
  }, [])
  useEffect(() => {
    if (profile) setForm(current => ({ ...current, full_name: profile.full_name, address: profile.address, mobile: profile.mobile }))
  }, [profile])
  useEffect(() => {
    if (!activePlan) return
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setActivePlan(null)
    document.addEventListener('keydown', close)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = '' }
  }, [activePlan])
  const set = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }))

  const loginToJoin = async (event: FormEvent) => {
    event.preventDefault()
    if (!login.email || !login.password) return toast.error('Enter your email and password.')
    setSigningIn(true)
    const { error } = await signIn(login.email, login.password)
    setSigningIn(false)
    if (error) return toast.error(error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message)
    toast.success('Signed in. Complete your membership details.')
  }

  const join = async () => {
    if (!activePlan) return
    if (!user) return toast.error('Please sign in before applying for membership.')
    if (!form.full_name || !form.date_of_birth || !form.address || form.mobile.replace(/\D/g, '').length < 10) return toast.error('Complete all required membership details.')
    if (!form.declaration_accepted) return toast.error('Please accept the declaration.')
    if (activePlan.id === 'annual' || activePlan.id === 'half-yearly' || activePlan.id === 'quarterly') return toast.error('Membership plans must be activated in the database before payment.')
    setSubmitting(true)
    try {
      const { data: membership, error } = await supabase.from('memberships').insert({ devotee_id: user.id, plan_id: activePlan.id, ...form, status: 'pending', payment_status: 'pending', starts_at: null, expires_at: null }).select('id,membership_number').single()
      if (error || !membership) throw new Error(error?.message || 'Could not create membership application.')
      await payWithRazorpay({ paymentType: 'membership', referenceId: membership.id, title: 'Shri Tripura Sundari Lalithambe Trust', description: `${activePlan.name} Membership`, prefill: { name: form.full_name, email: profile?.email, contact: form.mobile } })
      toast.success(`Membership ${membership.membership_number} is now active.`)
      setActivePlan(null)
    } catch (error) { toast.error((error as Error).message) } finally { setSubmitting(false) }
  }

  return <div className="membership-page">
    <section className="membership-hero"><div className="page-container"><span>Devotion · Service · Belonging</span><h1>Patron Membership</h1><p>Join the Trust family and participate more deeply in sacred sevas, celebrations and community service.</p></div></section>
    <section className="page-container py-14">
      <div className="section-heading centered-heading"><span>Choose your membership</span><h2>Membership plans</h2><p>Benefits and fees are based on the supplied Trust membership form.</p></div>
      <div className="membership-plans">{plans.map((plan, index) => <article key={plan.id} className="membership-plan-card">{index === 0 && <em>Most complete</em>}<Crown /><h3>{plan.name}</h3><strong>₹{plan.amount.toLocaleString('en-IN')}</strong><span>{plan.duration_months === 12 ? '1 year' : `${plan.duration_months} months`}</span><ul>{plan.benefits.map(benefit => <li key={benefit}><Check />{benefit}</li>)}</ul><button type="button" onClick={() => setActivePlan(plan)} className="btn-primary membership-join">Join</button></article>)}</div>
    </section>
    {activePlan && <div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="membership-modal-title" onMouseDown={event => event.target === event.currentTarget && setActivePlan(null)}>
      <div className="payment-modal-card membership-join-modal">
        <div className="modal-header"><div><span>{user ? 'Membership application' : 'Member login'}</span><h2 id="membership-modal-title">{activePlan.name}</h2></div><button onClick={() => setActivePlan(null)} aria-label="Close membership"><X /></button></div>
        {!user ? <form className="modal-body membership-login" onSubmit={loginToJoin}>
          <div className="plan-summary"><Crown /><div><strong>{activePlan.name}</strong><span>₹{activePlan.amount.toLocaleString('en-IN')} · {activePlan.duration_months} months</span></div></div>
          <h3>Sign in to join</h3><p>Your membership and payment receipt will be saved in your profile.</p>
          <label><span className="label">Email address</span><input type="email" className="input-field" value={login.email} onChange={event => setLogin(current => ({ ...current, email: event.target.value }))} autoFocus /></label>
          <label><span className="label">Password</span><div className="password-field"><input type={showPassword ? 'text' : 'password'} className="input-field" value={login.password} onChange={event => setLogin(current => ({ ...current, password: event.target.value }))} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
          <button type="submit" disabled={signingIn} className="btn-primary w-full py-3.5">{signingIn ? 'Signing in...' : 'Sign In & Continue'}</button>
          <p className="modal-register">New devotee? <Link to="/register">Create an account</Link></p>
        </form> : <div className="modal-body">
          <div className="plan-summary"><Crown /><div><strong>{activePlan.name}</strong><span>₹{activePlan.amount.toLocaleString('en-IN')} · {activePlan.duration_months} months</span></div></div>
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
          <div className="secure-note"><ShieldCheck /><div><strong>Secure online payment</strong><small>Your subscription activates after payment verification.</small></div></div>
          <button onClick={join} disabled={submitting} className="btn-primary w-full py-3.5 text-base"><CreditCard /> {submitting ? 'Processing membership...' : `Continue · ₹${activePlan.amount.toLocaleString('en-IN')}`}</button>
        </div>}
      </div>
    </div>}
  </div>
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="label">{label}</span><input className="input-field" type={type} value={value} onChange={event => onChange(event.target.value)} /></label>
}
