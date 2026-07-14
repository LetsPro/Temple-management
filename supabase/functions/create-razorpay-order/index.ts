import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const { payment_type, reference_id } = await req.json()
    if (!['donation', 'membership'].includes(payment_type) || !reference_id) return json({ error: "Invalid payment reference" }, 400)

    const url = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const table = payment_type === 'donation' ? 'donations' : 'memberships'
    const fields = payment_type === 'donation' ? 'id,amount,donation_number,payment_status' : 'id,plan_id,devotee_id,membership_number,payment_status'
    const { data: record, error } = await admin.from(table).select(fields).eq('id', reference_id).single()
    if (error || !record) return json({ error: "Payment record not found" }, 404)

    let amount = Number((record as Record<string, unknown>).amount || 0)
    if (payment_type === 'membership') {
      const authHeader = req.headers.get('Authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      const { data: authData } = await admin.auth.getUser(token)
      if (!authData.user || authData.user.id !== (record as Record<string, unknown>).devotee_id) return json({ error: "Unauthorized" }, 401)
      const { data: plan } = await admin.from('membership_plans').select('amount').eq('id', (record as Record<string, unknown>).plan_id).single()
      amount = Number(plan?.amount || 0)
    }
    if (!amount) return json({ error: "Invalid amount" }, 400)

    const keyId = Deno.env.get("RAZORPAY_KEY_ID")
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")
    if (!keyId || !keySecret) return json({ error: "Razorpay is not configured" }, 503)

    const receipt = String((record as Record<string, unknown>).donation_number || (record as Record<string, unknown>).membership_number).slice(0, 40)
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${btoa(`${keyId}:${keySecret}`)}` },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt, notes: { payment_type, reference_id } }),
    })
    const order = await response.json()
    if (!response.ok) return json({ error: order.error?.description || "Order creation failed" }, 502)

    await admin.from('payments').insert({ payment_type, reference_id, user_id: (record as Record<string, unknown>).devotee_id || null, razorpay_order_id: order.id, razorpay_payment_id: '', razorpay_signature: '', amount, currency: 'INR', payment_status: 'created', paid_at: null })
    return json({ ...order, key_id: keyId })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
