import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, MailCheck, Printer, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { downloadConfirmationImage, type PurchaseConfirmationData, type TicketTempleDetails } from '../../lib/confirmationImage'
import { formatCurrency } from '../../lib/currency'
import toast from 'react-hot-toast'

const defaultTemple: TicketTempleDetails = { templeName: 'Shri Tripura Sundari Lalithambe Trust' }

export function PurchaseConfirmation({ data, onDone, doneLabel = 'Done' }: { data: PurchaseConfirmationData; onDone?: () => void; doneLabel?: string }) {
  const [temple, setTemple] = useState<TicketTempleDetails>(defaultTemple)
  const [downloading, setDownloading] = useState(false)
  const [settingsReady, setSettingsReady] = useState(false)
  const autoDownloaded = useRef(false)

  useEffect(() => {
    const loadSettings = async () => {
      const { data: settings } = await supabase.from('temple_settings').select('temple_name,tagline,address,phone,email,receipt_footer_note').limit(1).maybeSingle()
      if (settings) setTemple({ templeName: settings.temple_name || defaultTemple.templeName, tagline: settings.tagline, address: settings.address, phone: settings.phone, email: settings.email, footerNote: settings.receipt_footer_note })
      setSettingsReady(true)
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (!settingsReady || autoDownloaded.current) return
    autoDownloaded.current = true
    downloadConfirmationImage(data, temple).catch(() => toast.error('Automatic ticket download was blocked. Use Download Ticket below.'))
  }, [data, settingsReady, temple])

  const download = async () => {
    setDownloading(true)
    try { await downloadConfirmationImage(data, temple) }
    catch { toast.error('Could not create the ticket image. Please try again.') }
    finally { setDownloading(false) }
  }

  return <section className="purchase-confirmation" aria-label={`${data.kind} confirmation`}>
    <div className="purchase-ticket">
      <div className="purchase-ticket-head">
        <div className="purchase-ticket-mark">ॐ</div>
        <strong>{temple.templeName}</strong>
        {temple.tagline && <span>{temple.tagline}</span>}
      </div>
      <div className="purchase-ticket-body">
        <div className="purchase-confirmed"><CheckCircle2 /> {data.kind === 'event' && data.amount === undefined ? 'Registration confirmed' : 'Payment confirmed'}</div>
        <p className="purchase-eyebrow">{data.kind} confirmation ticket</p>
        <h2>{data.title}</h2>
        <p>{data.subtitle}</p>
        <div className="purchase-reference"><small>Confirmation reference</small><strong>{data.reference}</strong></div>
        <dl>{data.details.map(detail => <div key={`${detail.label}-${detail.value}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
        {data.amount !== undefined && <div className="purchase-total"><span>Amount paid</span><strong>{formatCurrency(data.amount, data.currency)}</strong></div>}
        <div className={`purchase-email-status ${data.emailSent ? 'sent' : ''}`}>
          <MailCheck />
          <span>{data.emailSent ? `Confirmation email sent${data.email ? ` to ${data.email}` : ''}.` : data.email ? 'Payment is confirmed. Email delivery may take a few minutes.' : 'No email address was provided. Download this ticket for your records.'}</span>
        </div>
        <p className="purchase-blessing">May the Divine Mother bless you and your family.</p>
      </div>
      <div className="purchase-ticket-foot">{temple.address && <span>{temple.address}</span>}<span>{[temple.phone, temple.email].filter(Boolean).join(' · ')}</span></div>
    </div>
    <div className="purchase-actions no-print">
      <button type="button" className="btn-secondary" onClick={download} disabled={downloading}><Download size={17} /> {downloading ? 'Preparing ticket...' : 'Download Ticket'}</button>
      <button type="button" className="btn-secondary" onClick={() => window.print()}><Printer size={17} /> Print</button>
      {onDone && <button type="button" className="btn-primary" onClick={onDone}>{doneLabel}</button>}
    </div>
  </section>
}

export function PurchaseConfirmationModal({ data, onClose, doneLabel }: { data: PurchaseConfirmationData; onClose: () => void; doneLabel?: string }) {
  return <div className="payment-modal purchase-confirmation-modal" role="dialog" aria-modal="true" aria-label="Purchase confirmed">
    <div className="payment-modal-card">
      <button type="button" className="purchase-close no-print" onClick={onClose} aria-label="Close confirmation"><X /></button>
      <PurchaseConfirmation data={data} onDone={onClose} doneLabel={doneLabel} />
    </div>
  </div>
}
