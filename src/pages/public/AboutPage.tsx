import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AboutPage() {
  const [settings, setSettings] = useState<{ temple_name: string; history_text: string; mission_text: string; about_image_url: string; tagline: string } | null>(null)

  useEffect(() => {
    supabase.from('temple_settings').select('temple_name, history_text, mission_text, about_image_url, tagline').maybeSingle().then(({ data }) => setSettings(data))
  }, [])

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#2d0a06] to-[#7a1e1e] py-20 text-center text-white">
        <div className="page-container">
          <div className="text-5xl mb-4">🛕</div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-3">Shri Tripura Sundari Lalithambe Trust</h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">{settings?.tagline || 'A sacred space for devotion, community and divine grace'}</p>
        </div>
      </div>

      <div className="page-container py-14">
        <div className="max-w-4xl mx-auto">
          {/* History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
            <div>
              <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Our Story</div>
              <h2 className="text-3xl font-bold font-serif text-temple-text mb-4">Temple History</h2>
              <p className="text-temple-muted leading-relaxed whitespace-pre-line">
                {settings?.history_text || 'Shri Tripura Sundari Lalithambe Trust is devoted to Maa Lalithambike and the timeless values of devotion, service and dharma. The trust brings devotees together through daily worship, sacred sevas, festivals and community service.'}
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden">
              {settings?.about_image_url ? (
                <img src={settings.about_image_url} alt="Temple" className="w-full h-72 object-cover" />
              ) : (
                <div className="w-full h-72 bg-gradient-to-br from-vermilion-50 to-saffron-50 flex items-center justify-center text-7xl rounded-3xl">🛕</div>
              )}
            </div>
          </div>

          {/* Mission */}
          <div className="bg-gradient-to-br from-cream-100 to-saffron-50 rounded-3xl p-8 mb-12">
            <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Our Purpose</div>
            <h2 className="text-3xl font-bold font-serif text-temple-text mb-4">Mission & Values</h2>
            <p className="text-temple-muted leading-relaxed">
              {settings?.mission_text || 'Our mission is to preserve ancient Hindu traditions and provide a welcoming spiritual home for all devotees. We are committed to performing daily rituals with sincerity, organizing festivals that bring the community together, and offering charitable services to those in need.'}
            </p>
          </div>

          {/* Values grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
            {[
              { icon: '🙏', title: 'Devotion', desc: 'Daily rituals conducted with utmost reverence, maintaining the sanctity of ancient traditions.' },
              { icon: '🤝', title: 'Community', desc: 'Building a strong, inclusive community where all devotees feel welcomed and supported.' },
              { icon: '🌟', title: 'Service', desc: 'Committed to social welfare through annadanam, education support and charitable activities.' },
            ].map(v => (
              <div key={v.title} className="card text-center">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="font-bold text-temple-text mb-2">{v.title}</h3>
                <p className="text-temple-muted text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>

          {/* Committee placeholder */}
          <div className="text-center">
            <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Leadership</div>
            <h2 className="text-2xl font-bold font-serif text-temple-text mb-6">Temple Committee</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Sri Ramanathan Iyer', role: 'President' },
                { name: 'Smt. Meenakshi Sharma', role: 'Secretary' },
                { name: 'Pandit Venkatesh', role: 'Head Priest' },
                { name: 'Sri Krishnamurthy', role: 'Treasurer' },
              ].map(p => (
                <div key={p.name} className="card text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-vermilion-100 to-saffron-100 flex items-center justify-center text-2xl mx-auto mb-3">👤</div>
                  <div className="font-semibold text-temple-text text-sm">{p.name}</div>
                  <div className="text-xs text-saffron-600 font-medium mt-0.5">{p.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
