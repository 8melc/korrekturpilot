import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  // Prüfe ENV-Variablen zur Laufzeit
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Stripe ENV-Variablen fehlen');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    
    if (event.type === 'checkout.session.completed') {
      // Dieser Endpoint macht nichts - nutze /api/stripe/webhook stattdessen!
      console.log('⚠️ checkout.session.completed empfangen, aber dieser Endpoint ist nicht implementiert');
    }
    
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}

