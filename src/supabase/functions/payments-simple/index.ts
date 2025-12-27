import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper to get authenticated user
async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('Auth error:', error);
    return null;
  }
  
  return user;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    
    console.log('🔵 Request:', req.method, path);

    // Health check
    if (path.endsWith('/payments') || path.endsWith('/payments/')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'ShopEasy Payment Service',
          version: '2.0.0',
          message: 'Payments API is running (Simple version)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PayStack Initialize
    if (path.includes('/paystack/initialize') && req.method === 'POST') {
      const user = await getAuthUser(req);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { email, amount, currency, reference, metadata } = await req.json();
      
      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Payment gateway not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get frontend URL - in preview it's the current origin
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
      
      // Initialize PayStack transaction
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount), // Amount is already in kobo from frontend
          currency: currency || 'NGN',
          reference,
          metadata,
          callback_url: `${frontendUrl}?payment-callback=true&reference=${reference}`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        console.error('PayStack error:', data);
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to initialize payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store payment record
      await supabase.from('payments').insert({
        reference,
        provider: 'paystack',
        organization_id: metadata.orgId,
        user_id: user.id,
        plan_id: metadata.planId,
        billing_cycle: metadata.billingCycle,
        amount,
        currency: currency || 'NGN',
        status: 'pending',
      });

      return new Response(
        JSON.stringify({
          success: true,
          authorizationUrl: data.data.authorization_url,
          reference: data.data.reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PayStack Verify
    if (path.includes('/paystack/verify/') && req.method === 'GET') {
      const user = await getAuthUser(req);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const reference = path.split('/paystack/verify/')[1];
      
      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Payment gateway not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: { 'Authorization': `Bearer ${paystackSecretKey}` },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to verify payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentData = data.data;

      // Update payment record
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .single();

      if (payment) {
        const newStatus = paymentData.status === 'success' ? 'completed' : 'failed';
        
        await supabase
          .from('payments')
          .update({
            status: newStatus,
            verified_at: new Date().toISOString(),
            transaction_id: paymentData.id?.toString(),
          })
          .eq('reference', reference);

        // Create subscription if successful
        if (paymentData.status === 'success') {
          const startDate = new Date();
          const endDate = new Date();
          
          if (payment.billing_cycle === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          await supabase.from('subscriptions').upsert({
            organization_id: payment.organization_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: payment.amount,
            payment_reference: reference,
            provider: 'paystack',
          }, { onConflict: 'organization_id' });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: paymentData.status,
          amount: paymentData.amount / 100,
          reference: paymentData.reference,
          paidAt: paymentData.paid_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Flutterwave Initialize
    if (path.includes('/flutterwave/initialize') && req.method === 'POST') {
      const user = await getAuthUser(req);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { email, amount, currency, reference, metadata } = await req.json();
      
      const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
      if (!flutterwaveSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Payment gateway not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amountInNGN = amount / 100;

      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: amountInNGN,
          currency: currency || 'NGN',
          redirect_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/payment-callback`,
          customer: { email },
          customizations: {
            title: 'ShopEasy Subscription',
            description: `${metadata.planName} - ${metadata.billingCycle} billing`,
          },
          meta: metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to initialize payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store payment record
      await supabase.from('payments').insert({
        reference,
        provider: 'flutterwave',
        organization_id: metadata.orgId,
        user_id: user.id,
        plan_id: metadata.planId,
        billing_cycle: metadata.billingCycle,
        amount,
        currency: currency || 'NGN',
        status: 'pending',
      });

      return new Response(
        JSON.stringify({
          success: true,
          authorizationUrl: data.data.link,
          reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Flutterwave Verify
    if (path.includes('/flutterwave/verify/') && req.method === 'GET') {
      const user = await getAuthUser(req);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transactionId = path.split('/flutterwave/verify/')[1];
      
      const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
      if (!flutterwaveSecretKey) {
        return new Response(
          JSON.stringify({ error: 'Payment gateway not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          headers: { 'Authorization': `Bearer ${flutterwaveSecretKey}` },
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        return new Response(
          JSON.stringify({ success: false, error: data.message || 'Failed to verify payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentData = data.data;
      const reference = paymentData.tx_ref;

      // Update payment record
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference)
        .single();

      if (payment) {
        const newStatus = paymentData.status === 'successful' ? 'completed' : 'failed';
        
        await supabase
          .from('payments')
          .update({
            status: newStatus,
            verified_at: new Date().toISOString(),
            transaction_id: paymentData.id?.toString(),
          })
          .eq('reference', reference);

        // Create subscription if successful
        if (paymentData.status === 'successful') {
          const startDate = new Date();
          const endDate = new Date();
          
          if (payment.billing_cycle === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          await supabase.from('subscriptions').upsert({
            organization_id: payment.organization_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: payment.amount,
            payment_reference: reference,
            provider: 'flutterwave',
          }, { onConflict: 'organization_id' });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: paymentData.status === 'successful' ? 'success' : paymentData.status,
          amount: paymentData.amount,
          reference,
          paidAt: paymentData.created_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404 - Route not found
    return new Response(
      JSON.stringify({ 
        error: 'Not found',
        path: path,
        message: 'Available routes: /paystack/initialize, /paystack/verify/:ref, /flutterwave/initialize, /flutterwave/verify/:id'
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});