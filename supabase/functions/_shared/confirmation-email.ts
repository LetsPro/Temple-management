import type { SupabaseClient } from "npm:@supabase/supabase-js@2"

export type ConfirmationType = 'booking' | 'membership' | 'event'

type EmailRow = { label: string; value: string }
type ConfirmationContent = {
  recipient: string
  devoteeName: string
  subject: string
  eyebrow: string
  heading: string
  intro: string
  referenceLabel: string
  referenceValue: string
  rows: EmailRow[]
  note?: string
  listTitle?: string
  listItems?: string[]
}

type TempleSettings = {
  temple_name?: string | null
  tagline?: string | null
  logo_url?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
}

const IST_TIME_ZONE = 'Asia/Kolkata'

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const related = (record: Record<string, unknown>, key: string) => {
  const value = record[key]
  return asRecord(Array.isArray(value) ? value[0] : value)
}

const textValue = (value: unknown, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

const escapeHtml = (value: unknown) => textValue(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const formatCurrency = (value: unknown) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value || 0))

const formatDate = (value: unknown, includeTime = false) => {
  if (!value) return '—'
  const raw = String(value)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00+05:30`)
    : new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  }).format(date)
}

const cleanList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map(item => textValue(item).trim()).filter(Boolean)
}

async function getProfile(admin: SupabaseClient, devoteeId: unknown) {
  if (!devoteeId) return {}
  const { data } = await admin
    .from('profiles')
    .select('full_name,email,mobile')
    .eq('id', String(devoteeId))
    .maybeSingle()
  return asRecord(data)
}

async function buildBookingContent(admin: SupabaseClient, referenceId: string): Promise<ConfirmationContent> {
  const { data, error } = await admin
    .from('bookings')
    .select('booking_number,devotee_id,guest_name,guest_email,guest_mobile,booking_date,slot_time,total_amount,payment_status,booking_status,participant_count,special_notes,pooja_services(name,category,instructions),booking_participants(name,gotram,nakshatra,rashi)')
    .eq('id', referenceId)
    .single()
  if (error || !data) throw new Error('Booking details were not found.')

  const booking = asRecord(data)
  if (booking.payment_status !== 'paid' || booking.booking_status !== 'confirmed') {
    throw new Error('The booking is not confirmed yet.')
  }
  const profile = await getProfile(admin, booking.devotee_id)
  const service = related(booking, 'pooja_services')
  const participants = Array.isArray(booking.booking_participants)
    ? booking.booking_participants.map(item => asRecord(item))
    : []
  const participantNames = participants.map(participant => {
    const spiritualDetails = [participant.gotram, participant.nakshatra, participant.rashi]
      .map(value => textValue(value).trim()).filter(Boolean).join(' · ')
    return `${textValue(participant.name, 'Devotee')}${spiritualDetails ? ` — ${spiritualDetails}` : ''}`
  })

  const recipient = textValue(profile.email || booking.guest_email).trim()
  if (!recipient) throw new Error('No recipient email is available for this booking.')
  const serviceName = textValue(service.name, 'Pooja / Seva')
  const bookingNumber = textValue(booking.booking_number, referenceId.slice(0, 8).toUpperCase())

  return {
    recipient,
    devoteeName: textValue(profile.full_name || booking.guest_name, 'Devotee'),
    subject: `${serviceName} booking confirmed · ${bookingNumber}`,
    eyebrow: 'Pooja / Seva Confirmation',
    heading: 'Your sacred seva is confirmed',
    intro: `We have received your offering and confirmed your booking for ${serviceName}. Please keep these details for your visit.`,
    referenceLabel: 'Booking number',
    referenceValue: bookingNumber,
    rows: [
      { label: 'Pooja / Seva', value: serviceName },
      ...(service.category ? [{ label: 'Category', value: textValue(service.category) }] : []),
      { label: 'Date', value: formatDate(booking.booking_date) },
      { label: 'Time', value: textValue(booking.slot_time, 'As scheduled') },
      { label: 'Participants', value: textValue(booking.participant_count, '1') },
      { label: 'Amount paid', value: formatCurrency(booking.total_amount) },
      ...(booking.special_notes ? [{ label: 'Special request', value: textValue(booking.special_notes) }] : []),
    ],
    note: textValue(service.instructions || booking.special_notes),
    listTitle: participantNames.length ? 'Devotee details' : undefined,
    listItems: participantNames,
  }
}

async function buildMembershipContent(admin: SupabaseClient, referenceId: string): Promise<ConfirmationContent> {
  const { data, error } = await admin
    .from('memberships')
    .select('membership_number,devotee_id,full_name,mobile,status,payment_status,starts_at,expires_at,membership_plans(name,amount,duration_months,benefits)')
    .eq('id', referenceId)
    .single()
  if (error || !data) throw new Error('Membership details were not found.')

  const membership = asRecord(data)
  if (membership.payment_status !== 'paid' || membership.status !== 'active') {
    throw new Error('The membership is not active yet.')
  }
  const profile = await getProfile(admin, membership.devotee_id)
  const plan = related(membership, 'membership_plans')
  const recipient = textValue(profile.email).trim()
  if (!recipient) throw new Error('No recipient email is available for this membership.')
  const planName = textValue(plan.name, 'Temple Membership')
  const membershipNumber = textValue(membership.membership_number, referenceId.slice(0, 8).toUpperCase())

  return {
    recipient,
    devoteeName: textValue(membership.full_name || profile.full_name, 'Devotee'),
    subject: `${planName} membership activated · ${membershipNumber}`,
    eyebrow: 'Membership Confirmation',
    heading: 'Welcome to our temple family',
    intro: `Your ${planName} membership is now active. We are grateful to have you participate more deeply in the Trust's sevas and community.`,
    referenceLabel: 'Membership number',
    referenceValue: membershipNumber,
    rows: [
      { label: 'Membership plan', value: planName },
      { label: 'Member name', value: textValue(membership.full_name) },
      { label: 'Duration', value: `${textValue(plan.duration_months, '—')} months` },
      { label: 'Starts on', value: formatDate(membership.starts_at) },
      { label: 'Valid until', value: formatDate(membership.expires_at) },
      { label: 'Amount paid', value: formatCurrency(plan.amount) },
    ],
    listTitle: 'Membership benefits',
    listItems: cleanList(plan.benefits),
  }
}

