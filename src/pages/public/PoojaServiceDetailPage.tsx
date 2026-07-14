import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Clock, Users, Calendar, ChevronLeft, Star, CheckCircle, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { Skeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'

type Service = Database['public']['Tables']['pooja_services']['Row']
type Slot = Database['public']['Tables']['pooja_service_slots']['Row']

export default function PoojaServiceDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [service, setService] = useState<Service | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('pooja_services').select('*').eq('slug', slug!).maybeSingle()
      if (!data) { navigate('/poojas'); return }
      setService(data)
      const { data: slotsData } = await supabase.from('pooja_service_slots').select('*').eq('service_id', data.id).eq('is_active', true)
      setSlots(slotsData || [])
      setLoading(false)
    }
    if (slug) load()
  }, [slug, navigate])

  if (loading) return (
    <div className="page-container py-10">
      <Skeleton className="h-5 w-40 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-72" />
      </div>
    </div>
  )

  if (!service) return null

  const handleBook = () => {
    if (!user) {
      navigate(`/login?redirect=/portal/book/${service.id}`)
    } else {
      navigate(`/portal/book/${service.id}`)
    }
  }

  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const availDays = (service.available_days as number[]) || [0, 1, 2, 3, 4, 5, 6]

  return (
    <div className="page-container py-10">
      <Link to="/poojas" className="inline-flex items-center gap-1.5 text-temple-muted hover:text-temple-text text-sm mb-6 group">
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Poojas & Sevas
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {service.image_url ? (
            <img src={service.image_url} alt={service.name} className="w-full h-72 object-cover rounded-3xl mb-6" />
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-cream-200 to-amber-100 rounded-3xl mb-6 flex items-center justify-center text-7xl">🪔</div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-saffron-600 bg-saffron-50 px-3 py-1 rounded-full">{service.category}</span>
            {service.is_featured && <span className="flex items-center gap-1 text-xs text-gold-600 bg-gold-50 px-2.5 py-1 rounded-full font-semibold"><Star size={11} className="fill-gold-500" /> Featured</span>}
          </div>

          <h1 className="text-3xl font-bold font-serif text-temple-text mb-4">{service.name}</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-cream-100 rounded-xl p-3 text-center">
              <Clock size={16} className="text-saffron-500 mx-auto mb-1" />
              <div className="font-bold text-temple-text text-sm">{service.duration_minutes} min</div>
              <div className="text-xs text-temple-muted">Duration</div>
            </div>
            <div className="bg-cream-100 rounded-xl p-3 text-center">
              <Users size={16} className="text-saffron-500 mx-auto mb-1" />
              <div className="font-bold text-temple-text text-sm">Max {service.capacity_per_slot}</div>
              <div className="text-xs text-temple-muted">Per Slot</div>
            </div>
            <div className="bg-cream-100 rounded-xl p-3 text-center">
              <Calendar size={16} className="text-saffron-500 mx-auto mb-1" />
              <div className="font-bold text-temple-text text-sm">{slots.length} Slots</div>
              <div className="text-xs text-temple-muted">Available</div>
            </div>
            <div className="bg-vermilion-50 rounded-xl p-3 text-center">
              <div className="font-bold text-vermilion-700 text-lg">₹{service.price.toLocaleString('en-IN')}</div>
              <div className="text-xs text-vermilion-600">Per Booking</div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-temple-text mb-6">
            <h3 className="font-bold text-lg mb-2">About this Seva</h3>
            <p className="text-temple-muted leading-relaxed">{service.description}</p>
          </div>

          {service.benefits && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-5">
              <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle size={16} /> Benefits
              </h4>
              <p className="text-green-700 text-sm leading-relaxed">{service.benefits}</p>
            </div>
          )}

          {service.instructions && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <Info size={16} /> Instructions for Devotees
              </h4>
              <p className="text-blue-700 text-sm leading-relaxed">{service.instructions}</p>
            </div>
          )}

          {/* Available days */}
          <div className="bg-white border border-temple-border rounded-2xl p-5">
            <h4 className="font-bold text-temple-text mb-3">Available Days</h4>
            <div className="flex gap-2 flex-wrap">
              {daysMap.map((day, i) => (
                <span key={day} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${availDays.includes(i) ? 'bg-saffron-50 text-saffron-700 border border-saffron-200' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card sticky top-20">
            <div className="text-center mb-5">
              <div className="text-3xl font-bold text-vermilion-700 mb-1">₹{service.price.toLocaleString('en-IN')}</div>
              <div className="text-temple-muted text-sm">per booking</div>
            </div>

            <button onClick={handleBook} className="btn-primary w-full justify-center py-3 text-base mb-3">
              Book Now <Calendar size={16} />
            </button>
            {!user && (
              <p className="text-center text-xs text-temple-muted">
                <Link to="/login" className="text-vermilion-600 font-medium">Sign in</Link> or <Link to="/register" className="text-vermilion-600 font-medium">register</Link> to book
              </p>
            )}

            <div className="border-t border-temple-border mt-4 pt-4 space-y-3 text-sm">
              <h5 className="font-semibold text-temple-text">Available Slots</h5>
              {slots.length === 0 ? (
                <p className="text-temple-muted">Contact temple for slot information</p>
              ) : (
                <div className="space-y-2">
                  {slots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between bg-cream-100 rounded-lg px-3 py-2">
                      <Clock size={13} className="text-saffron-500" />
                      <span className="font-medium text-temple-text">{slot.slot_time}</span>
                      <span className="text-xs text-temple-muted">Max {slot.max_capacity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-temple-border mt-4 pt-4 space-y-2 text-xs text-temple-muted">
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Instant booking confirmation</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Secure Razorpay payment</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500" /> Cancellation as per temple policy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
