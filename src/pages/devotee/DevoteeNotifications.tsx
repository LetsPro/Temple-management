import { useState, useEffect } from 'react'
import { Bell, CheckCheck, BellOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import type { Database } from '../../lib/database.types'
import EmptyState from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'

type Notification = Database['public']['Tables']['notifications']['Row']

export default function DevoteeNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false)
    load()
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const typeIcon = (type: string) => ({ booking: '📅', donation: '💛', event: '🎊', success: '✅', warning: '⚠️', error: '❌', info: '📢' }[type] || '📢')

  const unread = notifications.filter(n => !n.is_read)

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Notifications</h1>
          <p className="text-temple-muted text-sm">{unread.length > 0 ? `${unread.length} unread` : 'All caught up!'}</p>
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-1.5">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" description="You'll see booking confirmations, announcements and updates here." />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`flex gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${n.is_read ? 'bg-white border-temple-border opacity-70' : 'bg-saffron-50/40 border-saffron-100 hover:bg-saffron-50'}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon(n.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-temple-text text-sm">{n.title}</div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-vermilion-500 flex-shrink-0" />}
                </div>
                <p className="text-temple-muted text-xs leading-relaxed mt-0.5">{n.message}</p>
                <div className="text-xs text-temple-muted mt-1">{format(new Date(n.created_at), 'dd MMM yyyy, h:mm a')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
