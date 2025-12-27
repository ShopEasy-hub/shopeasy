#!/bin/bash

# =====================================================
# ⚡ COPY-PASTE DEPLOYMENT SCRIPT
# =====================================================
# Run these commands one by one in your terminal
# =====================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "⚡ SUPABASE EDGE FUNCTION DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# =====================================================
# STEP 1: Install Supabase CLI
# =====================================================

echo "📦 STEP 1: Installing Supabase CLI..."
echo ""
echo "Run this command:"
echo "npm install -g supabase"
echo ""
read -p "Press Enter after running the command above..."

# =====================================================
# STEP 2: Login to Supabase
# =====================================================

echo ""
echo "🔐 STEP 2: Login to Supabase..."
echo ""
echo "Run this command:"
echo "supabase login"
echo ""
echo "This will open your browser. Login with your Supabase account."
echo ""
read -p "Press Enter after logging in..."

# =====================================================
# STEP 3: Get Project Reference ID
# =====================================================

echo ""
echo "🔍 STEP 3: Get your Project Reference ID"
echo ""
echo "1. Open Supabase Dashboard in browser"
echo "2. Go to: Settings → General"
echo "3. Copy the 'Reference ID' (looks like: abcdefghijklmnop)"
echo ""
read -p "Enter your Project Reference ID: " PROJECT_REF
echo ""
echo "Using Project Reference ID: $PROJECT_REF"
echo ""

# =====================================================
# STEP 4: Link Project
# =====================================================

echo ""
echo "🔗 STEP 4: Linking your project..."
echo ""
echo "Run this command:"
echo "supabase link --project-ref $PROJECT_REF"
echo ""
read -p "Press Enter after running the command above..."

# =====================================================
# STEP 5: Deploy Edge Function
# =====================================================

echo ""
echo "🚀 STEP 5: Deploying Edge Function..."
echo ""
echo "Run this command:"
echo "supabase functions deploy create-organization-user"
echo ""
read -p "Press Enter after deployment completes..."

# =====================================================
# STEP 6: Set Environment Secrets
# =====================================================

echo ""
echo "🔑 STEP 6: Setting Environment Secrets..."
echo ""
echo "First, get your credentials:"
echo "1. Open Supabase Dashboard"
echo "2. Go to: Settings → API"
echo "3. Copy your 'service_role' key (NOT the anon key!)"
echo ""
read -p "Enter your Supabase URL (https://YOUR_PROJECT.supabase.co): " SUPABASE_URL
read -p "Enter your Service Role Key: " SERVICE_ROLE_KEY
echo ""

echo "Run these commands:"
echo ""
echo "supabase secrets set SUPABASE_URL=$SUPABASE_URL"
echo "supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo ""
read -p "Press Enter after running both commands above..."

# =====================================================
# STEP 7: Verify Deployment
# =====================================================

echo ""
echo "✅ STEP 7: Verifying deployment..."
echo ""
echo "Run this command:"
echo "supabase functions list"
echo ""
echo "You should see 'create-organization-user' listed as 'Deployed'"
echo ""
read -p "Press Enter to continue..."

# =====================================================
# SUCCESS
# =====================================================

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Edge Function deployed successfully!"
echo ""
echo "Now test in your app:"
echo "1. Users → Add User"
echo "2. Fill in the form"
echo "3. Submit"
echo "4. ✅ Should work automatically!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
