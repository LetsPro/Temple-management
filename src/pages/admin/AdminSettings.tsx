import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'
import type { Database } from '../../lib/database.types'

type Settings = Database['public']['Tables']['temple_settings']['Row']
type SocialLinks = { facebook: string; instagram: string; youtube: string }

const emptySocialLinks: SocialLinks = { facebook: '', instagram: '', youtube: '' }

const getSocialLinks = (value: Settings['social_media'] | undefined): SocialLinks => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptySocialLinks
  const links = value as Record<string, unknown>
  return {
    facebook: typeof links.facebook === 'string' ? links.facebook : '',
    instagram: typeof links.instagram === 'string' ? links.instagram : '',
    youtube: typeof links.youtube === 'string' ? links.youtube : '',
  }
}

export default function AdminSettings() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(emptySocialLinks)
  const [activeTab, setActiveTab] = useState<'temple' | 'receipt' | 'booking' | 'payment'>('temple')

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<Partial<Settings>>()

  useEffect(() => {
    supabase.from('temple_settings').select('*').maybeSingle().then(({ data }) => {
      setSettings(data)
      setSocialLinks(getSocialLinks(data?.social_media))
      reset(data || {})
      setLoading(false)
    })
  }, [reset])

  const onSubmit = async (data: Partial<Settings>) => {
    if (!settings) return
    setSaving(true)
    const { id, created_at, updated_at, ...formData } = data as Settings
    void id; void created_at; void updated_at
    const existingSocial = settings.social_media && typeof settings.social_media === 'object' && !Array.isArray(settings.social_media)
      ? settings.social_media as Record<string, unknown>
      : {}
    const updateData = { ...formData, social_media: { ...existingSocial, ...socialLinks } }
    const { error } = await supabase.from('temple_settings').update(updateData).eq('id', settings.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Settings saved.')
    setSettings({ ...settings, ...data, social_media: updateData.social_media })
  }

  const tabs = [
    { key: 'temple', label: 'Temple Details' },
    { key: 'receipt', label: 'Receipt Settings' },
    { key: 'booking', label: 'Booking Rules' },
    { key: 'payment', label: 'Payment Settings' },
  ] as const

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-temple-text">Settings</h1>
        <p className="text-temple-muted text-sm">Configure temple details and system preferences.</p>
      </div>

      <div className="flex gap-1 border-b border-temple-border overflow-x-auto scrollbar-hide">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${activeTab === t.key ? 'border-vermilion-700 text-vermilion-700' : 'border-transparent text-temple-muted hover:text-temple-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        {activeTab === 'temple' && (
          <>
            <h3 className="font-bold text-temple-text">Temple Information</h3>
            <div>
              <label className="label">Temple Name</label>
              <input {...register('temple_name')} className="input-field" />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input {...register('tagline')} className="input-field" />
              <p className="text-xs text-temple-muted mt-1">Displayed below the logo in the website footer.</p>
            </div>
            <div>
              <label className="label">Logo URL</label>
              <input {...register('logo_url')} type="url" className="input-field" placeholder="https://your-domain.org/temple-logo.jpg" />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea {...register('address')} rows={2} className="input-field resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Phone</label><input {...register('phone')} className="input-field" /></div>
              <div><label className="label">Email</label><input {...register('email')} type="email" className="input-field" /></div>
            </div>
            <div>
              <label className="label">Google Maps URL</label>
              <input {...register('google_maps_url')} className="input-field" placeholder="https://maps.google.com/..." />
            </div>
            <div>
              <label className="label">Footer Opening Hours</label>
              <input {...register('footer_hours')} className="input-field" placeholder="Mon – Sun: 6:00 AM – 9:00 PM" />
            </div>
            <div className="border-t border-temple-border pt-5 space-y-4">
              <div>
                <h4 className="font-bold text-temple-text">Footer Social Links</h4>
                <p className="text-xs text-temple-muted mt-1">Leave a link empty to hide that social icon.</p>
              </div>
              <div><label className="label">Facebook URL</label><input type="url" value={socialLinks.facebook} onChange={event => setSocialLinks(current => ({ ...current, facebook: event.target.value }))} className="input-field" placeholder="https://facebook.com/..." /></div>
              <div><label className="label">Instagram URL</label><input type="url" value={socialLinks.instagram} onChange={event => setSocialLinks(current => ({ ...current, instagram: event.target.value }))} className="input-field" placeholder="https://instagram.com/..." /></div>
              <div><label className="label">YouTube URL</label><input type="url" value={socialLinks.youtube} onChange={event => setSocialLinks(current => ({ ...current, youtube: event.target.value }))} className="input-field" placeholder="https://youtube.com/@..." /></div>
            </div>
            <div>
              <label className="label">Temple History</label>
              <textarea {...register('history_text')} rows={4} className="input-field resize-none" />
            </div>
            <div>
              <label className="label">Mission Statement</label>
              <textarea {...register('mission_text')} rows={3} className="input-field resize-none" />
            </div>
          </>
        )}

        {activeTab === 'receipt' && (
          <>
            <h3 className="font-bold text-temple-text">Receipt & Document Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Receipt Prefix</label>
                <input {...register('receipt_prefix')} className="input-field" placeholder="TMS" />
              </div>
              <div>
                <label className="label">Registration Number</label>
                <input {...register('temple_registration_number')} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Receipt Footer Note</label>
              <textarea {...register('receipt_footer_note')} rows={3} className="input-field resize-none" />
            </div>
          </>
        )}

        {activeTab === 'booking' && (
          <>
            <h3 className="font-bold text-temple-text">Booking & Cancellation Rules</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cancellation Notice (hours)</label>
                <input {...register('booking_cancellation_hours', { valueAsNumber: true })} type="number" min="0" className="input-field" />
                <p className="text-xs text-temple-muted mt-1">Minimum hours before booking for free cancellation</p>
              </div>
              <div>
                <label className="label">Advance Booking (days)</label>
                <input {...register('booking_advance_days', { valueAsNumber: true })} type="number" min="1" className="input-field" />
                <p className="text-xs text-temple-muted mt-1">How many days in advance devotees can book</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'payment' && (
          <>
            <h3 className="font-bold text-temple-text">Payment Settings</h3>
            <div>
              <label className="label">Razorpay Key ID (Public)</label>
              <input {...register('razorpay_key_id')} className="input-field" placeholder="rzp_live_..." />
              <p className="text-xs text-temple-muted mt-1">The public key shown in Razorpay dashboard. Never enter your secret key here.</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
              <strong>Security Note:</strong> Your Razorpay Secret Key must be stored as a server secret (RAZORPAY_KEY_SECRET) and never entered in the frontend. Only the public Key ID goes here.
            </div>
          </>
        )}

        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={15} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
