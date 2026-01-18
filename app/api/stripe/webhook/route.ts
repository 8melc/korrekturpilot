import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // Prüfe ENV-Variablen zur Laufzeit (nicht beim Import!)
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY fehlt');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET fehlt');
    return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 500 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase ENV-Variablen fehlen');
    return NextResponse.json({ error: 'Database misconfigured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  
  if (!sig) {
    console.error('❌ stripe-signature Header fehlt');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    console.log('🔍 Session empfangen:', {
      sessionId: session.id,
      customer_email: session.customer_email,
      metadata: session.metadata,
      has_metadata: !!session.metadata,
      metadata_keys: session.metadata ? Object.keys(session.metadata) : []
    });

    const userId = session.metadata?.userId;

    if (!userId) {
      console.error('❌ Keine userId in metadata gefunden');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log('📝 UserId aus metadata:', userId);

    // 🔥 WICHTIG: Prüfen ob User existiert
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, credits')
      .eq('id', userId)
      .maybeSingle(); // maybeSingle() statt single() - kein Error bei "not found"

    if (fetchError) {
      console.error('❌ Fehler beim User-Fetch:', fetchError);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Wenn User nicht existiert, erstellen
    if (!existingUser) {
      console.log('🆕 User existiert nicht, erstelle neuen User');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ 
          id: userId, 
          credits: 5  // 5 Free Credit beim Erstellen
        }])
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Fehler beim User-Erstellen:', createError);
        return NextResponse.json({ received: true }, { status: 200 });
      }
      console.log('✅ Neuer User erstellt:', newUser);
    }

    // Jetzt Credits hinzufügen (25 für den Kauf)
    const creditsToAdd = 25;
    const currentCredits = existingUser?.credits || 1;
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        credits: currentCredits + creditsToAdd 
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Fehler beim Credits-Update:', updateError);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log('✅ Credits erfolgreich hinzugefügt:', {
      userId,
      vorher: currentCredits,
      hinzugefügt: creditsToAdd,
      nachher: updatedUser.credits
    });

    // Erstelle Payment-Eintrag in der payments Tabelle
    try {
      // Hole Payment Intent Details von Stripe
      const paymentIntentId = session.payment_intent as string;
      let amount = 790; // Default: 7.90€ in Cents
      let currency = 'eur';

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          amount = paymentIntent.amount;
          currency = paymentIntent.currency;
        } catch (err) {
          console.warn('⚠️ Konnte Payment Intent nicht abrufen:', err);
        }
      }

      // Erstelle Payment-Eintrag
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          stripe_payment_intent_id: paymentIntentId || session.id,
          amount: amount,
          currency: currency,
          status: 'completed',
        });

      if (paymentError) {
        console.error('❌ Fehler beim Erstellen des Payment-Eintrags:', paymentError);
        // Nicht kritisch, Webhook sollte trotzdem 200 zurückgeben
      } else {
        console.log('✅ Payment-Eintrag erstellt:', {
          userId,
          amount: amount / 100,
          currency,
        });
      }
    } catch (paymentErr) {
      console.error('❌ Unerwarteter Fehler beim Erstellen des Payment-Eintrags:', paymentErr);
      // Nicht kritisch, Webhook sollte trotzdem 200 zurückgeben
    }

    return NextResponse.json({ 
      received: true,
      creditsAdded: creditsToAdd,
      totalCredits: updatedUser.credits
    }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
