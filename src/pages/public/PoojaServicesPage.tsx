import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, Users, Calendar, ArrowRight, Star, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { Skeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'

type Service = Database['public']['Tables']['pooja_services']['Row']

export default function PoojaServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [categories, setCategories] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    setError(false)
    const { data, error: err } = await supabase
      .from('pooja_services')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (err) { setError(true); setLoading(false); return }
    setServices(data || [])
    const cats = ['All', ...new Set((data || []).map(s => s.category))]
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = services.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || s.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="page-container py-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Poojas & Sevas</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-temple-text mb-3 font-serif">Sacred Services</h1>
        <p className="text-temple-muted leading-relaxed">
          Choose from our range of poojas, archanas, homams and special sevas conducted by experienced priests.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search poojas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1"
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                category === cat
                  ? 'bg-vermilion-700 text-white border-vermilion-700'
                  : 'bg-white text-temple-muted border-temple-border hover:border-vermilion-300 hover:text-vermilion-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔔" title="No services found" description="Try adjusting your search or filter criteria." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="card hover:shadow-temple-md transition-all duration-200 flex flex-col">
      {service.image_url ? (
        <img src={service.image_url} alt={service.name} className="w-full h-44 object-cover rounded-xl mb-4" loading="lazy" />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-cream-200 to-amber-100 rounded-xl mb-4 flex items-center justify-center text-5xl">🪔</div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-saffron-600 bg-saffron-50 px-2.5 py-0.5 rounded-full">{service.category}</span>
        {service.is_featured && <Star size={13} className="text-gold-500 fill-gold-500" />}
      </div>
      <h3 className="font-bold text-temple-text text-base mb-1.5">{service.name}</h3>
      <p className="text-temple-muted text-sm line-clamp-3 leading-relaxed flex-1">{service.description}</p>

      <div className="mt-4 pt-4 border-t border-temple-border/60 grid grid-cols-2 gap-2 text-xs text-temple-muted mb-4">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-saffron-500" />
          {service.duration_minutes} minutes
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-saffron-500" />
          Max {service.capacity_per_slot} devotees
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-vermilion-700 font-bold text-xl">₹{service.price.toLocaleString('en-IN')}</div>
        <Link to={`/poojas/${service.slug}`} className="btn-primary text-sm py-2">
          Book Now <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
