import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
]

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().min(10, 'Valid mobile number required').max(15),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const nextStep = async () => {
    const valid = await trigger(['full_name', 'email', 'mobile', 'password', 'confirm_password'])
    if (valid) setStep(2)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const { error } = await signUp(data)
    setSubmitting(false)
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('duplicate')) {
        toast.error('This email is already registered. Please login.')
      } else {
        toast.error(error.message)
      }
    } else {
      toast.success('Registration successful! Welcome to the temple family. 🙏')
      navigate('/portal', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex rangoli-bg">
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 bg-gradient-to-br from-[#2d0a06] via-[#7a1e1e] to-[#b85c1a] p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="text-6xl mb-6">🛕</div>
          <h1 className="font-serif text-4xl font-bold mb-4">Join the Temple Family</h1>
          <p className="text-white/70 leading-relaxed">
            Register to enjoy seamless pooja bookings and personalized temple services.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-xl">🛕</div>
              <span className="font-bold text-temple-text">Shri Tripura Sundari Lalithambe Trust</span>
            </Link>
          </div>

          <div className="card p-8">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-vermilion-700 text-white' : 'bg-cream-200 text-temple-muted'}`}>1</div>
              <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-vermilion-700' : 'bg-cream-200'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-vermilion-700 text-white' : 'bg-cream-200 text-temple-muted'}`}>2</div>
            </div>

            <h2 className="text-2xl font-bold text-temple-text mb-1">
              {step === 1 ? 'Create Account' : 'Your Address'}
            </h2>
            <p className="text-temple-muted text-sm mb-6">
              {step === 1 ? 'Step 1 of 2: Account details' : 'Step 2 of 2: Location details (optional)'}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <>
                  <div>
                    <label className="label">Full Name *</label>
                    <input {...register('full_name')} className="input-field" placeholder="Ramesh Kumar" />
                    {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                  </div>
                  <div>
                    <label className="label">Email Address *</label>
                    <input {...register('email')} type="email" className="input-field" placeholder="ramesh@example.com" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="label">Mobile Number *</label>
                    <input {...register('mobile')} type="tel" className="input-field" placeholder="+91 98765 43210" />
                    {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>}
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <div className="relative">
                      <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="Min 8 characters" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-muted">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="label">Confirm Password *</label>
                    <input {...register('confirm_password')} type="password" className="input-field" placeholder="Repeat password" />
                    {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                  </div>
                  <button type="button" onClick={nextStep} className="btn-primary w-full justify-center py-3 text-base">
                    Continue <ArrowRight size={16} />
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="label">Address</label>
                    <textarea {...register('address')} className="input-field" rows={2} placeholder="House/Flat No, Street Name" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">City</label>
                      <input {...register('city')} className="input-field" placeholder="Chennai" />
                    </div>
                    <div>
                      <label className="label">Pincode</label>
                      <input {...register('pincode')} className="input-field" placeholder="600001" />
                    </div>
                  </div>
                  <div>
                    <label className="label">State</label>
                    <select {...register('state')} className="input-field">
                      <option value="">Select State</option>
                      {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">
                      Back
                    </button>
                    <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center py-3 text-base">
                      {submitting ? 'Registering...' : 'Complete Registration'}
                    </button>
                  </div>
                  <button type="submit" disabled={submitting} className="btn-ghost w-full text-sm text-temple-muted">
                    Skip & Register
                  </button>
                </>
              )}
            </form>

            <div className="mt-6 pt-6 border-t border-temple-border text-center">
              <p className="text-temple-muted text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-vermilion-600 font-semibold hover:text-vermilion-700">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-temple-muted hover:text-temple-text">
              ← Back to Temple Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
