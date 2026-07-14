import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, Facebook, Heart, Instagram, LayoutDashboard, LogOut, Mail, MapPin, Menu, Phone, User, UserPlus, X, Youtube } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { DonationModal } from '../pages/public/DonationsPage'

const TRUST_NAME = 'Shri Tripura Sundari Lalithambe Trust'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/poojas', label: 'Sevas / Pooja Booking' },
  { href: '/festivals', label: 'Events' },
]

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [donationOpen, setDonationOpen] = useState(false)
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

  useEffect(() => {
    const openDonation = () => setDonationOpen(true)
    window.addEventListener('open-donation-modal', openDonation)
    return () => window.removeEventListener('open-donation-modal', openDonation)
  }, [])

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
              <button onClick={() => setDonationOpen(true)} className="donate-button"><Heart size={16} /> Donate</button>
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
              <button onClick={() => { setDonationOpen(true); setMobileOpen(false) }}>Donate</button>
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
      <DonationModal open={donationOpen} onClose={() => setDonationOpen(false)} />
      {accountOpen && <div className="account-drawer-layer" onMouseDown={event => event.target === event.currentTarget && setAccountOpen(false)}>
        <aside className="account-drawer" aria-label="My account">
          <div className="drawer-head"><div><span>Namaskaram</span><h2>My Account</h2></div><button onClick={() => setAccountOpen(false)} aria-label="Close account"><X /></button></div>
          {user ? <>
            <div className="drawer-profile"><div>{profile?.full_name?.[0]?.toUpperCase() || 'D'}</div><strong>{profile?.full_name || 'Devotee'}</strong><span>{profile?.devotee_number || profile?.email}</span></div>
            <nav>
              <Link to="/portal" onClick={() => setAccountOpen(false)}><LayoutDashboard /> Devotee Dashboard</Link>
              <Link to="/portal/profile" onClick={() => setAccountOpen(false)}><User /> Profile & Membership</Link>
              <Link to="/portal/donations" onClick={() => setAccountOpen(false)}><Heart /> My Donations</Link>
              <Link to="/membership" onClick={() => setAccountOpen(false)}><CreditCard /> Become a Member</Link>
              {profile?.role === 'admin' && <Link to="/admin" onClick={() => setAccountOpen(false)}><LayoutDashboard /> Admin Portal</Link>}
            </nav>
            <button className="drawer-signout" onClick={handleSignOut}><LogOut /> Sign Out</button>
          </> : <div className="drawer-guest"><User size={42} /><h3>Welcome, devotee</h3><p>Sign in to manage bookings, donations and your membership subscription.</p><Link to="/login" onClick={() => setAccountOpen(false)} className="btn-primary">Sign In</Link><Link to="/register" onClick={() => setAccountOpen(false)} className="btn-secondary"><UserPlus size={16} /> Create Account</Link></div>}
        </aside>
      </div>}
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
          <div className="footer-logo-wrap">
            <img src="/trust-logo.jpg" alt="Sri Tripura Sundari Lalithambe Trust" className="footer-logo" />
          </div>
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
          <Link to="/about">› About</Link>
          <Link to="/poojas">› Sevas & Poojas</Link>
          <button type="button" onClick={() => window.dispatchEvent(new Event('open-donation-modal'))}>› Donations</button>
          <Link to="/membership">› Membership</Link>
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
        <span>© {new Date().getFullYear()} {TRUST_NAME}. All Rights Reserved.</span>
        <span>Powered by <a href="https://dreambuzz.in" target="_blank" rel="noopener noreferrer">DreamBuzz Solutions</a></span>
      </div>
    </footer>
  )
}
