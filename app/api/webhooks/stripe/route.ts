import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  try {
    // Prüfe ob Stripe Secret Key konfiguriert ist
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY ist nicht konfiguriert')
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    // Prüfe ob Webhook Secret konfiguriert ist
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Webhook misconfigured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })

    const sig = req.headers.get('stripe-signature')
    if (!sig) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const body = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Invalid webhook signature:', err.message)
      }
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Event loggen
    console.log('Stripe event', event.id, event.type)

    return NextResponse.json({ received: true })
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Webhook error:', error)
    }
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

