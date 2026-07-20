import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('')

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })
  try {
    const { payment_type, reference_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()
    if (!['booking', 'donation', 'membership', 'event'].includes(payment_type) || !reference_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: 'Missing verification data' }, 400)

    const secret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!secret) return json({ error: 'Razorpay is not configured' }, 503)
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${razorpay_order_id}|${razorpay_payment_id}`)))
    if (expected !== razorpay_signature) return json({ error: 'Invalid payment signature' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: payment } = await admin.from('payments').select('id,amount,user_id').eq('reference_id', reference_id).eq('razorpay_order_id', razorpay_order_id).eq('payment_type', payment_type).single()
    if (!payment) return json({ error: 'Payment order not found' }, 404)

    const paidAt = new Date().toISOString()
    await admin.from('payments').update({ razorpay_payment_id, razorpay_signature, payment_status: 'paid', paid_at: paidAt }).eq('id', payment.id)
    if (payment_type === 'donation') {
      await admin.from('donations').update({ payment_status: 'paid' }).eq('id', reference_id)
    } else if (payment_type === 'membership') {
      const { data: membership } = await admin.from('memberships').select('plan_id').eq('id', reference_id).single()
      const { data: plan } = await admin.from('membership_plans').select('duration_months').eq('id', membership?.plan_id).single()
      const expires = new Date(); expires.setMonth(expires.getMonth() + Number(plan?.duration_months || 0))
      await admin.from('memberships').update({ payment_status: 'paid', status: 'active', starts_at: paidAt, expires_at: expires.toISOString() }).eq('id', reference_id)
    } else if (payment_type === 'event') {
      await admin.from('event_registrations').update({ payment_status: 'paid', status: 'registered', amount: payment.amount }).eq('id', reference_id)
    } else {
      const { data: booking } = await admin.from('bookings').update({ payment_status: 'paid', booking_status: 'confirmed' }).eq('id', reference_id).select('booking_number').single()
      return json({ verified: true, booking_number: booking?.booking_number })
    }
    return json({ verified: true })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
