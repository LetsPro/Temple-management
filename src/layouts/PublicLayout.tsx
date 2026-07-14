import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Bell, User, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/poojas', label: 'Poojas & Sevas' },
  { href: '/festivals', label: 'Festivals' },
  { href: '/donate', label: 'Donate' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [templeName, setTempleName] = useState('Sri Mahalakshmi Temple')
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  useEffect(() => {
    supabase.from('temple_settings').select('temple_name').maybeSingle().then(({ data }) => {
      if (data) setTempleName(data.temple_name)
    })
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col rangoli-bg">
      {/* Navbar */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-temple border-b border-temple-border' : 'bg-white/80 backdrop-blur-sm'}`}>
        <div className="page-container">
          <nav className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-lg shadow-md group-hover:shadow-lg transition-shadow">
                🛕
              </div>
              <span className="font-bold text-temple-text text-[15px] hidden sm:block leading-tight">
                {templeName}
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    location.pathname === link.href
                      ? 'text-vermilion-700 bg-vermilion-50'
                      : 'text-temple-muted hover:text-temple-text hover:bg-cream-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-temple-border bg-white hover:bg-cream-100 transition-all text-sm font-medium text-temple-text"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vermilion-700 to-saffron-500 flex items-center justify-center text-white text-xs font-bold">
                      {profile?.full_name?.[0]?.toUpperCase() || <User size={12} />}
                    </div>
                    <span className="max-w-[100px] truncate">{profile?.full_name || 'Profile'}</span>
                    <ChevronDown size={14} />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-temple-border shadow-temple-lg py-1.5 animate-fade-in">
                      <Link to="/portal" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-temple-text hover:bg-cream-100 transition-colors">
                        <LayoutDashboard size={15} className="text-saffron-500" />
                        Devotee Portal
                      </Link>
                      {profile?.role === 'admin' && (
                        <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-temple-text hover:bg-cream-100 transition-colors">
                          <LayoutDashboard size={15} className="text-vermilion-600" />
                          Admin Portal
                        </Link>
                      )}
                      <div className="border-t border-temple-border my-1" />
                      <button onClick={handleSignOut} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/login" className="btn-ghost text-sm">Login</Link>
                  <Link to="/register" className="btn-primary text-sm py-2">Register</Link>
                </div>
              )}

              {/* Book pooja CTA */}
              <Link to="/poojas" className="hidden md:flex btn-primary text-sm py-2">
                Book Pooja
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-cream-100 text-temple-muted"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-temple-border bg-white/95 backdrop-blur-sm animate-fade-in">
            <div className="page-container py-3 flex flex-col gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? 'text-vermilion-700 bg-vermilion-50'
                      : 'text-temple-text hover:bg-cream-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-temple-border my-1 pt-2 flex flex-col gap-1">
                {user ? (
                  <>
                    <Link to="/portal" className="px-4 py-2.5 rounded-xl text-sm font-medium text-temple-text hover:bg-cream-100">Devotee Portal</Link>
                    {profile?.role === 'admin' && (
                      <Link to="/admin" className="px-4 py-2.5 rounded-xl text-sm font-medium text-temple-text hover:bg-cream-100">Admin Portal</Link>
                    )}
                    <button onClick={handleSignOut} className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 text-left">Sign Out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="px-4 py-2.5 rounded-xl text-sm font-medium text-temple-text hover:bg-cream-100">Login</Link>
                    <Link to="/register" className="btn-primary">Register</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer templeName={templeName} />
    </div>
  )
}

function Footer({ templeName }: { templeName: string }) {
  return (
    <footer className="bg-gradient-to-br from-[#1a0a04] to-[#3C2415] text-white mt-auto">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-saffron-500 to-gold-500 flex items-center justify-center text-lg">🛕</div>
              <span className="font-bold text-white">{templeName}</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              A sacred space for devotion, community and divine grace. Serving devotees since 1824.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {[['/', 'Home'], ['/about', 'About Temple'], ['/poojas', 'Poojas & Sevas'], ['/festivals', 'Festivals'], ['/donate', 'Donate']].map(([href, label]) => (
                <Link key={href} to={href} className="text-white/60 hover:text-saffron-400 text-sm transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Temple Timings</h4>
            <div className="space-y-2 text-sm text-white/60">
              <div><span className="text-white/80 font-medium">Mon – Fri:</span> 6:00 AM – 12:30 PM, 4:00 PM – 8:30 PM</div>
              <div><span className="text-white/80 font-medium">Sat – Sun:</span> 5:30 AM – 1:00 PM, 4:00 PM – 9:00 PM</div>
              <div><span className="text-white/80 font-medium">Holidays:</span> 5:00 AM – 1:30 PM, 3:30 PM – 9:30 PM</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Contact</h4>
            <div className="space-y-2 text-sm text-white/60">
              <div>12, Temple Street, Mylapore</div>
              <div>Chennai – 600004, Tamil Nadu</div>
              <div className="pt-1">
                <a href="tel:+914423456789" className="text-saffron-400 hover:text-saffron-300">+91 44 2345 6789</a>
              </div>
              <div>
                <a href="mailto:info@srimahalakshmi.org" className="text-saffron-400 hover:text-saffron-300">info@srimahalakshmi.org</a>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/40">
          <div>© {new Date().getFullYear()} {templeName}. All rights reserved.</div>
          <div className="flex gap-4">
            <Link to="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
            <Link to="/about" className="hover:text-white/60 transition-colors">About</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