async function buildEventContent(admin: SupabaseClient, referenceId: string): Promise<ConfirmationContent> {
  const { data, error } = await admin
    .from('event_registrations')
    .select('id,event_id,devotee_id,guest_name,guest_email,guest_mobile,event_plan_id,participant_count,notes,amount,payment_status,status,events(title,description,start_datetime,end_datetime,venue),event_plans(name,price)')
    .eq('id', referenceId)
    .single()
  if (error || !data) throw new Error('Event registration details were not found.')

  const registration = asRecord(data)
  if (registration.status !== 'registered' || !['paid', 'not_required'].includes(textValue(registration.payment_status))) {
    throw new Error('The event registration is not confirmed yet.')
  }
  const profile = await getProfile(admin, registration.devotee_id)
  const event = related(registration, 'events')
  const plan = related(registration, 'event_plans')
  const recipient = textValue(profile.email || registration.guest_email).trim()
  if (!recipient) throw new Error('No recipient email is available for this event registration.')
  const eventTitle = textValue(event.title, 'Temple Event')
  const registrationNumber = `EVT-${referenceId.slice(0, 8).toUpperCase()}`
  const isFree = registration.payment_status === 'not_required'

  return {
    recipient,
    devoteeName: textValue(profile.full_name || registration.guest_name, 'Devotee'),
    subject: `${eventTitle} registration confirmed · ${registrationNumber}`,
    eyebrow: 'Event Registration Confirmation',
    heading: 'Your place is confirmed',
    intro: `You are registered for ${eventTitle}. We look forward to welcoming you for this auspicious gathering.`,
    referenceLabel: 'Registration number',
    referenceValue: registrationNumber,
    rows: [
      { label: 'Event', value: eventTitle },
      ...(plan.name ? [{ label: 'Pass / Plan', value: textValue(plan.name) }] : []),
      { label: 'Begins', value: formatDate(event.start_datetime, true) },
      { label: 'Ends', value: formatDate(event.end_datetime, true) },
      { label: 'Venue', value: textValue(event.venue, 'Temple premises') },
      { label: 'Participants', value: textValue(registration.participant_count, '1') },
      { label: isFree ? 'Entry' : 'Amount paid', value: isFree ? 'Free' : formatCurrency(registration.amount) },
      ...(registration.notes ? [{ label: 'Registration note', value: textValue(registration.notes) }] : []),
    ],
    note: textValue(event.description),
  }
}

async function buildContent(admin: SupabaseClient, type: ConfirmationType, referenceId: string) {
  if (type === 'booking') return buildBookingContent(admin, referenceId)
  if (type === 'membership') return buildMembershipContent(admin, referenceId)
  return buildEventContent(admin, referenceId)
}

