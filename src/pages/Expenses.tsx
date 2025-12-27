import { useState, useEffect } from 'react';
import { AppState, Page } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft,
  Plus,
  TrendingDown,
  Calendar,
  Receipt,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
} from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'pos';
  branchId: string;
  branchName: string;
  recordedBy: string;
  createdAt: string;
}

interface ExpensesProps {
  appState: AppState;
  onNavigate: (page: Page) => void;
}

const expenseCategories = [
  'Utilities',
  'Rent',
  'Salaries',
  'Supplies',
  'Maintenance',
  'Transportation',
  'Marketing',
  'Insurance',
  'Taxes',
  'Miscellaneous',
];

export function Expenses({ appState, onNavigate }: ExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('today');

  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'transfer' | 'pos',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadExpenses();
  }, [appState.orgId, appState.currentBranchId]);

  async function loadExpenses() {
    if (!appState.orgId) return;

    try {
      // In production, fetch from backend
      // For now, load from localStorage
      const key = `expenses_${appState.orgId}`;
      const stored = localStorage.getItem(key);
      const allExpenses = stored ? JSON.parse(stored) : [];
      setExpenses(allExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!appState.orgId || !appState.currentBranchId) return;

    const expense: Expense = {
      id: Date.now().toString(),
      date: newExpense.date,
      category: newExpense.category,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      paymentMethod: newExpense.paymentMethod,
      branchId: appState.currentBranchId,
      branchName: appState.branches?.find(b => b.id === appState.currentBranchId)?.name || 'Unknown',
      recordedBy: appState.user?.name || 'User',
      createdAt: new Date().toISOString(),
    };

    const updatedExpenses = [expense, ...expenses];
    setExpenses(updatedExpenses);

    // Save to localStorage (in production, save to backend)
    const key = `expenses_${appState.orgId}`;
    localStorage.setItem(key, JSON.stringify(updatedExpenses));

    setShowAddExpense(false);
    setNewExpense({
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'cash',
      date: new Date().toISOString().split('T')[0],
    });
  }

  function handleDeleteExpense(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const updatedExpenses = expenses.filter(e => e.id !== expenseId);
    setExpenses(updatedExpenses);

    const key = `expenses_${appState.orgId}`;
    localStorage.setItem(key, JSON.stringify(updatedExpenses));
  }

  function handleEditExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExpense) return;

    const updatedExpenses = expenses.map(exp =>
      exp.id === selectedExpense.id ? selectedExpense : exp
    );
    setExpenses(updatedExpenses);

    const key = `expenses_${appState.orgId}`;
    localStorage.setItem(key, JSON.stringify(updatedExpenses));

    setShowEditExpense(false);
    setSelectedExpense(null);
  }

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    // Search filter
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;

    // Date filter
    let matchesDate = true;
    const expenseDate = new Date(expense.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterDate === 'today') {
      matchesDate = expenseDate.toDateString() === today.toDateString();
    } else if (filterDate === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = expenseDate >= weekAgo;
    } else if (filterDate === 'month') {
      matchesDate = 
        expenseDate.getMonth() === today.getMonth() &&
        expenseDate.getFullYear() === today.getFullYear();
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Calculate totals
  const todayTotal = expenses
    .filter(e => new Date(e.date).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + e.amount, 0);

  const weekTotal = expenses
    .filter(e => {
      const expenseDate = new Date(e.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return expenseDate >= weekAgo;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const monthTotal = expenses
    .filter(e => {
      const expenseDate = new Date(e.date);
      const today = new Date();
      return (
        expenseDate.getMonth() === today.getMonth() &&
        expenseDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1>Expenses</h1>
              <p className="text-sm text-muted-foreground">
                Track and manage business expenses
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddExpense(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Expense
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Today</p>
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-2xl text-destructive">₦{todayTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).length} expenses
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">This Week</p>
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl">₦{weekTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Last 7 days
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">This Month</p>
                <Receipt className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl">₦{monthTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleString('default', { month: 'long' })}
              </p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background"
              >
                <option value="all">All Categories</option>
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </Card>

          {/* Expenses List */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Category</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-left p-4">Payment</th>
                    <th className="text-right p-4">Amount</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        No expenses found. Record your first expense to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="text-sm">
                            {new Date(expense.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(expense.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{expense.category}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{expense.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {expense.branchName} • {expense.recordedBy}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary">
                            {expense.paymentMethod.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-destructive font-medium">
                            ₦{expense.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowEditExpense(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                required
              >
                <option value="">Select category</option>
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="amount">Amount (₦) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter expense details..."
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Payment Method *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['cash', 'transfer', 'pos'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setNewExpense({ ...newExpense, paymentMethod: method })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      newExpense.paymentMethod === method
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      {selectedExpense && (
        <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEditExpense} className="space-y-4">
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={selectedExpense.date}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <select
                  id="edit-category"
                  value={selectedExpense.category}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                >
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="edit-amount">Amount (₦) *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={selectedExpense.amount}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, amount: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={selectedExpense.description}
                  onChange={(e) => setSelectedExpense({ ...selectedExpense, description: e.target.value })}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditExpense(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
