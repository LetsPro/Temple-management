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

const WIDTH = 1080
const HEIGHT = 1520
const MAROON = '#94161a'
const GOLD = '#d99b32'
const CREAM = '#fff8eb'
const INK = '#3c2415'
const MUTED = '#765e50'

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function wrapLines(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word
    if (line && context.measureText(next).width > maxWidth) { lines.push(line); line = word }
    else line = next
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function centeredText(context: CanvasRenderingContext2D, value: string, y: number, maxWidth: number, lineHeight: number, maxLines = 2) {
  const lines = wrapLines(context, value, maxWidth).slice(0, maxLines)
  lines.forEach((line, index) => context.fillText(line, WIDTH / 2, y + index * lineHeight))
  return lines.length
}

export async function createConfirmationImage(data: PurchaseConfirmationData, temple: TicketTempleDetails) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image creation is not supported in this browser.')

  context.fillStyle = CREAM
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = MAROON
  context.fillRect(0, 0, WIDTH, 330)
  context.fillStyle = GOLD
  context.fillRect(0, 330, WIDTH, 12)

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#ffd275'
  context.font = '56px Georgia, serif'
  context.fillText('ॐ', WIDTH / 2, 68)
  context.fillStyle = '#ffffff'
  context.font = '700 42px Georgia, serif'
  centeredText(context, temple.templeName, 133, 900, 50)
  if (temple.tagline) {
    context.fillStyle = '#ffe0a3'
    context.font = '24px Arial, sans-serif'
    centeredText(context, temple.tagline, 238, 850, 30, 1)
  }
  context.fillStyle = '#ffffff'
  context.font = '700 23px Arial, sans-serif'
  context.fillText(`${data.kind.toUpperCase()} CONFIRMATION TICKET`, WIDTH / 2, 292)

  context.shadowColor = 'rgba(92, 51, 31, .15)'
  context.shadowBlur = 30
  context.shadowOffsetY = 12
  context.fillStyle = '#ffffff'
  roundedRect(context, 65, 395, 950, 1000, 34)
  context.fill()
  context.shadowColor = 'transparent'
  context.strokeStyle = '#ead5bb'
  context.lineWidth = 2
  context.stroke()

  context.fillStyle = '#edf8ef'
  roundedRect(context, 355, 435, 370, 58, 29)
  context.fill()
  context.fillStyle = '#20703a'
  context.font = '700 21px Arial, sans-serif'
  context.fillText(data.kind === 'event' && data.amount === undefined ? 'REGISTRATION CONFIRMED' : 'PAYMENT CONFIRMED', WIDTH / 2, 464)

  context.fillStyle = MAROON
  context.font = '700 46px Georgia, serif'
  const titleLines = centeredText(context, data.title, 545, 820, 54)
  const subtitleY = 545 + titleLines * 54 + 22
  context.fillStyle = MUTED
  context.font = '25px Arial, sans-serif'
  const subtitleLines = centeredText(context, data.subtitle, subtitleY, 820, 34, 3)

  let y = subtitleY + subtitleLines * 34 + 30
  context.setLineDash([12, 10])
  context.strokeStyle = GOLD
  context.beginPath(); context.moveTo(120, y); context.lineTo(960, y); context.stroke()
  context.setLineDash([])

  context.fillStyle = MUTED
  context.font = '700 18px Arial, sans-serif'
  context.fillText('CONFIRMATION REFERENCE', WIDTH / 2, y + 40)
  context.fillStyle = MAROON
  context.font = '700 38px Arial, sans-serif'
  context.fillText(data.reference, WIDTH / 2, y + 88)
  y += 145

  context.textAlign = 'left'
  data.details.slice(0, 6).forEach(detail => {
    context.fillStyle = MUTED
    context.font = '24px Arial, sans-serif'
    context.fillText(detail.label, 125, y)
    context.textAlign = 'right'
    context.fillStyle = INK
    context.font = '700 24px Arial, sans-serif'
    const valueLines = wrapLines(context, detail.value, 500).slice(0, 2)
    valueLines.forEach((line, index) => context.fillText(line, 955, y + index * 30))
    const rowHeight = valueLines.length > 1 ? 76 : 58
    context.strokeStyle = '#f0e2d4'
    context.lineWidth = 2
    context.beginPath(); context.moveTo(120, y + rowHeight - 25); context.lineTo(960, y + rowHeight - 25); context.stroke()
    context.textAlign = 'left'
    y += rowHeight
  })

  if (data.amount !== undefined) {
    context.fillStyle = '#fff1d4'
    roundedRect(context, 120, y + 5, 840, 76, 16)
    context.fill()
    context.fillStyle = MUTED
    context.font = '700 22px Arial, sans-serif'
    context.fillText('AMOUNT PAID', 150, y + 43)
    context.textAlign = 'right'
    context.fillStyle = MAROON
    context.font = '700 34px Arial, sans-serif'
    context.fillText(`₹${data.amount.toLocaleString('en-IN')}`, 930, y + 43)
    context.textAlign = 'left'
  }

  context.textAlign = 'center'
  context.fillStyle = MAROON
  context.font = 'italic 28px Georgia, serif'
  context.fillText('May the Divine Mother bless you and your family.', WIDTH / 2, 1340)
  context.fillStyle = MUTED
  context.font = '20px Arial, sans-serif'
  const footer = [temple.address, [temple.phone, temple.email].filter(Boolean).join(' · '), temple.footerNote].filter(Boolean)
  footer.slice(0, 3).forEach((line, index) => centeredText(context, line!, 1420 + index * 27, 900, 25, 1))

  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create ticket image.')), 'image/png', 1))
}

export async function downloadConfirmationImage(data: PurchaseConfirmationData, temple: TicketTempleDetails) {
  const image = await createConfirmationImage(data, temple)
  const safeReference = data.reference.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
  const url = URL.createObjectURL(image)
  const link = document.createElement('a')
  link.href = url
  link.download = `${data.kind}-${safeReference}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
