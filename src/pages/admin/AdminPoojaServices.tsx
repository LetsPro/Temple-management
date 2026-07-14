import { useState, useEffect } from 'react'
import { Plus, CreditCard as Edit, Archive, Eye, X, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Service = Database['public']['Tables']['pooja_services']['Row']

const CATEGORIES = ['Archana', 'Homam', 'Special Seva', 'Katha & Pravachan', 'Charity', 'General']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const schema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string(),
  benefits: z.string(),
  instructions: z.string(),
  price: z.number().min(0),
  duration_minutes: z.number().min(1),
  capacity_per_slot: z.number().min(1),
  is_featured: z.boolean(),
  is_active: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function AdminPoojaServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [availDays, setAvailDays] = useState<number[]>([0,1,2,3,4,5,6])
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true, is_featured: false, capacity_per_slot: 10, duration_minutes: 60 },
  })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('pooja_services').select('*').order('display_order')
    setServices(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openEdit = (service: Service) => {
    setEditing(service)
    reset({ name: service.name, category: service.category, slug: service.slug, description: service.description, benefits: service.benefits, instructions: service.instructions, price: service.price, duration_minutes: service.duration_minutes, capacity_per_slot: service.capacity_per_slot, is_featured: service.is_featured, is_active: service.is_active })
    setAvailDays((service.available_days as number[]) || [0,1,2,3,4,5,6])
    setShowForm(true)
  }

  const openCreate = () => {
    setEditing(null)
    reset({ is_active: true, is_featured: false, capacity_per_slot: 10, duration_minutes: 60, price: 0 })
    setAvailDays([0,1,2,3,4,5,6])
    setShowForm(true)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const payload = { ...data, available_days: availDays }
    if (editing) {
      const { error } = await supabase.from('pooja_services').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); setSubmitting(false); return }
      toast.success('Service updated.')
    } else {
      const { error } = await supabase.from('pooja_services').insert(payload)
      if (error) { toast.error(error.message); setSubmitting(false); return }
      toast.success('Service created.')
    }
    setSubmitting(false)
    setShowForm(false)
    load()
  }

  const toggleActive = async (service: Service) => {
    await supabase.from('pooja_services').update({ is_active: !service.is_active }).eq('id', service.id)
    toast.success(`Service ${service.is_active ? 'deactivated' : 'activated'}.`)
    load()
  }

  const nameToSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Pooja & Seva Management</h1>
          <p className="text-temple-muted text-sm">{services.length} services</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm"><Plus size={15} /> Add Service</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : services.length === 0 ? (
        <EmptyState icon="🙏" title="No services yet" action={<button onClick={openCreate} className="btn-primary text-sm">Add First Service</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(s => (
            <div key={s.id} className={`card transition-all ${!s.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded-full">{s.category}</span>
                    {s.is_featured && <span className="text-xs text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full font-semibold">Featured</span>}
                    {!s.is_active && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <h3 className="font-bold text-temple-text">{s.name}</h3>
                  <p className="text-temple-muted text-xs mt-0.5 line-clamp-2">{s.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-vermilion-700">₹{s.price.toLocaleString('en-IN')}</div>
                  <div className="text-xs text-temple-muted">{s.duration_minutes} min</div>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-temple-border/50">
                <button onClick={() => openEdit(s)} className="btn-ghost text-xs flex-1 justify-center"><Edit size={12} /> Edit</button>
                <button onClick={() => toggleActive(s)} className={`btn-ghost text-xs flex-1 justify-center ${s.is_active ? 'text-red-600' : 'text-green-600'}`}>
                  {s.is_active ? <><ToggleRight size={12} /> Deactivate</> : <><ToggleLeft size={12} /> Activate</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-xl text-temple-text">{editing ? 'Edit Service' : 'Add New Service'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Service Name *</label>
                    <input {...register('name')} onChange={e => { register('name').onChange(e); if (!editing) setValue('slug', nameToSlug(e.target.value)) }} className="input-field" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="label">Category *</label>
                    <select {...register('category')} className="input-field">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">URL Slug *</label>
                    <input {...register('slug')} className="input-field" placeholder="e.g. abhishekam" />
                    {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
                  </div>
                  <div>
                    <label className="label">Price (₹) *</label>
                    <input {...register('price', { valueAsNumber: true })} type="number" className="input-field" min="0" />
                  </div>
                  <div>
                    <label className="label">Duration (minutes)</label>
                    <input {...register('duration_minutes', { valueAsNumber: true })} type="number" className="input-field" min="1" />
                  </div>
                  <div>
                    <label className="label">Capacity per Slot</label>
                    <input {...register('capacity_per_slot', { valueAsNumber: true })} type="number" className="input-field" min="1" />
                  </div>
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea {...register('description')} rows={3} className="input-field resize-none" />
                </div>
                <div>
                  <label className="label">Benefits</label>
                  <textarea {...register('benefits')} rows={2} className="input-field resize-none" />
                </div>
                <div>
                  <label className="label">Instructions for Devotees</label>
                  <textarea {...register('instructions')} rows={2} className="input-field resize-none" />
                </div>

                <div>
                  <label className="label">Available Days</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((day, i) => (
                      <button type="button" key={day} onClick={() => setAvailDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${availDays.includes(i) ? 'bg-vermilion-700 text-white border-vermilion-700' : 'bg-white border-temple-border text-temple-muted'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input {...register('is_active')} type="checkbox" className="w-4 h-4 rounded accent-vermilion-700" />
                    <span className="text-sm font-medium text-temple-text">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input {...register('is_featured')} type="checkbox" className="w-4 h-4 rounded accent-vermilion-700" />
                    <span className="text-sm font-medium text-temple-text">Featured on Homepage</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-none">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                    <Save size={15} /> {submitting ? 'Saving...' : editing ? 'Update Service' : 'Create Service'}
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
