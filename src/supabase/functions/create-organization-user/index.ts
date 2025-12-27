// Edge Function for creating organization users
// Handles both auth.users and user_profiles creation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { orgId, userData } = await req.json()

    // Validate input
    if (!orgId || !userData) {
      throw new Error('Missing required parameters')
    }

    const { name, email, password, role, branchId } = userData

    if (!name || !email || !password) {
      throw new Error('Missing required user data')
    }

    // Create Supabase client with service role key (has admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Creating user:', email)

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingAuthUser) {
      console.log('Auth user already exists, checking for profile...')
      
      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', existingAuthUser.id)
        .maybeSingle()
      
      if (existingProfile) {
        console.log('User and profile both exist')
        return new Response(
          JSON.stringify({
            success: false,
            error: `A user with email ${email} already exists in the system`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
      }
      
      // Auth user exists but no profile - create the profile
      console.log('Auth user exists but no profile, creating profile...')
      const { data: newProfile, error: newProfileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: existingAuthUser.id,
          email: email,
          name: name,
          role: role || 'cashier',
          organization_id: orgId,
          assigned_branch_id: branchId || null,
          status: 'active'
        })
        .select()
        .single()
      
      if (newProfileError) {
        console.error('Failed to create profile for existing auth user:', newProfileError)
        throw new Error(`Failed to create profile: ${newProfileError.message}`)
      }
      
      console.log('Profile created for existing auth user')
      return new Response(
        JSON.stringify({
          success: true,
          user: newProfile,
          message: 'User created successfully and can login immediately'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Create auth user with admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name,
        role: role,
        organization_id: orgId,
        branchId: branchId
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    console.log('Auth user created:', authData.user.id)

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    if (existingProfile) {
      console.log('Profile already exists for this user, returning existing profile')
      
      // Fetch full profile data
      const { data: fullProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()
      
      return new Response(
        JSON.stringify({
          success: true,
          user: fullProfile,
          message: 'User already exists and can login immediately'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: email,
        name: name,
        role: role || 'cashier',
        organization_id: orgId,
        assigned_branch_id: branchId || null,
        status: 'active'
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      
      // Rollback: Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log('Profile created:', profileData.id)

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        user: profileData,
        message: 'User created successfully and can login immediately'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    
    // More detailed error logging
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Detailed error:', {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name
    })
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorStack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Changed to 500 for server errors
      }
    )
  }
})