import { useEffect, useState } from 'react'
import { CreditCard, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { payWithRazorpay } from '../../lib/razorpay'
import toast from 'react-hot-toast'
import { PurchaseConfirmationModal } from '../../components/purchases/PurchaseConfirmation'
import type { PurchaseConfirmationData } from '../../lib/confirmationPdf'

type Purpose = { id: string; name: string; description: string; icon: string }
const fallbackPurposes: Purpose[] = [
  { id: 'annadanam', name: 'Annadanam', description: 'Free meals for devotees', icon: '🍛' },
  { id: 'development', name: 'Temple Development', description: 'Maintenance and sacred spaces', icon: '🏗️' },
  { id: 'goshala', name: 'Goshala', description: 'Care for sacred cows', icon: '🐄' },
  { id: 'general', name: 'General Donation', description: 'Where the trust needs it most', icon: '🪷' },
]
const amounts = [101, 251, 501, 1001, 2501, 5001]

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
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [confirmation, setConfirmation] = useState<PurchaseConfirmationData | null>(null)

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
  useEffect(() => {
    if (open) setTermsAccepted(false)
  }, [open])

  if (!open) return null
  const finalAmount = customAmount ? Number(customAmount) : amount

  const donate = async () => {
    if (!termsAccepted) return toast.error('Please read and accept the Terms and Payment Terms.')
    if (!finalAmount || finalAmount < 1) return toast.error('Enter a valid donation amount.')
    if (!anonymous && (!name.trim() || !email.includes('@') || mobile.replace(/\D/g, '').length < 10)) return toast.error('Enter your name, email and valid mobile number.')
    setSubmitting(true)
    try {
      const donationId = crypto.randomUUID()
      const { data: donation, error } = await supabase.from('donations').insert({
        id: donationId, devotee_id: user?.id || null, donor_name: anonymous ? 'Anonymous Devotee' : name.trim(), donor_email: anonymous ? '' : email.trim(), donor_mobile: anonymous ? '' : mobile.trim(), donor_address: '', purpose, custom_purpose: '', amount: finalAmount, is_anonymous: anonymous, payment_status: 'pending', offline_reference: '', notes: '',
      }).select('donation_number').single()
      if (error || !donation) throw new Error(error?.message || 'Could not create donation.')
      const payment = await payWithRazorpay({ paymentType: 'donation', referenceId: donationId, title: 'Shri Tripura Sundari Lalithambe Trust', description: `Donation - ${purpose}`, prefill: { name: anonymous ? 'Anonymous Devotee' : name, email: anonymous ? '' : email, contact: anonymous ? '' : mobile } })
      setConfirmation({
        kind: 'donation',
        reference: donation.donation_number || `DON-${donationId.slice(0, 8).toUpperCase()}`,
        title: 'Thank you for your sacred offering',
        subtitle: 'Your donation has been received successfully and will support the Trust\'s sacred service.',
        amount: finalAmount,
        email: anonymous ? '' : email.trim(),
        emailSent: payment.email_sent,
        details: [
          { label: 'Donation purpose', value: purpose },
          { label: 'Donor', value: anonymous ? 'Anonymous Devotee' : name.trim() },
          { label: 'Date', value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
          { label: 'Payment status', value: 'Paid' },
        ],
      })
      toast.success('Thank you. Your donation is confirmed.')
    } catch (error) { toast.error((error as Error).message) } finally { setSubmitting(false) }
  }

  if (confirmation) return <PurchaseConfirmationModal data={confirmation} onClose={() => { setConfirmation(null); onClose() }} doneLabel="Close" />

  return (
    <div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="donation-title" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="payment-modal-card">
        <div className="modal-header"><div><span>Sacred offering</span><h2 id="donation-title">Make a Donation</h2></div><button onClick={onClose} aria-label="Close donation"><X /></button></div>
        <div className="modal-body">
          {!user && <p className="guest-checkout-note">Guest checkout is available. You can donate securely without creating an account.</p>}
          <label className="label">Choose donation purpose</label>
          <div className="purpose-grid">{purposes.map(item => <button key={item.id} onClick={() => setPurpose(item.name)} className={purpose === item.name ? 'selected' : ''}><b>{item.icon}</b><span><strong>{item.name}</strong><small>{item.description}</small></span></button>)}</div>
          <label className="label mt-5">Offering amount</label>
          <div className="amount-row">{amounts.map(value => <button key={value} onClick={() => { setAmount(value); setCustomAmount('') }} className={!customAmount && amount === value ? 'selected' : ''}>₹{value.toLocaleString('en-IN')}</button>)}</div>
          <input type="number" min="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="input-field mt-2" placeholder="Or enter a custom amount" />
          <label className="flex items-center gap-2 mt-5 text-sm font-semibold"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} /> Donate anonymously</label>
          {!anonymous && <div className="grid sm:grid-cols-2 gap-3 mt-4"><input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Full name" /><input value={mobile} onChange={e => setMobile(e.target.value)} className="input-field" placeholder="Mobile number" /><input value={email} onChange={e => setEmail(e.target.value)} className="input-field sm:col-span-2" type="email" placeholder="Email address for confirmation *" /></div>}
          {anonymous && <p className="guest-checkout-note mt-3">Anonymous donations receive an on-screen and downloadable PDF ticket. Email is not sent because no address is collected.</p>}
          <label className="checkout-consent"><input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} /><span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/payment-terms" target="_blank" rel="noopener noreferrer">Payment Terms</a>.</span></label>
        </div>
        <div className="modal-footer"><div><small>Total offering</small><strong>₹{finalAmount.toLocaleString('en-IN')}</strong></div><button onClick={donate} disabled={submitting || !termsAccepted} className="btn-primary"><CreditCard size={17} /> {submitting ? 'Opening payment...' : 'Donate Now'}</button></div>
      </div>
    </div>
  )
}
