#!/bin/bash

# =====================================================
# 🛠️ EDGE FUNCTION DEBUG COMMANDS
# =====================================================

echo "═══════════════════════════════════════════════════════════════"
echo "🛠️  EDGE FUNCTION DEBUGGING"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# =====================================================
# STEP 1: Check if logged in
# =====================================================

echo "1️⃣  Checking login status..."
echo ""
echo "Run: supabase projects list"
echo ""
read -p "Press Enter after running..."
echo ""

# =====================================================
# STEP 2: Check if function is deployed
# =====================================================

echo "2️⃣  Checking if function is deployed..."
echo ""
echo "Run: supabase functions list"
echo ""
echo "Should show:"
echo "  create-organization-user    Yes"
echo ""
read -p "Press Enter after running..."
echo ""

# =====================================================
# STEP 3: Check secrets
# =====================================================

echo "3️⃣  Checking secrets..."
echo ""
echo "Run: supabase secrets list"
echo ""
echo "Should show:"
echo "  SUPABASE_URL"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo ""
read -p "Are both secrets listed? (y/n): " secrets_ok
echo ""

if [ "$secrets_ok" != "y" ]; then
  echo "❌ Secrets missing! Setting them now..."
  echo ""
  read -p "Enter your Supabase URL (https://YOUR_REF.supabase.co): " SUPABASE_URL
  read -p "Enter your Service Role Key: " SERVICE_KEY
  echo ""
  echo "Run these commands:"
  echo ""
  echo "supabase secrets set SUPABASE_URL=$SUPABASE_URL"
  echo "supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY"
  echo ""
  read -p "Press Enter after running..."
  echo ""
  echo "Now redeploying function..."
  echo ""
  echo "Run: supabase functions deploy create-organization-user"
  echo ""
  read -p "Press Enter after redeploying..."
  echo ""
fi

# =====================================================
# STEP 4: Check logs for errors
# =====================================================

echo "4️⃣  Checking function logs..."
echo ""
echo "Run: supabase functions logs create-organization-user --limit 20"
echo ""
echo "Look for recent errors!"
echo ""
read -p "Press Enter after checking logs..."
echo ""

# =====================================================
# STEP 5: Test function manually
# =====================================================

echo "5️⃣  Testing function manually..."
echo ""
echo "First, get your Organization ID and Branch ID:"
echo "  - Open your app console"
echo "  - Look for organization data"
echo "  - Copy the IDs"
echo ""
read -p "Enter your Organization ID: " ORG_ID
read -p "Enter a Branch ID: " BRANCH_ID
echo ""

echo "Creating test file..."
cat > /tmp/test-user.json << EOF
{
  "orgId": "$ORG_ID",
  "userData": {
    "name": "Test User",
    "email": "test-$(date +%s)@example.com",
    "password": "Test123!",
    "role": "cashier",
    "branchId": "$BRANCH_ID"
  }
}
EOF

echo "Test file created!"
echo ""
echo "Run: supabase functions invoke create-organization-user --data @/tmp/test-user.json"
echo ""
echo "This will show the EXACT error!"
echo ""
read -p "Press Enter after running..."
echo ""

# =====================================================
# STEP 6: Watch logs in real-time
# =====================================================

echo "6️⃣  Watch logs in real-time..."
echo ""
echo "Open a NEW terminal and run:"
echo ""
echo "  supabase functions logs create-organization-user --follow"
echo ""
echo "Leave it open, then try creating a user in your app."
echo "You'll see the errors in real-time!"
echo ""
read -p "Press Enter when ready to continue..."
echo ""

# =====================================================
# TROUBLESHOOTING
# =====================================================

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 TROUBLESHOOTING GUIDE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "COMMON ERRORS:"
echo ""
echo "❌ \"Invalid JWT\" → Wrong service role key"
echo "   Fix: Dashboard → Settings → API → Copy service_role key"
echo "        supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY"
echo ""
echo "❌ \"SUPABASE_URL not defined\" → URL secret not set"
echo "   Fix: supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co"
echo ""
echo "❌ \"User already exists\" → Duplicate email"
echo "   Fix: Dashboard → Authentication → Users → Delete user"
echo "        Or use different email"
echo ""
echo "❌ \"Row level security\" → Using anon key instead of service role"
echo "   Fix: Make sure you copied the SERVICE ROLE key, NOT anon key!"
echo ""
echo "❌ \"Missing required parameters\" → Frontend not sending correct data"
echo "   Fix: Check browser console for what's being sent"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# =====================================================
# SUMMARY
# =====================================================

echo "📋 SUMMARY OF COMMANDS:"
echo ""
echo "# Check status"
echo "supabase projects list"
echo "supabase functions list"
echo "supabase secrets list"
echo ""
echo "# View logs"
echo "supabase functions logs create-organization-user --limit 20"
echo "supabase functions logs create-organization-user --follow"
echo ""
echo "# Test function"
echo "supabase functions invoke create-organization-user --data @test-user.json"
echo ""
echo "# Redeploy"
echo "supabase functions deploy create-organization-user"
echo ""
echo "# Set secrets"
echo "supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co"
echo "supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎯 NEXT: Check the logs to see the REAL error!"
echo ""
echo "Dashboard → Functions → create-organization-user → Logs"
echo ""
echo "OR run: supabase functions logs create-organization-user --limit 20"
echo ""
