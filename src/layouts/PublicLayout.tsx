import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, Facebook, Instagram, LayoutDashboard, LogOut, Mail, MapPin, Menu, Phone, User, UserPlus, X, Youtube } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

const TRUST_NAME = 'Shri Tripura Sundari Lalithambe Trust'
type TempleSettings = Database['public']['Tables']['temple_settings']['Row']
type FooterSocialLinks = { facebook?: string; instagram?: string; youtube?: string }

const footerDefaults = {
  temple_name: TRUST_NAME,
  tagline: 'Devotion · Service · Dharma · Serving devotees with faith and commitment.',
  logo_url: '/trust-logo.jpg',
  address: 'Padmanabhanagar, Bengaluru – 560 070, Karnataka, India',
  phone: '+91 80 1234 5678',
  email: 'info@stsltrust.org',
  google_maps_url: '',
  footer_hours: 'Mon – Sun: 6:00 AM – 9:00 PM',
  social_media: {} as FooterSocialLinks,
}

const safeExternalUrl = (value: string | undefined) => {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

const parseSocialLinks = (value: TempleSettings['social_media'] | undefined): FooterSocialLinks => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const links = value as Record<string, unknown>
  return {
    facebook: safeExternalUrl(typeof links.facebook === 'string' ? links.facebook : ''),
    instagram: safeExternalUrl(typeof links.instagram === 'string' ? links.instagram : ''),
    youtube: safeExternalUrl(typeof links.youtube === 'string' ? links.youtube : ''),
  }
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/poojas', label: 'Sevas / Pooja Booking' },
  { href: '/events', label: 'Events' },
]

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
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
    setAccountOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
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
              <img src="/trust-logo.jpg" alt="Sri Tripura Sundari Lalithambe Trust" className="header-logo" />
            </Link>

            <div className="desktop-nav">
              {navLinks.map(link => (
                <Link key={link.href} to={link.href} className={location.pathname === link.href ? 'active' : ''}>{link.label}</Link>
              ))}
            </div>

            <div className="nav-actions">
              <Link to="/membership" className="membership-button">Membership</Link>
              <button onClick={() => setAccountOpen(true)} className="account-menu-button" aria-label="Open My Account" title="My Account"><Menu size={21} /></button>
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
              <Link to="/membership">Membership</Link>
              {user ? <>
                <button onClick={() => { setAccountOpen(true); setMobileOpen(false) }}>My Account</button>
                <button onClick={handleSignOut}>Sign Out</button>
              </> : <>
                <Link to="/login" className="mobile-signin">Sign In</Link>
                <Link to="/register" className="mobile-signup">Sign Up</Link>
              </>}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>
      {accountOpen && <div className="account-drawer-layer" onMouseDown={event => event.target === event.currentTarget && setAccountOpen(false)}>
        <aside className="account-drawer" aria-label="My account">
          <div className="drawer-head"><div><span>Namaskaram</span><h2>My Account</h2></div><button onClick={() => setAccountOpen(false)} aria-label="Close account"><X /></button></div>
          {user ? <>
            <div className="drawer-profile"><div>{profile?.full_name?.[0]?.toUpperCase() || 'D'}</div><strong>{profile?.full_name || 'Devotee'}</strong><span>{profile?.devotee_number || profile?.email}</span></div>
            <nav>
              <Link to="/portal" onClick={() => setAccountOpen(false)}><LayoutDashboard /> Devotee Dashboard</Link>
              <Link to="/portal/profile" onClick={() => setAccountOpen(false)}><User /> Profile & Membership</Link>
              <Link to="/membership" onClick={() => setAccountOpen(false)}><CreditCard /> Become a Member</Link>
              {profile?.role === 'admin' && <Link to="/admin" onClick={() => setAccountOpen(false)}><LayoutDashboard /> Admin Portal</Link>}
            </nav>
            <button className="drawer-signout" onClick={handleSignOut}><LogOut /> Sign Out</button>
          </> : <div className="drawer-guest"><User size={42} /><h3>Welcome, devotee</h3><p>Sign in to manage bookings and your membership subscription.</p><Link to="/login" onClick={() => setAccountOpen(false)} className="btn-primary">Sign In</Link><Link to="/register" onClick={() => setAccountOpen(false)} className="btn-secondary"><UserPlus size={16} /> Create Account</Link></div>}
        </aside>
      </div>}
      <Footer />
    </div>
  )
}

