import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center rangoli-bg px-6">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6">🛕</div>
        <h1 className="text-6xl font-bold text-vermilion-700 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-temple-text mb-3">Page Not Found</h2>
        <p className="text-temple-muted mb-8 leading-relaxed">
          The page you are looking for does not exist or may have been moved. Please return to the temple home.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-primary">Go Home</Link>
          <Link to="/poojas" className="btn-secondary">Book a Pooja</Link>
        </div>
      </div>
    </div>
  )
}
