import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { testSupabaseConnection, displayNetworkError } from './network-handler';

// Get Supabase credentials from info file
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Validate credentials
if (!projectId || !publicAnonKey) {
  console.error('❌ Supabase credentials missing! Check /utils/supabase/info.ts');
  console.error('📝 Current values:', { projectId, publicAnonKey: publicAnonKey ? '***set***' : 'missing' });
}

if (projectId && publicAnonKey) {
  console.log('✅ Supabase client initializing:', supabaseUrl);
  
  // Test connection (non-blocking)
  testSupabaseConnection(projectId, publicAnonKey)
    .then(isConnected => {
      if (isConnected) {
        console.log('✅ Supabase connection test: SUCCESS');
      } else {
        console.warn('⚠️ Supabase connection test: FAILED');
        console.warn('💡 Add ?diagnostic-network=true to URL for detailed diagnostics');
      }
    })
    .catch(error => {
      displayNetworkError(error, 'Supabase connection test');
    });
} else {
  console.error('🚨 CRITICAL: Supabase cannot initialize without credentials!');
}

// Create Supabase client with enhanced error handling
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch (e) {
            console.error('localStorage.getItem error:', e);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            console.error('localStorage.setItem error:', e);
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error('localStorage.removeItem error:', e);
          }
        },
      },
    },
    global: {
      headers: {
        'x-client-info': 'shopeasy-pos',
      },
      fetch: async (url, options = {}) => {
        try {
          // Use native fetch with added error handling
          const response = await fetch(url, options);
          
          // Log failed requests for debugging
          if (!response.ok && response.status !== 404) {
            console.warn(`⚠️ HTTP ${response.status} from ${url}`);
          }
          
          return response;
        } catch (error: any) {
          // Enhanced error logging for network errors
          if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
            console.error('🚨 NetworkError detected:');
            displayNetworkError(error, `fetch to ${url}`);
            
            // Show user-friendly message
            console.error('');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('🔧 QUICK FIX:');
            console.error('  1. Check your internet connection');
            console.error('  2. Disable browser extensions temporarily');
            console.error('  3. Try incognito/private mode');
            console.error('  4. Add ?diagnostic-network=true for details');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('');
          }
          
          throw error;
        }
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          logo: string | null;
          subscription_plan: 'starter' | 'professional' | 'enterprise' | 'ultimate';
          subscription_status: 'active' | 'expired' | 'cancelled';
          subscription_expires_at: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      branches: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          location: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
      };
      warehouses: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          location: string | null;
          manager_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['warehouses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['warehouses']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sku: string;
          barcode: string | null;
          category: string | null;
          price: number;
          unit_cost: number;
          cost_price: number;
          reorder_level: number;
          tax_rate: number;
          expiry_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      inventory: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string | null;
          warehouse_id: string | null;
          product_id: string;
          quantity: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['inventory']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
      };
    };
  };
};

// Helper functions
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

export async function getUserOrganization() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  
  if (error) throw error;
  return data?.organization_id || null;
}