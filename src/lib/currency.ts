export type SupportedCurrency = 'INR' | 'USD'

export function formatCurrency(amount: number, currency: SupportedCurrency = 'INR') {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}
