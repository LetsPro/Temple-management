import { useState, useEffect } from 'react'
import { Plus, CreditCard as Edit, X, Save, ToggleLeft, ToggleRight } from 'lucide-react'
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

type Announcement = Database['public']['Tables']['announcements']['Row']

const schema = z.object({
  title: z.string().min(2),
  content: z.string().min(5),
  priority: z.enum(['normal', 'important', 'urgent']),
  is_published: z.boolean(),
  publish_at: z.string().optional(),
  expires_at: z.string().optional().nullable(),
})
type FormData = z.infer<typeof schema>

const priorityBadge = (p: string) => ({
  urgent: 'badge-urgent',
  important: 'badge-important',
  normal: 'badge-normal',
}[p] || 'badge-normal')

export default function AdminAnnouncements() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_published: true, priority: 'normal' },
  })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    reset({ is_published: true, priority: 'normal', publish_at: new Date().toISOString().slice(0, 16) })
    setShowForm(true)
  }

  const openEdit = (a: Announcement) => {
    setEditing(a)
    reset({ title: a.title, content: a.content, priority: a.priority, is_published: a.is_published, publish_at: a.publish_at?.slice(0, 16), expires_at: a.expires_at?.slice(0, 16) || null })
    setShowForm(true)
  }

  const onSubmit = async (data: FormData) => {
    if (!user) return
    setSubmitting(true)
    const payload = { ...data, publish_at: data.publish_at || new Date().toISOString(), expires_at: data.expires_at || null, created_by: user.id }
    if (editing) {
      await supabase.from('announcements').update(payload).eq('id', editing.id)
      toast.success('Announcement updated.')
    } else {
      await supabase.from('announcements').insert(payload)
      toast.success('Announcement created.')
    }
    setSubmitting(false)
    setShowForm(false)
    load()
  }

  const togglePublish = async (a: Announcement) => {
    await supabase.from('announcements').update({ is_published: !a.is_published }).eq('id', a.id)
    toast.success(`Announcement ${a.is_published ? 'unpublished' : 'published'}.`)
    load()
  }

  const deleteAnn = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    toast.success('Deleted.')
    load()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Announcements & Notices</h1>
          <p className="text-temple-muted text-sm">{announcements.length} total</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm"><Plus size={15} /> Add Announcement</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : announcements.length === 0 ? (
        <EmptyState icon="📢" title="No announcements" action={<button onClick={openCreate} className="btn-primary text-sm">Add Announcement</button>} />
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className={`card ${!a.is_published ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={priorityBadge(a.priority)}>{a.priority}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-temple-text">{a.title}</h4>
                    {a.is_published ? <span className="text-xs text-green-600 font-medium">Published</span> : <span className="text-xs text-gray-500">Draft</span>}
                  </div>
                  <p className="text-temple-muted text-sm line-clamp-2 mb-2">{a.content}</p>
                  <div className="text-xs text-temple-muted">
                    {format(new Date(a.publish_at), 'dd MMM yyyy')}
                    {a.expires_at && ` – expires ${format(new Date(a.expires_at), 'dd MMM yyyy')}`}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-temple-border/50">
                <button onClick={() => openEdit(a)} className="btn-ghost text-xs"><Edit size={12} /> Edit</button>
                <button onClick={() => togglePublish(a)} className={`btn-ghost text-xs ${a.is_published ? 'text-amber-600' : 'text-green-600'}`}>
                  {a.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => deleteAnn(a.id)} className="btn-ghost text-xs text-red-600 hover:bg-red-50 ml-auto">Delete</button>
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
                <h3 className="font-bold text-xl text-temple-text">{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-cream-100"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input {...register('title')} className="input-field" />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="label">Content *</label>
                  <textarea {...register('content')} rows={5} className="input-field resize-none" />
                  {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Priority</label>
                    <select {...register('priority')} className="input-field">
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Publish At</label>
                    <input {...register('publish_at')} type="datetime-local" className="input-field" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Expires At (optional)</label>
                    <input {...register('expires_at')} type="datetime-local" className="input-field" />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input {...register('is_published')} type="checkbox" className="w-4 h-4 rounded accent-vermilion-700" />
                  <span className="text-sm font-medium">Publish immediately</span>
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                    <Save size={15} /> {submitting ? 'Saving...' : editing ? 'Update' : 'Publish'}
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
