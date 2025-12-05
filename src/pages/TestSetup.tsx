import { useState } from 'react';
import { signUp, createBranch, createProduct, updateStock, createUser, createSale } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Store, AlertCircle } from 'lucide-react';

const SAMPLE_BRANCHES = [
  { name: 'Main Warehouse', address: '123 Commerce Street, Lagos', phone: '+234 800 100 1000', isHeadquarters: true },
  { name: 'Lekki Branch', address: '45 Admiralty Way, Lekki Phase 1, Lagos', phone: '+234 800 100 1001' },
  { name: 'Victoria Island Store', address: '78 Adeola Odeku Street, Victoria Island, Lagos', phone: '+234 800 100 1002' },
];

const SAMPLE_PRODUCTS = [
  { name: 'Paracetamol 500mg', sku: 'PARA500', barcode: '5012345678900', category: 'Medicine', price: 500, unitCost: 300, reorderLevel: 50, taxRate: 0 },
  { name: 'Ibuprofen 400mg', sku: 'IBU400', barcode: '5012345678901', category: 'Medicine', price: 800, unitCost: 500, reorderLevel: 40, taxRate: 0 },
  { name: 'Vitamin C Tablets', sku: 'VITC100', barcode: '5012345678902', category: 'Supplements', price: 1200, unitCost: 800, reorderLevel: 30, taxRate: 0 },
  { name: 'Hand Sanitizer 500ml', sku: 'SANI500', barcode: '5012345678903', category: 'Hygiene', price: 1500, unitCost: 1000, reorderLevel: 25, taxRate: 7.5 },
  { name: 'Face Mask (Pack of 50)', sku: 'MASK50', barcode: '5012345678904', category: 'Hygiene', price: 2500, unitCost: 1800, reorderLevel: 20, taxRate: 7.5 },
  { name: 'Rice 25kg', sku: 'RICE25', barcode: '5012345678905', category: 'Groceries', price: 15000, unitCost: 12000, reorderLevel: 10, taxRate: 7.5 },
  { name: 'Cooking Oil 5L', sku: 'OIL5L', barcode: '5012345678906', category: 'Groceries', price: 5000, unitCost: 4000, reorderLevel: 15, taxRate: 7.5 },
  { name: 'Detergent Powder 1kg', sku: 'DET1KG', barcode: '5012345678907', category: 'Household', price: 1800, unitCost: 1200, reorderLevel: 30, taxRate: 7.5 },
  { name: 'Toilet Paper (12 rolls)', sku: 'TP12', barcode: '5012345678908', category: 'Household', price: 2000, unitCost: 1500, reorderLevel: 20, taxRate: 7.5 },
  { name: 'Bottled Water 750ml', sku: 'WATER750', barcode: '5012345678909', category: 'Beverages', price: 150, unitCost: 100, reorderLevel: 100, taxRate: 7.5 },
  { name: 'Soft Drink 500ml', sku: 'SODA500', barcode: '5012345678910', category: 'Beverages', price: 200, unitCost: 130, reorderLevel: 80, taxRate: 7.5 },
  { name: 'Bread (Sliced)', sku: 'BREAD01', barcode: '5012345678911', category: 'Bakery', price: 600, unitCost: 400, reorderLevel: 40, taxRate: 0 },
  { name: 'Sugar 1kg', sku: 'SUGAR1', barcode: '5012345678912', category: 'Groceries', price: 800, unitCost: 600, reorderLevel: 25, taxRate: 7.5 },
  { name: 'Milk Powder 400g', sku: 'MILK400', barcode: '5012345678913', category: 'Groceries', price: 2500, unitCost: 1900, reorderLevel: 20, taxRate: 0 },
  { name: 'Antiseptic Liquid 500ml', sku: 'ANTI500', barcode: '5012345678914', category: 'Medicine', price: 1800, unitCost: 1300, reorderLevel: 15, taxRate: 0 },
];

const SAMPLE_USERS = [
  { name: 'John Manager', email: 'manager@shopeasy.com', password: 'test123', role: 'manager' },
  { name: 'Jane Cashier', email: 'cashier@shopeasy.com', password: 'test123', role: 'cashier' },
  { name: 'Bob Auditor', email: 'auditor@shopeasy.com', password: 'test123', role: 'auditor' },
];

