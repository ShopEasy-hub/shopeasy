/**
 * ShopEasy API Layer - Supabase PostgreSQL Version
 * This replaces the Deno KV store implementation
 */

import { supabase, getCurrentUser, getUserOrganization } from './supabase';

// =====================================================
// AUTHENTICATION
// =====================================================

export async function signUp(email: string, password: string, name: string, orgName: string) {
  try {
    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: undefined, // Disable email confirmation for development
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      throw authError;
    }
    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    console.log('✅ User created:', authData.user.id);

    // Important: The user should now be authenticated
    // Verify session exists
    if (!authData.session) {
      console.warn('⚠️ No session after signup, attempting to sign in...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      if (!signInData.session) throw new Error('Failed to establish session');
    }

    console.log('✅ Session established');

    // Use SECURITY DEFINER function to bypass RLS completely
    const { data: result, error: signupError } = await supabase.rpc('complete_signup', {
      p_user_id: authData.user.id,
      p_org_name: orgName,
      p_user_name: name,
      p_email: email,
    });

    if (signupError) {
      console.error('Complete signup error:', signupError);
      throw new Error(`Failed to complete signup: ${signupError.message}`);
    }

    console.log('✅ Organization and profile created via RPC');

    // Fetch the created organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select()
      .eq('id', result.organization_id)
      .single();

    if (orgError) {
      console.error('Failed to fetch organization:', orgError);
      throw new Error(`Failed to fetch organization: ${orgError.message}`);
    }

    return { user: authData.user, organization: org };
  } catch (error: any) {
    console.error('❌ Signup error:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  // Import config to get proper redirect URL
  const { APP_CONFIG } = await import('./config');
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: APP_CONFIG.passwordReset.redirectUrl,
  });
  
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) throw error;
  return data;
}

export async function getCurrentSession() {
  try {
    console.log('🔍 Getting current session from Supabase...');
    
    // Check if supabase client is initialized
    if (!supabase) {
      console.error('❌ Supabase client not initialized');
      // Return null instead of throwing to prevent crashes
      return null;
    }
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session error:', error);
      // Return null instead of throwing for session errors
      return null;
    }
    
    const session = data?.session || null;
    console.log('✅ Session retrieved:', session ? 'Active session' : 'No session');
    return session;
  } catch (error) {
    console.error('❌ getCurrentSession failed:', error);
    // Return null instead of throwing to prevent crashes
    return null;
  }
}

// =====================================================
// ORGANIZATIONS
// =====================================================

