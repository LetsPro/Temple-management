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

const PAGE_WIDTH = 420
const PAGE_HEIGHT = 595

const pdfEscape = (value: string) => cleanPdfText(value).replace(/([\\()])/g, '\\$1')
const rgb = (hex: string) => {
  const value = hex.replace('#', '')
  return [0, 2, 4].map(index => (parseInt(value.slice(index, index + 2), 16) / 255).toFixed(3)).join(' ')
}
const textWidth = (value: string, size: number, bold = false) => cleanPdfText(value).length * size * (bold ? .56 : .51)
const wrapText = (value: string, size: number, maxWidth: number, bold = false) => {
  const words = cleanPdfText(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word
    if (line && textWidth(candidate, size, bold) > maxWidth) { lines.push(line); line = word }
    else line = candidate
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function buildPdfDocument(content: string, title: string) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>',
    `<< /Title (${pdfEscape(title)}) /Creator (Shri Lalithambe Trust website) >>`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 8 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

export async function createConfirmationPdf(data: PurchaseConfirmationData, temple: TicketTempleDetails) {
  const maroon = '#94161a'; const gold = '#d99b32'; const cream = '#fff8eb'
  const ink = '#3c2415'; const muted = '#765e50'; const lines: string[] = []
  const fillRect = (x: number, y: number, width: number, height: number, color: string) => lines.push(`${rgb(color)} rg ${x} ${y} ${width} ${height} re f`)
  const strokeLine = (x1: number, y1: number, x2: number, y2: number, color: string, dashed = false) => lines.push(`${rgb(color)} RG 0.7 w ${dashed ? '[4 3] 0 d' : '[] 0 d'} ${x1} ${y1} m ${x2} ${y2} l S`)
  const text = (value: string, x: number, y: number, size: number, color: string, font: 'F1' | 'F2' | 'F3' = 'F1', align: 'left' | 'center' | 'right' = 'left') => {
    const clean = cleanPdfText(value)
    const width = textWidth(clean, size, font === 'F2')
    const position = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x
    lines.push(`BT /${font} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${position.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(clean)}) Tj ET`)
  }
  const centeredLines = (value: string, y: number, size: number, color: string, maxWidth: number, font: 'F1' | 'F2' | 'F3' = 'F1', leading = size * 1.25) => {
    wrapText(value, size, maxWidth, font === 'F2').slice(0, 2).forEach((line, index) => text(line, PAGE_WIDTH / 2, y - index * leading, size, color, font, 'center'))
  }

  fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, cream)
  fillRect(0, 463, PAGE_WIDTH, 132, maroon)
  fillRect(0, 456, PAGE_WIDTH, 7, gold)
  centeredLines(temple.templeName, 555, 16, '#ffffff', 350, 'F2', 19)
  if (temple.tagline) centeredLines(temple.tagline, 516, 8, '#ffe0a3', 340)
  text(`${data.kind.toUpperCase()} CONFIRMATION TICKET`, PAGE_WIDTH / 2, 484, 8.5, '#ffffff', 'F2', 'center')

  fillRect(28, 55, 364, 375, '#ffffff')
  lines.push(`${rgb('#ead5bb')} RG 0.8 w 28 55 364 375 re S`)
  fillRect(150, 400, 120, 25, '#edf8ef')
  text(data.kind === 'event' && data.amount === undefined ? 'REGISTRATION CONFIRMED' : 'PAYMENT CONFIRMED', PAGE_WIDTH / 2, 409, 8, '#20703a', 'F2', 'center')
  centeredLines(data.title, 379, 16, maroon, 330, 'F2', 18)
  centeredLines(data.subtitle, 348, 8.5, muted, 326, 'F1', 11)
  strokeLine(48, 326, 372, 326, gold, true)
  text('CONFIRMATION REFERENCE', PAGE_WIDTH / 2, 310, 7, muted, 'F2', 'center')
  text(data.reference, PAGE_WIDTH / 2, 291, 14, maroon, 'F2', 'center')

  let y = 265
  data.details.slice(0, 6).forEach(detail => {
    const valueLines = wrapText(detail.value, 8.5, 190, true).slice(0, 2)
    text(detail.label, 50, y, 8.5, muted)
    valueLines.forEach((value, index) => text(value, 370, y - index * 10, 8.5, ink, 'F2', 'right'))
    const rowHeight = valueLines.length > 1 ? 34 : 27
    strokeLine(48, y - rowHeight + 9, 372, y - rowHeight + 9, '#f0e2d4')
    y -= rowHeight
  })

  if (data.amount !== undefined) {
    fillRect(48, y - 28, 324, 30, '#fff1d4')
    text('AMOUNT PAID', 60, y - 17, 8.5, muted, 'F2')
    text(`INR ${data.amount.toLocaleString('en-IN')}`, 360, y - 18, 12, maroon, 'F2', 'right')
  }
  text('May the Divine Mother bless you and your family.', PAGE_WIDTH / 2, 74, 10, maroon, 'F3', 'center')
  const footerLines = [temple.address, [temple.phone, temple.email].filter(Boolean).join(' | '), temple.footerNote].filter(Boolean).flatMap(value => wrapText(value!, 6.7, 350))
  footerLines.slice(0, 3).forEach((line, index) => text(line, PAGE_WIDTH / 2, 48 - index * 9, 6.7, muted, 'F1', 'center'))
  return buildPdfDocument(lines.join('\n') + '\n', `${data.kind} confirmation ${data.reference}`)
}

export async function downloadConfirmationPdf(data: PurchaseConfirmationData, temple: TicketTempleDetails) {
  const doc = await createConfirmationPdf(data, temple)
  const safeReference = data.reference.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
  const url = URL.createObjectURL(doc)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.kind}-${safeReference}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
