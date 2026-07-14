import { useEffect, useState } from 'react'
import { CreditCard, Heart, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { payWithRazorpay } from '../../lib/razorpay'
import toast from 'react-hot-toast'

type Purpose = { id: string; name: string; description: string; icon: string }
const fallbackPurposes: Purpose[] = [
  { id: 'annadanam', name: 'Annadanam', description: 'Free meals for devotees', icon: '🍛' },
  { id: 'development', name: 'Temple Development', description: 'Maintenance and sacred spaces', icon: '🏗️' },
  { id: 'goshala', name: 'Goshala', description: 'Care for sacred cows', icon: '🐄' },
  { id: 'general', name: 'General Donation', description: 'Where the trust needs it most', icon: '🪷' },
]
const amounts = [101, 251, 501, 1001, 2501, 5001]

export default function DonationsPage() {
  const [open, setOpen] = useState(false)
  return (
    <div className="page-container py-16 sm:py-24">
      <div className="max-w-3xl mx-auto text-center">
        <span className="text-saffron-600 font-bold uppercase tracking-[.2em] text-xs">A sacred offering</span>
        <h1 className="font-serif text-4xl sm:text-6xl text-vermilion-700 font-bold mt-3">Support devotion and service</h1>
        <p className="text-temple-muted max-w-2xl mx-auto mt-4">Your contribution supports daily worship, annadanam, festivals, temple care and community service.</p>
        <button onClick={() => setOpen(true)} className="btn-primary text-base px-8 py-3.5 mt-8"><Heart size={18} /> Donate Now</button>
        <div className="grid sm:grid-cols-3 gap-4 mt-12 text-left">
          {[['Secure payment', 'Payment is completed through Razorpay Checkout.'], ['Choose your purpose', 'Direct your offering to the cause closest to your heart.'], ['Instant record', 'Paid donations are saved in your devotee profile.']].map(([title, copy]) => (
            <div key={title} className="card"><ShieldCheck className="text-saffron-600 mb-3" /><h2 className="font-bold">{title}</h2><p className="text-sm text-temple-muted mt-1">{copy}</p></div>
          ))}
        </div>
      </div>
      <DonationModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

export function DonationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile } = useAuth()
  const [purposes, setPurposes] = useState<Purpose[]>(fallbackPurposes)
  const [purpose, setPurpose] = useState('General Donation')
  const [amount, setAmount] = useState(501)
  const [customAmount, setCustomAmount] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.from('donation_purposes').select('id,name,description,icon').eq('is_active', true).order('display_order').then(({ data }) => {
      if (data?.length) setPurposes(data)
    })
  }, [])
  useEffect(() => {
    if (profile) { setName(profile.full_name); setEmail(profile.email); setMobile(profile.mobile) }
  }, [profile])
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close); document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  const finalAmount = customAmount ? Number(customAmount) : amount

  const donate = async () => {
    if (!finalAmount || finalAmount < 1) return toast.error('Enter a valid donation amount.')
    if (!anonymous && (!name.trim() || mobile.replace(/\D/g, '').length < 10)) return toast.error('Enter your name and valid mobile number.')
    setSubmitting(true)
    try {
      const donationId = crypto.randomUUID()
      const { error } = await supabase.from('donations').insert({
        id: donationId, devotee_id: user?.id || null, donor_name: anonymous ? 'Anonymous Devotee' : name.trim(), donor_email: anonymous ? '' : email.trim(), donor_mobile: anonymous ? '' : mobile.trim(), donor_address: '', purpose, custom_purpose: '', amount: finalAmount, is_anonymous: anonymous, payment_status: 'pending', offline_reference: '', notes: '',
      })
      if (error) throw new Error(error.message || 'Could not create donation.')
      await payWithRazorpay({ paymentType: 'donation', referenceId: donationId, title: 'Shri Tripura Sundari Lalithambe Trust', description: `Donation - ${purpose}`, prefill: { name, email, contact: mobile } })
      toast.success('Thank you. Your donation is confirmed.')
      onClose()
    } catch (error) { toast.error((error as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="donation-title" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="payment-modal-card">
        <div className="modal-header"><div><span>Sacred offering</span><h2 id="donation-title">Make a Donation</h2></div><button onClick={onClose} aria-label="Close donation"><X /></button></div>
        <div className="modal-body">
          <label className="label">Choose donation purpose</label>
          <div className="purpose-grid">{purposes.map(item => <button key={item.id} onClick={() => setPurpose(item.name)} className={purpose === item.name ? 'selected' : ''}><b>{item.icon}</b><span><strong>{item.name}</strong><small>{item.description}</small></span></button>)}</div>
          <label className="label mt-5">Offering amount</label>
          <div className="amount-row">{amounts.map(value => <button key={value} onClick={() => { setAmount(value); setCustomAmount('') }} className={!customAmount && amount === value ? 'selected' : ''}>₹{value.toLocaleString('en-IN')}</button>)}</div>
          <input type="number" min="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="input-field mt-2" placeholder="Or enter a custom amount" />
          <label className="flex items-center gap-2 mt-5 text-sm font-semibold"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} /> Donate anonymously</label>
          {!anonymous && <div className="grid sm:grid-cols-2 gap-3 mt-4"><input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Full name" /><input value={mobile} onChange={e => setMobile(e.target.value)} className="input-field" placeholder="Mobile number" /><input value={email} onChange={e => setEmail(e.target.value)} className="input-field sm:col-span-2" type="email" placeholder="Email address (optional)" /></div>}
        </div>
        <div className="modal-footer"><div><small>Total offering</small><strong>₹{finalAmount.toLocaleString('en-IN')}</strong></div><button onClick={donate} disabled={submitting} className="btn-primary"><CreditCard size={17} /> {submitting ? 'Opening payment...' : 'Donate Now'}</button></div>
      </div>
    </div>
  )
}
