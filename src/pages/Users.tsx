import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { getUsers, createUser, updateUser, deleteUser, getBranches } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Plus, User, Shield, Edit, UserX, Trash2 } from 'lucide-react';

interface UsersProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

const roles = ['owner', 'admin', 'manager', 'warehouse_manager', 'cashier', 'auditor'];

const rolePermissions = {
  owner: ['All permissions'],
  admin: ['Manage branches', 'Manage users', 'View all reports', 'Manage products', 'Approve transfers'],
  manager: ['Manage products', 'Approve transfers', 'View reports', 'Manage staff'],
  warehouse_manager: ['Manage warehouse inventory', 'Send products to branches', 'Manage supplier products', 'View warehouse reports'],
  cashier: ['Process sales', 'View inventory', 'Hold sales'],
  auditor: ['View reports', 'View transactions', 'Export data'],
};

export function Users({ appState, onNavigate }: UsersProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    branchId: '',
  });

  useEffect(() => {
    if (appState.orgId) {
      loadUsers();
      loadBranches();
    }
  }, [appState.orgId]);

  async function loadUsers() {
    if (!appState.orgId) return;

    try {
      console.log('🔍 Loading users for org:', appState.orgId);
      const { users: userData } = await getUsers(appState.orgId);
      console.log('📊 Raw users data:', userData);
      console.log('📊 Users count:', userData?.length || 0);
      
      // Transform snake_case to camelCase for display
      const transformedUsers = (userData || []).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.assigned_branch_id,
        organizationId: user.organization_id,
        createdAt: user.created_at || user.createdAt,
        updatedAt: user.updated_at || user.updatedAt,
        status: user.status || 'active',
      }));
      
      console.log('✅ Transformed users:', transformedUsers);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      alert('Failed to load users: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    if (!appState.orgId) return;

    try {
      const { branches: branchData } = await getBranches(appState.orgId);
      setBranches(branchData || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!appState.orgId) return;

    // Validate branch assignment for non-admin roles
    const rolesThatNeedBranch = ['manager', 'cashier', 'warehouse_manager'];
    if (rolesThatNeedBranch.includes(newUser.role) && !newUser.branchId) {
      alert('Please assign a branch for this user role');
      return;
    }

    try {
      // Convert empty branchId to null for roles that don't need branches
      const userData = {
        ...newUser,
        branchId: newUser.branchId || null, // Convert empty string to null
      };
      
      await createUser(appState.orgId, userData);
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'cashier', branchId: '' });
      loadUsers();
      alert('✅ User created successfully! They can now login with their credentials.');
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMsg = error?.message || 'Failed to create user';
      alert('❌ Error: ' + errorMsg);
    }
  }

  function handleEditUser(user: any) {
    setSelectedUser({
      ...user,
      password: '', // Don't show existing password
      branchId: user.branchId || '',
    });
    setShowEditUser(true);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    // Validate branch assignment for non-admin roles
    const rolesThatNeedBranch = ['manager', 'cashier', 'warehouse_manager'];
    if (rolesThatNeedBranch.includes(selectedUser.role) && !selectedUser.branchId) {
      alert('Please assign a branch for this user role');
      return;
    }

    try {
      await updateUser(selectedUser.id, {
        role: selectedUser.role,
        name: selectedUser.name,
        email: selectedUser.email,
        branchId: selectedUser.branchId || null, // Convert empty string to null
      });
      
      alert('User updated successfully!');
      setShowEditUser(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message || error}`);
    }
  }

  async function handleDeactivateUser(user: any) {
    const action = user.status === 'inactive' ? 'activate' : 'deactivate';
    const message = user.status === 'inactive' 
      ? `Are you sure you want to activate ${user.name}? They will regain access to the system.`
      : `Are you sure you want to deactivate ${user.name}? They will lose access to the system.`;
    
    if (confirm(message)) {
      try {
        console.log(`${action} user:`, user);
        
        // Update user status
        const updatedUser = {
          ...user,
          status: user.status === 'inactive' ? 'active' : 'inactive',
          updatedAt: new Date().toISOString(),
        };
        
        await updateUser(user.id, updatedUser);
        
        // Update local state
        setUsers(users.map(u => u.id === user.id ? updatedUser : u));
        
        alert(`User ${action}d successfully!`);
      } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        alert(`Failed to ${action} user. Please try again.`);
      }
    }
  }

  async function handleDeleteUser(user: any) {
    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      try {
        await deleteUser(user.id);
        setUsers(users.filter(u => u.id !== user.id));
        alert(`User ${user.name} deleted successfully!`);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Failed to delete user. Please try again.`);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1>User Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage users and their roles
              </p>
            </div>
          </div>

          {(appState.userRole === 'owner' || appState.userRole === 'admin') && (
            <Button onClick={() => setShowAddUser(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 overflow-x-auto">
            <div className="p-6">
              <h2 className="mb-4">Team Members</h2>
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <User className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                        <p className="text-muted-foreground">No users yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm capitalize">
                            <Shield className="w-3 h-3" />
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              onClick={() => handleDeactivateUser(user)}
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Deactivate</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4">Role Permissions</h3>
            <div className="space-y-4">
              {Object.entries(rolePermissions).map(([role, permissions]) => (
                <div key={role} className="pb-4 border-b last:border-b-0">
                  <p className="capitalize mb-2">{role}</p>
                  <ul className="space-y-1">
                    {permissions.map((perm, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1 h-1 bg-primary rounded-full"></span>
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose the appropriate role for this user
              </p>
            </div>

            {!['owner', 'admin', 'auditor'].includes(newUser.role) && (
              <div>
                <Label htmlFor="branch">Assigned Branch *</Label>
                <select
                  id="branch"
                  value={newUser.branchId}
                  onChange={(e) => setNewUser({ ...newUser, branchId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} {branch.location ? `- ${branch.location}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  This user will only have access to this branch
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button type="submit">Add User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="John Doe"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Email Address *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@example.com"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  required
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="edit-role">Role *</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!['owner', 'admin', 'auditor'].includes(selectedUser.role) && (
                <div>
                  <Label htmlFor="edit-branch">Assigned Branch *</Label>
                  <select
                    id="edit-branch"
                    value={selectedUser.branchId}
                    onChange={(e) => setSelectedUser({ ...selectedUser, branchId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    required
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} {branch.location ? `- ${branch.location}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    This user will only have access to this branch
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="••••••••"
                  value={selectedUser.password}
                  onChange={(e) => setSelectedUser({ ...selectedUser, password: e.target.value })}
                  minLength={6}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditUser(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}