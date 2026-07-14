import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Heart, Bell, User, Settings, LogOut,
  Menu, X, ChevronRight, BookOpen
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/portal/book', label: 'Book Pooja / Seva', icon: BookOpen },
  { href: '/portal/bookings', label: 'My Bookings', icon: Calendar },
  { href: '/portal/donations', label: 'My Donations', icon: Heart },
  { href: '/portal/events', label: 'Events', icon: Calendar },
  { href: '/portal/notifications', label: 'Notifications', icon: Bell },
  { href: '/portal/profile', label: 'My Profile', icon: User },
]

export default function DevoteeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href
    return location.pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 border-b border-temple-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-lg">🛕</div>
          <div>
            <div className="font-bold text-temple-text text-sm leading-tight">Devotee Portal</div>
            <div className="text-xs text-temple-muted">Sri Mahalakshmi Temple</div>
          </div>
        </Link>
      </div>

      {/* Profile summary */}
      <div className="p-4 border-b border-temple-border bg-cream-100/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || 'D'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-temple-text text-sm truncate">{profile?.full_name || 'Devotee'}</div>
            <div className="text-xs text-temple-muted truncate">{profile?.devotee_number || profile?.email}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-vermilion-50 text-vermilion-700'
                    : 'text-temple-muted hover:text-temple-text hover:bg-cream-100'
                }`}
              >
                <item.icon size={17} className={active ? 'text-vermilion-600' : ''} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto text-vermilion-400" />}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-temple-border space-y-0.5">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-temple-muted hover:text-temple-text hover:bg-cream-100 transition-all">
          <span>🛕</span> Temple Website
        </Link>
        <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
          <LogOut size={17} /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-cream-100/40">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-temple-border bg-white fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-white flex flex-col animate-slide-in">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-cream-100">
              <X size={18} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-temple-border px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-cream-100 text-temple-muted">
              <Menu size={20} />
            </button>
            <div className="text-sm text-temple-muted hidden sm:block">
              Welcome back, <span className="font-semibold text-temple-text">{profile?.full_name?.split(' ')[0] || 'Devotee'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/portal/notifications" className="p-2 rounded-lg hover:bg-cream-100 text-temple-muted relative">
              <Bell size={18} />
            </Link>
            <Link to="/portal/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-cream-100 transition-all">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-xs font-bold">
                {profile?.full_name?.[0]?.toUpperCase() || 'D'}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
