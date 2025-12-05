import { Card } from '../components/ui/card';
import { Server, Database, Shield, Users, Package, ArrowLeftRight, ShoppingCart, BarChart3 } from 'lucide-react';

export function BackendDocs() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-2">shopeasy - Backend Architecture</h1>
        <p className="text-muted-foreground mb-8">
          Technical documentation and system architecture diagrams
        </p>

        {/* System Architecture */}
        <Card className="p-8 mb-8">
          <h2 className="mb-6">System Architecture</h2>
          <div className="flex flex-col gap-4 items-center">
            <div className="flex gap-4 items-center">
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 text-center">
                <Users className="w-12 h-12 text-primary mx-auto mb-2" />
                <p>Client Devices</p>
                <p className="text-xs text-muted-foreground">Desktop / Tablet / Mobile</p>
              </div>
              <div className="text-2xl">→</div>
              <div className="bg-accent/10 border-2 border-accent rounded-lg p-6 text-center">
                <Server className="w-12 h-12 text-accent mx-auto mb-2" />
                <p>Hono Server</p>
                <p className="text-xs text-muted-foreground">Supabase Edge Function</p>
              </div>
              <div className="text-2xl">→</div>
              <div className="bg-success/10 border-2 border-success rounded-lg p-6 text-center">
                <Database className="w-12 h-12 text-success mx-auto mb-2" />
                <p>KV Store</p>
                <p className="text-xs text-muted-foreground">Supabase PostgreSQL</p>
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <p>Supabase Auth (JWT-based authentication)</p>
            </div>
          </div>
        </Card>

        {/* ER Diagram */}
        <Card className="p-8 mb-8">
          <h2 className="mb-6">Entity Relationship Diagram</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'Organization', fields: ['id', 'name', 'logo', 'ownerId'], icon: Server },
              { name: 'Branch', fields: ['id', 'orgId', 'name', 'address', 'phone'], icon: Server },
              { name: 'User', fields: ['id', 'orgId', 'name', 'email', 'role'], icon: Users },
              { name: 'Product', fields: ['id', 'orgId', 'sku', 'name', 'price'], icon: Package },
              { name: 'Stock', fields: ['branchId', 'productId', 'quantity'], icon: Package },
              { name: 'Transfer', fields: ['id', 'sourceId', 'destId', 'status'], icon: ArrowLeftRight },
              { name: 'Sale', fields: ['id', 'branchId', 'cashierId', 'total'], icon: ShoppingCart },
              { name: 'Audit Log', fields: ['timestamp', 'userId', 'action'], icon: BarChart3 },
            ].map((entity) => {
              const Icon = entity.icon;
              return (
                <div key={entity.name} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                    <Icon className="w-5 h-5 text-primary" />
                    <span>{entity.name}</span>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {entity.fields.map((field) => (
                      <li key={field} className="font-mono text-xs">
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>

        {/* API Endpoints */}
        <Card className="p-8 mb-8">
          <h2 className="mb-6">REST API Endpoints</h2>
          <div className="space-y-6">
            {[
              {
                category: 'Authentication',
                endpoints: [
                  { method: 'POST', path: '/auth/signup', desc: 'Create organization & owner account' },
                ],
              },
              {
                category: 'Organizations',
                endpoints: [
                  { method: 'GET', path: '/org/:orgId', desc: 'Get organization details' },
                  { method: 'PUT', path: '/org/:orgId', desc: 'Update organization' },
                ],
              },
              {
                category: 'Branches',
                endpoints: [
                  { method: 'GET', path: '/org/:orgId/branches', desc: 'List all branches' },
                  { method: 'POST', path: '/org/:orgId/branches', desc: 'Create new branch' },
                ],
              },
              {
                category: 'Products',
                endpoints: [
                  { method: 'GET', path: '/org/:orgId/products', desc: 'List all products' },
                  { method: 'POST', path: '/org/:orgId/products', desc: 'Create product' },
                  { method: 'PUT', path: '/products/:productId', desc: 'Update product' },
                ],
              },
              {
                category: 'Stock',
                endpoints: [
                  { method: 'GET', path: '/stock/:branchId', desc: 'Get branch stock levels' },
                  { method: 'PUT', path: '/stock/:branchId/:productId', desc: 'Update stock' },
                ],
              },
              {
                category: 'Transfers',
                endpoints: [
                  { method: 'POST', path: '/transfers', desc: 'Create transfer' },
                  { method: 'GET', path: '/org/:orgId/transfers', desc: 'List transfers' },
                  { method: 'PUT', path: '/transfers/:id/approve', desc: 'Approve transfer' },
                  { method: 'PUT', path: '/transfers/:id/receive', desc: 'Receive transfer' },
                ],
              },
              {
                category: 'Sales',
                endpoints: [
                  { method: 'POST', path: '/sales', desc: 'Create sale (POS transaction)' },
                  { method: 'GET', path: '/org/:orgId/sales', desc: 'List sales' },
                ],
              },
              {
                category: 'Users',
                endpoints: [
                  { method: 'GET', path: '/org/:orgId/users', desc: 'List organization users' },
                  { method: 'POST', path: '/org/:orgId/users', desc: 'Create user' },
                ],
              },
            ].map((group) => (
              <div key={group.category}>
                <h3 className="mb-3 text-primary">{group.category}</h3>
                <div className="space-y-2">
                  {group.endpoints.map((endpoint, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 bg-muted rounded-lg">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          endpoint.method === 'GET'
                            ? 'bg-blue-500/10 text-blue-600'
                            : endpoint.method === 'POST'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono flex-1">{endpoint.path}</code>
                      <span className="text-sm text-muted-foreground">{endpoint.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Transfer Sequence Diagram */}
        <Card className="p-8 mb-8">
          <h2 className="mb-6">Transfer Workflow Sequence</h2>
          <div className="space-y-4 max-w-2xl">
            {[
              { step: '1', actor: 'Manager', action: 'Creates transfer request', color: 'bg-blue-500' },
              { step: '2', actor: 'System', action: 'Validates source stock availability', color: 'bg-purple-500' },
              { step: '3', actor: 'System', action: 'Sets status to PENDING', color: 'bg-warning' },
              { step: '4', actor: 'Admin', action: 'Reviews and approves transfer', color: 'bg-blue-500' },
              { step: '5', actor: 'System', action: 'Sets status to APPROVED', color: 'bg-purple-500' },
              { step: '6', actor: 'Manager', action: 'Marks transfer as IN_TRANSIT', color: 'bg-blue-500' },
              { step: '7', actor: 'System', action: 'Decrements source branch stock', color: 'bg-purple-500' },
              { step: '8', actor: 'Recipient', action: 'Receives goods at destination', color: 'bg-blue-500' },
              { step: '9', actor: 'System', action: 'Increments destination stock', color: 'bg-purple-500' },
              { step: '10', actor: 'System', action: 'Sets status to RECEIVED, logs audit', color: 'bg-success' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <div className={`w-8 h-8 ${item.color} text-white rounded-full flex items-center justify-center text-sm`}>
                  {item.step}
                </div>
                <div className="flex-1 border-l-2 border-dashed pl-4 py-2">
                  <p className="text-sm">
                    <span className="text-primary">{item.actor}:</span> {item.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Security & RBAC */}
        <Card className="p-8">
          <h2 className="mb-6">Security & Role-Based Access Control</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="mb-3">Authentication</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>JWT tokens issued by Supabase Auth</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Access tokens passed in Authorization header</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Automatic token refresh on session</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Email auto-confirmed for prototype</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3">Data Isolation</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-success">•</span>
                  <span>Multi-tenant by orgId</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">•</span>
                  <span>KV keys prefixed by entity type</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">•</span>
                  <span>Server validates user access on each request</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success">•</span>
                  <span>Audit logs for critical actions</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-3">Role Hierarchy</h3>
              <div className="space-y-2">
                {[
                  { role: 'Owner', level: 5, color: 'bg-red-500' },
                  { role: 'Admin', level: 4, color: 'bg-orange-500' },
                  { role: 'Manager', level: 3, color: 'bg-yellow-500' },
                  { role: 'Cashier', level: 2, color: 'bg-green-500' },
                  { role: 'Auditor', level: 1, color: 'bg-blue-500' },
                ].map((r) => (
                  <div key={r.role} className="flex items-center gap-3">
                    <div className={`w-20 h-6 ${r.color} rounded text-white text-xs flex items-center justify-center`}>
                      Level {r.level}
                    </div>
                    <span className="text-sm">{r.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3">Key Permissions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Manage branches (Owner, Admin)</li>
                <li>• Approve transfers (Admin, Manager)</li>
                <li>• Process sales (Manager, Cashier)</li>
                <li>• View reports (All except Cashier)</li>
                <li>• Manage products (Owner, Admin, Manager)</li>
                <li>• Create users (Owner, Admin)</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
