import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { sendConfirmationEmail } from "../_shared/confirmation-email.ts"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const { confirmation_type, reference_id } = await req.json()
    if (confirmation_type !== 'event' || !reference_id) return json({ error: 'Invalid confirmation request' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: registration } = await admin
      .from('event_registrations')
      .select('devotee_id,status,payment_status')
      .eq('id', reference_id)
      .single()
    if (!registration) return json({ error: 'Event registration not found' }, 404)
    if (registration.status !== 'registered' || !['paid', 'not_required'].includes(registration.payment_status)) {
      return json({ error: 'Event registration is not confirmed' }, 409)
    }

    if (registration.devotee_id) {
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
      const { data: authData } = await admin.auth.getUser(token)
      if (!authData.user || authData.user.id !== registration.devotee_id) return json({ error: 'Unauthorized' }, 401)
    }

    const result = await sendConfirmationEmail(admin, 'event', reference_id)
    return json({ sent: result.sent, already_sent: result.alreadySent })
  } catch (error) {
    console.error('Confirmation email failed', error)
    return json({ error: (error as Error).message }, 500)
  }
})

