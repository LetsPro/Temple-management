import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Facebook, Instagram, LayoutDashboard, LogOut, Mail, MapPin, Menu, Phone, User, X, Youtube } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const TRUST_NAME = 'Shri Tripura Sundari Lalithambe Trust'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Temple' },
  { href: '/poojas', label: 'Sevas / Pooja Booking' },
  { href: '/donate', label: 'Donations' },
  { href: '/festivals', label: 'Events' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14)
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
      <div className="ornament-line" aria-hidden="true" />
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="page-container">
          <nav className="main-nav" aria-label="Main navigation">
            <Link to="/" className="brand" aria-label={`${TRUST_NAME} home`}>
              <span className="brand-mark" aria-hidden="true">🪷</span>
              <span className="brand-copy"><strong>Shri Tripura Sundari<br />Lalithambe Trust</strong><small><i /> Devotion · Service · Dharma <i /></small></span>
            </Link>

            <div className="desktop-nav">
              {navLinks.map(link => (
                <Link key={link.href} to={link.href} className={location.pathname === link.href ? 'active' : ''}>{link.label}</Link>
              ))}
            </div>

            <div className="nav-actions">
              {user ? (
                <div className="user-menu-wrap">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="account-button">
                    <User size={16} /> <span>{profile?.full_name || 'My Account'}</span><ChevronDown size={14} />
                  </button>
                  {userMenuOpen && (
                    <div className="account-menu">
                      <Link to="/portal"><LayoutDashboard size={15} /> Devotee Portal</Link>
                      {profile?.role === 'admin' && <Link to="/admin"><LayoutDashboard size={15} /> Admin Portal</Link>}
                      <button onClick={handleSignOut}><LogOut size={15} /> Sign Out</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="account-button"><User size={16} /> <span>My Account</span></Link>
              )}
              <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" aria-expanded={mobileOpen}>
                {mobileOpen ? <X size={23} /> : <Menu size={23} />}
              </button>
            </div>
          </nav>
        </div>

        {mobileOpen && (
          <div className="mobile-menu">
            <div className="page-container">
              {navLinks.map(link => <Link key={link.href} to={link.href} className={location.pathname === link.href ? 'active' : ''}>{link.label}</Link>)}
              {user ? <button onClick={handleSignOut}>Sign Out</button> : <Link to="/register">Create Account</Link>}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-pattern" aria-hidden="true" />
      <div className="page-container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">🪷</div>
          <h3>{TRUST_NAME}</h3>
          <div className="gold-rule" />
          <p>Devotion · Service · Dharma<br />Serving devotees with faith and commitment.</p>
        </div>
        <div>
          <h4>Contact Us</h4>
          <a href="tel:+918012345678"><Phone size={15} /> +91 80 1234 5678</a>
          <a href="mailto:info@stsltrust.org"><Mail size={15} /> info@stsltrust.org</a>
          <p><span>◷</span> Mon – Sun: 6:00 AM – 9:00 PM</p>
        </div>
        <div>
          <h4>Location</h4>
          <p><MapPin size={15} /> Padmanabhanagar,<br />Bengaluru – 560 070,<br />Karnataka, India</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <Link to="/about">› About Temple</Link>
          <Link to="/poojas">› Sevas & Poojas</Link>
          <Link to="/donate">› Donations</Link>
          <Link to="/contact">› Contact Us</Link>
        </div>
        <div>
          <h4>Follow Us</h4>
          <div className="socials">
            <a href="#facebook" aria-label="Facebook"><Facebook size={18} /></a>
            <a href="#instagram" aria-label="Instagram"><Instagram size={18} /></a>
            <a href="#youtube" aria-label="YouTube"><Youtube size={18} /></a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} {TRUST_NAME}. All Rights Reserved.</div>
    </footer>
  )
}
