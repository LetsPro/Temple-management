import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, Calendar, Heart, Megaphone,
  Image, Settings, BarChart3, LogOut, Menu, X, ChevronRight, FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/devotees', label: 'Devotees', icon: Users },
  { href: '/admin/poojas', label: 'Poojas & Sevas', icon: BookOpen },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/donations', label: 'Donations', icon: Heart },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
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

  const getCurrentPageTitle = () => {
    const item = navItems.find(i => isActive(i.href, i.exact))
    return item?.label || 'Admin'
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-temple-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-lg">🛕</div>
          <div>
            <div className="font-bold text-temple-text text-sm leading-tight">Admin Portal</div>
            <div className="text-xs text-temple-muted">Temple Management</div>
          </div>
        </Link>
      </div>

      <div className="p-4 border-b border-temple-border bg-red-50/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-vermilion-700 to-vermilion-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-temple-text text-sm truncate">{profile?.full_name || 'Admin'}</div>
            <div className="text-xs text-vermilion-600 font-medium">Administrator</div>
          </div>
        </div>
      </div>

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

      <div className="p-3 border-t border-temple-border space-y-0.5">
        <Link to="/portal" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-temple-muted hover:text-temple-text hover:bg-cream-100 transition-all">
          <span className="text-base">👤</span> Devotee Portal
        </Link>
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-temple-muted hover:text-temple-text hover:bg-cream-100 transition-all">
          <span className="text-base">🛕</span> Temple Website
        </Link>
        <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
          <LogOut size={17} /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-temple-border bg-white fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
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

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white border-b border-temple-border px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-cream-100 text-temple-muted">
              <Menu size={20} />
            </button>
            <div className="text-sm font-semibold text-temple-text">{getCurrentPageTitle()}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-temple-muted">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Admin
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
