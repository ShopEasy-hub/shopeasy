import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with Service Role key (has admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the calling user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { orgId, userData } = await req.json();

    if (!orgId || !userData) {
      throw new Error('Missing required fields');
    }

    // Verify the calling user has permission (is owner or admin in the organization)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (profile.organization_id !== orgId) {
      throw new Error('User does not belong to this organization');
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    console.log('Creating user:', userData.email);

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user returned from auth creation');
    }

    console.log('Auth user created:', authData.user.id);

    // Create the user profile
    const { data: userProfile, error: profileInsertError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        organization_id: orgId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        branch_id: userData.branchId || null,
        status: 'active',
      })
      .select()
      .single();

    if (profileInsertError) {
      console.error('Profile insert error:', profileInsertError);
      // Try to delete the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user profile: ${profileInsertError.message}`);
    }

    console.log('User profile created:', userProfile);

    return new Response(
      JSON.stringify({ success: true, user: userProfile }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-organization-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
