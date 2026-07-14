import { useState, useEffect } from 'react'
import { Plus, Edit, Eye, X, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

type Event = Database['public']['Tables']['events']['Row']

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string(),
  start_datetime: z.string().min(1),
  end_datetime: z.string().min(1),
  venue: z.string(),
  registration_enabled: z.boolean(),
  capacity: z.number().nullable().optional(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function AdminEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_published: false, is_featured: false, registration_enabled: false },
  })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('events').select('*').order('start_datetime', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    reset({ is_published: false, is_featured: false, registration_enabled: false })
    setShowForm(true)
  }

  const openEdit = (event: Event) => {
    setEditing(event)
    reset({
      title: event.title, slug: event.slug, description: event.description,
      start_datetime: event.start_datetime.slice(0, 16), end_datetime: event.end_datetime.slice(0, 16),
      venue: event.venue, registration_enabled: event.registration_enabled,
      capacity: event.capacity, is_published: event.is_published, is_featured: event.is_featured,
    })
    setShowForm(true)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const payload = { ...data, capacity: data.capacity || null }
    if (editing) {
      await supabase.from('events').update(payload).eq('id', editing.id)
      toast.success('Event updated.')
    } else {
      await supabase.from('events').insert(payload)
      toast.success('Event created.')
    }
    setSubmitting(false)
    setShowForm(false)
    load()
  }

  const togglePublish = async (event: Event) => {
    await supabase.from('events').update({ is_published: !event.is_published }).eq('id', event.id)
    toast.success(`Event ${event.is_published ? 'unpublished' : 'published'}.`)
    load()
  }

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
          {events.map(event => (
            <div key={event.id} className={`card ${!event.is_published ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-14 text-center flex-shrink-0">
                  <div className="bg-vermilion-50 rounded-xl p-2">
                    <div className="text-vermilion-700 font-bold text-lg leading-none">{format(new Date(event.start_datetime), 'dd')}</div>
                    <div className="text-vermilion-400 text-xs">{format(new Date(event.start_datetime), 'MMM')}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-temple-text">{event.title}</h3>
                    {event.is_published ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Published</span> : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>}
                    {event.is_featured && <span className="text-xs bg-gold-50 text-gold-600 px-2 py-0.5 rounded-full font-semibold">Featured</span>}
                    {event.registration_enabled && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Registration On</span>}
                  </div>
                  <p className="text-temple-muted text-sm line-clamp-2 mb-2">{event.description}</p>
                  <div className="text-xs text-temple-muted">
                    {format(new Date(event.start_datetime), 'dd MMM yyyy, h:mm a')} – {format(new Date(event.end_datetime), 'dd MMM yyyy, h:mm a')} · {event.venue}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-temple-border/50">
                <button onClick={() => openEdit(event)} className="btn-ghost text-xs"><Edit size={12} /> Edit</button>
                <button onClick={() => togglePublish(event)} className={`btn-ghost text-xs ${event.is_published ? 'text-amber-600' : 'text-green-600'}`}>
                  {event.is_published ? <><ToggleRight size={12} /> Unpublish</> : <><ToggleLeft size={12} /> Publish</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-xl text-temple-text">{editing ? 'Edit Event' : 'Add New Event'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Title *</label>
                    <input {...register('title')} className="input-field" onChange={e => { register('title').onChange(e); if (!editing) { const form = document.querySelector('[name="slug"]') as HTMLInputElement; if (form) form.value = nameToSlug(e.target.value) } }} />
                  </div>
                  <div><label className="label">Slug *</label><input {...register('slug')} className="input-field" /></div>
                  <div><label className="label">Venue</label><input {...register('venue')} className="input-field" /></div>
                  <div><label className="label">Start Date & Time *</label><input {...register('start_datetime')} type="datetime-local" className="input-field" /></div>
                  <div><label className="label">End Date & Time *</label><input {...register('end_datetime')} type="datetime-local" className="input-field" /></div>
                  <div><label className="label">Capacity</label><input {...register('capacity', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} type="number" min="0" className="input-field" placeholder="Leave blank for unlimited" /></div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea {...register('description')} rows={4} className="input-field resize-none" />
                </div>
                <div className="flex flex-wrap gap-4">
                  {[['is_published', 'Published'], ['is_featured', 'Featured'], ['registration_enabled', 'Registration Enabled']].map(([n, l]) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer">
                      <input {...register(n as keyof FormData)} type="checkbox" className="w-4 h-4 rounded accent-vermilion-700" />
                      <span className="text-sm font-medium text-temple-text">{l}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                    <Save size={15} /> {submitting ? 'Saving...' : editing ? 'Update' : 'Create Event'}
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
