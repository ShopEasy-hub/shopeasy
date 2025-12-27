import { useState, useEffect } from 'react';
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary';
import { NetworkErrorFallback } from './components/NetworkErrorFallback';
import { getCurrentSession, getBranches, getUserProfile } from './lib/api';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { POSTerminal } from './pages/POSTerminal';
import { Inventory } from './pages/Inventory';
import { Transfers } from './pages/Transfers';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';

import { TestSetup } from './pages/TestSetup';
import { SubscriptionPlans } from './pages/SubscriptionPlans';
import { BillingCycle } from './pages/BillingCycle';
import { Expenses } from './pages/Expenses';
import { Returns } from './pages/Returns';
import { ReturnHistory } from './pages/ReturnHistory';
import { WarehousesUnified } from './pages/WarehousesUnified';
import { Suppliers } from './pages/Suppliers';
import { ShortDated } from './pages/ShortDated';
import { SubscriptionExpiredOverlay } from './components/SubscriptionExpiredOverlay';
import { PaymentCallback } from './pages/PaymentCallback';
import { DataViewer } from './pages/DataViewer';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import ProductHistory from './pages/ProductHistory';
import { DiagnosticNetwork } from './pages/DiagnosticNetwork';

export type Page = 'setup' | 'login' | 'forgot-password' | 'reset-password' | 'dashboard' | 'pos' | 'inventory' | 'transfers' | 'reports' | 'users' | 'settings' | 'test-setup' | 'subscribe' | 'billing-cycle' | 'expenses' | 'returns' | 'return-history' | 'warehouses' | 'suppliers' | 'short-dated' | 'payment-callback' | 'data-viewer' | 'admin' | 'super-admin' | 'product-history' | 'diagnostic-network';