export function TestSetup() {
  const timestamp = Date.now();
  const [useUniqueEmail, setUseUniqueEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const addStatus = (message: string) => {
    setStatus((prev) => [...prev, message]);
  };

  const getTestEmail = () => {
    if (customEmail) return customEmail;
    if (useUniqueEmail) return `test${timestamp}@shopeasy.com`;
    return 'test@shopeasy.com';
  };

  const getTestCredentials = () => ({
    email: getTestEmail(),
    password: customPassword,
    name: 'Test Admin',
    orgName: useUniqueEmail ? `Test Retail Co ${timestamp}` : 'Test Retail Co',
  });

  async function setupTestAccount() {
    setLoading(true);
    setError(null);
    setStatus([]);
    setCompleted(false);

    const testCredentials = getTestCredentials();

    try {
      // Step 1: Create test account and organization
      addStatus('Creating test account...');
      console.log('Starting signup with:', testCredentials.email);
      
      const signupResult = await signUp(
        testCredentials.email,
        testCredentials.password,
        testCredentials.name,
        testCredentials.orgName
      );
      
      console.log('Signup result:', signupResult);
      
      if (!signupResult.success) {
        // Check if it's an email exists error
        if (signupResult.error?.includes('already') || signupResult.error?.includes('exists')) {
          throw new Error(
            `The email "${testCredentials.email}" is already registered. Please check the "Use Unique Email" option to create a new test account with a different email address.`
          );
        }
        throw new Error(signupResult.error || 'Signup failed: Invalid response from server');
      }
      
      if (!signupResult.userId || !signupResult.orgId) {
        throw new Error('Signup failed: Missing userId or orgId in response');
      }
      
      const { userId, orgId } = signupResult;
      addStatus(`✓ Account created: ${testCredentials.email}`);
      addStatus(`✓ Organization created: ${testCredentials.orgName}`);

      // Step 2: Create branches
      addStatus('Creating branches...');
      const branches = [];
      for (const branchData of SAMPLE_BRANCHES) {
        const { branch } = await createBranch(orgId, branchData);
        branches.push(branch);
        addStatus(`✓ Branch created: ${branchData.name}`);
      }

      // Step 3: Create products
      addStatus('Creating products...');
      const products = [];
      for (const productData of SAMPLE_PRODUCTS) {
        const { product } = await createProduct(orgId, productData);
        products.push(product);
        addStatus(`✓ Product created: ${productData.name}`);
      }

      // Step 4: Add initial stock to main warehouse (first branch)
      if (branches.length > 0 && products.length > 0) {
        addStatus('Adding initial stock to Main Warehouse...');
        const mainWarehouse = branches[0];
        
        for (const product of products) {
          // Add random stock between 50-200 units
          const quantity = Math.floor(Math.random() * 150) + 50;
          await updateStock(mainWarehouse.id, product.id, quantity, 'set');
        }
        addStatus(`✓ Stock added to ${mainWarehouse.name}`);

        // Add some stock to second branch
        if (branches.length > 1) {
          addStatus('Adding stock to Lekki Branch...');
          const lekkiBranch = branches[1];
          
          for (const product of products) {
            // Add random stock between 20-80 units
            const quantity = Math.floor(Math.random() * 60) + 20;
            await updateStock(lekkiBranch.id, product.id, quantity, 'set');
          }
          addStatus(`✓ Stock added to ${lekkiBranch.name}`);
        }
      }

      // Step 5: Create additional users (with unique emails if needed)
      addStatus('Creating additional users...');
      for (const userData of SAMPLE_USERS) {
        try {
          const userEmail = useUniqueEmail 
            ? `${userData.email.split('@')[0]}${timestamp}@shopeasy.com`
            : userData.email;
          
          await createUser(orgId, {
            ...userData,
            email: userEmail
          });
          addStatus(`✓ User created: ${userData.name} (${userData.role})`);
        } catch (err) {
          // Skip if user already exists
          console.log(`Skipping user ${userData.email}, may already exist`);
          addStatus(`⚠ Skipped: ${userData.name} (may already exist)`);
        }
      }

      // Step 6: Create sample sales transactions for analytics
      if (branches.length > 0 && products.length > 0) {
        addStatus('Creating sample sales transactions...');
        const mainBranch = branches[0];
        const paymentMethods = ['cash', 'pos', 'transfer'];
        
        // Create 10 sample sales over the past week
        for (let i = 0; i < 10; i++) {
          const daysAgo = Math.floor(Math.random() * 7);
          const saleDate = new Date();
          saleDate.setDate(saleDate.getDate() - daysAgo);
          
          // Random 2-5 products per sale
          const numItems = Math.floor(Math.random() * 4) + 2;
          const saleItems = [];
          let saleTotal = 0;
          
          for (let j = 0; j < numItems; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 3) + 1;
            const itemTotal = product.price * quantity;
            
            saleItems.push({
              productId: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              quantity: quantity,
              discount: 0
            });
            
            saleTotal += itemTotal;
          }
          
          const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          
          await createSale({
            orgId,
            branchId: mainBranch.id,
            customer: i % 3 === 0 ? 'Walk-in Customer' : `Customer ${i + 1}`,
            items: saleItems,
            subtotal: saleTotal,
            discount: 0,
            total: saleTotal,
            paymentMethod,
            amountPaid: saleTotal,
            change: 0
          });
        }
        
        addStatus(`✓ Created 10 sample sales transactions`);
      }

      addStatus('');
      addStatus('🎉 Test account setup completed successfully!');
      addStatus('');
      addStatus('Login credentials:');
      addStatus(`Email: ${testCredentials.email}`);
      addStatus(`Password: ${testCredentials.password}`);
      
      if (!useUniqueEmail) {
        addStatus('');
        addStatus('Additional test users:');
        SAMPLE_USERS.forEach(user => {
          addStatus(`${user.email} / ${user.password} (${user.role})`);
        });
      }
      
      setCredentials({
        email: testCredentials.email,
        password: testCredentials.password
      });
      setCompleted(true);
    } catch (err: any) {
      console.error('Setup error:', err);
      const errorMessage = err.message || 'Failed to setup test account';
      setError(errorMessage);
      addStatus(`❌ Error: ${errorMessage}`);
      
      // If it's an email exists error, suggest using unique email
      if (errorMessage.includes('already') || errorMessage.includes('exists')) {
        addStatus('');
        addStatus('💡 Tip: Check the "Use Unique Email" option below to create a new test account');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2">shopeasy Test Account Setup</h1>
          <p className="text-muted-foreground">
            Create a test account with sample data for demonstration
          </p>
        </div>

        {/* Before setup */}
        {!loading && !completed && (
          <div className="space-y-4">
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <div className="mb-2 font-semibold">What will be created:</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Test organization: <span className="font-medium text-foreground">Test Retail Co</span></li>
                <li>• Admin account with custom or default email</li>
                <li>• {SAMPLE_BRANCHES.length} branches with different locations</li>
                <li>• {SAMPLE_PRODUCTS.length} sample products with barcodes and cost tracking</li>
                <li>• Initial stock in Main Warehouse and Lekki Branch</li>
                <li>• {SAMPLE_USERS.length} additional users (Manager, Cashier, Auditor)</li>
                <li>• 10 sample sales transactions with mixed payment methods</li>
              </ul>
            </div>

            {/* Email Configuration */}
            <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
              <div className="font-semibold text-sm">Account Configuration</div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="uniqueEmail"
                  checked={useUniqueEmail}
                  onChange={(e) => setUseUniqueEmail(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="uniqueEmail" className="text-sm cursor-pointer">
                  Use unique email (recommended if test@shopeasy.com already exists)
                </Label>
              </div>

              {useUniqueEmail && (
                <div className="pl-6 text-xs text-muted-foreground">
                  Email will be: <span className="font-mono text-foreground">test{timestamp}@shopeasy.com</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="customEmail" className="text-sm">
                  Or use custom email (optional)
                </Label>
                <Input
                  id="customEmail"
                  type="email"
                  placeholder="custom@example.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                />
              </div>

              {!useUniqueEmail && !customEmail && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Default credentials: <span className="font-mono">test@shopeasy.com / test123</span>
                  </span>
                </div>
              )}
            </div>

            <Button 
              onClick={setupTestAccount}
              className="w-full"
              size="lg"
            >
              Create Test Account
            </Button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Setting up test account...</span>
          </div>
        )}

        {/* Status messages */}
        {status.length > 0 && (
          <div className="mt-6 bg-muted rounded-lg p-4 max-h-96 overflow-auto">
            <div className="space-y-1 font-mono text-sm">
              {status.map((message, index) => (
                <div 
                  key={index} 
                  className={
                    message.startsWith('✓') ? 'text-green-600' :
                    message.startsWith('⚠') ? 'text-amber-600' :
                    message.startsWith('❌') ? 'text-red-600' :
                    message.startsWith('💡') ? 'text-blue-600' :
                    message.includes('Login credentials') || message.includes('Email:') || message.includes('Password:') ? 'text-primary font-medium' :
                    message === '' ? 'h-2' :
                    'text-foreground'
                  }
                >
                  {message || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Setup Failed</div>
                <div>{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Completion state */}
        {completed && credentials && (
          <div className="mt-6 space-y-3">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                ✅ Account Ready!
              </div>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <div>Email: <span className="font-mono">{credentials.email}</span></div>
                <div>Password: <span className="font-mono">{credentials.password}</span></div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                Go to Login
              </Button>
              <Button 
                onClick={() => {
                  setCompleted(false);
                  setStatus([]);
                  setError(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Create Another
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
