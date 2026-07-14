import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCard, Heart, CheckCircle, Download, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const PURPOSES = [
  { id: 'Annadanam', label: 'Annadanam', description: 'Free meals for devotees and the needy', icon: '🍛' },
  { id: 'Temple Development', label: 'Temple Development', description: 'Renovation and maintenance', icon: '🏗️' },
  { id: 'Goshala', label: 'Goshala', description: 'Care of sacred cows', icon: '🐄' },
  { id: 'Festival Fund', label: 'Festival Fund', description: 'Festivals and celebrations', icon: '🎊' },
  { id: 'General Donation', label: 'General Donation', description: 'For the temple as needed', icon: '🪷' },
  { id: 'Custom', label: 'Custom Purpose', description: 'Specify your own intention', icon: '✨' },
]

const PRESET_AMOUNTS = [101, 251, 501, 1001, 2501]

const schema = z.object({
  donor_name: z.string().min(2, 'Name required'),
  donor_email: z.string().email('Valid email required'),
  donor_mobile: z.string().min(10, 'Valid mobile required'),
  donor_address: z.string().optional(),
  custom_purpose: z.string().optional(),
  is_anonymous: z.boolean(),
  amount: z.number().min(1, 'Minimum donation is ₹1'),
})
type FormData = z.infer<typeof schema>

interface DonationSuccess {
  donation_number: string
  amount: number
  purpose: string
  donor_name: string
  payment_status: string
  created_at: string
}

