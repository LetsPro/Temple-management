import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Save, Lock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const indianStates = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry']

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password required'),
  new_password: z.string().min(8, 'Min 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

export default function DevoteeProfile() {
  const { profile, refreshProfile } = useAuth()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  const { register: regProfile, handleSubmit: handleProfile, reset: resetProfile, formState: { errors: profileErrors } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  })

  const { register: regPassword, handleSubmit: handlePassword, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (profile) {
      resetProfile({
        full_name: profile.full_name,
        mobile: profile.mobile,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
      })
    }
  }, [profile, resetProfile])

  const completionFields = [
    profile?.full_name, profile?.mobile, profile?.email, profile?.address,
    profile?.city, profile?.state, profile?.pincode,
  ]
  const completionPct = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100)

  const saveProfile = async (data: ProfileData) => {
    if (!profile) return
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update(data).eq('id', profile.id)
    setSavingProfile(false)
    if (error) { toast.error('Failed to save profile.'); return }
    await refreshProfile()
    toast.success('Profile updated successfully!')
  }

  const savePassword = async (data: PasswordData) => {
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: data.new_password })
    setSavingPassword(false)
    if (error) { toast.error(error.message); return }
    resetPassword()
    toast.success('Password changed successfully!')
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-temple-text">My Profile</h1>
        <p className="text-temple-muted text-sm">Manage your personal information and account settings.</p>
      </div>

      {/* Profile summary card */}
      <div className="card bg-gradient-to-r from-vermilion-50 to-saffron-50 border-saffron-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || <User size={24} />}
          </div>
          <div>
            <div className="font-bold text-temple-text text-lg">{profile?.full_name}</div>
            <div className="text-temple-muted text-sm">{profile?.email}</div>
            {profile?.devotee_number && <div className="text-saffron-600 text-xs font-medium mt-0.5">{profile.devotee_number}</div>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-temple-text">Profile Completion</span>
            <span className="text-sm font-bold text-saffron-600">{completionPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white border border-saffron-100">
            <div className="h-full rounded-full bg-gradient-to-r from-saffron-400 to-vermilion-500 transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-temple-border">
        <button onClick={() => setActiveTab('profile')} className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'profile' ? 'border-vermilion-700 text-vermilion-700' : 'border-transparent text-temple-muted hover:text-temple-text'}`}>
          Personal Information
        </button>
        <button onClick={() => setActiveTab('password')} className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'password' ? 'border-vermilion-700 text-vermilion-700' : 'border-transparent text-temple-muted hover:text-temple-text'}`}>
          Change Password
        </button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfile(saveProfile)} className="card space-y-5">
          <h3 className="font-bold text-temple-text">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input {...regProfile('full_name')} className="input-field" />
              {profileErrors.full_name && <p className="text-red-500 text-xs mt-1">{profileErrors.full_name.message}</p>}
            </div>
            <div>
              <label className="label">Email Address</label>
              <input value={profile?.email} disabled className="input-field opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="label">Mobile *</label>
              <input {...regProfile('mobile')} type="tel" className="input-field" />
              {profileErrors.mobile && <p className="text-red-500 text-xs mt-1">{profileErrors.mobile.message}</p>}
            </div>
            <div>
              <label className="label">Devotee ID</label>
              <input value={profile?.devotee_number || ''} disabled className="input-field opacity-60 cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <textarea {...regProfile('address')} rows={2} className="input-field resize-none" placeholder="House/Flat No, Street Name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">City</label>
              <input {...regProfile('city')} className="input-field" />
            </div>
            <div>
              <label className="label">State</label>
              <select {...regProfile('state')} className="input-field">
                <option value="">Select State</option>
                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pincode</label>
              <input {...regProfile('pincode')} className="input-field" />
            </div>
          </div>

          <button type="submit" disabled={savingProfile} className="btn-primary">
            <Save size={15} /> {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {activeTab === 'password' && (
        <form onSubmit={handlePassword(savePassword)} className="card space-y-5">
          <h3 className="font-bold text-temple-text flex items-center gap-2"><Lock size={16} /> Change Password</h3>
          <div>
            <label className="label">Current Password *</label>
            <input {...regPassword('current_password')} type="password" className="input-field" placeholder="••••••••" />
            {passwordErrors.current_password && <p className="text-red-500 text-xs mt-1">{passwordErrors.current_password.message}</p>}
          </div>
          <div>
            <label className="label">New Password *</label>
            <input {...regPassword('new_password')} type="password" className="input-field" placeholder="Min 8 characters" />
            {passwordErrors.new_password && <p className="text-red-500 text-xs mt-1">{passwordErrors.new_password.message}</p>}
          </div>
          <div>
            <label className="label">Confirm New Password *</label>
            <input {...regPassword('confirm_password')} type="password" className="input-field" placeholder="Repeat new password" />
            {passwordErrors.confirm_password && <p className="text-red-500 text-xs mt-1">{passwordErrors.confirm_password.message}</p>}
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">
            <Lock size={15} /> {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  )
}