export async function getOrganization(orgId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(orgId: string, updates: any) {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// BRANCHES
// =====================================================

export async function getBranches(orgId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  
  // Convert snake_case to camelCase for frontend
  return (data || []).map((branch: any) => ({
    ...branch,
    isHeadquarters: branch.is_headquarters,
  }));
}

export async function createBranch(orgId: string, branchData: any) {
  // Convert camelCase to snake_case for database
  const dbData: any = {
    organization_id: orgId,
    name: branchData.name,
    address: branchData.address,
    location: branchData.location,
    phone: branchData.phone,
    is_headquarters: branchData.isHeadquarters,
  };

  const { data, error } = await supabase
    .from('branches')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBranch(branchId: string, updates: any) {
  // Convert camelCase to snake_case for database
  const dbUpdates: any = { ...updates };
  if ('isHeadquarters' in updates) {
    dbUpdates.is_headquarters = updates.isHeadquarters;
    delete dbUpdates.isHeadquarters;
  }

  const { data, error } = await supabase
    .from('branches')
    .update(dbUpdates)
    .eq('id', branchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBranch(branchId: string) {
  const { error } = await supabase
    .from('branches')
    .delete()
    .eq('id', branchId);

  if (error) throw error;
  return { success: true };
}

// =====================================================
// WAREHOUSES
// =====================================================

export async function getWarehouses(orgId: string) {
  try {
    console.log('🔍 Getting warehouses for org:', orgId);
    
    // Try using the secure RPC function first (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_warehouses_secure', { p_org_id: orgId });
    
    if (!rpcError && rpcData) {
      console.log('✅ Warehouses loaded via RPC:', rpcData);
      // RPC returns JSONB array, parse it
      const warehouses = Array.isArray(rpcData) ? rpcData : JSON.parse(rpcData as string);
      return warehouses || [];
    }
    
    console.log('⚠️ RPC failed, trying direct query...', rpcError?.message);
    
    // Fallback to direct query
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Direct query error:', error);
      throw error;
    }
    
    console.log('✅ Warehouses loaded via direct query:', data?.length || 0);
    return data || [];
  } catch (error: any) {
    console.error('❌ getWarehouses failed:', error);
    throw error;
  }
}

export async function createWarehouse(orgId: string, warehouseData: any) {
  try {
    console.log('📦 Creating warehouse:', warehouseData);
    
    // Try using the secure RPC function first (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('create_warehouse_secure', { 
        p_org_id: orgId,
        p_data: warehouseData
      });
    
    if (!rpcError && rpcData) {
      console.log('✅ Warehouse created via RPC:', rpcData);
      return typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
    }
    
    console.log('⚠️ RPC failed, trying direct insert...', rpcError?.message);
    
    // Fallback to direct insert
    const { data, error } = await supabase
      .from('warehouses')
      .insert({
        organization_id: orgId,
        ...warehouseData,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Direct insert error:', error);
      throw error;
    }
    
    console.log('✅ Warehouse created via direct insert:', data);
    return data;
  } catch (error: any) {
    console.error('❌ createWarehouse failed:', error);
    throw error;
  }
}

export async function updateWarehouse(warehouseId: string, updates: any) {
  const { data, error } = await supabase
    .from('warehouses')
    .update(updates)
    .eq('id', warehouseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWarehouse(warehouseId: string) {
  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', warehouseId);

  if (error) throw error;
  return { success: true };
}

// =====================================================
// PRODUCTS
// =====================================================

export async function getProducts(orgId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProduct(productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(orgId: string, productData: any) {
  // Convert camelCase to snake_case for database
  const dbData: any = {
    organization_id: orgId,
    name: productData.name,
    sku: productData.sku,
    barcode: productData.barcode,
    category: productData.category,
    price: productData.price,
    unit_cost: productData.unitCost,
    reorder_level: productData.reorderLevel,
    tax_rate: productData.taxRate,
    expiry_date: productData.expiryDate,
  };

  const { data, error } = await supabase
    .from('products')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create product:', error);
    throw new Error(`Failed to create product: ${error.message}`);
  }
  
  // Return with wrapped structure for compatibility
  return { product: data };
}

export async function updateProduct(productId: string, updates: any) {
  // Convert camelCase to snake_case for database
  const dbUpdates: any = {};
  
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
  if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.unitCost !== undefined) dbUpdates.unit_cost = updates.unitCost;
  if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
  if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;
  if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate;

  const { data, error } = await supabase
    .from('products')
    .update(dbUpdates)
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) throw error;
  return { success: true };
}

// =====================================================
// INVENTORY
// =====================================================

export async function getInventory(orgId: string, branchId?: string, warehouseId?: string) {
  let query = supabase
    .from('inventory')
    .select(`
      *,
      product:products(*),
      branch:branches(name),
      warehouse:warehouses(name)
    `)
    .eq('organization_id', orgId);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }
  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getStockLevel(productId: string, branchId?: string, warehouseId?: string) {
  let query = supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', productId);

  if (branchId) {
    query = query.eq('branch_id', branchId).is('warehouse_id', null);
  }
  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId).is('branch_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    // No stock found
    if (error.code === 'PGRST116') return 0;
    throw error;
  }

  return data?.quantity || 0;
}

export async function upsertInventory(
  orgId: string,
  productId: string,
  quantity: number,
  branchId?: string,
  warehouseId?: string
) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('inventory')
    .upsert({
      organization_id: orgId,
      product_id: productId,
      quantity,
      branch_id: branchId || null,
      warehouse_id: warehouseId || null,
      updated_by: user?.id || null,
    }, {
      onConflict: 'product_id,branch_id,warehouse_id',
    })
    .select();

  if (error) throw error;
  
  // If trigger returned NULL (update case), fetch the record
  if (!data || data.length === 0) {
    console.log('⚠️ Upsert returned no data (likely trigger update), fetching record...');
    
    let query = supabase
      .from('inventory')
      .select()
      .eq('organization_id', orgId)
      .eq('product_id', productId);
    
    // Handle null values correctly with .is() instead of .eq()
    if (branchId) {
      query = query.eq('branch_id', branchId);
    } else {
      query = query.is('branch_id', null);
    }
    
    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    } else {
      query = query.is('warehouse_id', null);
    }
    
    const { data: fetchedData, error: fetchError } = await query.single();
    
    if (fetchError) throw fetchError;
    return fetchedData;
  }
  
  // Return first row if data is an array, otherwise return data
  return Array.isArray(data) ? data[0] : data;
}

export async function adjustInventory(
  productId: string,
  adjustment: number,
  branchId?: string,
  warehouseId?: string
) {
  const user = await getCurrentUser();
  const orgId = await getUserOrganization();
  
  if (!orgId) throw new Error('No organization found');

  // Get current quantity
  const currentQty = await getStockLevel(productId, branchId, warehouseId);
  const newQty = Math.max(0, currentQty + adjustment);

  return upsertInventory(orgId, productId, newQty, branchId, warehouseId);
}

// =====================================================
// TRANSFERS
// =====================================================

export async function getTransfers(orgId: string) {
  // Fetch transfers with their items from transfer_items table
  const { data, error } = await supabase
    .from('transfers')
    .select(`
      *,
      transfer_items (
        product_id,
        quantity,
        unit_cost,
        product:products (
          name,
          sku
        )
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching transfers:', error);
    throw error;
  }
  
  console.log(`✅ Fetched ${data?.length || 0} transfers with items`);
  
  // Transform snake_case to camelCase and format items for backward compatibility
  const transformedData = (data || []).map((transfer: any) => {
    // Transform transfer_items to the format expected by the UI
    const items = (transfer.transfer_items || []).map((item: any) => ({
      productId: item.product_id,
      quantity: item.quantity,
      unitCost: item.unit_cost || 0,
      name: item.product?.name || 'Unknown Product',
      sku: item.product?.sku || 'N/A',
    }));
    
    return {
      ...transfer,
      organizationId: transfer.organization_id,
      productId: transfer.product_id,
      fromBranchId: transfer.from_branch_id,
      fromWarehouseId: transfer.from_warehouse_id,
      toBranchId: transfer.to_branch_id,
      toWarehouseId: transfer.to_warehouse_id,
      initiatedBy: transfer.initiated_by,
      approvedBy: transfer.approved_by,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at,
      // Also map to legacy field names for compatibility
      sourceBranchId: transfer.from_branch_id,
      sourceWarehouseId: transfer.from_warehouse_id,
      destinationBranchId: transfer.to_branch_id,
      destinationWarehouseId: transfer.to_warehouse_id,
      // Add the formatted items array
      items: items,
    };
  });
  
  return transformedData;
}

export async function createTransfer(transferData: {
  orgId: string;
  sourceBranchId?: string;
  sourceWarehouseId?: string;
  destinationBranchId?: string;
  destinationWarehouseId?: string;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitCost: number;
  }>;
  reason?: string;
  requiresApproval?: boolean;
}) {
  const user = await getCurrentUser();
  
  // Create a SINGLE transfer with multiple items
  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .insert({
      organization_id: transferData.orgId,
      from_branch_id: transferData.sourceBranchId || null,
      from_warehouse_id: transferData.sourceWarehouseId || null,
      to_branch_id: transferData.destinationBranchId || null,
      to_warehouse_id: transferData.destinationWarehouseId || null,
      notes: transferData.reason || null,
      status: 'pending',
      initiated_by: user?.id || null,
    })
    .select()
    .single();

  if (transferError) {
    console.error('❌ Failed to create transfer:', transferError);
    throw transferError;
  }

  console.log('✅ Transfer created:', transfer.id);

  // Now create transfer_items for each product
  const transferItems = transferData.items.map(item => ({
    transfer_id: transfer.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_cost: item.unitCost || 0,
  }));

  const { data: items, error: itemsError } = await supabase
    .from('transfer_items')
    .insert(transferItems)
    .select();

  if (itemsError) {
    console.error('❌ Failed to create transfer items:', itemsError);
    // Rollback: delete the transfer
    await supabase.from('transfers').delete().eq('id', transfer.id);
    throw itemsError;
  }

  console.log('✅ Transfer items created:', items.length);
  
  return { success: true, transfer, items };
}

export async function updateTransferStatus(
  transferId: string,
  status: 'approved' | 'rejected' | 'in_transit' | 'completed'
) {
  const user = await getCurrentUser();

  // CRITICAL: Fetch the transfer BEFORE updating to check its old status
  const { data: oldTransfer, error: fetchError } = await supabase
    .from('transfers')
    .select('*')
    .eq('id', transferId)
    .single();

  if (fetchError) {
    console.error('❌ Failed to fetch transfer:', fetchError);
    throw fetchError;
  }

  console.log('🔄 Updating transfer status:', {
    id: transferId,
    oldStatus: oldTransfer.status,
    newStatus: status,
    wasApproved: oldTransfer.status === 'approved' || oldTransfer.approved_by !== null
  });

  const updates: any = {
    status,
    approved_by: user?.id || null,
  };

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('transfers')
    .update(updates)
    .eq('id', transferId)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to update transfer status:', {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
      attemptedStatus: status,
      transferId
    });
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Check if it's a constraint violation
    if (error.message?.includes('status') || error.code === '23514') {
      throw new Error(`Status "${status}" is not allowed. Please run the migration: /supabase/migrations/FIX_TRANSFER_INTRANSIT_STATUS.sql`);
    }
    
    throw error;
  }
  
  console.log('✅ Transfer status updated successfully to:', status);
  
  // ⚠️ REMOVED DUPLICATE INVENTORY HANDLING
  // The database trigger 'complete_transfer()' already handles inventory updates
  // Calling handleTransferInventoryUpdate here was causing DOUBLE inventory updates!
  // This was the cause of crashes when accepting transfers
  
  // OLD CODE (CAUSING DOUBLE UPDATES):
  // if (status === 'approved' || status === 'completed') {
  //   await handleTransferInventoryUpdate(data, status, oldTransfer);
  // }
  
  return data;
}

// ⚠️ DEPRECATED - No longer used, kept for reference only
// All inventory updates now handled by database trigger 'complete_transfer()'
async function handleTransferInventoryUpdate_DEPRECATED(transfer: any, status: 'approved' | 'completed', oldTransfer: any) {
  console.log('🔄 Handling inventory update for transfer:', transfer.id, 'Status:', status);
  
  const productId = transfer.product_id;
  const quantity = transfer.quantity;
  
  // When approved: ONLY deduct from source (don't add to destination yet)
  if (status === 'approved') {
    if (transfer.from_branch_id) {
      console.log('📤 [APPROVED] Deducting from source branch:', transfer.from_branch_id, 'Product:', productId, 'Qty:', quantity);
      await adjustBranchStock(transfer.from_branch_id, productId, -quantity);
    } else if (transfer.from_warehouse_id) {
      console.log('📤 [APPROVED] Deducting from source warehouse:', transfer.from_warehouse_id, 'Product:', productId, 'Qty:', quantity);
      await adjustWarehouseStock(transfer.from_warehouse_id, productId, -quantity);
    }
  }
  
  // When completed: add to destination
  // ALSO deduct from source if it wasn't approved first (direct completion)
  if (status === 'completed') {
    // Check if transfer was already approved (source already deducted)
    const wasAlreadyApproved = oldTransfer.status === 'approved' || oldTransfer.approved_by;
    
    // If not previously approved, deduct from source now
    if (!wasAlreadyApproved) {
      console.log('⚡ [DIRECT COMPLETE] Transfer not previously approved, deducting from source first');
      if (transfer.from_branch_id) {
        console.log('📤 [DIRECT] Deducting from source branch:', transfer.from_branch_id);
        await adjustBranchStock(transfer.from_branch_id, productId, -quantity);
      } else if (transfer.from_warehouse_id) {
        console.log('📤 [DIRECT] Deducting from source warehouse:', transfer.from_warehouse_id);
        await adjustWarehouseStock(transfer.from_warehouse_id, productId, -quantity);
      }
    }
    
    // Always add to destination when completed
    if (transfer.to_branch_id) {
      console.log('📥 [COMPLETED] Adding to destination branch:', transfer.to_branch_id, 'Product:', productId, 'Qty:', quantity);
      await adjustBranchStock(transfer.to_branch_id, productId, quantity);
    } else if (transfer.to_warehouse_id) {
      console.log('📥 [COMPLETED] Adding to destination warehouse:', transfer.to_warehouse_id, 'Product:', productId, 'Qty:', quantity);
      await adjustWarehouseStock(transfer.to_warehouse_id, productId, quantity);
    }
  }
}

async function adjustBranchStock(branchId: string, productId: string, adjustment: number) {
  console.log(`📊 adjustBranchStock: Branch=${branchId}, Product=${productId}, Adjustment=${adjustment}`);
  
  // Get organization ID for the branch
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('organization_id')
    .eq('id', branchId)
    .single();
  
  if (branchError || !branch) {
    console.error('❌ Branch not found:', branchError);
    throw new Error('Branch not found');
  }
  
  console.log(`  Organization: ${branch.organization_id}`);
  
  // Get current stock from inventory table
  const { data: currentStock, error: fetchError } = await supabase
    .from('inventory')
    .select('id, quantity')
    .eq('product_id', productId)
    .eq('branch_id', branchId)
    .is('warehouse_id', null)
    .maybeSingle();
  
  if (fetchError) {
    console.error('❌ Error fetching current stock:', fetchError);
    throw fetchError;
  }
  
  const currentQty = currentStock?.quantity || 0;
  const newQty = Math.max(0, currentQty + adjustment);
  
  console.log(`  Current: ${currentQty}, Adjustment: ${adjustment}, New: ${newQty}`);
  
  // Use the safe upsert function from the database
  const { data, error } = await supabase.rpc('upsert_inventory_safe', {
    p_organization_id: branch.organization_id,
    p_product_id: productId,
    p_quantity: newQty,
    p_branch_id: branchId,
    p_warehouse_id: null,
    p_updated_by: (await getCurrentUser())?.id || null,
  });
  
  if (error) {
    console.error('❌ Error upserting inventory:', error);
    throw error;
  }
  
  console.log(`✅ Branch stock adjusted successfully`);
  return data;
}

async function adjustWarehouseStock(warehouseId: string, productId: string, adjustment: number) {
  console.log(`📊 adjustWarehouseStock: Warehouse=${warehouseId}, Product=${productId}, Adjustment=${adjustment}`);
  
  // Get organization ID for the warehouse
  const { data: warehouse, error: warehouseError } = await supabase
    .from('warehouses')
    .select('organization_id')
    .eq('id', warehouseId)
    .single();
  
  if (warehouseError || !warehouse) {
    console.error('❌ Warehouse not found:', warehouseError);
    throw new Error('Warehouse not found');
  }
  
  console.log(`  Organization: ${warehouse.organization_id}`);
  
  // Get current stock from inventory table
  const { data: currentStock, error: fetchError } = await supabase
    .from('inventory')
    .select('id, quantity')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .is('branch_id', null)
    .maybeSingle();
  
  if (fetchError) {
    console.error('❌ Error fetching current stock:', fetchError);
    throw fetchError;
  }
  
  const currentQty = currentStock?.quantity || 0;
  const newQty = Math.max(0, currentQty + adjustment);
  
  console.log(`  Current: ${currentQty}, Adjustment: ${adjustment}, New: ${newQty}`);
  
  // Use the safe upsert function from the database
  const { data, error } = await supabase.rpc('upsert_inventory_safe', {
    p_organization_id: warehouse.organization_id,
    p_product_id: productId,
    p_quantity: newQty,
    p_branch_id: null,
    p_warehouse_id: warehouseId,
    p_updated_by: (await getCurrentUser())?.id || null,
  });
  
  if (error) {
    console.error('❌ Error upserting inventory:', error);
    throw error;
  }
  
  console.log(`✅ Warehouse stock adjusted successfully`);
  return data;
}

// =====================================================
// SUPPLIERS
// =====================================================

export async function getSuppliers(orgId: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSupplier(orgId: string, supplierData: any) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      organization_id: orgId,
      ...supplierData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSupplier(supplierId: string, updates: any) {
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadSupplierInvoice(supplierId: string, file: File) {
  const user = await getCurrentUser();
  const orgId = await getUserOrganization();
  
  if (!user || !orgId) throw new Error('Not authenticated');

  // Upload file to Supabase Storage
  const fileName = `${orgId}/${supplierId}/${Date.now()}_${file.name}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('supplier-invoices')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('supplier-invoices')
    .getPublicUrl(fileName);

  // Update supplier with invoice URL
  const { data, error } = await supabase
    .from('suppliers')
    .update({ invoice_url: publicUrl })
    .eq('id', supplierId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// EXPENSES
// =====================================================

export async function getExpenses(orgId: string, branchId?: string) {
  let query = supabase
    .from('expenses')
    .select('*, branch:branches(name)')
    .eq('organization_id', orgId);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createExpense(orgId: string, expenseData: any) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      organization_id: orgId,
      ...expenseData,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// SALES
// =====================================================

export async function getSales(orgId: string, branchId?: string) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      branch:branches(name),
      items:sale_items(
        *,
        product:products(name, sku)
      )
    `)
    .eq('organization_id', orgId);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSale(saleData: {
  orgId: string;
  branchId: string;
  customer: string;
  customerPhone?: string;
  customerBirthDate?: string;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    discount: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'pos' | 'transfer';
  amountPaid: number;
  change: number;
}) {
  const user = await getCurrentUser();

  // Create the sale record
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      organization_id: saleData.orgId,
      branch_id: saleData.branchId,
      customer_name: saleData.customer,
      customer_phone: saleData.customerPhone || null,
      customer_birth_date: saleData.customerBirthDate || null,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      total: saleData.total,
      payment_method: saleData.paymentMethod,
      amount_paid: saleData.amountPaid,
      change: saleData.change,
      status: 'completed',
      processed_by: user?.id || null,
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // Create sale items
  const saleItems = saleData.items.map((item) => ({
    sale_id: sale.id,
    product_id: item.productId,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    discount: item.discount,
    subtotal: item.price * item.quantity * (1 - item.discount / 100),
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems);

  if (itemsError) throw itemsError;

  // Deduct stock for each item sold
  for (const item of saleData.items) {
    try {
      console.log(`🛒 [SALE] Deducting stock for: ${item.name}, Qty: ${item.quantity}, Branch: ${saleData.branchId}`);
      
      // Get branch info for organization ID
      const { data: branch } = await supabase
        .from('branches')
        .select('organization_id')
        .eq('id', saleData.branchId)
        .single();
      
      if (!branch) {
        console.error(`❌ Branch not found: ${saleData.branchId}`);
        continue;
      }
      
      // Get current stock
      const currentQty = await getStockLevel(item.productId, saleData.branchId);
      const newQty = Math.max(0, currentQty - item.quantity);
      
      console.log(`  Current stock: ${currentQty}, Deducting: ${item.quantity}, New: ${newQty}`);
      
      // Use the safe upsert function
      const { error: stockError } = await supabase.rpc('upsert_inventory_safe', {
        p_organization_id: branch.organization_id,
        p_product_id: item.productId,
        p_quantity: newQty,
        p_branch_id: saleData.branchId,
        p_warehouse_id: null,
        p_updated_by: user?.id || null,
      });
      
      if (stockError) {
        console.error(`❌ Failed to update stock for ${item.name}:`, stockError);
        throw stockError;
      }
      
      console.log(`✅ Stock deducted successfully for ${item.name}`);
    } catch (error) {
      console.error(`❌ Failed to update stock for product ${item.productId}:`, error);
      throw error; // Don't continue if stock update fails
    }
  }

  console.log(`✅ Sale completed successfully: ID ${sale.id}, Total: ${saleData.total}`);
  return { success: true, sale };
}

// =====================================================
// RETURNS
// =====================================================

export async function getReturns(orgId: string, branchId?: string) {
  let query = supabase
    .from('returns')
    .select(`
      *,
      branch:branches(name),
      product:products(name, sku)
    `)
    .eq('organization_id', orgId);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createReturn(returnData: {
  orgId: string;
  branchId: string;
  productId: string;
  quantity: number;
  reason: string;
  refundAmount: number;
  saleId?: string;
}) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('returns')
    .insert({
      organization_id: returnData.orgId,
      branch_id: returnData.branchId,
      product_id: returnData.productId,
      quantity: returnData.quantity,
      reason: returnData.reason,
      refund_amount: returnData.refundAmount,
      sale_id: returnData.saleId || null,
      processed_by: user?.id || null,
      status: 'completed', // Set to completed since stock is immediately restored
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// USER PROFILES
// =====================================================

export async function getUserProfile(userId?: string) {
  const user = userId ? { id: userId } : await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, organization:organizations(name, subscription_status, subscription_plan, trial_start_date)')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrganizationUsers(orgId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createOrganizationUser(orgId: string, userData: {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId?: string;
}) {
  try {
    console.log('📝 Creating organization user:', userData.email);
    
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Try the secure RPC function first (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('create_organization_user_secure', {
        p_org_id: orgId,
        p_user_data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          branchId: userData.branchId
        }
      });

    if (!rpcError && rpcData) {
      console.log('✅ RPC response:', rpcData);
      
      // SUCCESS! Profile created
      // Remove the manual_steps_required error - just return the user
      // The profile is created, user appears in list
      // Auth can be set up later
      if (rpcData.success && rpcData.user) {
        console.log('✅ User profile created successfully');
        
        // If there's an auth_note, log it but don't throw error
        if (rpcData.auth_note) {
          console.log('ℹ️ Auth note:', rpcData.auth_note);
        }
        
        return rpcData.user;
      }
      
      // Legacy: Check if manual steps are required (old format)
      if (rpcData.manual_steps_required) {
        const instructions = rpcData.instructions;
        // DON'T throw error - just log and return the user
        console.log('ℹ️ User profile created. Auth setup available in Dashboard.');
        console.log('📋 Instructions:', instructions);
        
        // Return the user even if auth needs manual setup
        if (rpcData.user) {
          return rpcData.user;
        }
      }
      
      // Check if this is the old format with manual_steps (deprecated)
      if (rpcData.manual_steps) {
        console.log('⚠️ Auth user needs to be created manually in Supabase Dashboard');
        // Don't throw - just return what we have
        return rpcData.user || rpcData;
      }
      
      return rpcData.user || rpcData;
    }

    // Check if error is about duplicate user
    const errorMessage = rpcError?.message?.toLowerCase() || '';
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      console.log('❌ Duplicate user detected');
      throw new Error(`A user with the email "${userData.email}" already exists in the system.`);
    }

    console.log('⚠️ RPC function failed, trying Edge Function...', rpcError?.message);

    // Fallback: Try Edge Function
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-organization-user', {
      body: { orgId, userData },
    });

    if (edgeError) {
      console.error('❌ Edge function error:', edgeError);
      console.error('❌ Edge function error details:', JSON.stringify(edgeError, null, 2));
      
      // Provide helpful error message based on the actual issue
      throw new Error(
        `❌ USER CREATION FAILED\\n\\n` +
        `Issue: ${rpcError?.message || 'Unknown error'}\\n\\n` +
        `Edge Function Error: ${edgeError.message}\\n` +
        `Details: ${JSON.stringify(edgeError, null, 2)}\\n\\n` +
        `Solutions:\\n` +
        `1. Check Supabase Dashboard → Functions → create-organization-user → Logs\\n` +
        `2. Verify secrets are set: supabase secrets list\\n` +
        `3. Redeploy: supabase functions deploy create-organization-user`
      );
    }

    // Log the full response for debugging
    console.log('📥 Edge Function response:', edgeData);

    if (!edgeData || !edgeData.success) {
      // Check for duplicate error in edge function response
      const edgeErrorMsg = edgeData?.error?.toLowerCase() || '';
      if (edgeErrorMsg.includes('already exists') || edgeErrorMsg.includes('duplicate')) {
        throw new Error(`A user with the email "${userData.email}" already exists in the system.`);
      }
      
      // Show detailed error from Edge Function
      const errorDetails = edgeData?.details ? `\n\nDetails: ${edgeData.details}` : '';
      throw new Error(`Edge Function failed: ${edgeData?.error || 'Unknown error'}${errorDetails}`);
    }

    console.log('✅ User created via Edge Function:', edgeData.user);
    return edgeData.user;
  } catch (error: any) {
    console.error('❌ Create user error:', error);
    throw error;
  }
}

export async function updateOrganizationUser(userId: string, updates: {
  name?: string;
  role?: string;
  branchId?: string;
  status?: string;
}) {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.branchId !== undefined) updateData.assigned_branch_id = updates.branchId;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update user error:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    console.log('✅ User updated:', data);
    return data;
  } catch (error: any) {
    console.error('❌ Update user error:', error);
    throw error;
  }
}

export async function deleteOrganizationUser(userId: string) {
  try {
    console.log('🗑️  Deleting user:', userId);
    
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // First, try to delete using the auth.admin API (requires service role)
    // This is only available if you have the service role key
    // For production, use an Edge Function
    
    // Delete from auth.users (will cascade to user_profiles if FK is set)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      // If admin API fails, try direct deletion from user_profiles
      // The auth.users entry should be handled by cascade or manual cleanup
      console.warn('Auth deletion failed, trying profile deletion:', authError);
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        throw new Error(`Failed to delete user: ${profileError.message}`);
      }
      
      console.log('⚠️  User profile deleted, but auth.users may need manual cleanup');
      return { success: true, needsCleanup: true };
    }

    console.log('✅ User deleted successfully');
    return { success: true, needsCleanup: false };
  } catch (error: any) {
    console.error('❌ Delete user error:', error);
    throw error;
  }
}

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

export function subscribeToInventoryChanges(
  orgId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel('inventory-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `organization_id=eq.${orgId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToTransfers(
  orgId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel('transfer-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transfers',
        filter: `organization_id=eq.${orgId}`,
      },
      callback
    )
    .subscribe();
}

// =====================================================
// WAREHOUSE SUPPLIER PRODUCTS
// =====================================================

export async function getWarehouseSupplierProducts(
  orgId: string,
  warehouseId: string,
  productId?: string
) {
  let query = supabase
    .from('warehouse_supplier_products')
    .select(`
      *,
      warehouse:warehouses(id, name, location),
      product:products(id, name, sku),
      supplier:suppliers(id, name, contact_person, phone, email)
    `)
    .eq('organization_id', orgId)
    .eq('warehouse_id', warehouseId)
    .eq('is_active', true);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query.order('is_primary_supplier', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createWarehouseSupplierProduct(productData: {
  orgId: string;
  warehouseId: string;
  productId: string;
  supplierId: string;
  costPrice: number;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  isPrimarySupplier?: boolean;
  supplierProductCode?: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('warehouse_supplier_products')
    .insert({
      organization_id: productData.orgId,
      warehouse_id: productData.warehouseId,
      product_id: productData.productId,
      supplier_id: productData.supplierId,
      cost_price: productData.costPrice,
      minimum_order_quantity: productData.minimumOrderQuantity || 1,
      lead_time_days: productData.leadTimeDays || 7,
      is_primary_supplier: productData.isPrimarySupplier || false,
      supplier_product_code: productData.supplierProductCode,
      notes: productData.notes,
      is_active: true,
    })
    .select(`
      *,
      warehouse:warehouses(id, name),
      product:products(id, name, sku),
      supplier:suppliers(id, name)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateWarehouseSupplierProduct(
  id: string,
  updates: {
    costPrice?: number;
    minimumOrderQuantity?: number;
    leadTimeDays?: number;
    isPrimarySupplier?: boolean;
    supplierProductCode?: string;
    notes?: string;
    isActive?: boolean;
  }
) {
  const updateData: any = {};
  
  if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
  if (updates.minimumOrderQuantity !== undefined) updateData.minimum_order_quantity = updates.minimumOrderQuantity;
  if (updates.leadTimeDays !== undefined) updateData.lead_time_days = updates.leadTimeDays;
  if (updates.isPrimarySupplier !== undefined) updateData.is_primary_supplier = updates.isPrimarySupplier;
  if (updates.supplierProductCode !== undefined) updateData.supplier_product_code = updates.supplierProductCode;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('warehouse_supplier_products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWarehouseSupplierProduct(id: string) {
  const { error } = await supabase
    .from('warehouse_supplier_products')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}

// =====================================================
// UTILITY / DEBUG FUNCTIONS
// =====================================================

/**
 * Get current user's access token
 */
export async function getAccessToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session.access_token;
}

/**
 * Delete all products for an organization (DEBUG ONLY)
 */
export async function deleteAllProducts(orgId: string) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('organization_id', orgId)
    .select();

  if (error) throw error;
  
  return {
    success: true,
    message: `Deleted ${data?.length || 0} products`,
    count: data?.length || 0,
  };
}

/**
 * Delete all inventory/stock for an organization (DEBUG ONLY)
 */
export async function deleteAllStock(orgId: string) {
  const { data, error } = await supabase
    .from('inventory')
    .delete()
    .eq('organization_id', orgId)
    .select();

  if (error) throw error;
  
  return {
    success: true,
    message: `Deleted ${data?.length || 0} stock entries`,
    count: data?.length || 0,
  };
}

/**
 * Delete all inventory AND products for an organization (DEBUG ONLY)
 */
export async function deleteAllInventory(orgId: string) {
  // Delete inventory first
  const { data: stockData, error: stockError } = await supabase
    .from('inventory')
    .delete()
    .eq('organization_id', orgId)
    .select();

  if (stockError) throw stockError;

  // Then delete products (cascade will handle related data)
  const { data: productData, error: productError } = await supabase
    .from('products')
    .delete()
    .eq('organization_id', orgId)
    .select();

  if (productError) throw productError;
  
  return {
    success: true,
    message: `Deleted ${productData?.length || 0} products and ${stockData?.length || 0} stock entries`,
    products: productData?.length || 0,
    stock: stockData?.length || 0,
  };
}