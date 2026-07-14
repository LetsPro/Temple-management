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

          <section id="sadguru-profile" className="guru-profile">
            <div className="guru-profile-heading">
              <div className="guru-profile-photo"><img src="/sadguru-sri-satish-guruji.jpg" alt="Sadguru Sri Satish Guruji" /></div>
              <div><span>Leadership & spiritual guidance</span><h2>Profile of Sadguru Sri Satish Guruji</h2><p>Yoga, Tantra, Vedic wisdom and naturopathy in service of mankind.</p></div>
            </div>
            <div className="guru-profile-content">
              <p>Sadguru Sri Satish Guruji is well known in India. His father, Late Sri P. Sathya Seelan, was also a Sadguru.</p>
              <p>Yoga has been a family calling for the last 50 years, and the family has a large number of followers from India and several other countries. He started learning yoga from his father when he was five years old. A child prodigy, he became a Guru and began teaching yoga by the age of 16. From the age of seven, he also learned and acquired Tantric knowledge from his father and other Gurus. He has spent considerable time perfecting his knowledge of Tantra, Vedic Astrology, Astro-Yoga, Vasthu Shastra and Naturopathy. Sadguru is an exponent in various Astro-Yoga techniques, a renowned Yoga Master and consultant. He is also knowledgeable in Ayurvedic medicine and herbal remedies used for chronic ailments.</p>
              <p>He has travelled throughout India and visited many of its sacred places and temples. His proficiency across these sciences makes him one of the rare young Gurus of our times.</p>
              <p>By the age of 20, he was proclaimed a Sadguru and was revered by his family members and devotees. He has conducted Yoga Camps in several Indian states with established yoga centres, including Rajasthan, Karnataka, Andhra Pradesh and Maharashtra. Sadguru is an ardent devotee of Supreme Mother Sri Lalitha Tripura Sundari and constructed a temple in the name of the Holy Mother at Kuppam.</p>
              <p>He has been teaching and practising Astro-Yoga for the benefit of mankind. His knowledge of the therapeutic powers of yoga and naturopathy has been instrumental in helping thousands of people.</p>
              <p>At the Ashram in Kuppam, Sadguru has guided people seeking consultation on personal matters and challenges. Through “Brahmasthra Yogic Science and Sanjeevini Naturopathy,” he works to build awareness of yoga, naturopathy and their benefits.</p>
              <p>Sadguru believes that by controlling Prana—the breath—and choosing the right food, one can maintain a healthy body. His aim is to spread the message of good health through yogic practice, disciplined eating habits and naturopathy. With proper food and regular yoga, people can help control and prevent illnesses such as diabetes, stress, hypertension, asthma, arthritis, obesity and heart problems.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
