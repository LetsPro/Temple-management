import { useState, useEffect } from 'react'
import { Plus, CreditCard as Edit, X, Save, ToggleLeft, ToggleRight, ImagePlus, Trash2, IndianRupee } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type EventRow = Database['public']['Tables']['events']['Row']
type EventPlan = Database['public']['Tables']['event_plans']['Row']
type Event = EventRow & { event_plans: EventPlan[] }
type PlanDraft = { id?: string; name: string; price: number | '' }

const schema = z.object({
  title: z.string().min(2, 'Enter an event title.'),
  slug: z.string().min(2, 'Enter an event slug.'),
  description: z.string(),
  start_datetime: z.string().min(1, 'Select a start date and time.'),
  end_datetime: z.string().min(1, 'Select an end date and time.'),
  venue: z.string(),
  registration_enabled: z.boolean(),
  capacity: z.number().nullable().optional(),
  pricing_type: z.enum(['free', 'paid']),
  is_published: z.boolean(),
  is_featured: z.boolean(),
})
type FormData = z.infer<typeof schema>

const blankPlan = (): PlanDraft => ({ name: '', price: '' })

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [plans, setPlans] = useState<PlanDraft[]>([blankPlan()])
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_published: false, is_featured: false, registration_enabled: false, pricing_type: 'free' },
  })
  const pricingType = watch('pricing_type')

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*, event_plans(*)')
      .order('start_datetime', { ascending: false })
    if (error) toast.error('Could not load events.')
    setEvents((data || []) as Event[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setPlans([blankPlan()])
    setThumbnailFile(null)
    setThumbnailPreview('')
    reset({
      title: '', slug: '', description: '', start_datetime: '', end_datetime: '', venue: '',
      capacity: null, is_published: false, is_featured: false, registration_enabled: false, pricing_type: 'free',
    })
    setShowForm(true)
  }

  const openEdit = (event: Event) => {
    setEditing(event)
    const activePlans = (event.event_plans || []).filter(plan => plan.is_active).sort((a, b) => a.display_order - b.display_order)
    setPlans(activePlans.length ? activePlans.map(plan => ({ id: plan.id, name: plan.name, price: Number(plan.price) })) : [blankPlan()])
    setThumbnailFile(null)
    setThumbnailPreview(event.banner_image_url || '')
    reset({
      title: event.title, slug: event.slug, description: event.description,
      start_datetime: event.start_datetime.slice(0, 16), end_datetime: event.end_datetime.slice(0, 16),
      venue: event.venue, registration_enabled: event.registration_enabled,
      capacity: event.capacity, pricing_type: event.pricing_type,
      is_published: event.is_published, is_featured: event.is_featured,
    })
    setShowForm(true)
  }

  const selectPricing = (value: 'free' | 'paid') => {
    setValue('pricing_type', value, { shouldValidate: true })
    if (value === 'paid') {
      setValue('registration_enabled', true)
      if (!plans.length) setPlans([blankPlan()])
    }
  }

  const chooseThumbnail = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Choose an image file.')
    if (file.size > 5 * 1024 * 1024) return toast.error('Thumbnail must be smaller than 5 MB.')
    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const uploadThumbnail = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `events/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('event-thumbnails').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(`Thumbnail upload failed: ${error.message}`)
    return supabase.storage.from('event-thumbnails').getPublicUrl(path).data.publicUrl
  }

  const onSubmit = async (data: FormData) => {
    const validPlans = plans.map(plan => ({ ...plan, name: plan.name.trim(), price: Number(plan.price) }))
    if (data.pricing_type === 'paid' && (validPlans.length === 0 || validPlans.some(plan => !plan.name || !Number.isFinite(plan.price) || plan.price <= 0))) {
      toast.error('Every paid plan needs a name and a price greater than ₹0.')
      return
    }

    setSubmitting(true)
    try {
      let bannerImageUrl = thumbnailPreview
      if (thumbnailFile) bannerImageUrl = await uploadThumbnail(thumbnailFile)

      const payload = {
        ...data,
        registration_enabled: data.pricing_type === 'paid' ? true : data.registration_enabled,
        capacity: data.capacity || null,
        banner_image_url: bannerImageUrl,
      }

      let eventId = editing?.id
      if (editing) {
        const { error } = await supabase.from('events').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data: created, error } = await supabase.from('events').insert(payload).select('id').single()
        if (error || !created) throw error || new Error('Could not create event.')
        eventId = created.id
      }

      if (!eventId) throw new Error('Event could not be saved.')
      const { error: deactivateError } = await supabase.from('event_plans').update({ is_active: false }).eq('event_id', eventId)
      if (deactivateError) throw deactivateError

      if (data.pricing_type === 'paid') {
        const planRows = validPlans.map((plan, index) => ({
          ...(plan.id ? { id: plan.id } : {}),
          event_id: eventId,
          name: plan.name,
          price: plan.price,
          is_active: true,
          display_order: index,
        }))
        const { error: plansError } = await supabase.from('event_plans').upsert(planRows)
        if (plansError) throw plansError
      }

      toast.success(editing ? 'Event updated.' : 'Event created.')
      setShowForm(false)
      await load()
    } catch (error) {
      toast.error((error as Error).message || 'Could not save event.')
    } finally {
      setSubmitting(false)
    }
  }

  const togglePublish = async (event: Event) => {
    const { error } = await supabase.from('events').update({ is_published: !event.is_published }).eq('id', event.id)
    if (error) return toast.error('Could not change publishing status.')
    toast.success(`Event ${event.is_published ? 'unpublished' : 'published'}.`)
    load()
  }

  const updatePlan = (index: number, field: 'name' | 'price', value: string) => {
    setPlans(current => current.map((plan, planIndex) => planIndex === index
      ? { ...plan, [field]: field === 'price' ? (value === '' ? '' : Number(value)) : value }
      : plan))
  }
  const removePlan = (index: number) => setPlans(current => current.filter((_, planIndex) => planIndex !== index))
  const nameToSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Festival & Event Management</h1>
          <p className="text-temple-muted text-sm">{events.length} events</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm"><Plus size={15} /> Add Event</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : events.length === 0 ? (
        <EmptyState icon="🎊" title="No events yet" action={<button onClick={openCreate} className="btn-primary text-sm">Add Event</button>} />
      ) : (
        <div className="space-y-4">
          {events.map(event => {
            const activePlans = event.event_plans?.filter(plan => plan.is_active) || []
            return <div key={event.id} className={`card ${!event.is_published ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-4">
                {event.banner_image_url ? <img src={event.banner_image_url} alt="" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" /> : (
                  <div className="w-14 text-center flex-shrink-0"><div className="bg-vermilion-50 rounded-xl p-2"><div className="text-vermilion-700 font-bold text-lg leading-none">{format(new Date(event.start_datetime), 'dd')}</div><div className="text-vermilion-400 text-xs">{format(new Date(event.start_datetime), 'MMM')}</div></div></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-temple-text">{event.title}</h3>
                    {event.is_published ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Published</span> : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>}
                    {event.is_featured && <span className="text-xs bg-gold-50 text-gold-600 px-2 py-0.5 rounded-full font-semibold">Featured</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${event.pricing_type === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {event.pricing_type === 'paid' ? `Paid · ${activePlans.length} plan${activePlans.length === 1 ? '' : 's'}` : 'Free'}
                    </span>
                  </div>
                  <p className="text-temple-muted text-sm line-clamp-2 mb-2">{event.description}</p>
                  <div className="text-xs text-temple-muted">{format(new Date(event.start_datetime), 'dd MMM yyyy, h:mm a')} – {format(new Date(event.end_datetime), 'dd MMM yyyy, h:mm a')} · {event.venue}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-temple-border/50">
                <button onClick={() => openEdit(event)} className="btn-ghost text-xs"><Edit size={12} /> Edit</button>
                <button onClick={() => togglePublish(event)} className={`btn-ghost text-xs ${event.is_published ? 'text-amber-600' : 'text-green-600'}`}>
                  {event.is_published ? <><ToggleRight size={12} /> Unpublish</> : <><ToggleLeft size={12} /> Publish</>}
                </button>
              </div>
            </div>
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl my-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-xl text-temple-text">{editing ? 'Edit Event' : 'Add New Event'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Title *</label>
                    <input {...register('title')} className="input-field" onChange={e => { register('title').onChange(e); if (!editing) setValue('slug', nameToSlug(e.target.value), { shouldValidate: true }) }} />
                    {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title.message}</p>}
                  </div>
                  <div><label className="label">Slug *</label><input {...register('slug')} className="input-field" />{errors.slug && <p className="text-red-600 text-xs mt-1">{errors.slug.message}</p>}</div>
                  <div><label className="label">Venue</label><input {...register('venue')} className="input-field" /></div>
                  <div><label className="label">Start Date & Time *</label><input {...register('start_datetime')} type="datetime-local" className="input-field" /></div>
                  <div><label className="label">End Date & Time *</label><input {...register('end_datetime')} type="datetime-local" className="input-field" /></div>
                  <div><label className="label">Capacity</label><input {...register('capacity', { setValueAs: value => value === '' ? null : Number(value) })} type="number" min="0" className="input-field" placeholder="Leave blank for unlimited" /></div>
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea {...register('description')} rows={4} className="input-field resize-none" />
                </div>

                <div>
                  <label className="label">Event thumbnail</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <label className="w-full sm:w-auto cursor-pointer border-2 border-dashed border-temple-border rounded-2xl px-5 py-4 flex items-center gap-3 hover:border-saffron-400 hover:bg-cream-50 transition-colors">
                      <ImagePlus size={22} className="text-saffron-500" />
                      <span><strong className="block text-sm text-temple-text">Upload thumbnail</strong><small className="text-temple-muted">JPG, PNG, WEBP or GIF · max 5 MB</small></span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event => chooseThumbnail(event.target.files?.[0])} />
                    </label>
                    {thumbnailPreview && <div className="relative w-full sm:w-64 h-36 rounded-xl border border-temple-border bg-cream-100 overflow-hidden"><img src={thumbnailPreview} alt="Event thumbnail preview" className="w-full h-full object-contain" /><span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Preview</span><button type="button" onClick={() => { setThumbnailFile(null); setThumbnailPreview('') }} className="absolute top-2 right-2 bg-white border border-temple-border rounded-full p-1 shadow" aria-label="Remove thumbnail"><X size={14} /></button></div>}
                  </div>
                </div>

                <fieldset>
                  <legend className="label">Event type *</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(['free', 'paid'] as const).map(value => <label key={value} className={`cursor-pointer rounded-2xl border p-4 flex items-center gap-3 ${pricingType === value ? 'border-vermilion-600 bg-vermilion-50' : 'border-temple-border'}`}>
                      <input type="radio" checked={pricingType === value} onChange={() => selectPricing(value)} className="accent-vermilion-700" />
                      <span><strong className="block text-sm text-temple-text capitalize">{value} event</strong><small className="text-temple-muted">{value === 'free' ? 'Register without payment' : 'Pay securely with Razorpay'}</small></span>
                    </label>)}
                  </div>
                </fieldset>

                <fieldset disabled={pricingType === 'free'} className={pricingType === 'free' ? 'opacity-50' : ''}>
                  <div className="flex items-center justify-between mb-2">
                    <div><legend className="label mb-0">Paid plans *</legend><p className="text-xs text-temple-muted">Add one or more ticket or participation plans.</p></div>
                    <button type="button" disabled={pricingType === 'free'} onClick={() => setPlans(current => [...current, blankPlan()])} className="btn-secondary text-xs"><Plus size={13} /> Add Plan</button>
                  </div>
                  <div className="space-y-3">
                    {plans.map((plan, index) => <div key={plan.id || index} className="grid grid-cols-[1fr_150px_auto] gap-2 items-end">
                      <div><label className="label">Plan name</label><input value={plan.name} onChange={event => updatePlan(index, 'name', event.target.value)} className="input-field" placeholder="e.g. Individual Pass" /></div>
                      <div><label className="label">Price</label><div className="relative"><IndianRupee size={14} className="absolute left-3 top-3.5 text-temple-muted" /><input value={plan.price} onChange={event => updatePlan(index, 'price', event.target.value)} type="number" min="1" step="0.01" className="input-field pl-8" placeholder="500" /></div></div>
                      <button type="button" onClick={() => removePlan(index)} disabled={plans.length === 1} className="mb-1 p-2.5 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label="Remove plan"><Trash2 size={17} /></button>
                    </div>)}
                  </div>
                  {pricingType === 'free' && <p className="text-xs text-temple-muted mt-2">Plans are disabled for free events.</p>}
                </fieldset>

                <div className="flex flex-wrap gap-4">
                  {[['is_published', 'Published'], ['is_featured', 'Featured'], ['registration_enabled', 'Registration Enabled']].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 cursor-pointer">
                      <input {...register(name as keyof FormData)} type="checkbox" className="w-4 h-4 rounded accent-vermilion-700" />
                      <span className="text-sm font-medium text-temple-text">{label}{name === 'registration_enabled' && pricingType === 'paid' ? ' (required for paid events)' : ''}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                    <Save size={15} /> {submitting ? 'Saving...' : editing ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
