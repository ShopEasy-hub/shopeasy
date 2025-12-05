import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Get Supabase credentials from info file
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Validate credentials
if (!projectId || !publicAnonKey) {
  console.error('❌ Supabase credentials missing! Check /utils/supabase/info.tsx');
  console.error('📝 Current values:', { projectId, publicAnonKey: publicAnonKey ? '***set***' : 'missing' });
}

if (projectId && publicAnonKey) {
  console.log('✅ Supabase client initializing:', supabaseUrl);
}

// Create Supabase client (even with invalid credentials, to prevent undefined errors)
// The actual API calls will fail with better error messages
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
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
