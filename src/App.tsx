import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import DevoteeLayout from './layouts/DevoteeLayout'
import AdminLayout from './layouts/AdminLayout'

// Public pages
import HomePage from './pages/public/HomePage'
import AboutPage from './pages/public/AboutPage'
import PoojaServicesPage from './pages/public/PoojaServicesPage'
import PoojaServiceDetailPage from './pages/public/PoojaServiceDetailPage'
import FestivalsPage from './pages/public/FestivalsPage'
import EventDetailPage from './pages/public/EventDetailPage'
import GalleryPage from './pages/public/GalleryPage'
import ContactPage from './pages/public/ContactPage'
import MembershipPage from './pages/public/MembershipPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import NotFoundPage from './pages/NotFoundPage'

// Devotee pages
import DevoteeDashboard from './pages/devotee/DevoteeDashboard'
import DevoteeProfile from './pages/devotee/DevoteeProfile'
import DevoteeBookings from './pages/devotee/DevoteeBookings'
import BookingFlow from './pages/devotee/BookingFlow'
import DevoteeDonations from './pages/devotee/DevoteeDonations'
import DevoteeEvents from './pages/devotee/DevoteeEvents'
import DevoteeNotifications from './pages/devotee/DevoteeNotifications'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminDevotees from './pages/admin/AdminDevotees'
import AdminPoojaServices from './pages/admin/AdminPoojaServices'
import AdminBookings from './pages/admin/AdminBookings'
import AdminDonations from './pages/admin/AdminDonations'
import AdminEvents from './pages/admin/AdminEvents'
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import AdminGallery from './pages/admin/AdminGallery'
import AdminSettings from './pages/admin/AdminSettings'
import AdminReports from './pages/admin/AdminReports'
import AdminMemberships from './pages/admin/AdminMemberships'

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-saffron-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-temple-muted text-sm">Loading...</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && profile?.role !== 'admin') return <Navigate to="/portal" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/poojas" element={<PoojaServicesPage />} />
          <Route path="/poojas/:slug" element={<PoojaServiceDetailPage />} />
          <Route path="/festivals" element={<FestivalsPage />} />
          <Route path="/festivals/:slug" element={<EventDetailPage />} />
          <Route path="/donate" element={<Navigate to="/" replace />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Devotee portal */}
        <Route path="/portal" element={
          <ProtectedRoute><DevoteeLayout /></ProtectedRoute>
        }>
          <Route index element={<DevoteeDashboard />} />
          <Route path="profile" element={<DevoteeProfile />} />
          <Route path="bookings" element={<DevoteeBookings />} />
          <Route path="book" element={<BookingFlow />} />
          <Route path="book/:serviceId" element={<BookingFlow />} />
          <Route path="donations" element={<DevoteeDonations />} />
          <Route path="events" element={<DevoteeEvents />} />
          <Route path="notifications" element={<DevoteeNotifications />} />
        </Route>

        {/* Admin portal */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="devotees" element={<AdminDevotees />} />
          <Route path="poojas" element={<AdminPoojaServices />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="donations" element={<AdminDonations />} />
          <Route path="memberships" element={<AdminMemberships />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
