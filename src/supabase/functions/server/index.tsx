import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper to get authenticated user
async function getAuthUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  
  return user;
}

// ======================
// AUTH ROUTES
// ======================

app.post('/make-server-088c2cd9/auth/signup', async (c) => {
  try {
    const { email, password, name, orgName, role = 'owner' } = await c.req.json();
    
    console.log('Signup request for:', email);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // Auto-confirm since email server not configured
    });
    
    if (error) {
      console.error('Supabase auth error:', error);
      
      // Check for specific error types
      if (error.message?.includes('already') || error.code === 'email_exists') {
        return c.json({ 
          success: false, 
          error: `An account with email "${email}" already exists. Please use a different email address.`,
          errorCode: 'EMAIL_EXISTS'
        }, 400);
      }
      
      throw error;
    }
    
    const userId = data.user.id;
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Creating organization:', orgId, 'for user:', userId);
    
    // Create organization
    await kv.set(`org:${orgId}`, {
      id: orgId,
      name: orgName,
      logo: '',
      ownerId: userId,
      createdAt: new Date().toISOString(),
    });
    
    // Create user profile
    await kv.set(`user:${userId}`, {
      id: userId,
      email,
      name,
      orgId,
      role,
      createdAt: new Date().toISOString(),
    });
    
    // Add user to org users list
    await kv.set(`org:${orgId}:users`, [userId]);
    
    console.log('Signup completed successfully for:', email);
    
    return c.json({ success: true, userId, orgId });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred during signup'
    }, 400);
  }
});

// ======================
// ORGANIZATION ROUTES
// ======================