function renderHtml(content: ConfirmationContent, settings: TempleSettings, siteUrl?: string) {
  const templeName = textValue(settings.temple_name, 'Shri Tripura Sundari Lalithambe Trust')
  const contact = [settings.phone, settings.email].map(value => textValue(value).trim()).filter(Boolean).join(' · ')
  const logoUrl = /^https:\/\//i.test(textValue(settings.logo_url)) ? textValue(settings.logo_url) : ''
  const safeSiteUrl = /^https:\/\//i.test(textValue(siteUrl)) ? textValue(siteUrl) : ''
  const rows = content.rows.map(row => `
    <tr>
      <td style="padding:11px 0;color:#765e50;font-size:14px;border-bottom:1px solid #f0e2d4;width:42%;vertical-align:top;">${escapeHtml(row.label)}</td>
      <td style="padding:11px 0;color:#3c2415;font-size:14px;font-weight:700;text-align:right;border-bottom:1px solid #f0e2d4;vertical-align:top;">${escapeHtml(row.value)}</td>
    </tr>`).join('')
  const list = content.listItems?.length ? `
    <div style="margin-top:24px;padding:20px 22px;border:1px solid #ead5bb;border-radius:14px;background:#fff9ef;">
      <div style="margin-bottom:10px;color:#971417;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(content.listTitle || 'Details')}</div>
      <ul style="padding-left:20px;margin:0;color:#5f493d;font-size:14px;line-height:1.7;">${content.listItems.map(item => `<li style="margin:4px 0;">${escapeHtml(item)}</li>`).join('')}</ul>
    </div>` : ''
  const note = content.note ? `
    <div style="margin-top:24px;padding:18px 20px;border-left:4px solid #e76f24;border-radius:4px 12px 12px 4px;background:#fff4e6;color:#5f493d;font-size:14px;line-height:1.65;">
      <strong style="display:block;margin-bottom:5px;color:#8f1315;">Please note</strong>${escapeHtml(content.note)}
    </div>` : ''
  const button = safeSiteUrl ? `<div style="text-align:center;margin-top:30px;"><a href="${escapeHtml(safeSiteUrl)}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#a80e16;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">Visit temple website</a></div>` : ''

  return `<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.subject)}</title></head>
  <body style="margin:0;padding:0;background:#f6eee4;font-family:'Helvetica Neue',Arial,sans-serif;color:#3c2415;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.intro)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6eee4;"><tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;overflow:hidden;border-radius:20px;background:#ffffff;box-shadow:0 12px 35px rgba(92,51,31,.12);">
        <tr><td style="padding:26px 32px;text-align:center;background:linear-gradient(135deg,#8c060b,#b90b10);border-bottom:5px solid #e3a83f;">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(templeName)}" width="170" style="display:block;max-width:170px;height:auto;margin:0 auto 14px;border-radius:8px;background:#ffffff;">` : `<div style="font-family:Georgia,serif;font-size:30px;color:#ffd275;margin-bottom:8px;">ॐ</div>`}
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.2;color:#ffffff;font-weight:700;">${escapeHtml(templeName)}</div>
          ${settings.tagline ? `<div style="margin-top:6px;color:#ffdca1;font-size:12px;letter-spacing:.04em;">${escapeHtml(settings.tagline)}</div>` : ''}
        </td></tr>
        <tr><td style="padding:38px 38px 34px;">
          <div style="color:#d15b0f;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;">${escapeHtml(content.eyebrow)}</div>
          <h1 style="margin:9px 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.14;color:#8f1315;">${escapeHtml(content.heading)}</h1>
          <p style="margin:0 0 24px;color:#665248;font-size:15px;line-height:1.7;">Namaste ${escapeHtml(content.devoteeName)},<br>${escapeHtml(content.intro)}</p>
          <div style="padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,#fff7e8,#ffebc6);border:1px solid #eed2a6;text-align:center;">
            <div style="color:#826658;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;">${escapeHtml(content.referenceLabel)}</div>
            <div style="margin-top:6px;color:#971417;font-size:22px;font-weight:800;letter-spacing:.04em;">${escapeHtml(content.referenceValue)}</div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:collapse;">${rows}</table>
          ${list}${note}${button}
          <p style="margin:30px 0 0;text-align:center;color:#8f1315;font-family:Georgia,'Times New Roman',serif;font-size:17px;">May the Divine Mother bless you and your family. 🙏</p>
        </td></tr>
        <tr><td style="padding:22px 30px;text-align:center;background:#fff8ed;border-top:1px solid #eadbc9;color:#765e50;font-size:12px;line-height:1.6;">
          ${settings.address ? `<div>${escapeHtml(settings.address)}</div>` : ''}
          ${contact ? `<div>${escapeHtml(contact)}</div>` : ''}
          <div style="margin-top:8px;color:#9d1515;">This is an automated confirmation for your temple transaction.</div>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
}

