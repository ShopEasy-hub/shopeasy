/**
 * ShopEasy API - Re-exports from Supabase implementation
 * This file maintains backward compatibility by re-exporting from api-supabase.ts
 * 
 * All files importing from './lib/api' will now use the new PostgreSQL backend
 */

// Import everything from api-supabase
import * as ApiSupabase from './api-supabase';

// Re-export types and functions that don't need wrapping
export {
  signUp,
  signIn,
  signOut,
  getCurrentSession,
  updateOrganization,
  updateBranch,
  deleteBranch,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getProduct,
  updateProduct,
  deleteProduct,
  getInventory,
  getStockLevel,
  upsertInventory,
  adjustInventory,
  createTransfer,
  updateTransferStatus,
  getSuppliers,
  createSupplier,
  updateSupplier,
  uploadSupplierInvoice,
  getExpenses,
  createExpense,
  createReturn,
  getReturns,
  getUserProfile,
  getOrganizationUsers,
  subscribeToInventoryChanges,
  subscribeToTransfers,
  getAccessToken,
  deleteAllProducts,
  deleteAllStock,
  deleteAllInventory,
  getWarehouseSupplierProducts,
  createWarehouseSupplierProduct,
  updateWarehouseSupplierProduct,
  deleteWarehouseSupplierProduct,
} from './api-supabase';

// Import specific functions for backward compatibility aliases
import { 
  getUserProfile, 
  getInventory, 
  upsertInventory,
  getOrganizationUsers,
  updateTransferStatus,
  getBranches as getbranchesRaw,
  getProducts as getProductsRaw,
  getSales as getSalesRaw,
  getTransfers as getTransfersRaw,
  getOrganization as getOrganizationRaw,
  createBranch as createBranchRaw,
} from './api-supabase';

// =====================================================
// WRAPPED FUNCTIONS FOR BACKWARD COMPATIBILITY
// These wrap the raw Supabase functions to match the expected API format
// =====================================================

export async function getBranches(orgId: string) {
  const branches = await getbranchesRaw(orgId);
  return { branches };
}

export async function getProducts(orgId: string) {
  const products = await getProductsRaw(orgId);
  
  // Transform snake_case to camelCase for backward compatibility
  const transformedProducts = products.map((product: any) => ({
    ...product,
    unitCost: product.unit_cost,
    reorderLevel: product.reorder_level,
    taxRate: product.tax_rate,
    expiryDate: product.expiry_date,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  }));
  
  return { products: transformedProducts };
}

export async function getSales(orgId: string, branchId?: string) {
  const sales = await getSalesRaw(orgId, branchId);
  
  // Transform snake_case to camelCase for backward compatibility
  const transformedSales = sales.map((sale: any) => ({
    ...sale,
    branchId: sale.branch_id,
    organizationId: sale.organization_id,
    customerName: sale.customer_name,
    customerPhone: sale.customer_phone,
    customerBirthDate: sale.customer_birth_date,
    paymentMethod: sale.payment_method,
    amountPaid: sale.amount_paid,
    processedBy: sale.processed_by,
    createdAt: sale.created_at,
    updatedAt: sale.updated_at,
  }));
  
  return { sales: transformedSales };
}

export async function getTransfers(orgId: string) {
  const transfers = await getTransfersRaw(orgId);
  return { transfers };
}

export async function getOrganization(orgId: string) {
  const org = await getOrganizationRaw(orgId);
  return { org };
}

export async function createBranch(orgId: string, branchData: any) {
  const branch = await createBranchRaw(orgId, branchData);
  return { success: true, branch };
}

// Re-export createProduct from api-supabase (it already returns { product: data })
export { createProduct, createSale } from './api-supabase';

// =====================================================
// BACKWARD COMPATIBILITY ALIASES
// =====================================================

export async function getUser(userId?: string) {
  return getUserProfile(userId);
}

export async function getBranchStock(branchId: string) {
  // Get current user's organization
  const { getUserOrganization } = await import('./supabase');
  const orgId = await getUserOrganization();
  if (!orgId) throw new Error('No organization found');
  
  const inventory = await getInventory(orgId, branchId);
  
  // Transform snake_case to camelCase for backward compatibility
  const stock = inventory.map((item: any) => ({
    ...item,
    productId: item.product_id,
    branchId: item.branch_id,
    warehouseId: item.warehouse_id,
    organizationId: item.organization_id,
    updatedBy: item.updated_by,
    lastUpdated: item.updated_at || item.created_at,
  }));
  
  return { stock };
}

export async function getWarehouseStock(orgId: string, warehouseId: string) {
  return getInventory(orgId, undefined, warehouseId);
}

// Transfer status update helpers
export async function approveTransfer(transferId: string) {
  return updateTransferStatus(transferId, 'approved');
}

export async function markTransferInTransit(transferId: string) {
  return updateTransferStatus(transferId, 'in_transit');
}

export async function receiveTransfer(transferId: string, items?: any[], notes?: string) {
  // Complete the transfer (inventory update handled by database trigger)
  return updateTransferStatus(transferId, 'completed');
}

export async function updateStock(
  branchIdOrOrgId: string,
  productId: string,
  quantity: number,
  operationOrBranchId?: string | 'add' | 'subtract' | 'set',
  warehouseId?: string
) {
  // Get current user's organization
  const { getUserOrganization } = await import('./supabase');
  const { getStockLevel } = await import('./api-supabase');
  const orgId = await getUserOrganization();
  if (!orgId) throw new Error('No organization found');
  
  // Handle both old and new calling patterns
  let branchId: string | undefined;
  let operation: 'add' | 'subtract' | 'set' = 'set';
  let finalQuantity: number = quantity;
  
  // Check if this is the new calling pattern: updateStock(branchId, productId, quantity, operation)
  if (typeof operationOrBranchId === 'string' && ['add', 'subtract', 'set'].includes(operationOrBranchId)) {
    branchId = branchIdOrOrgId; // First param is branchId
    operation = operationOrBranchId as 'add' | 'subtract' | 'set';
    
    // Get current stock and calculate new quantity
    if (operation === 'add' || operation === 'subtract') {
      const currentQty = await getStockLevel(productId, branchId, warehouseId);
      if (operation === 'add') {
        finalQuantity = currentQty + quantity;
      } else {
        finalQuantity = Math.max(0, currentQty - quantity);
      }
    }
  } else {
    // Old calling pattern: updateStock(orgId, productId, quantity, branchId, warehouseId)
    branchId = operationOrBranchId;
  }
  
  const result = await upsertInventory(orgId, productId, finalQuantity, branchId, warehouseId);
  return { success: true, stock: result };
}

export async function getUsers(orgId: string) {
  const users = await getOrganizationUsers(orgId);
  return { users };
}

export async function createUser(orgId: string, userData: any) {
  const { createOrganizationUser } = await import('./api-supabase');
  const user = await createOrganizationUser(orgId, userData);
  return { users: [user] };
}

export async function updateUser(userId: string, updates: any) {
  const { updateOrganizationUser } = await import('./api-supabase');
  const user = await updateOrganizationUser(userId, updates);
  return user;
}

export async function deleteUser(userId: string) {
  const { deleteOrganizationUser } = await import('./api-supabase');
  const result = await deleteOrganizationUser(userId);
  return result;
}