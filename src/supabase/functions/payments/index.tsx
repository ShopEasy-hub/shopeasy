import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper to get authenticated user
async function getAuthUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  
  return user;
}

// ======================
// PAYSTACK ROUTES
// ======================

// Initialize PayStack Payment
app.post('/paystack/initialize', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { email, amount, currency, reference, metadata } = await c.req.json();
    
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Initialize PayStack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        currency: currency || 'NGN',
        reference,
        metadata,
        callback_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/payment-callback`,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.status) {
      console.error('PayStack initialization error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to initialize payment' 
      }, 400);
    }
    
    // Store payment record in PostgreSQL
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
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
    
    if (paymentError) {
      console.error('Failed to store payment record:', paymentError);
    }
    
    return c.json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('PayStack initialization error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Verify PayStack Payment
app.get('/paystack/verify/:reference', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const reference = c.req.param('reference');
    
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Verify transaction with PayStack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (!response.ok || !data.status) {
      console.error('PayStack verification error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to verify payment' 
      }, 400);
    }
    
    const paymentData = data.data;
    
    // Update payment record in PostgreSQL
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();
    
    if (payment && !fetchError) {
      const newStatus = paymentData.status === 'success' ? 'completed' : 'failed';
      
      await supabase
        .from('payments')
        .update({
          status: newStatus,
          verified_at: new Date().toISOString(),
          transaction_id: paymentData.id?.toString(),
        })
        .eq('reference', reference);
      
      // If payment successful, create/update subscription
      if (paymentData.status === 'success') {
        const startDate = new Date();
        const endDate = new Date();
        
        // Calculate end date based on billing cycle
        if (payment.billing_cycle === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        await supabase
          .from('subscriptions')
          .upsert({
            organization_id: payment.organization_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: payment.amount,
            payment_reference: reference,
            provider: 'paystack',
          }, {
            onConflict: 'organization_id'
          });
      }
    }
    
    return c.json({
      success: true,
      status: paymentData.status,
      amount: paymentData.amount / 100, // Convert from kobo
      reference: paymentData.reference,
      paidAt: paymentData.paid_at,
    });
  } catch (error) {
    console.error('PayStack verification error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// FLUTTERWAVE ROUTES
// ======================

// Initialize Flutterwave Payment
app.post('/flutterwave/initialize', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { email, amount, currency, reference, metadata } = await c.req.json();
    
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Initialize Flutterwave payment
    // Note: Flutterwave expects amount in main currency unit (NGN), not kobo
    // Frontend sends amount in kobo, so we divide by 100
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
        customer: {
          email,
        },
        customizations: {
          title: 'ShopEasy Subscription',
          description: `${metadata.planName} - ${metadata.billingCycle} billing`,
          logo: '',
        },
        meta: metadata,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok || data.status !== 'success') {
      console.error('Flutterwave initialization error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to initialize payment' 
      }, 400);
    }
    
    // Store payment record in PostgreSQL
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
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
    
    if (paymentError) {
      console.error('Failed to store payment record:', paymentError);
    }
    
    return c.json({
      success: true,
      authorizationUrl: data.data.link,
      reference,
    });
  } catch (error) {
    console.error('Flutterwave initialization error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Verify Flutterwave Payment
app.get('/flutterwave/verify/:transactionId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const transactionId = c.req.param('transactionId');
    
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Verify transaction with Flutterwave
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${flutterwaveSecretKey}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (!response.ok || data.status !== 'success') {
      console.error('Flutterwave verification error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to verify payment' 
      }, 400);
    }
    
    const paymentData = data.data;
    const reference = paymentData.tx_ref;
    
    // Update payment record in PostgreSQL
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();
    
    if (payment && !fetchError) {
      const newStatus = paymentData.status === 'successful' ? 'completed' : 'failed';
      
      await supabase
        .from('payments')
        .update({
          status: newStatus,
          verified_at: new Date().toISOString(),
          transaction_id: paymentData.id?.toString(),
        })
        .eq('reference', reference);
      
      // If payment successful, create/update subscription
      if (paymentData.status === 'successful') {
        const startDate = new Date();
        const endDate = new Date();
        
        // Calculate end date based on billing cycle
        if (payment.billing_cycle === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        await supabase
          .from('subscriptions')
          .upsert({
            organization_id: payment.organization_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: payment.amount,
            payment_reference: reference,
            provider: 'flutterwave',
          }, {
            onConflict: 'organization_id'
          });
      }
    }
    
    return c.json({
      success: true,
      status: paymentData.status === 'successful' ? 'success' : paymentData.status,
      amount: paymentData.amount,
      reference,
      paidAt: paymentData.created_at,
    });
  } catch (error) {
    console.error('Flutterwave verification error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Default health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'ShopEasy Payment Service',
    version: '2.0.0',
    message: 'Payments API is running. No KV store dependencies.'
  });
});

Deno.serve(app.fetch);
