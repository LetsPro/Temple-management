import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().optional(),
  subject: z.string().min(3, 'Subject required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})
type FormData = z.infer<typeof schema>

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const { error } = await supabase.from('contact_messages').insert(data)
    setSubmitting(false)
    if (error) { toast.error('Failed to send message. Please try again.'); return }
    setSent(true)
    reset()
  }

  return (
    <div className="page-container py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-saffron-500 font-semibold text-sm uppercase tracking-wide mb-2">Get in Touch</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-temple-text mb-3 font-serif">Contact Us</h1>
        <p className="text-temple-muted">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact info */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-saffron-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-saffron-500" />
              </div>
              <div>
                <h4 className="font-semibold text-temple-text mb-1">Address</h4>
                <p className="text-temple-muted text-sm leading-relaxed">12, Temple Street, Mylapore<br />Chennai – 600004, Tamil Nadu</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-saffron-50 flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-saffron-500" />
              </div>
              <div>
                <h4 className="font-semibold text-temple-text mb-1">Phone</h4>
                <a href="tel:+914423456789" className="text-vermilion-600 text-sm font-medium">+91 44 2345 6789</a>
                <p className="text-temple-muted text-xs mt-0.5">Mon – Sat, 9 AM – 5 PM</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-saffron-50 flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-saffron-500" />
              </div>
              <div>
                <h4 className="font-semibold text-temple-text mb-1">Email</h4>
                <a href="mailto:info@srimahalakshmi.org" className="text-vermilion-600 text-sm font-medium">info@srimahalakshmi.org</a>
                <p className="text-temple-muted text-xs mt-0.5">Responses within 24 hours</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-saffron-50 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-saffron-500" />
              </div>
              <div>
                <h4 className="font-semibold text-temple-text mb-2">Temple Timings</h4>
                <div className="space-y-1 text-xs text-temple-muted">
                  <div className="flex justify-between gap-4"><span>Mon – Fri:</span><span>6:00 – 12:30 / 16:00 – 20:30</span></div>
                  <div className="flex justify-between gap-4"><span>Sat – Sun:</span><span>5:30 – 13:00 / 16:00 – 21:00</span></div>
                  <div className="flex justify-between gap-4"><span>Holidays:</span><span>5:00 – 13:30 / 15:30 – 21:30</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div className="lg:col-span-2">
          <div className="card">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-temple-text mb-2">Message Sent!</h3>
                <p className="text-temple-muted mb-4">Thank you for reaching out. We'll get back to you within 24 hours. 🙏</p>
                <button onClick={() => setSent(false)} className="btn-secondary">Send Another Message</button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-temple-text text-lg mb-5">Send Us a Message</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Full Name *</label>
                      <input {...register('name')} className="input-field" placeholder="Your name" />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="label">Email *</label>
                      <input {...register('email')} type="email" className="input-field" placeholder="your@email.com" />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Mobile</label>
                      <input {...register('mobile')} type="tel" className="input-field" placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <label className="label">Subject *</label>
                      <input {...register('subject')} className="input-field" placeholder="How can we help?" />
                      {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Message *</label>
                    <textarea {...register('message')} rows={5} className="input-field resize-none" placeholder="Your message..." />
                    {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    <Send size={15} /> {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
