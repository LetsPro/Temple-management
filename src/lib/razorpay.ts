import { supabase } from './supabase'

type PaymentType = 'booking' | 'donation' | 'membership'
type CheckoutPrefill = { name: string; email?: string; contact: string }
type PaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void }
  }
}

export async function payWithRazorpay(input: {
  paymentType: PaymentType
  referenceId: string
  title: string
  description: string
  prefill: CheckoutPrefill
}) {
  if (!window.Razorpay) throw new Error('Razorpay Checkout could not be loaded.')
  const { data: order, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
    body: { payment_type: input.paymentType, reference_id: input.referenceId },
  })
  if (orderError || !order?.id) throw new Error(order?.error || orderError?.message || 'Unable to create payment order.')

  const response = await new Promise<PaymentResponse>((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: input.title,
      description: input.description,
      order_id: order.id,
      image: `${window.location.origin}/trust-logo.jpg`,
      prefill: input.prefill,
      theme: { color: '#9D1515' },
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
      handler: resolve,
    })
    checkout.on('payment.failed', value => reject(new Error(value.error?.description || 'Payment failed.')))
    checkout.open()
  })

  const { data: verified, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: { payment_type: input.paymentType, reference_id: input.referenceId, ...response },
  })
  if (verifyError || !verified?.verified) throw new Error(verified?.error || verifyError?.message || 'Payment verification failed.')
  return { ...response, booking_number: verified.booking_number as string | undefined }
}