export default function DonationsPage() {
  const { user, profile } = useAuth()
  const [purpose, setPurpose] = useState('General Donation')
  const [customAmount, setCustomAmount] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [step, setStep] = useState<'select' | 'form' | 'success'>('select')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<DonationSuccess | null>(null)
  const [razorpayKey, setRazorpayKey] = useState('')

  useEffect(() => {
    supabase.from('temple_settings').select('razorpay_key_id').maybeSingle().then(({ data }) => {
      if (data?.razorpay_key_id) setRazorpayKey(data.razorpay_key_id)
    })
  }, [])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      donor_name: profile?.full_name || '',
      donor_email: profile?.email || '',
      donor_mobile: profile?.mobile || '',
      is_anonymous: false,
      amount: 0,
    },
  })

  const isAnonymous = watch('is_anonymous')
  const currentAmount = selectedPreset || (customAmount ? parseFloat(customAmount) : 0)

  const handleAmountSelect = (amount: number) => {
    setSelectedPreset(amount)
    setCustomAmount('')
    setValue('amount', amount)
  }

  const handleCustomAmount = (val: string) => {
    setCustomAmount(val)
    setSelectedPreset(null)
    setValue('amount', parseFloat(val) || 0)
  }

  const handleContinue = () => {
    if (!currentAmount || currentAmount < 1) { toast.error('Please enter a valid amount.'); return }
    if (!purpose) { toast.error('Please select a donation purpose.'); return }
    setStep('form')
  }

  const processPayment = async (data: FormData) => {
    setSubmitting(true)
    try {
      // Create donation record
      const donationData = {
        devotee_id: user?.id || null,
        donor_name: data.is_anonymous ? 'Anonymous Devotee' : data.donor_name,
        donor_email: data.is_anonymous ? '' : data.donor_email,
        donor_mobile: data.is_anonymous ? '' : data.donor_mobile,
        donor_address: data.donor_address || '',
        purpose: purpose === 'Custom' ? 'Custom' : purpose,
        custom_purpose: purpose === 'Custom' ? data.custom_purpose || '' : '',
        amount: data.amount,
        is_anonymous: data.is_anonymous,
        payment_status: 'pending' as const,
      }

      const { data: donation, error: donErr } = await supabase.from('donations').insert(donationData).select().single()
      if (donErr) throw new Error(donErr.message)

      // Try Razorpay if key available, else offline
      if (razorpayKey) {
        // Create order via edge function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const orderRes = await fetch(`${supabaseUrl}/functions/v1/create-razorpay-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ amount: data.amount, currency: 'INR', receipt: donation.donation_number }),
        })

        if (orderRes.ok) {
          const order = await orderRes.json()

          await new Promise<void>((resolve, reject) => {
            const options = {
              key: razorpayKey,
              amount: order.amount,
              currency: order.currency,
              name: 'Shri Tripura Sundari Lalithambe Trust',
              description: `Donation - ${purpose}`,
              order_id: order.id,
              handler: async (response: Record<string, string>) => {
                await supabase.from('donations').update({ payment_status: 'paid' }).eq('id', donation.id)
                await supabase.from('payments').insert({
                  payment_type: 'donation',
                  reference_id: donation.id,
                  user_id: user?.id || null,
                  razorpay_order_id: order.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: data.amount,
                  currency: 'INR',
                  payment_status: 'paid',
                  paid_at: new Date().toISOString(),
                })
                resolve()
              },
              modal: { ondismiss: () => reject(new Error('cancelled')) },
              prefill: {
                name: data.donor_name,
                email: data.donor_email,
                contact: data.donor_mobile,
              },
              theme: { color: '#A52A2A' },
            }
            // @ts-ignore
            const rzp = new window.Razorpay(options)
            rzp.open()
          })
        }
      } else {
        // Mark as offline/demo
        await supabase.from('donations').update({ payment_status: 'offline' }).eq('id', donation.id)
      }

      setSuccess({
        donation_number: donation.donation_number,
        amount: data.amount,
        purpose: purpose === 'Custom' ? data.custom_purpose || 'Custom' : purpose,
        donor_name: data.is_anonymous ? 'Anonymous' : data.donor_name,
        payment_status: 'paid',
        created_at: donation.created_at,
      })
      setStep('success')
    } catch (err: unknown) {
      const e = err as Error
      if (e.message !== 'cancelled') toast.error('Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success' && success) {
    return <DonationSuccess success={success} onNewDonation={() => { setStep('select'); setSuccess(null); setSelectedPreset(null); setCustomAmount(''); }} />
  }

  return (
    <div className="page-container py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Support the Temple</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-temple-text mb-3 font-serif">Make a Donation</h1>
        <p className="text-temple-muted leading-relaxed">
          Your generous contributions support our sacred services, community outreach and temple maintenance.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {step === 'select' && (
          <div className="space-y-6">
            {/* Purpose selection */}
            <div>
              <h3 className="font-bold text-temple-text mb-3">1. Select Donation Purpose</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PURPOSES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPurpose(p.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                      purpose === p.id ? 'border-vermilion-700 bg-vermilion-50' : 'border-temple-border bg-white hover:border-saffron-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{p.icon}</div>
                    <div className="font-semibold text-temple-text text-sm">{p.label}</div>
                    <div className="text-xs text-temple-muted mt-0.5 leading-tight">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount selection */}
            <div>
              <h3 className="font-bold text-temple-text mb-3">2. Select Amount</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleAmountSelect(amt)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                      selectedPreset === amt ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white text-temple-text border-temple-border hover:border-saffron-400'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-muted font-bold">₹</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={e => handleCustomAmount(e.target.value)}
                  placeholder="Enter custom amount"
                  className="input-field pl-8"
                  min="1"
                />
              </div>
              {currentAmount > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl text-sm text-green-700 font-medium">
                  Donation: ₹{currentAmount.toLocaleString('en-IN')} towards {purpose === 'Custom' ? 'Custom Purpose' : purpose}
                </div>
              )}
            </div>

            <button onClick={handleContinue} className="btn-primary w-full justify-center py-3 text-base">
              Continue to Donor Details →
            </button>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit(processPayment)} className="space-y-5">
            <div className="card bg-saffron-50 border-saffron-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-temple-text text-xl">₹{currentAmount.toLocaleString('en-IN')}</div>
                  <div className="text-sm text-temple-muted">{purpose === 'Custom' ? 'Custom Purpose' : purpose}</div>
                </div>
                <button type="button" onClick={() => setStep('select')} className="btn-ghost text-sm">Change</button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input {...register('is_anonymous')} type="checkbox" id="anon" className="w-4 h-4 rounded accent-vermilion-700" />
              <label htmlFor="anon" className="text-sm font-medium text-temple-text cursor-pointer">Donate anonymously</label>
            </div>

            {!isAnonymous && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name *</label>
                    <input {...register('donor_name')} className="input-field" placeholder="Your name" />
                    {errors.donor_name && <p className="text-red-500 text-xs mt-1">{errors.donor_name.message}</p>}
                  </div>
                  <div>
                    <label className="label">Mobile *</label>
                    <input {...register('donor_mobile')} className="input-field" placeholder="+91 98765 43210" />
                    {errors.donor_mobile && <p className="text-red-500 text-xs mt-1">{errors.donor_mobile.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input {...register('donor_email')} type="email" className="input-field" placeholder="email@example.com" />
                  {errors.donor_email && <p className="text-red-500 text-xs mt-1">{errors.donor_email.message}</p>}
                </div>
                <div>
                  <label className="label">Address (optional)</label>
                  <input {...register('donor_address')} className="input-field" placeholder="City, State" />
                </div>
              </>
            )}

            {purpose === 'Custom' && (
              <div>
                <label className="label">Specify Purpose *</label>
                <input {...register('custom_purpose')} className="input-field" placeholder="e.g., In memory of, Birthday offering..." />
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('select')} className="btn-secondary flex-none">Back</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center py-3 text-base">
                <CreditCard size={16} />
                {submitting ? 'Processing...' : `Pay ₹${currentAmount.toLocaleString('en-IN')}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function DonationSuccess({ success, onNewDonation }: { success: DonationSuccess; onNewDonation: () => void }) {
  return (
    <div className="page-container py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-temple-text mb-2">Donation Successful!</h2>
        <p className="text-temple-muted mb-8 leading-relaxed">
          Thank you for your generous contribution. May Maa Lalithambike shower her blessings on you and your family.
        </p>

        {/* Receipt */}
        <div className="card text-left mb-6" id="donation-receipt">
          <div className="text-center border-b border-temple-border pb-4 mb-4">
            <div className="text-2xl mb-1">🛕</div>
            <div className="font-bold text-temple-text">Shri Tripura Sundari Lalithambe Trust</div>
            <div className="text-xs text-temple-muted">Donation Receipt</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-temple-muted">Receipt No.</span><span className="font-semibold">{success.donation_number}</span></div>
            <div className="flex justify-between"><span className="text-temple-muted">Donor</span><span className="font-semibold">{success.donor_name}</span></div>
            <div className="flex justify-between"><span className="text-temple-muted">Purpose</span><span className="font-semibold">{success.purpose}</span></div>
            <div className="flex justify-between"><span className="text-temple-muted">Amount</span><span className="font-bold text-vermilion-700 text-base">₹{success.amount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-temple-muted">Status</span><span className="text-green-600 font-semibold capitalize">{success.payment_status}</span></div>
          </div>
          <div className="border-t border-temple-border mt-4 pt-4 text-center text-xs text-temple-muted">
            Thank you for your generous contribution. May the Lord bless you and your family.
          </div>
        </div>

        <div className="flex gap-3 justify-center mb-4">
          <button onClick={() => window.print()} className="btn-secondary gap-2">
            <Printer size={15} /> Print Receipt
          </button>
          <button onClick={onNewDonation} className="btn-primary gap-2">
            <Heart size={15} /> Donate Again
          </button>
        </div>
      </div>
    </div>
  )
}
