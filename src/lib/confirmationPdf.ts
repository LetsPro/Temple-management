export type TicketDetail = { label: string; value: string }

export type PurchaseConfirmationData = {
  kind: 'booking' | 'membership' | 'event' | 'donation'
  reference: string
  title: string
  subtitle: string
  amount?: number
  email?: string
  emailSent?: boolean
  details: TicketDetail[]
}

export type TicketTempleDetails = {
  templeName: string
  tagline?: string
  address?: string
  phone?: string
  email?: string
  footerNote?: string
}

const cleanPdfText = (value: string) => value
  .replace(/[₹]/g, 'INR ')
  .replace(/[–—]/g, '-')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[^\x20-\x7E]/g, '')

export async function createConfirmationPdf(data: PurchaseConfirmationData, temple: TicketTempleDetails) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const maroon = '#94161a'
  const gold = '#d99b32'
  const cream = '#fff8eb'
  const ink = '#3c2415'
  const muted = '#765e50'

  doc.setFillColor(cream)
  doc.rect(0, 0, width, height, 'F')
  doc.setFillColor(maroon)
  doc.rect(0, 0, width, 47, 'F')
  doc.setFillColor(gold)
  doc.rect(0, 47, width, 2.2, 'F')

  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  const templeLines = doc.splitTextToSize(cleanPdfText(temple.templeName), width - 24)
  doc.text(templeLines, width / 2, 17, { align: 'center' })
  if (temple.tagline) {
    doc.setTextColor('#ffe0a3')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(cleanPdfText(temple.tagline), width / 2, 31, { align: 'center', maxWidth: width - 24 })
  }
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(`${data.kind.toUpperCase()} CONFIRMATION TICKET`, width / 2, 41, { align: 'center' })

  doc.setFillColor('#ffffff')
  doc.setDrawColor('#ead5bb')
  doc.roundedRect(10, 58, width - 20, height - 76, 4, 4, 'FD')
  doc.setFillColor('#edf8ef')
  doc.setTextColor('#20703a')
  doc.roundedRect(width / 2 - 19, 64, 38, 8, 4, 4, 'F')
  doc.setFontSize(8)
  doc.text(data.kind === 'event' && data.amount === undefined ? 'REGISTRATION CONFIRMED' : 'PAYMENT CONFIRMED', width / 2, 69.4, { align: 'center' })

  doc.setTextColor(maroon)
  doc.setFontSize(16)
  doc.text(cleanPdfText(data.title), width / 2, 81, { align: 'center', maxWidth: width - 30 })
  doc.setTextColor(muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(cleanPdfText(data.subtitle), width / 2, 88, { align: 'center', maxWidth: width - 30 })

  doc.setDrawColor(gold)
  doc.setLineDashPattern([1.5, 1.5], 0)
  doc.line(16, 94, width - 16, 94)
  doc.setLineDashPattern([], 0)
  doc.setTextColor(muted)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('CONFIRMATION REFERENCE', width / 2, 101, { align: 'center' })
  doc.setTextColor(maroon)
  doc.setFontSize(14)
  doc.text(cleanPdfText(data.reference), width / 2, 109, { align: 'center' })

  let y = 120
  doc.setFontSize(8.5)
  data.details.forEach(detail => {
    const labelLines = doc.splitTextToSize(cleanPdfText(detail.label), width * .3)
    const valueLines = doc.splitTextToSize(cleanPdfText(detail.value), width * .48)
    const rowHeight = Math.max(labelLines.length, valueLines.length) * 4.2 + 5.8
    doc.setDrawColor('#f0e2d4')
    doc.line(17, y + rowHeight - 3, width - 17, y + rowHeight - 3)
    doc.setTextColor(muted)
    doc.setFont('helvetica', 'normal')
    doc.text(labelLines, 18, y)
    doc.setTextColor(ink)
    doc.setFont('helvetica', 'bold')
    doc.text(valueLines, width - 18, y, { align: 'right' })
    y += rowHeight
  })

  if (data.amount !== undefined) {
    doc.setFillColor('#fff1d4')
    doc.roundedRect(16, y + 1, width - 32, 13, 3, 3, 'F')
    doc.setTextColor(muted)
    doc.setFont('helvetica', 'bold')
    doc.text('AMOUNT PAID', 20, y + 9)
    doc.setTextColor(maroon)
    doc.setFontSize(11)
    doc.text(`INR ${data.amount.toLocaleString('en-IN')}`, width - 20, y + 9, { align: 'right' })
  }

  doc.setTextColor(maroon)
  doc.setFont('times', 'italic')
  doc.setFontSize(10)
  doc.text('May the Divine Mother bless you and your family.', width / 2, height - 24, { align: 'center' })
  doc.setTextColor(muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  const footer = [temple.address, [temple.phone, temple.email].filter(Boolean).join(' | '), temple.footerNote]
    .filter(Boolean).map(value => cleanPdfText(value!)).join('\n')
  doc.text(footer, width / 2, height - 16, { align: 'center', maxWidth: width - 24 })
  return doc
}

export async function downloadConfirmationPdf(data: PurchaseConfirmationData, temple: TicketTempleDetails) {
  const doc = await createConfirmationPdf(data, temple)
  const safeReference = data.reference.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
  doc.save(`${data.kind}-${safeReference}.pdf`)
}