function renderText(content: ConfirmationContent, settings: TempleSettings) {
  const lines = [
    textValue(settings.temple_name, 'Shri Tripura Sundari Lalithambe Trust'),
    '',
    content.heading,
    `Namaste ${content.devoteeName},`,
    content.intro,
    '',
    `${content.referenceLabel}: ${content.referenceValue}`,
    ...content.rows.map(row => `${row.label}: ${row.value}`),
  ]
  if (content.listItems?.length) lines.push('', `${content.listTitle || 'Details'}:`, ...content.listItems.map(item => `- ${item}`))
  if (content.note) lines.push('', `Please note: ${content.note}`)
  lines.push('', 'May the Divine Mother bless you and your family.', '', textValue(settings.address), textValue(settings.phone), textValue(settings.email))
  return lines.filter((line, index) => line || lines[index - 1] !== '').join('\n').trim()
}

async function markDelivery(admin: SupabaseClient, type: ConfirmationType, referenceId: string, recipient: string) {
  const now = new Date().toISOString()
  const { error } = await admin.from('confirmation_emails').insert({
    confirmation_type: type,
    reference_id: referenceId,
    recipient_email: recipient,
    status: 'sending',
    updated_at: now,
  })
  if (!error) return { shouldSend: true }
  if (error.code !== '23505') throw new Error(`Could not track confirmation email: ${error.message}`)

  const { data: existing, error: existingError } = await admin
    .from('confirmation_emails')
    .select('status,updated_at,provider_message_id')
    .eq('confirmation_type', type)
    .eq('reference_id', referenceId)
    .single()
  if (existingError || !existing) throw new Error('Could not check confirmation email status.')
  if (existing.status === 'sent') return { shouldSend: false, emailId: existing.provider_message_id as string | null }

  const isRecentAttempt = existing.status === 'sending' && Date.now() - new Date(existing.updated_at).getTime() < 5 * 60 * 1000
  if (isRecentAttempt) return { shouldSend: false }

  const { error: retryError } = await admin.from('confirmation_emails').update({
    recipient_email: recipient,
    status: 'sending',
    error_message: null,
    updated_at: now,
  }).eq('confirmation_type', type).eq('reference_id', referenceId)
  if (retryError) throw new Error(`Could not retry confirmation email: ${retryError.message}`)
  return { shouldSend: true }
}

export async function sendConfirmationEmail(admin: SupabaseClient, type: ConfirmationType, referenceId: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!resendApiKey || !from) throw new Error('Confirmation email service is not configured.')

  const { data: rawSettings } = await admin.from('temple_settings').select('temple_name,tagline,logo_url,address,phone,email').limit(1).maybeSingle()
  const settings = asRecord(rawSettings) as TempleSettings
  const content = await buildContent(admin, type, referenceId)
  const delivery = await markDelivery(admin, type, referenceId, content.recipient)
  if (!delivery.shouldSend) return { sent: false, alreadySent: true, emailId: delivery.emailId || null }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `temple-${type}-${referenceId}`,
        'User-Agent': 'temple-management-confirmations/1.0',
      },
      body: JSON.stringify({
        from,
        to: [content.recipient],
        subject: content.subject,
        html: renderHtml(content, settings, Deno.env.get('PUBLIC_SITE_URL')),
        text: renderText(content, settings),
        ...(settings.email ? { reply_to: settings.email } : {}),
        tags: [
          { name: 'confirmation_type', value: type },
          { name: 'reference_id', value: referenceId },
        ],
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.message || result?.error?.message || 'Email provider rejected the message.')

    await admin.from('confirmation_emails').update({
      status: 'sent',
      provider_message_id: result.id || null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    }).eq('confirmation_type', type).eq('reference_id', referenceId)
    return { sent: true, alreadySent: false, emailId: result.id || null }
  } catch (error) {
    await admin.from('confirmation_emails').update({
      status: 'failed',
      error_message: (error as Error).message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq('confirmation_type', type).eq('reference_id', referenceId)
    throw error
  }
}