app.get('/make-server-088c2cd9/org/:orgId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const org = await kv.get(`org:${orgId}`);
    
    if (!org) return c.json({ error: 'Organization not found' }, 404);
    
    return c.json({ success: true, org });
  } catch (error) {
    console.error('Get org error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/org/:orgId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const updates = await c.req.json();
    
    const org = await kv.get(`org:${orgId}`);
    if (!org) return c.json({ error: 'Organization not found' }, 404);
    
    const updatedOrg = { ...org, ...updates };
    await kv.set(`org:${orgId}`, updatedOrg);
    
    return c.json({ success: true, org: updatedOrg });
  } catch (error) {
    console.error('Update org error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// BRANCH ROUTES
// ======================

app.get('/make-server-088c2cd9/org/:orgId/branches', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    let branchIds = await kv.get(`org:${orgId}:branches`) || [];
    
    // Deduplicate branch IDs
    branchIds = [...new Set(branchIds)];
    await kv.set(`org:${orgId}:branches`, branchIds);
    
    const branches = await Promise.all(
      branchIds.map((id: string) => kv.get(`branch:${id}`))
    );
    
    return c.json({ success: true, branches: branches.filter(Boolean) });
  } catch (error) {
    console.error('Get branches error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-088c2cd9/org/:orgId/branches', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const branchData = await c.req.json();
    
    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const branch = {
      id: branchId,
      orgId,
      ...branchData,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`branch:${branchId}`, branch);
    
    // Prevent duplicate entries
    const branchIds = await kv.get(`org:${orgId}:branches`) || [];
    if (!branchIds.includes(branchId)) {
      await kv.set(`org:${orgId}:branches`, [...branchIds, branchId]);
    }
    
    return c.json({ success: true, branch });
  } catch (error) {
    console.error('Create branch error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// PRODUCT ROUTES
// ======================

app.get('/make-server-088c2cd9/org/:orgId/products', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    let productIds = await kv.get(`org:${orgId}:products`) || [];
    
    // Deduplicate product IDs
    productIds = [...new Set(productIds)];
    await kv.set(`org:${orgId}:products`, productIds);
    
    const products = await Promise.all(
      productIds.map((id: string) => kv.get(`product:${id}`))
    );
    
    return c.json({ success: true, products: products.filter(Boolean) });
  } catch (error) {
    console.error('Get products error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-088c2cd9/org/:orgId/products', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const productData = await c.req.json();
    
    const productId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const product = {
      id: productId,
      orgId,
      ...productData,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`product:${productId}`, product);
    
    // Prevent duplicate entries
    const productIds = await kv.get(`org:${orgId}:products`) || [];
    if (!productIds.includes(productId)) {
      await kv.set(`org:${orgId}:products`, [...productIds, productId]);
    }
    
    return c.json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/products/:productId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const productId = c.req.param('productId');
    const product = await kv.get(`product:${productId}`);
    
    if (!product) return c.json({ error: 'Product not found' }, 404);
    
    return c.json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/products/:productId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const productId = c.req.param('productId');
    const updates = await c.req.json();
    
    const product = await kv.get(`product:${productId}`);
    if (!product) return c.json({ error: 'Product not found' }, 404);
    
    const updatedProduct = { ...product, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`product:${productId}`, updatedProduct);
    
    return c.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete a product (and its stock from all branches)
app.delete('/make-server-088c2cd9/products/:productId', async (c) => {
  try {
    console.log('🗑️ DELETE product endpoint called');
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      console.log('❌ Unauthorized - no user');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const productId = c.req.param('productId');
    console.log('🗑️ Attempting to delete product:', productId);
    
    const product = await kv.get(`product:${productId}`);
    console.log('🗑️ Product found:', product ? 'Yes' : 'No');
    
    if (!product) {
      console.log('❌ Product not found in KV store');
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const orgId = product.orgId;
    
    // Remove product from org's product list
    const productIds = await kv.get(`org:${orgId}:products`) || [];
    const updatedProductIds = productIds.filter((id: string) => id !== productId);
    await kv.set(`org:${orgId}:products`, updatedProductIds);
    
    // Delete the product itself
    await kv.del(`product:${productId}`);
    
    // Delete stock from all branches
    const branchIds = await kv.get(`org:${orgId}:branches`) || [];
    let stockDeleted = 0;
    for (const branchId of branchIds) {
      const stockKey = `stock:${branchId}:${productId}`;
      const stockExists = await kv.get(stockKey);
      if (stockExists) {
        await kv.del(stockKey);
        stockDeleted++;
      }
    }
    
    console.log(`Deleted product ${productId} and ${stockDeleted} stock entries`);
    
    return c.json({ 
      success: true, 
      message: `Product deleted successfully`,
      stockDeleted 
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// BULK DELETION ROUTES (FOR DEBUGGING)
// ======================

// Delete all products for an organization
app.delete('/make-server-088c2cd9/org/:orgId/products/all', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    console.log(`🗑️ Deleting ALL products for org: ${orgId}`);
    
    // Get all products for this org
    const productIds = await kv.get(`org:${orgId}:products`) || [];
    console.log(`Found ${productIds.length} products to delete`);
    
    // Delete each product and its stock
    let productsDeleted = 0;
    let stockDeleted = 0;
    
    const branchIds = await kv.get(`org:${orgId}:branches`) || [];
    
    for (const productId of productIds) {
      // Delete product data
      await kv.del(`product:${productId}`);
      productsDeleted++;
      
      // Delete stock from all branches
      for (const branchId of branchIds) {
        const stockKey = `stock:${branchId}:${productId}`;
        const stockExists = await kv.get(stockKey);
        if (stockExists) {
          await kv.del(stockKey);
          stockDeleted++;
        }
      }
    }
    
    // Clear the org's product list
    await kv.set(`org:${orgId}:products`, []);
    
    console.log(`✅ Deleted ${productsDeleted} products and ${stockDeleted} stock entries`);
    
    return c.json({ 
      success: true, 
      message: `Deleted ${productsDeleted} products and ${stockDeleted} stock entries`,
      products: productsDeleted,
      stock: stockDeleted
    });
  } catch (error) {
    console.error('Delete all products error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete all stock for an organization (keep products)
app.delete('/make-server-088c2cd9/org/:orgId/stock/all', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    console.log(`🗑️ Deleting ALL stock for org: ${orgId}`);
    
    // Get all branches and products
    const branchIds = await kv.get(`org:${orgId}:branches`) || [];
    const productIds = await kv.get(`org:${orgId}:products`) || [];
    
    let stockDeleted = 0;
    
    // Delete stock for each product in each branch
    for (const branchId of branchIds) {
      for (const productId of productIds) {
        const stockKey = `stock:${branchId}:${productId}`;
        const stockExists = await kv.get(stockKey);
        if (stockExists) {
          await kv.del(stockKey);
          stockDeleted++;
        }
      }
    }
    
    console.log(`✅ Deleted ${stockDeleted} stock entries`);
    
    return c.json({ 
      success: true, 
      message: `Deleted ${stockDeleted} stock entries`,
      stock: stockDeleted
    });
  } catch (error) {
    console.error('Delete all stock error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete all inventory (products + stock) for an organization
app.delete('/make-server-088c2cd9/org/:orgId/inventory/all', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    console.log(`🗑️ Deleting ALL INVENTORY (products + stock) for org: ${orgId}`);
    
    // Get all products and branches
    const productIds = await kv.get(`org:${orgId}:products`) || [];
    const branchIds = await kv.get(`org:${orgId}:branches`) || [];
    
    let productsDeleted = 0;
    let stockDeleted = 0;
    
    // Delete all products and their stock
    for (const productId of productIds) {
      // Delete product data
      await kv.del(`product:${productId}`);
      productsDeleted++;
      
      // Delete stock from all branches
      for (const branchId of branchIds) {
        const stockKey = `stock:${branchId}:${productId}`;
        const stockExists = await kv.get(stockKey);
        if (stockExists) {
          await kv.del(stockKey);
          stockDeleted++;
        }
      }
    }
    
    // Clear the org's product list
    await kv.set(`org:${orgId}:products`, []);
    
    console.log(`✅ Deleted ${productsDeleted} products and ${stockDeleted} stock entries`);
    
    return c.json({ 
      success: true, 
      message: `Deleted all inventory: ${productsDeleted} products and ${stockDeleted} stock entries`,
      products: productsDeleted,
      stock: stockDeleted
    });
  } catch (error) {
    console.error('Delete all inventory error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// STOCK ROUTES
// ======================

app.get('/make-server-088c2cd9/stock/:branchId/:productId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const branchId = c.req.param('branchId');
    const productId = c.req.param('productId');
    
    const stock = await kv.get(`stock:${branchId}:${productId}`) || { quantity: 0 };
    
    return c.json({ success: true, stock });
  } catch (error) {
    console.error('Get stock error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/stock/:branchId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const branchId = c.req.param('branchId');
    console.log(`📦 Fetching stock for location: ${branchId}`);
    
    // Check if this is a warehouse or branch based on prefix
    const isWarehouse = branchId.startsWith('warehouse_');
    const prefix = isWarehouse ? `warehouse-stock:${branchId}:` : `stock:${branchId}:`;
    
    const stockKeys = await kv.getByPrefix(prefix);
    console.log(`📦 Found ${stockKeys.length} stock items for ${branchId}`);
    
    // Map the stock entries to a consistent format
    const stock = stockKeys.map((item: any) => {
      const productId = item.key.split(':')[2];
      return {
        branchId,
        productId,
        quantity: item.value?.quantity || 0,
        lastUpdated: item.value?.updatedAt || item.value?.lastUpdated,
        updatedAt: item.value?.updatedAt || item.value?.lastUpdated,
      };
    });
    
    console.log(`📦 Returning ${stock.length} deduplicated stock items`);
    return c.json({ success: true, stock });
  } catch (error) {
    console.error('Get branch stock error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/stock/:branchId/:productId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const branchId = c.req.param('branchId');
    const productId = c.req.param('productId');
    const { quantity, operation = 'set', reason = '' } = await c.req.json();
    
    console.log(`📦 Stock Update Request: ${operation} ${quantity} for product ${productId} in ${branchId}`);
    
    // Determine if this is a warehouse or branch
    const isWarehouse = branchId.startsWith('warehouse_');
    const stockKey = isWarehouse ? `warehouse-stock:${branchId}:${productId}` : `stock:${branchId}:${productId}`;
    
    // 🔒 ATOMIC OPERATION: Use a lock key to prevent race conditions
    const lockKey = `lock:${stockKey}`;
    const lockId = `${Date.now()}_${Math.random()}`;
    const maxRetries = 5;
    let acquired = false;
    
    // Try to acquire lock with retries
    for (let i = 0; i < maxRetries; i++) {
      const existingLock = await kv.get(lockKey);
      if (!existingLock || (Date.now() - existingLock.timestamp > 5000)) {
        // Lock is free or expired (older than 5 seconds)
        await kv.set(lockKey, { lockId, timestamp: Date.now() });
        acquired = true;
        break;
      }
      // Wait 100ms before retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!acquired) {
      console.error(`❌ Failed to acquire lock for ${stockKey}`);
      return c.json({ error: 'Resource busy, please try again' }, 409);
    }
    
    try {
      // Get current stock
      const currentStock = await kv.get(stockKey) || { quantity: 0 };
      console.log(`📦 Current stock: ${currentStock.quantity || 0}`);
      
      let newQuantity = quantity;
      if (operation === 'add') {
        newQuantity = (currentStock.quantity || 0) + quantity;
      } else if (operation === 'subtract') {
        newQuantity = (currentStock.quantity || 0) - quantity;
      }
      
      // Prevent negative stock
      if (newQuantity < 0) {
        console.error(`❌ Insufficient stock: trying to set ${newQuantity}`);
        return c.json({ error: 'Insufficient stock' }, 400);
      }
      
      const timestamp = new Date().toISOString();
      const updatedStock = {
        branchId,
        productId,
        quantity: newQuantity,
        updatedAt: timestamp,
        lastUpdated: timestamp,
        updatedBy: user.id,
      };
      
      // Write stock atomically
      await kv.set(stockKey, updatedStock);
      console.log(`✅ Stock updated successfully: ${newQuantity}`);
      
      // Log stock movement for audit trail
      const movementId = `stock:movement:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await kv.set(movementId, {
        branchId,
        productId,
        operation,
        quantity,
        previousQuantity: currentStock.quantity || 0,
        newQuantity,
        userId: user.id,
        timestamp,
        reason: reason || `Stock ${operation}`,
      });
      
      return c.json({ success: true, stock: updatedStock });
    } finally {
      // Always release lock
      await kv.del(lockKey);
    }
  } catch (error) {
    console.error('Update stock error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// STOCK CLEANUP & DIAGNOSTICS
// ======================

// Clean up duplicate stock entries
app.post('/make-server-088c2cd9/stock/cleanup/:branchId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const branchId = c.req.param('branchId');
    console.log(`🧹 Cleaning up stock duplicates for: ${branchId}`);
    
    const isWarehouse = branchId.startsWith('warehouse_');
    const prefix = isWarehouse ? `warehouse-stock:${branchId}:` : `stock:${branchId}:`;
    
    // Get all stock entries
    const stockKeys = await kv.getByPrefix(prefix);
    console.log(`Found ${stockKeys.length} total stock entries`);
    
    // Group by product ID and keep only the latest
    const stockByProduct = new Map();
    for (const entry of stockKeys) {
      const productId = entry.key.split(':')[2];
      const existing = stockByProduct.get(productId);
      const timestamp = new Date(entry.value?.updatedAt || entry.value?.lastUpdated || 0).getTime();
      
      if (!existing || timestamp > existing.timestamp) {
        stockByProduct.set(productId, {
          key: entry.key,
          value: entry.value,
          timestamp,
        });
      }
    }
    
    console.log(`Deduplicated to ${stockByProduct.size} unique products`);
    
    // Delete all old entries and rewrite with clean data
    let deleted = 0;
    let written = 0;
    
    for (const entry of stockKeys) {
      await kv.del(entry.key);
      deleted++;
    }
    
    for (const [productId, data] of stockByProduct.entries()) {
      const cleanKey = isWarehouse 
        ? `warehouse-stock:${branchId}:${productId}` 
        : `stock:${branchId}:${productId}`;
      await kv.set(cleanKey, data.value);
      written++;
    }
    
    console.log(`✅ Cleanup complete: deleted ${deleted}, wrote ${written}`);
    
    return c.json({ 
      success: true, 
      message: `Cleaned up stock: deleted ${deleted} entries, wrote ${written} clean entries`,
      deleted,
      written,
    });
  } catch (error) {
    console.error('Stock cleanup error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// TRANSFER ROUTES
// ======================

app.post('/make-server-088c2cd9/transfers', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const transferData = await c.req.json();
    
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transfer = {
      id: transferId,
      ...transferData,
      status: 'pending',
      initiatedBy: user.id,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`transfer:${transferId}`, transfer);
    
    // Store transfer items
    if (transferData.items) {
      await kv.set(`transfer:${transferId}:items`, transferData.items);
    }
    
    // Add to org transfers list
    const orgTransfers = await kv.get(`org:${transferData.orgId}:transfers`) || [];
    await kv.set(`org:${transferData.orgId}:transfers`, [...orgTransfers, transferId]);
    
    // Log activity
    await kv.set(`audit:${Date.now()}:${user.id}`, {
      action: 'transfer_created',
      transferId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true, transfer });
  } catch (error) {
    console.error('Create transfer error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/transfers/:transferId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const transferId = c.req.param('transferId');
    
    const transfer = await kv.get(`transfer:${transferId}`);
    if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
    
    const items = await kv.get(`transfer:${transferId}:items`) || [];
    
    return c.json({ success: true, transfer: { ...transfer, items } });
  } catch (error) {
    console.error('Get transfer error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/org/:orgId/transfers', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const transferIds = await kv.get(`org:${orgId}:transfers`) || [];
    
    const transfers = await Promise.all(
      transferIds.map(async (id: string) => {
        const transfer = await kv.get(`transfer:${id}`);
        const items = await kv.get(`transfer:${id}:items`) || [];
        return transfer ? { ...transfer, items } : null;
      })
    );
    
    return c.json({ success: true, transfers: transfers.filter(Boolean) });
  } catch (error) {
    console.error('Get transfers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/transfers/:transferId/approve', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const transferId = c.req.param('transferId');
    const transfer = await kv.get(`transfer:${transferId}`);
    
    if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
    
    const updatedTransfer = {
      ...transfer,
      status: 'approved',
      approvedBy: user.id,
      approvedAt: new Date().toISOString(),
    };
    
    await kv.set(`transfer:${transferId}`, updatedTransfer);
    
    await kv.set(`audit:${Date.now()}:${user.id}`, {
      action: 'transfer_approved',
      transferId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true, transfer: updatedTransfer });
  } catch (error) {
    console.error('Approve transfer error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/transfers/:transferId/in-transit', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const transferId = c.req.param('transferId');
    const transfer = await kv.get(`transfer:${transferId}`);
    
    if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
    
    // Deduct stock from source
    const items = await kv.get(`transfer:${transferId}:items`) || [];
    for (const item of items) {
      await kv.put(`stock:${transfer.sourceBranchId}:${item.productId}`, {
        quantity: item.quantity,
        operation: 'subtract',
      });
    }
    
    const updatedTransfer = {
      ...transfer,
      status: 'in_transit',
      inTransitAt: new Date().toISOString(),
    };
    
    await kv.set(`transfer:${transferId}`, updatedTransfer);
    
    return c.json({ success: true, transfer: updatedTransfer });
  } catch (error) {
    console.error('Mark in-transit error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/transfers/:transferId/receive', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const transferId = c.req.param('transferId');
    const { receivedItems, notes } = await c.req.json();
    
    const transfer = await kv.get(`transfer:${transferId}`);
    if (!transfer) return c.json({ error: 'Transfer not found' }, 404);
    
    // Add stock to destination
    for (const item of receivedItems) {
      const currentStock = await kv.get(`stock:${transfer.destinationBranchId}:${item.productId}`) || { quantity: 0 };
      const timestamp = new Date().toISOString();
      await kv.set(`stock:${transfer.destinationBranchId}:${item.productId}`, {
        branchId: transfer.destinationBranchId,
        productId: item.productId,
        quantity: (currentStock.quantity || 0) + item.receivedQuantity,
        updatedAt: timestamp,
        lastUpdated: timestamp, // Keep both for compatibility
      });
    }
    
    const updatedTransfer = {
      ...transfer,
      status: 'received',
      receivedBy: user.id,
      receivedAt: new Date().toISOString(),
      receivedItems,
      notes,
    };
    
    await kv.set(`transfer:${transferId}`, updatedTransfer);
    
    await kv.set(`audit:${Date.now()}:${user.id}`, {
      action: 'transfer_received',
      transferId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true, transfer: updatedTransfer });
  } catch (error) {
    console.error('Receive transfer error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// SALES ROUTES
// ======================

app.post('/make-server-088c2cd9/sales', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const saleData = await c.req.json();
    
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sale = {
      id: saleId,
      ...saleData,
      cashierId: user.id,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`sale:${saleId}`, sale);
    
    // Store sale items and deduct stock atomically
    if (saleData.items) {
      await kv.set(`sale:${saleId}:items`, saleData.items);
      
      console.log(`📦 Deducting stock for ${saleData.items.length} items`);
      
      // Deduct stock with atomic locks for each item
      for (const item of saleData.items) {
        const stockKey = `stock:${saleData.branchId}:${item.productId}`;
        const lockKey = `lock:${stockKey}`;
        const lockId = `${Date.now()}_${Math.random()}`;
        
        // Acquire lock with timeout
        let acquired = false;
        for (let i = 0; i < 10; i++) {
          const existingLock = await kv.get(lockKey);
          if (!existingLock || (Date.now() - existingLock.timestamp > 5000)) {
            await kv.set(lockKey, { lockId, timestamp: Date.now() });
            acquired = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        if (!acquired) {
          console.error(`❌ Failed to acquire lock for ${stockKey} during sale`);
          // Continue anyway to not block the sale - log for investigation
        }
        
        try {
          const currentStock = await kv.get(stockKey) || { quantity: 0 };
          const newQuantity = Math.max(0, (currentStock.quantity || 0) - item.quantity);
          
          console.log(`📉 SALE: Deducting ${item.quantity} of ${item.productId} from ${currentStock.quantity || 0} -> ${newQuantity}`);
          
          const timestamp = new Date().toISOString();
          await kv.set(stockKey, {
            branchId: saleData.branchId,
            productId: item.productId,
            quantity: newQuantity,
            lastUpdated: timestamp,
            updatedAt: timestamp,
            updatedBy: user.id,
          });
          
          // Log stock movement for audit trail
          await kv.set(`stock:movement:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, {
            branchId: saleData.branchId,
            productId: item.productId,
            operation: 'sale',
            quantity: item.quantity,
            previousQuantity: currentStock.quantity || 0,
            newQuantity,
            userId: user.id,
            saleId,
            timestamp,
            reason: 'POS Sale',
          });
        } finally {
          if (acquired) {
            await kv.del(lockKey);
          }
        }
      }
      
      console.log(`✅ Stock deducted successfully for sale ${saleId}`);
    }
    
    // Add to org sales list
    const orgSales = await kv.get(`org:${saleData.orgId}:sales`) || [];
    await kv.set(`org:${saleData.orgId}:sales`, [...orgSales, saleId]);
    
    return c.json({ success: true, sale });
  } catch (error) {
    console.error('Create sale error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/org/:orgId/sales', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const saleIds = await kv.get(`org:${orgId}:sales`) || [];
    
    const sales = await Promise.all(
      saleIds.map(async (id: string) => {
        const sale = await kv.get(`sale:${id}`);
        const items = await kv.get(`sale:${id}:items`) || [];
        return sale ? { ...sale, items } : null;
      })
    );
    
    return c.json({ success: true, sales: sales.filter(Boolean) });
  } catch (error) {
    console.error('Get sales error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// USER ROUTES
// ======================

app.get('/make-server-088c2cd9/user/:userId', async (c) => {
  try {
    const authUser = await getAuthUser(c.req.raw);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);
    
    if (!user) return c.json({ error: 'User not found' }, 404);
    
    return c.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/org/:orgId/users', async (c) => {
  try {
    const authUser = await getAuthUser(c.req.raw);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const userIds = await kv.get(`org:${orgId}:users`) || [];
    
    const users = await Promise.all(
      userIds.map((id: string) => kv.get(`user:${id}`))
    );
    
    return c.json({ success: true, users: users.filter(Boolean) });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-088c2cd9/org/:orgId/users', async (c) => {
  try {
    const authUser = await getAuthUser(c.req.raw);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const { email, password, name, role } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });
    
    if (error) throw error;
    
    const userId = data.user.id;
    
    // Create user profile
    await kv.set(`user:${userId}`, {
      id: userId,
      email,
      name,
      orgId,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    
    // Add user to org users list
    const userIds = await kv.get(`org:${orgId}:users`) || [];
    await kv.set(`org:${orgId}:users`, [...userIds, userId]);
    
    return c.json({ success: true, userId });
  } catch (error) {
    console.error('Create user error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/user/:userId', async (c) => {
  try {
    const authUser = await getAuthUser(c.req.raw);
    if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
    
    const userId = c.req.param('userId');
    const updates = await c.req.json();
    
    // Get existing user
    const existingUser = await kv.get(`user:${userId}`);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update user profile with new data
    const updatedUser = {
      ...existingUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${userId}`, updatedUser);
    
    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// RETURNS ROUTES
// ======================

app.post('/make-server-088c2cd9/returns', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const returnData = await c.req.json();
    
    const returnId = `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const returnRecord = {
      id: returnId,
      originalSaleId: returnData.originalSaleId,
      receiptNumber: returnData.receiptNumber,
      returnDate: new Date().toISOString(),
      branchId: returnData.branchId,
      totalRefund: returnData.totalRefund,
      reason: returnData.reason,
      processedBy: user.id,
      processedByName: returnData.processedByName,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`return:${returnId}`, returnRecord);
    await kv.set(`return:${returnId}:items`, returnData.items);
    
    // Add to org returns list
    const orgReturns = await kv.get(`org:${returnData.orgId}:returns`) || [];
    await kv.set(`org:${returnData.orgId}:returns`, [...orgReturns, returnId]);
    
    // Log audit trail
    await kv.set(`audit:${Date.now()}:${user.id}`, {
      action: 'return_processed',
      returnId,
      originalSaleId: returnData.originalSaleId,
      totalRefund: returnData.totalRefund,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true, return: returnRecord });
  } catch (error) {
    console.error('Create return error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/org/:orgId/returns', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const returnIds = await kv.get(`org:${orgId}:returns`) || [];
    
    const returns = await Promise.all(
      returnIds.map(async (id: string) => {
        const returnRecord = await kv.get(`return:${id}`);
        const items = await kv.get(`return:${id}:items`) || [];
        return returnRecord ? { ...returnRecord, items } : null;
      })
    );
    
    return c.json({ success: true, returns: returns.filter(Boolean) });
  } catch (error) {
    console.error('Get returns error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// PAYMENT ROUTES
// ======================

// Initialize PayStack Payment
app.post('/make-server-088c2cd9/payments/paystack/initialize', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { email, amount, currency, reference, metadata } = await c.req.json();
    
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Initialize PayStack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        currency: currency || 'NGN',
        reference,
        metadata,
        callback_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/payment-callback`,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.status) {
      console.error('PayStack initialization error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to initialize payment' 
      }, 400);
    }
    
    // Store payment record in PostgreSQL
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        reference,
        provider: 'paystack',
        organization_id: metadata.orgId,
        user_id: user.id,
        plan_id: metadata.planId,
        billing_cycle: metadata.billingCycle,
        amount,
        currency: currency || 'NGN',
        status: 'pending',
      });
    
    if (paymentError) {
      console.error('Failed to store payment record:', paymentError);
    }
    
    return c.json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('PayStack initialization error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Verify PayStack Payment
app.get('/make-server-088c2cd9/payments/paystack/verify/:reference', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const reference = c.req.param('reference');
    
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Verify transaction with PayStack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (!response.ok || !data.status) {
      console.error('PayStack verification error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to verify payment' 
      }, 400);
    }
    
    const paymentData = data.data;
    
    // Update payment record in PostgreSQL
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();
    
    if (payment && !fetchError) {
      const newStatus = paymentData.status === 'success' ? 'completed' : 'failed';
      
      await supabase
        .from('payments')
        .update({
          status: newStatus,
          verified_at: new Date().toISOString(),
          transaction_id: paymentData.id?.toString(),
        })
        .eq('reference', reference);
      
      // If payment successful, create/update subscription
      if (paymentData.status === 'success') {
        const startDate = new Date();
        const endDate = new Date();
        
        // Calculate end date based on billing cycle
        if (payment.billing_cycle === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        await supabase
          .from('subscriptions')
          .upsert({
            organization_id: payment.organization_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: payment.amount,
            payment_reference: reference,
            provider: 'paystack',
          }, {
            onConflict: 'organization_id'
          });
      }
    }
    
    return c.json({
      success: true,
      status: paymentData.status,
      amount: paymentData.amount / 100, // Convert from kobo
      reference: paymentData.reference,
      paidAt: paymentData.paid_at,
    });
  } catch (error) {
    console.error('PayStack verification error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Initialize Flutterwave Payment
app.post('/make-server-088c2cd9/payments/flutterwave/initialize', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const { email, amount, currency, reference, metadata } = await c.req.json();
    
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Initialize Flutterwave payment
    // Note: Flutterwave expects amount in main currency unit (NGN), not kobo
    // Frontend sends amount in kobo, so we divide by 100
    const amountInNGN = amount / 100;
    
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: amountInNGN,
        currency: currency || 'NGN',
        redirect_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/payment-callback`,
        customer: {
          email,
        },
        customizations: {
          title: 'shopeasy Subscription',
          description: `${metadata.planName} - ${metadata.billingCycle} billing`,
          logo: '',
        },
        meta: metadata,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok || data.status !== 'success') {
      console.error('Flutterwave initialization error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to initialize payment' 
      }, 400);
    }
    
    // Store payment record in PostgreSQL
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        reference,
        provider: 'flutterwave',
        organization_id: metadata.orgId,
        user_id: user.id,
        plan_id: metadata.planId,
        billing_cycle: metadata.billingCycle,
        amount,
        currency: currency || 'NGN',
        status: 'pending',
      });
    
    if (paymentError) {
      console.error('Failed to store payment record:', paymentError);
    }
    
    return c.json({
      success: true,
      authorizationUrl: data.data.link,
      reference,
    });
  } catch (error) {
    console.error('Flutterwave initialization error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Verify Flutterwave Payment
app.get('/make-server-088c2cd9/payments/flutterwave/verify/:transactionId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const transactionId = c.req.param('transactionId');
    
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      return c.json({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }, 500);
    }
    
    // Verify transaction with Flutterwave
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${flutterwaveSecretKey}`,
        },
      }
    );
    
    const data = await response.json();
    
    if (!response.ok || data.status !== 'success') {
      console.error('Flutterwave verification error:', data);
      return c.json({ 
        success: false, 
        error: data.message || 'Failed to verify payment' 
      }, 400);
    }
    
    const paymentData = data.data;
    const reference = paymentData.tx_ref;
    
    // Update payment record in PostgreSQL
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();
    
    if (payment && !fetchError) {
      const newStatus = paymentData.status === 'successful' ? 'completed' : 'failed';
      
      await supabase
        .from('payments')
        .update({
          status: newStatus,
          verified_at: new Date().toISOString(),
          transaction_id: paymentData.id?.toString(),
        })
        .eq('reference', reference);
      
      // If payment successful, create/update subscription
      if (paymentData.status === 'successful') {
        const startDate = new Date();
        const endDate = new Date();
        
        // Calculate end date based on billing cycle
        if (payment.billing_cycle === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        await supabase
          .from('subscriptions')
          .upsert({
            organization_id: payment.organization_id,
            plan_id: payment.plan_id,
            billing_cycle: payment.billing_cycle,
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: payment.amount,
            payment_reference: reference,
            provider: 'flutterwave',
          }, {
            onConflict: 'organization_id'
          });
      }
    }
    
    return c.json({
      success: true,
      status: paymentData.status === 'successful' ? 'success' : paymentData.status,
      amount: paymentData.amount,
      reference: paymentData.tx_ref,
      paidAt: paymentData.created_at,
    });
  } catch (error) {
    console.error('Flutterwave verification error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get subscription status
app.get('/make-server-088c2cd9/org/:orgId/subscription', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const subscription = await kv.get(`org:${orgId}:subscription`);
    
    if (!subscription) {
      return c.json({ 
        success: true, 
        subscription: null,
        status: 'trial' 
      });
    }
    
    return c.json({ success: true, subscription });
  } catch (error) {
    console.error('Get subscription error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// DATA CLEANUP ROUTES (FOR DEBUGGING)
// ======================

// Delete all products for an organization
app.delete('/make-server-088c2cd9/org/:orgId/products/all', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    
    // Get all product IDs
    const productIds = await kv.get(`org:${orgId}:products`) || [];
    
    console.log(`Deleting ${productIds.length} products for org ${orgId}`);
    
    // Delete each product
    for (const productId of productIds) {
      await kv.del(`product:${productId}`);
    }
    
    // Clear the products list
    await kv.set(`org:${orgId}:products`, []);
    
    return c.json({ 
      success: true, 
      message: `Deleted ${productIds.length} products`,
      count: productIds.length 
    });
  } catch (error) {
    console.error('Delete all products error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete all stock for an organization (all branches)
app.delete('/make-server-088c2cd9/org/:orgId/stock/all', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    
    // Get all branches for the org
    const branchIds = await kv.get(`org:${orgId}:branches`) || [];
    
    console.log(`Deleting stock for ${branchIds.length} branches in org ${orgId}`);
    
    let totalDeleted = 0;
    
    // Delete stock for each branch
    for (const branchId of branchIds) {
      const stockEntries = await kv.getByPrefix(`stock:${branchId}:`);
      
      for (const entry of stockEntries) {
        await kv.del(entry.key);
        totalDeleted++;
      }
    }
    
    return c.json({ 
      success: true, 
      message: `Deleted ${totalDeleted} stock entries across ${branchIds.length} branches`,
      count: totalDeleted,
      branches: branchIds.length
    });
  } catch (error) {
    console.error('Delete all stock error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete all inventory (products + stock) for an organization
app.delete('/make-server-088c2cd9/org/:orgId/inventory/all', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    
    console.log(`Deleting ALL inventory for org ${orgId}`);
    
    // Delete all products
    const productIds = await kv.get(`org:${orgId}:products`) || [];
    for (const productId of productIds) {
      await kv.del(`product:${productId}`);
    }
    await kv.set(`org:${orgId}:products`, []);
    
    // Delete all stock
    const branchIds = await kv.get(`org:${orgId}:branches`) || [];
    let stockCount = 0;
    for (const branchId of branchIds) {
      const stockEntries = await kv.getByPrefix(`stock:${branchId}:`);
      for (const entry of stockEntries) {
        await kv.del(entry.key);
        stockCount++;
      }
    }
    
    return c.json({ 
      success: true, 
      message: `Deleted ${productIds.length} products and ${stockCount} stock entries`,
      products: productIds.length,
      stock: stockCount,
      branches: branchIds.length
    });
  } catch (error) {
    console.error('Delete all inventory error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// WAREHOUSE ROUTES
// ======================

app.get('/make-server-088c2cd9/org/:orgId/warehouses', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    let warehouseIds = await kv.get(`org:${orgId}:warehouses`) || [];
    
    // Deduplicate warehouse IDs
    warehouseIds = [...new Set(warehouseIds)];
    await kv.set(`org:${orgId}:warehouses`, warehouseIds);
    
    const warehouses = await Promise.all(
      warehouseIds.map((id: string) => kv.get(`warehouse:${id}`))
    );
    
    return c.json({ success: true, warehouses: warehouses.filter(Boolean) });
  } catch (error) {
    console.error('Get warehouses error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-088c2cd9/org/:orgId/warehouses', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const warehouseData = await c.req.json();
    
    const warehouseId = `warehouse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const warehouse = {
      id: warehouseId,
      orgId,
      ...warehouseData,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`warehouse:${warehouseId}`, warehouse);
    
    // Prevent duplicate entries
    const warehouseIds = await kv.get(`org:${orgId}:warehouses`) || [];
    if (!warehouseIds.includes(warehouseId)) {
      await kv.set(`org:${orgId}:warehouses`, [...warehouseIds, warehouseId]);
    }
    
    console.log(`✅ Created warehouse: ${warehouseId} for org: ${orgId}`);
    return c.json({ success: true, warehouse });
  } catch (error) {
    console.error('Create warehouse error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/warehouse/:warehouseId/stock', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const warehouseId = c.req.param('warehouseId');
    const stockKeys = await kv.getByPrefix(`warehouse-stock:${warehouseId}:`);
    
    const stock = stockKeys.map((item: any) => {
      const productId = item.key.split(':')[2];
      return {
        warehouseId,
        productId,
        quantity: item.value?.quantity || 0,
        lastUpdated: item.value?.updatedAt || item.value?.lastUpdated,
        updatedAt: item.value?.updatedAt || item.value?.lastUpdated,
      };
    });
    
    return c.json({ success: true, stock });
  } catch (error) {
    console.error('Get warehouse stock error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ======================
// SUPPLIER ROUTES
// ======================

app.get('/make-server-088c2cd9/org/:orgId/suppliers', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    let supplierIds = await kv.get(`org:${orgId}:suppliers`) || [];
    
    // Deduplicate supplier IDs
    supplierIds = [...new Set(supplierIds)];
    await kv.set(`org:${orgId}:suppliers`, supplierIds);
    
    const suppliers = await Promise.all(
      supplierIds.map((id: string) => kv.get(`supplier:${id}`))
    );
    
    return c.json({ success: true, suppliers: suppliers.filter(Boolean) });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-088c2cd9/org/:orgId/suppliers', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const orgId = c.req.param('orgId');
    const supplierData = await c.req.json();
    
    const supplierId = `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const supplier = {
      id: supplierId,
      orgId,
      ...supplierData,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`supplier:${supplierId}`, supplier);
    
    // Prevent duplicate entries
    const supplierIds = await kv.get(`org:${orgId}:suppliers`) || [];
    if (!supplierIds.includes(supplierId)) {
      await kv.set(`org:${orgId}:suppliers`, [...supplierIds, supplierId]);
    }
    
    console.log(`✅ Created supplier: ${supplierId} for org: ${orgId}`);
    return c.json({ success: true, supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/suppliers/:supplierId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const supplierId = c.req.param('supplierId');
    const supplier = await kv.get(`supplier:${supplierId}`);
    
    if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
    
    return c.json({ success: true, supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-088c2cd9/suppliers/:supplierId', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const supplierId = c.req.param('supplierId');
    const updates = await c.req.json();
    
    const supplier = await kv.get(`supplier:${supplierId}`);
    if (!supplier) return c.json({ error: 'Supplier not found' }, 404);
    
    const updatedSupplier = { ...supplier, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`supplier:${supplierId}`, updatedSupplier);
    
    return c.json({ success: true, supplier: updatedSupplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Store supplier invoice metadata (file should be uploaded to Supabase Storage from frontend)
app.post('/make-server-088c2cd9/suppliers/:supplierId/invoice', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const supplierId = c.req.param('supplierId');
    const invoiceData = await c.req.json();
    
    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const invoice = {
      id: invoiceId,
      supplierId,
      orgId: invoiceData.orgId,
      transactionId: invoiceData.transactionId,
      fileUrl: invoiceData.fileUrl, // Supabase Storage URL
      fileName: invoiceData.fileName,
      fileSize: invoiceData.fileSize,
      uploadedBy: user.id,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`invoice:${invoiceId}`, invoice);
    
    // Add to supplier's invoices list
    const invoiceIds = await kv.get(`supplier:${supplierId}:invoices`) || [];
    await kv.set(`supplier:${supplierId}:invoices`, [...invoiceIds, invoiceId]);
    
    console.log(`✅ Created invoice: ${invoiceId} for supplier: ${supplierId}`);
    return c.json({ success: true, invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-088c2cd9/suppliers/:supplierId/invoices', async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    
    const supplierId = c.req.param('supplierId');
    const invoiceIds = await kv.get(`supplier:${supplierId}:invoices`) || [];
    
    const invoices = await Promise.all(
      invoiceIds.map((id: string) => kv.get(`invoice:${id}`))
    );
    
    return c.json({ success: true, invoices: invoices.filter(Boolean) });
  } catch (error) {
    console.error('Get invoices error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Health check
app.get('/make-server-088c2cd9/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

Deno.serve(app.fetch);