export interface AppState {
  userId: string | null;
  orgId: string | null;
  userRole: string | null;
  currentBranchId: string | null;
  currentWarehouseId: string | null;
  companyName: string;
  user?: { name: string; email: string; role?: string } | null;
  branches?: any[];
  subscriptionStatus?: 'trial' | 'active' | 'expired';
  trialStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionPlan?: 'starter' | 'standard' | 'growth' | 'enterprise' | null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('setup');
  const [appState, setAppState] = useState<AppState>({
    userId: null,
    orgId: null,
    userRole: null,
    currentBranchId: null,
    currentWarehouseId: null,
    companyName: 'ShopEasy',
    subscriptionStatus: 'trial',
    trialStartDate: null,
    subscriptionPlan: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [showSubscriptionExpired, setShowSubscriptionExpired] = useState(false);
  const [selectedPlanForBilling, setSelectedPlanForBilling] = useState<{
    id: string;
    name: string;
    monthlyPrice: number;
  } | null>(null);

  // Show helpful console message on load
  useEffect(() => {
    console.log('%c🏪 ShopEasy POS System', 'font-size: 20px; color: #10b981; font-weight: bold;');
    console.log('%c📋 Having issues?', 'font-size: 14px; color: #f59e0b; font-weight: bold;');
    console.log('');
    console.log('🔒 Getting "Invalid JWT" errors?');
    console.log('   → Just refresh the page (F5) or login again');
    console.log('   → Read: JWT_ERROR_FIX.md');
    console.log('');
    console.log('❌ Stock showing zero or delete not working?');
    console.log('   → Read: START_HERE.md for 2-minute fix');
    console.log('   → Or go to "Database Status" page in sidebar');
    console.log('');
    console.log('📚 All documentation files available in project root');
    console.log('');
  }, []);

  useEffect(() => {
    // Check if URL has special parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for password reset callback
    if (urlParams.get('reset-password') === 'true' || window.location.hash.includes('type=recovery')) {
      console.log('🔐 Password reset detected');
      setCurrentPage('reset-password');
      setLoading(false);
      return;
    }
    
    // Force login if session expired
    if (urlParams.get('force-login') === 'true') {
      console.log('🔒 Force login detected - clearing session');
      setCurrentPage('login');
      setLoading(false);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    
    if (urlParams.get('test-setup') === 'true') {
      setCurrentPage('test-setup');
      setLoading(false);
    } else if (urlParams.get('data-viewer') === 'true') {
      setCurrentPage('data-viewer');
      setLoading(false);
    } else if (urlParams.get('admin') === 'true') {
      setCurrentPage('admin');
      setLoading(false);
    } else if (urlParams.get('super-admin') === 'true') {
      setCurrentPage('super-admin');
      setLoading(false);
    } else if (urlParams.get('diagnostic-network') === 'true') {
      setCurrentPage('diagnostic-network');
      setLoading(false);
    } else if (
      urlParams.get('reference') || 
      urlParams.get('tx_ref') || 
      urlParams.get('transaction_id') ||
      urlParams.get('payment-callback') === 'true' ||
      urlParams.get('status') // Flutterwave includes status in callback
    ) {
      // Payment callback from gateway
      setCurrentPage('payment-callback');
      setLoading(false);
    } else {
      checkSession();
    }
  }, []);

  async function checkSession() {
    try {
      console.log('🔍 Checking session...');
      const session = await getCurrentSession();
      console.log('✅ Session check complete:', session ? 'Logged in' : 'Not logged in');
      
      if (session) {
        // User is logged in, fetch user profile and restore appState
        try {
          console.log('📋 Restoring user session data...');
          const userProfile = await getUserProfile();
          
          if (!userProfile) {
            throw new Error('User profile not found');
          }
          
          // Check and auto-expire trial if needed
          try {
            const { supabase } = await import('./lib/supabase');
            const { data: expiryCheck } = await supabase.rpc('check_and_expire_trial', {
              p_org_id: userProfile.organization_id
            });
            
            // If status changed to expired, refetch org data
            if (expiryCheck?.status === 'expired') {
              console.log('⚠️ Trial/subscription expired during session restore');
              const updatedProfile = await getUserProfile();
              if (updatedProfile) {
                userProfile.organization = updatedProfile.organization;
              }
            }
          } catch (error) {
            console.error('Error checking trial expiry:', error);
            // Continue with session restore even if check fails
          }
          
          // Determine the branch for the user
          let branchId = userProfile.branch_id;
          
          // For admin/owner, set to first branch (headquarters)
          if (['owner', 'admin'].includes(userProfile.role)) {
            try {
              const branches = await getBranches(userProfile.organization_id);
              branchId = branches && branches.length > 0 ? branches[0].id : branchId;
            } catch (error) {
              console.error('Error loading branches:', error);
            }
          }
          
          // Restore the full appState
          updateAppState({
            userId: userProfile.id,
            orgId: userProfile.organization_id,
            userRole: userProfile.role,
            user: { 
              email: userProfile.email, 
              name: userProfile.name, 
              role: userProfile.role 
            },
            currentBranchId: branchId,
            subscriptionStatus: userProfile.organization?.subscription_status || 'trial',
            trialStartDate: userProfile.organization?.trial_start_date || new Date().toISOString(),
            subscriptionEndDate: userProfile.organization?.subscription_end_date || null,
            subscriptionPlan: userProfile.organization?.subscription_plan || null,
          });
          
          console.log('✅ Session restored successfully');
          setCurrentPage('dashboard');
        } catch (profileError: any) {
          console.error('❌ Error restoring session:', profileError);
          // If we can't restore the profile, force login
          setCurrentPage('login');
        }
      } else {
        setCurrentPage('login');
      }
    } catch (error: any) {
      console.error('❌ Session check error:', error);
      // Show error instead of just going to login
      setLoadingError(error?.message || 'Failed to connect to server');
      // Still allow user to try login
      setTimeout(() => {
        setCurrentPage('login');
        setLoadingError(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  }

  function updateAppState(updates: Partial<AppState>) {
    setAppState((prev) => ({ ...prev, ...updates }));
  }

  function handleNavigate(page: string) {
    setCurrentPage(page as Page);
  }

  // Check subscription status
  function checkSubscriptionStatus(): boolean {
    if (!appState.orgId) return true; // Allow access during setup
    
    // If already has active subscription, allow access
    if (appState.subscriptionStatus === 'active') {
      return true;
    }

    // Check if trial period is still valid
    if (appState.subscriptionStatus === 'trial' && appState.trialStartDate) {
      const trialStart = new Date(appState.trialStartDate);
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceStart <= 7) {
        return true; // Still in trial period
      } else {
        // Trial expired
        if (appState.subscriptionStatus === 'trial') {
          updateAppState({ subscriptionStatus: 'expired' });
        }
        return false;
      }
    }

    // Subscription expired
    if (appState.subscriptionStatus === 'expired') {
      return false;
    }

    return true; // Default to allowing access
  }

  // Check subscription on page navigation
  useEffect(() => {
    if (appState.orgId && currentPage !== 'subscribe' && currentPage !== 'setup' && currentPage !== 'login') {
      const hasAccess = checkSubscriptionStatus();
      setShowSubscriptionExpired(!hasAccess);
    } else {
      setShowSubscriptionExpired(false);
    }
  }, [currentPage, appState.orgId, appState.subscriptionStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          {!loadingError ? (
            <>
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="mb-2 text-destructive">Connection Error</h3>
              <p className="text-sm text-muted-foreground mb-4">{loadingError}</p>
              <p className="text-xs text-muted-foreground">Redirecting to login...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <SimpleErrorBoundary>
      {currentPage === 'test-setup' && <TestSetup />}

      {currentPage === 'setup' && (
        <SetupPage
          onComplete={(userId, orgId, userEmail, userName) => {
            updateAppState({ 
              userId, 
              orgId,
              user: { email: userEmail, name: userName },
              subscriptionStatus: 'trial',
              trialStartDate: new Date().toISOString(),
            });
            setCurrentPage('dashboard');
          }}
          onLogin={() => setCurrentPage('login')}
        />
      )}

      {currentPage === 'login' && (
        <LoginPage
          onSuccess={async (userId, orgId, userRole, userEmail, userName, userBranchId) => {
            // Fetch organization data including trial info
            const userProfile = await getUserProfile(userId);
            let orgData = userProfile.organization;
            
            // Check and auto-expire trial if needed
            try {
              const { supabase } = await import('./lib/supabase');
              const { data: expiryCheck } = await supabase.rpc('check_and_expire_trial', {
                p_org_id: orgId
              });
              
              // If status changed to expired, refetch org data
              if (expiryCheck?.status === 'expired') {
                console.log('⚠️ Trial/subscription expired, refetching organization data');
                const updatedProfile = await getUserProfile(userId);
                orgData = updatedProfile.organization;
              }
            } catch (error) {
              console.error('Error checking trial expiry:', error);
              // Continue with login even if check fails
            }
            
            // Determine the landing branch based on role
            let landingBranchId = userBranchId;
            
            // For admin/owner, set to first branch (headquarters) - they can switch later
            if (['owner', 'admin'].includes(userRole)) {
              // Fetch branches to get the first one (headquarters)
              try {
                const branches = await getBranches(orgId);
                landingBranchId = branches && branches.length > 0 ? branches[0].id : null;
              } catch (error) {
                console.error('Error loading branches:', error);
              }
            }
            
            updateAppState({ 
              userId, 
              orgId, 
              userRole,
              user: { email: userEmail, name: userName, role: userRole },
              currentBranchId: landingBranchId,
              subscriptionStatus: orgData?.subscription_status || 'trial',
              trialStartDate: orgData?.trial_start_date || new Date().toISOString(),
              subscriptionEndDate: orgData?.subscription_end_date || null,
              subscriptionPlan: orgData?.subscription_plan || null,
            });
            setCurrentPage('dashboard');
          }}
          onSignUp={() => setCurrentPage('setup')}
          onForgotPassword={() => setCurrentPage('forgot-password')}
        />
      )}

      {currentPage === 'forgot-password' && (
        <ForgotPassword
          onBack={() => setCurrentPage('login')}
        />
      )}

      {currentPage === 'reset-password' && (
        <ResetPassword
          onSuccess={() => setCurrentPage('login')}
        />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
          updateAppState={updateAppState}
        />
      )}

      {currentPage === 'pos' && (
        <POSTerminal
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'inventory' && (
        <Inventory
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'transfers' && (
        <Transfers
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'reports' && (
        <Reports
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'users' && (
        <Users
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'settings' && (
        <Settings
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'subscribe' && (
        <SubscriptionPlans
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
          onSelectPlan={(planId) => {
            // Map plan IDs to pricing
            const planPricing = {
              'starter': { id: 'starter', name: 'Starter Plan', monthlyPrice: 7500 },
              'standard': { id: 'standard', name: 'Standard Plan', monthlyPrice: 50000 },
              'growth': { id: 'growth', name: 'Growth / Pro Plan', monthlyPrice: 95000 },
              'enterprise': { id: 'enterprise', name: 'Enterprise Plan', monthlyPrice: 250000 },
            };
            
            setSelectedPlanForBilling(planPricing[planId as keyof typeof planPricing]);
            setCurrentPage('billing-cycle');
          }}
        />
      )}

      {currentPage === 'billing-cycle' && selectedPlanForBilling && (
        <BillingCycle
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
          selectedPlan={selectedPlanForBilling}
        />
      )}

      {currentPage === 'expenses' && (
        <Expenses
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'returns' && (
        <Returns
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'return-history' && (
        <ReturnHistory
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'payment-callback' && (
        <PaymentCallback
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
          updateAppState={updateAppState}
        />
      )}

      {currentPage === 'warehouses' && (
        <WarehousesUnified
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'suppliers' && (
        <Suppliers
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'short-dated' && (
        <ShortDated
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'data-viewer' && (
        <DataViewer
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'product-history' && (
        <ProductHistory
          appState={appState}
          onNavigate={(page) => setCurrentPage(page)}
        />
      )}

      {currentPage === 'diagnostic-network' && (
        <DiagnosticNetwork />
      )}

      {currentPage === 'admin' && (
        <AdminPanel
          appState={appState}
          onNavigate={(page) => setCurrentPage(page as Page)}
        />
      )}

      {currentPage === 'super-admin' && (
        <SuperAdminPanel
          appState={appState}
          onNavigate={(page) => setCurrentPage(page as Page)}
        />
      )}

      {/* Subscription Expired Overlay */}
      {showSubscriptionExpired && (
        <SubscriptionExpiredOverlay
          onSubscribeClick={() => setCurrentPage('subscribe')}
          onContactSupport={() => {
            alert('Contact Support:\n\nEmail: support@borderpos.com\nPhone: +234 800 000 0000\nWhatsApp: +234 800 000 0000');
          }}
        />
      )}
    </SimpleErrorBoundary>
  );
}