function Footer() {
  const [settings, setSettings] = useState(footerDefaults)

  useEffect(() => {
    let active = true
    supabase.from('temple_settings').select('temple_name,tagline,logo_url,address,phone,email,google_maps_url,footer_hours,social_media').limit(1).maybeSingle().then(({ data }) => {
      if (!active || !data) return
      setSettings({
        temple_name: data.temple_name || footerDefaults.temple_name,
        tagline: data.tagline || footerDefaults.tagline,
        logo_url: safeExternalUrl(data.logo_url) || footerDefaults.logo_url,
        address: data.address || footerDefaults.address,
        phone: data.phone || footerDefaults.phone,
        email: data.email || footerDefaults.email,
        google_maps_url: safeExternalUrl(data.google_maps_url),
        footer_hours: data.footer_hours || footerDefaults.footer_hours,
        social_media: parseSocialLinks(data.social_media),
      })
    })
    return () => { active = false }
  }, [])

  const phoneHref = `tel:${settings.phone.replace(/[^+\d]/g, '')}`
  const mapContent = <><MapPin size={15} /><span className="whitespace-pre-line">{settings.address}</span></>
  const socialLinks = [
    { key: 'facebook', href: settings.social_media.facebook, label: 'Facebook', icon: <Facebook size={18} /> },
    { key: 'instagram', href: settings.social_media.instagram, label: 'Instagram', icon: <Instagram size={18} /> },
    { key: 'youtube', href: settings.social_media.youtube, label: 'YouTube', icon: <Youtube size={18} /> },
  ].filter(link => link.href)

  return (
    <footer className="site-footer">
      <div className="footer-pattern" aria-hidden="true" />
      <div className="page-container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-wrap">
            <img src={settings.logo_url} alt={settings.temple_name} className="footer-logo" onError={event => { event.currentTarget.src = '/trust-logo.jpg' }} />
          </div>
          <div className="gold-rule" />
          <p>{settings.tagline}</p>
        </div>
        <div>
          <h4>Contact Us</h4>
          <a href={phoneHref}><Phone size={15} /> {settings.phone}</a>
          <a href={`mailto:${settings.email}`}><Mail size={15} /> {settings.email}</a>
          <p><span>◷</span> {settings.footer_hours}</p>
        </div>
        <div>
          <h4>Location</h4>
          {settings.google_maps_url
            ? <a href={settings.google_maps_url} target="_blank" rel="noopener noreferrer" aria-label="Open temple location in Google Maps">{mapContent}</a>
            : <p>{mapContent}</p>}
        </div>
        <div>
          <h4>Quick Links</h4>
          <Link to="/about">› About</Link>
          <Link to="/poojas">› Sevas & Poojas</Link>
          <Link to="/membership">› Membership</Link>
          <Link to="/contact">› Contact Us</Link>
        </div>
        <div>
          <h4>Follow Us</h4>
          <div className="socials">
            {socialLinks.map(link => <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>{link.icon}</a>)}
          </div>
          {socialLinks.length === 0 && <p>Social links can be added in Admin Settings.</p>}
        </div>
      </div>
      <div className="payment-trust-strip" aria-label="Accepted payment methods">
        <span className="payment-label"><CreditCard size={15} /> Secure payments</span>
        <span className="pay-brand upi" aria-label="UPI">UPI</span>
        <span className="pay-brand razorpay" aria-label="Razorpay">Razorpay</span>
        <span className="pay-brand mastercard" aria-label="Mastercard"><i /><i /></span>
        <span className="pay-brand rupay" aria-label="RuPay">RuPay</span>
        <span className="pay-brand visa" aria-label="Visa">VISA</span>
      </div>
      <nav className="footer-legal-links" aria-label="Legal information">
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/disclaimer">Disclaimer</Link>
        <Link to="/payment-terms">Payment Terms</Link>
      </nav>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {settings.temple_name}. All Rights Reserved.</span>
        <span>Powered by <a href="https://dreambuzz.in" target="_blank" rel="noopener noreferrer">DreamBuzz Solutions</a></span>
      </div>
    </footer>
  )
}
