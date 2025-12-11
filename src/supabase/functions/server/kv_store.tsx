/* ========================================
 * DEPRECATED - DO NOT USE
 * ========================================
 * This file is NO LONGER USED in ShopEasy.
 * 
 * The system has been migrated from:
 * ❌ OLD: Deno KV store (kv_store_088c2cd9 table)
 * ✅ NEW: Proper Supabase PostgreSQL tables
 * 
 * Current database structure:
 * - organizations
 * - branches  
 * - warehouses
 * - products
 * - inventory (replaces stock)
 * - stock (warehouse stock)
 * - transfers
 * - sales
 * - sale_items
 * - returns
 * - expenses
 * - suppliers
 * - user_profiles
 * - audit_logs
 * 
 * API Layer:
 * ✅ Use: /lib/api-supabase.ts
 * ❌ Don't use: /lib/api.ts (old KV store)
 * 
 * This file is kept for reference only.
 * ======================================== */

// This file is deprecated and should not be used.
// All data access should go through /lib/api-supabase.ts

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

// DEPRECATED: Use api-supabase functions instead
export const set = async (key: string, value: any): Promise<void> => {
  throw new Error("DEPRECATED: Use api-supabase.ts instead. This KV store is no longer used.");
};

// DEPRECATED: Use api-supabase functions instead
export const get = async (key: string): Promise<any> => {
  throw new Error("DEPRECATED: Use api-supabase.ts instead. This KV store is no longer used.");
};

// DEPRECATED: Use api-supabase functions instead
export const del = async (key: string): Promise<void> => {
  throw new Error("DEPRECATED: Use api-supabase.ts instead. This KV store is no longer used.");
};

// DEPRECATED: Use api-supabase functions instead
export const mset = async (keys: string[], values: any[]): Promise<void> => {
  throw new Error("DEPRECATED: Use api-supabase.ts instead. This KV store is no longer used.");
};

// DEPRECATED: Use api-supabase functions instead
export const mget = async (keys: string[]): Promise<any[]> => {
  throw new Error("DEPRECATED: Use api-supabase.ts instead. This KV store is no longer used.");
};

// DEPRECATED: Use api-supabase functions instead
export const mdel = async (keys: string[]): Promise<void> => {
  throw new Error("DEPRECATED: Use api-supabase.ts instead. This KV store is no longer used.");
};

// DEPRECATED: Use api-supabase functions instead
export const getByPrefix = async (prefix: string): Promise<any[]> => {
  throw new Error("DEPRECATED: Use api-supabase.ts instead. This KV store is no longer used.");
};
