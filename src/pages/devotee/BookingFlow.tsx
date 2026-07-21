import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, ArrowRight, ArrowLeft, CheckCircle, CreditCard, User, Plus, Minus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { payWithRazorpay } from '../../lib/razorpay'
import { format, addDays, isBefore, startOfDay } from 'date-fns'
import type { Database } from '../../lib/database.types'
import toast from 'react-hot-toast'
import { PurchaseConfirmation } from '../../components/purchases/PurchaseConfirmation'
import type { PurchaseConfirmationData } from '../../lib/confirmationImage'

type Service = Database['public']['Tables']['pooja_services']['Row']
type Slot = Database['public']['Tables']['pooja_service_slots']['Row']

interface Participant { name: string; gotram?: string; nakshatra?: string }

type Step = 'service' | 'date' | 'slot' | 'participants' | 'review' | 'payment' | 'success'

export default function BookingFlow() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [step, setStep] = useState<Step>(serviceId ? 'date' : 'service')
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotAvailability, setSlotAvailability] = useState<Record<string, number>>({})
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [participantCount, setParticipantCount] = useState(1)
  const [participants, setParticipants] = useState<Participant[]>([{ name: profile?.full_name || '' }])
  const [specialNotes, setSpecialNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [bookingResult, setBookingResult] = useState<PurchaseConfirmationData | null>(null)
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [guest, setGuest] = useState({ name: profile?.full_name || '', email: profile?.email || '', mobile: profile?.mobile || '' })

  useEffect(() => {
    if (!serviceId) {
      supabase.from('pooja_services').select('*').eq('is_active', true).order('display_order').then(({ data }) => setServices(data || []))
    }
  }, [serviceId])

  useEffect(() => {
    if (profile) setGuest({ name: profile.full_name, email: profile.email, mobile: profile.mobile })
  }, [profile])

  useEffect(() => {
    if (serviceId) {
      supabase.from('pooja_services').select('*').eq('id', serviceId).maybeSingle().then(({ data }) => {
        if (data) setSelectedService(data)
      })
    }
  }, [serviceId])

  useEffect(() => {
    if (selectedService) {
      supabase.from('pooja_service_slots').select('*').eq('service_id', selectedService.id).eq('is_active', true).then(({ data }) => setSlots(data || []))
      supabase.from('blocked_service_dates').select('blocked_date').eq('service_id', selectedService.id).then(({ data }) => setBlockedDates((data || []).map(d => d.blocked_date)))
    }
  }, [selectedService])

  useEffect(() => {
    if (selectedDate && selectedService && slots.length > 0) {
      const checks = slots.map(slot =>
        supabase.rpc('get_slot_bookings_count', {
          p_service_id: selectedService.id,
          p_slot_id: slot.id,
          p_booking_date: selectedDate,
        }).then(({ data }) => ({ slotId: slot.id, count: data as number }))
      )
      Promise.all(checks).then(results => {
        const avail: Record<string, number> = {}
        results.forEach(r => { avail[r.slotId] = r.count })
        setSlotAvailability(avail)
      })
    }
  }, [selectedDate, selectedService, slots])

  const isDateAvailable = (dateStr: string) => {
    if (blockedDates.includes(dateStr)) return false
    if (!selectedService) return true
    const dayOfWeek = new Date(dateStr).getDay()
    const availDays = (selectedService.available_days as number[]) || [0,1,2,3,4,5,6]
    return availDays.includes(dayOfWeek)
  }

  const dates = Array.from({ length: 30 }).map((_, i) => {
    const d = addDays(new Date(), i + 1)
    return format(d, 'yyyy-MM-dd')
  }).filter(isDateAvailable).slice(0, 14)

  useEffect(() => {
    setParticipants(Array.from({ length: participantCount }).map((_, i) => ({ name: i === 0 ? (profile?.full_name || '') : '' })))
  }, [participantCount, profile?.full_name])

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setStep('date')
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep('slot')
  }

  const handleSlotSelect = (slot: Slot) => {
    const booked = slotAvailability[slot.id] || 0
    if (booked >= slot.max_capacity) { toast.error('This slot is fully booked.'); return }
    setSelectedSlot(slot)
    setStep('participants')
  }

  const handleParticipantsNext = () => {
    if (!user && (!guest.name.trim() || !guest.email.includes('@') || guest.mobile.replace(/\D/g, '').length < 10)) {
      toast.error('Enter your name, email and valid mobile number for guest checkout.')
      return
    }
    if (participants.some(p => !p.name.trim())) { toast.error('Please enter all participant names.'); return }
    setStep('review')
  }

  const processBooking = async () => {
    if (!selectedService || !selectedSlot || !selectedDate) return
    if (!termsAccepted) return toast.error('Please read and accept the Terms and Payment Terms.')
    setSubmitting(true)

    try {
      // Double-check availability
      const { data: currentCount } = await supabase.rpc('get_slot_bookings_count', {
        p_service_id: selectedService.id,
        p_slot_id: selectedSlot.id,
        p_booking_date: selectedDate,
      })

      if ((currentCount as number) + participantCount > selectedSlot.max_capacity) {
        toast.error('Sorry, this slot is no longer available. Please choose another.')
        setStep('slot')
        setSubmitting(false)
        return
      }

      const bookingId = crypto.randomUUID()
      const bookingPayload = {
        id: bookingId,
        devotee_id: user?.id || null,
        guest_name: user ? '' : guest.name.trim(),
        guest_email: user ? '' : guest.email.trim(),
        guest_mobile: user ? '' : guest.mobile.trim(),
        service_id: selectedService.id,
        booking_date: selectedDate,
        slot_id: selectedSlot.id,
        slot_time: selectedSlot.slot_time,
        total_amount: selectedService.price,
        payment_status: 'pending',
        booking_status: 'pending',
        participant_count: participantCount,
        special_notes: specialNotes,
      }
      let bookingNumber = ''
      if (user) {
        const { data: booking, error: bookingErr } = await supabase.from('bookings').insert(bookingPayload).select('booking_number').single()
        if (bookingErr || !booking) throw new Error(bookingErr?.message || 'Booking failed')
        bookingNumber = booking.booking_number
      } else {
        const { error: bookingErr } = await supabase.from('bookings').insert(bookingPayload)
        if (bookingErr) throw new Error(bookingErr.message || 'Guest booking failed')
      }

      // Insert participants
      const { error: participantError } = await supabase.from('booking_participants').insert(
        participants.map(p => ({ booking_id: bookingId, name: p.name, gotram: p.gotram || '', nakshatra: p.nakshatra || '' }))
      )
      if (participantError) throw participantError

      const payer = user && profile ? { name: profile.full_name, email: profile.email, mobile: profile.mobile } : guest
      const payment = await payWithRazorpay({ paymentType: 'booking', referenceId: bookingId, title: 'Shri Tripura Sundari Lalithambe Trust', description: selectedService.name, prefill: { name: payer.name, email: payer.email, contact: payer.mobile } })
      setBookingResult({
        kind: 'booking',
        reference: payment.booking_number || bookingNumber || bookingId.slice(0, 8).toUpperCase(),
        title: `${selectedService.name} confirmed`,
        subtitle: 'Your sacred Pooja / Seva booking is confirmed. Please keep this ticket for your visit.',
        amount: Number(selectedService.price),
        email: payer.email,
        emailSent: payment.email_sent,
        details: [
          { label: 'Pooja / Seva', value: selectedService.name },
          { label: 'Date', value: format(new Date(`${selectedDate}T00:00:00`), 'dd MMMM yyyy') },
          { label: 'Time', value: selectedSlot.slot_time },
          { label: 'Participants', value: String(participantCount) },
          ...(specialNotes.trim() ? [{ label: 'Special request', value: specialNotes.trim() }] : []),
        ],
      })
      setStep('success')
    } catch (err: unknown) {
      const e = err as Error
      if (e.message !== 'cancelled') toast.error('Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const stepLabels: Record<Step, string> = {
    service: 'Select Service', date: 'Choose Date', slot: 'Choose Slot',
    participants: 'Participants', review: 'Review', payment: 'Payment', success: 'Confirmed',
  }

  const stepsOrder: Step[] = ['service', 'date', 'slot', 'participants', 'review', 'success']
  const currentStepIdx = stepsOrder.indexOf(step)

  if (step === 'success' && bookingResult) {
    return <div className="py-8 animate-fade-in"><PurchaseConfirmation data={bookingResult} onDone={() => navigate(user ? '/portal/bookings' : '/poojas')} doneLabel={user ? 'View Bookings' : 'Back to Sevas'} /></div>
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
        {stepsOrder.filter(s => s !== 'success').map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < currentStepIdx ? 'bg-green-500 border-green-500 text-white' : i === currentStepIdx ? 'bg-vermilion-700 border-vermilion-700 text-white' : 'bg-white border-temple-border text-temple-muted'}`}>
              {i < currentStepIdx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === currentStepIdx ? 'text-vermilion-700' : 'text-temple-muted'}`}>{stepLabels[s]}</span>
            {i < stepsOrder.filter(s => s !== 'success').length - 1 && <div className={`w-8 h-0.5 ${i < currentStepIdx ? 'bg-green-400' : 'bg-temple-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step: Service */}
      {step === 'service' && (
        <div>
          <h2 className="text-xl font-bold text-temple-text mb-4">Select a Pooja or Seva</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map(s => (
              <button key={s.id} onClick={() => handleServiceSelect(s)}
                className="card text-left hover:shadow-temple-md hover:border-saffron-300 transition-all group">
                <div className="font-bold text-temple-text group-hover:text-vermilion-700 transition-colors mb-1">{s.name}</div>
                <div className="text-xs text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded-full inline-block mb-2">{s.category}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-vermilion-700 font-bold">₹{s.price.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-temple-muted flex items-center gap-1"><Clock size={11} /> {s.duration_minutes} min</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Date */}
      {step === 'date' && selectedService && (
        <div>
          <button onClick={() => setStep(serviceId ? 'service' : 'service')} className="btn-ghost text-sm mb-4"><ArrowLeft size={14} /> Back</button>
          <h2 className="text-xl font-bold text-temple-text mb-1">Choose a Date</h2>
          <p className="text-temple-muted text-sm mb-5">Select a date for <strong>{selectedService.name}</strong></p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {dates.map(date => (
              <button key={date} onClick={() => handleDateSelect(date)}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${selectedDate === date ? 'border-vermilion-700 bg-vermilion-50' : 'border-temple-border hover:border-saffron-300 bg-white'}`}>
                <div className="font-bold text-vermilion-700">{format(new Date(date), 'dd')}</div>
                <div className="text-xs text-temple-muted">{format(new Date(date), 'EEE')}</div>
                <div className="text-xs text-temple-muted">{format(new Date(date), 'MMM')}</div>
              </button>
            ))}
          </div>
          {dates.length === 0 && <div className="text-temple-muted text-sm py-6 text-center">No available dates in the next 30 days.</div>}
        </div>
      )}

      {/* Step: Slot */}
      {step === 'slot' && (
        <div>
          <button onClick={() => setStep('date')} className="btn-ghost text-sm mb-4"><ArrowLeft size={14} /> Back</button>
          <h2 className="text-xl font-bold text-temple-text mb-1">Choose a Time Slot</h2>
          <p className="text-temple-muted text-sm mb-5">{selectedDate && format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}</p>
          {slots.length === 0 ? (
            <div className="text-temple-muted text-sm py-6 text-center">No slots available for this service.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slots.map(slot => {
                const booked = slotAvailability[slot.id] || 0
                const available = slot.max_capacity - booked
                const full = available <= 0
                return (
                  <button key={slot.id} onClick={() => handleSlotSelect(slot)} disabled={full}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${selectedSlot?.id === slot.id ? 'border-vermilion-700 bg-vermilion-50' : full ? 'border-temple-border bg-gray-50 opacity-50 cursor-not-allowed' : 'border-temple-border hover:border-saffron-300 bg-white'}`}>
                    <div className="font-bold text-temple-text text-lg">{slot.slot_time}</div>
                    <div className={`text-xs mt-1 font-medium ${full ? 'text-red-500' : available <= 2 ? 'text-amber-600' : 'text-green-600'}`}>
                      {full ? 'Full' : `${available} left`}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step: Participants */}
      {step === 'participants' && (
        <div>
          <button onClick={() => setStep('slot')} className="btn-ghost text-sm mb-4"><ArrowLeft size={14} /> Back</button>
          <h2 className="text-xl font-bold text-temple-text mb-1">Participant Details</h2>
          <p className="text-temple-muted text-sm mb-5">Enter details for all participants. Max {selectedSlot?.max_capacity || 10} per slot.</p>

          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-temple-text text-sm">Number of Participants</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setParticipantCount(Math.max(1, participantCount - 1))} className="w-8 h-8 rounded-full border border-temple-border flex items-center justify-center hover:bg-cream-100">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold">{participantCount}</span>
                <button onClick={() => setParticipantCount(Math.min(selectedSlot?.max_capacity || 10, participantCount + 1))} className="w-8 h-8 rounded-full border border-temple-border flex items-center justify-center hover:bg-cream-100">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {!user && <div className="card mb-4">
            <div className="font-semibold text-sm text-temple-text mb-3">Guest checkout details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label><span className="label text-xs">Full Name *</span><input className="input-field text-sm" value={guest.name} onChange={event => setGuest(current => ({ ...current, name: event.target.value }))} /></label>
              <label><span className="label text-xs">Mobile Number *</span><input className="input-field text-sm" value={guest.mobile} onChange={event => setGuest(current => ({ ...current, mobile: event.target.value }))} /></label>
              <label className="sm:col-span-2"><span className="label text-xs">Email Address *</span><input type="email" className="input-field text-sm" value={guest.email} onChange={event => setGuest(current => ({ ...current, email: event.target.value }))} /></label>
            </div>
            <p className="text-xs text-temple-muted mt-3">Your confirmation and payment receipt will use these details. No account is required.</p>
          </div>}

          <div className="space-y-4 mb-4">
            {participants.map((p, i) => (
              <div key={i} className="card space-y-3">
                <div className="font-semibold text-sm text-temple-text flex items-center gap-2">
                  <User size={14} className="text-saffron-500" /> Participant {i + 1}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Full Name *</label>
                    <input value={p.name} onChange={e => { const np = [...participants]; np[i] = { ...np[i], name: e.target.value }; setParticipants(np) }} className="input-field text-sm" placeholder="Name" />
                  </div>
                  <div>
                    <label className="label text-xs">Gotram</label>
                    <input value={p.gotram || ''} onChange={e => { const np = [...participants]; np[i] = { ...np[i], gotram: e.target.value }; setParticipants(np) }} className="input-field text-sm" placeholder="Gotram (optional)" />
                  </div>
                  <div>
                    <label className="label text-xs">Nakshatra</label>
                    <input value={p.nakshatra || ''} onChange={e => { const np = [...participants]; np[i] = { ...np[i], nakshatra: e.target.value }; setParticipants(np) }} className="input-field text-sm" placeholder="Nakshatra (optional)" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card mb-4">
            <label className="label">Special Notes / Wishes</label>
            <textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} rows={3} className="input-field resize-none text-sm" placeholder="Any specific prayers or wishes..." />
          </div>

          <button onClick={handleParticipantsNext} className="btn-primary w-full justify-center py-3">Continue to Review <ArrowRight size={16} /></button>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && selectedService && selectedSlot && (
        <div>
          <button onClick={() => setStep('participants')} className="btn-ghost text-sm mb-4"><ArrowLeft size={14} /> Back</button>
          <h2 className="text-xl font-bold text-temple-text mb-5">Review Booking</h2>

          <div className="card space-y-4 mb-6">
            <h4 className="font-bold text-temple-text border-b border-temple-border pb-2">Booking Summary</h4>
            {[
              ['Service', selectedService.name],
              ['Date', format(new Date(selectedDate), 'dd MMMM yyyy (EEEE)')],
              ['Time', selectedSlot.slot_time],
              ['Participants', `${participantCount} person(s)`],
              ['Amount', `₹${selectedService.price.toLocaleString('en-IN')}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-temple-muted">{l}</span>
                <span className="font-semibold text-temple-text">{v}</span>
              </div>
            ))}
            {specialNotes && (
              <div className="pt-2 border-t border-temple-border text-sm">
                <div className="text-temple-muted text-xs mb-1">Special Notes</div>
                <div className="text-temple-text">{specialNotes}</div>
              </div>
            )}
          </div>

          <div className="card mb-6">
            <h4 className="font-bold text-temple-text mb-3 text-sm">Participants</h4>
            <div className="space-y-1.5">
              {participants.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-saffron-50 flex items-center justify-center text-xs font-bold text-saffron-600 flex-shrink-0">{i+1}</div>
                  <span className="text-temple-text">{p.name}</span>
                  {p.gotram && <span className="text-temple-muted text-xs">({p.gotram})</span>}
                </div>
              ))}
            </div>
          </div>

          <label className="checkout-consent"><input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} /><span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/payment-terms" target="_blank" rel="noopener noreferrer">Payment Terms</a>.</span></label>

          <button onClick={processBooking} disabled={submitting || !termsAccepted} className="btn-primary w-full justify-center py-3 text-base">
            <CreditCard size={16} />
            {submitting ? 'Processing...' : `Confirm & Pay ₹${selectedService.price.toLocaleString('en-IN')}`}
          </button>
        </div>
      )}
    </div>
  )
}
