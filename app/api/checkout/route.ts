import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    // Hole eingeloggten User aus Supabase Auth
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Auth error:', authError)
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Prüfe ob Stripe Secret Key konfiguriert ist
    if (!process.env.STRIPE_SECRET_KEY) {
      if (process.env.NODE_ENV === 'development') {
        console.error('STRIPE_SECRET_KEY ist nicht konfiguriert')
      }
      return NextResponse.json(
        { error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      )
    }

    // Prüfe ob Price ID konfiguriert ist
    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      if (process.env.NODE_ENV === 'development') {
        console.error('STRIPE_PRICE_ID ist nicht konfiguriert')
      }
      return NextResponse.json(
        { error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      )
    }

    // Origin aus Request-Header extrahieren (für success/cancel URLs)
    const origin = req.headers.get('origin') || 
      process.env.NEXT_PUBLIC_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })

    // Stripe Customer ID Sync: Prüfe ob User bereits eine Stripe Customer ID hat
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = userData?.stripe_customer_id

    // Wenn keine Customer ID vorhanden, erstelle neuen Stripe Customer
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          metadata: {
            userId: user.id,
          },
        })
        customerId = customer.id

        // Speichere Customer ID in Datenbank
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Fehler beim Erstellen des Stripe Customers:', error)
        }
        // Weiterlaufen ohne Customer ID (Stripe erstellt automatisch einen)
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!, // nutzt deine ENV-Price-ID
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout/cancel`,
    })

    // WICHTIG: URL für das Frontend zurückgeben
    return NextResponse.json(
      {
        id: session.id,
        url: session.url, // lib/buy-credits.ts liest dieses Feld
      },
      { status: 200 },
    )
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Stripe checkout error:', error)
    }

    const message =
      (error as any)?.message ||
      (typeof error === 'string' ? error : null) ||
      'Checkout-Session konnte nicht erstellt werden'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

