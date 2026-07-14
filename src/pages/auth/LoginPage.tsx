import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (user) navigate('/portal', { replace: true })
  }, [user, navigate])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const { error } = await signIn(data.email, data.password)
    setSubmitting(false)
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message)
    } else {
      toast.success('Welcome back! 🙏')
      navigate('/portal', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex rangoli-bg">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 bg-gradient-to-br from-[#2d0a06] via-[#7a1e1e] to-[#b85c1a] p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="text-6xl mb-6">🛕</div>
          <h1 className="font-serif text-4xl font-bold mb-4">Sri Mahalakshmi Temple</h1>
          <p className="text-white/70 leading-relaxed">
            Sign in to book poojas, make donations, and access your devotee portal.
          </p>
          <div className="mt-8 space-y-3">
            {['Book Poojas & Sevas Online', 'Make Secure Donations', 'Event Registrations', 'Manage Your Profile'].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-white/80 text-sm">
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-gold-500" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-xl">🛕</div>
              <span className="font-bold text-temple-text">Sri Mahalakshmi Temple</span>
            </Link>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold text-temple-text mb-1">Welcome Back</h2>
            <p className="text-temple-muted text-sm mb-6">Sign in to your devotee account</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input {...register('email')} type="email" className="input-field" placeholder="your@email.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-muted hover:text-temple-text">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-vermilion-600 hover:text-vermilion-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3 text-base">
                {submitting ? 'Signing in...' : <>Sign In <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-temple-border text-center">
              <p className="text-temple-muted text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-vermilion-600 font-semibold hover:text-vermilion-700">
                  Register as Devotee
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
