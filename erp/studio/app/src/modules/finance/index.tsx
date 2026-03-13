import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  DollarSign,
  BookOpen,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Download,
  Trash2,
  Eye,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatRelativeTime, exportToCSV } from '@shared/utils';
import { useDataStore, type Invoice } from '@core/services/dataStore';
import { useApiState } from '@core/hooks/useApiState';
import {
  ledgerAccountsService, journalService, billsService,
  type LedgerAccount as APIAccount, type JournalEntry as APIJournal, type Bill as APIBill,
} from '@core/api/services';

// Invoice Form Modal
function InvoiceForm({
  invoice,
  onSave,
  onCancel,
}: {
  invoice?: Invoice;
  onSave: (data: Partial<Invoice>) => void;
  onCancel: () => void;
}) {
  const { contacts } = useDataStore();
  const [formData, setFormData] = useState({
    clientName: invoice?.clientName || '',
    items: invoice?.items || [{ description: '', quantity: 1, unitPrice: 0 }],
    dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
    status: invoice?.status || 'draft' as Invoice['status'],
  });

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      subtotal,
      tax,
      total,
      amount: total,
      dueDate: formData.dueDate,
    } as any);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl p-6 m-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {invoice ? 'Edit Invoice' : 'Create Invoice'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Client Name</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                required
                placeholder="Client name..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Line Items</label>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="col-span-6 h-10 px-3 rounded-md border border-input bg-background"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="col-span-2 h-10 px-3 rounded-md border border-input bg-background"
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="col-span-3 h-10 px-3 rounded-md border border-input bg-background"
                    min="0"
                    step="0.01"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = formData.items.filter((_, i) => i !== index);
                      setFormData({ ...formData, items: newItems.length ? newItems : [{ description: '', quantity: 1, unitPrice: 0 }] });
                    }}
                    className="col-span-1 h-10 rounded-md border border-input hover:bg-destructive/10 text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + Add line item
            </button>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (10%)</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 rounded-md border border-input bg-background hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {invoice ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Invoices Page (Accounts Receivable)
function ReceivablesPage() {
  const { invoices, contacts, addInvoice, updateInvoice, deleteInvoice, loadInvoices, loadContacts, isLoading } = useDataStore();
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();

  useEffect(() => {
    loadInvoices();
    loadContacts();
  }, [loadInvoices, loadContacts]);

  const handleSave = (data: Partial<Invoice>) => {
    if (editingInvoice) {
      updateInvoice(editingInvoice.id, data);
    } else {
      addInvoice({
        id: crypto.randomUUID(),
        number: `INV-${String(invoices.length + 1).padStart(4, '0')}`,
        ...data,
        createdAt: new Date().toISOString(),
      } as any);
    }
    setShowForm(false);
    setEditingInvoice(undefined);
  };

  const statusConfig: Record<Invoice['status'], { color: string; icon: typeof CheckCircle2 }> = {
    draft: { color: 'bg-muted text-muted-foreground', icon: FileText },
    sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
    paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    cancelled: { color: 'bg-muted text-muted-foreground', icon: AlertCircle },
  };

  const totalReceivable = invoices
    .filter((i) => ['sent', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage customer invoices and payments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalReceivable)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-red-600">
            {invoices.filter((i) => i.status === 'overdue').length}
          </p>
        </div>
      </div>

      {/* Invoices table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Invoice #</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Due Date</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices yet</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-2 text-primary hover:underline"
                  >
                    Create your first invoice
                  </button>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const contact = contacts.find((c) => c.id === invoice.clientName);
                const config = statusConfig[invoice.status];
                return (
                  <tr key={invoice.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{invoice.invoiceNumber}</td>
                    <td className="p-4 text-foreground">
                      {contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'}
                    </td>
                    <td className="p-4 font-medium text-foreground">{formatCurrency(invoice.amount)}</td>
                    <td className="p-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.color)}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => updateInvoice(invoice.id, { status: 'sent' })}
                            className="p-2 rounded-md hover:bg-accent text-primary"
                            title="Send"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {invoice.status === 'sent' && (
                          <button
                            onClick={() => updateInvoice(invoice.id, { status: 'paid' })}
                            className="p-2 rounded-md hover:bg-accent text-green-600"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteInvoice(invoice.id)}
                          className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingInvoice(undefined);
          }}
        />
      )}
    </div>
  );
}

// Account types
type Account = {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  parentId?: string;
};

type JournalEntry = {
  id: string;
  date: Date;
  description: string;
  reference?: string;
  entries: {
    accountId: string;
    debit: number;
    credit: number;
  }[];
  status: 'draft' | 'posted';
  createdAt: Date;
};

// Ledger Page
function LedgerPage() {
  const { items: accounts, add: addAccount } = useApiState<APIAccount>(
    ledgerAccountsService.list, ledgerAccountsService.create, ledgerAccountsService.update, ledgerAccountsService.delete
  );
  const { items: journalEntries, add: addJournalEntry } = useApiState<APIJournal>(
    journalService.list, journalService.create, undefined, journalService.delete
  );
  const [viewMode, setViewMode] = useState<'accounts' | 'journal'>('accounts');
  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const typeConfig: Record<Account['type'], { label: string; color: string }> = {
    asset: { label: 'Asset', color: 'bg-blue-100 text-blue-800' },
    liability: { label: 'Liability', color: 'bg-red-100 text-red-800' },
    equity: { label: 'Equity', color: 'bg-purple-100 text-purple-800' },
    revenue: { label: 'Revenue', color: 'bg-green-100 text-green-800' },
    expense: { label: 'Expense', color: 'bg-orange-100 text-orange-800' },
  };

  const filteredAccounts = accounts.filter(
    (a) => filterType === 'all' || a.type === filterType
  );

  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = accounts.filter((a) => a.type === 'equity').reduce((sum, a) => sum + a.balance, 0);
  const totalRevenue = accounts.filter((a) => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0);
  const totalExpenses = accounts.filter((a) => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">General Ledger</h1>
            <p className="text-muted-foreground">Chart of accounts and journal entries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-input bg-background">
            <button
              onClick={() => setViewMode('accounts')}
              className={cn('px-4 py-2 text-sm font-medium rounded-l-md', viewMode === 'accounts' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              Chart of Accounts
            </button>
            <button
              onClick={() => setViewMode('journal')}
              className={cn('px-4 py-2 text-sm font-medium rounded-r-md', viewMode === 'journal' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              Journal Entries
            </button>
          </div>
          <button onClick={() => setShowForm(true)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {viewMode === 'accounts' ? 'Add Account' : 'New Entry'}
          </button>
        </div>
      </div>

      {/* Create Account / Journal Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {viewMode === 'accounts' ? 'Add Ledger Account' : 'New Journal Entry'}
            </h2>
            {viewMode === 'accounts' ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const data = new FormData(form);
                await addAccount({
                  code: data.get('code') as string,
                  name: data.get('name') as string,
                  type: data.get('type') as string,
                  description: data.get('description') as string || undefined,
                  balance: 0,
                  isActive: true,
                });
                setShowForm(false);
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Account Code *</label>
                      <input name="code" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. 1000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Type *</label>
                      <select name="type" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground">
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Account Name *</label>
                    <input name="name" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. Cash & Equivalents" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <textarea name="description" rows={2} className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground resize-none" placeholder="Optional description..." />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent text-foreground">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Add Account</button>
                </div>
              </form>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const data = new FormData(form);
                await addJournalEntry({
                  accountId: data.get('accountId') as string,
                  date: data.get('date') as string || new Date().toISOString().split('T')[0],
                  description: data.get('description') as string,
                  debit: parseFloat(data.get('debit') as string) || 0,
                  credit: parseFloat(data.get('credit') as string) || 0,
                  reference: data.get('reference') as string || undefined,
                });
                setShowForm(false);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Account *</label>
                    <select name="accountId" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground">
                      <option value="">Select account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                      <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Reference</label>
                      <input name="reference" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. INV-001" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description *</label>
                    <input name="description" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="Transaction description" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Debit</label>
                      <input name="debit" type="number" step="0.01" defaultValue="0" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Credit</label>
                      <input name="credit" type="number" step="0.01" defaultValue="0" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent text-foreground">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Add Entry</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Assets</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Liabilities</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Equity</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalEquity)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Revenue (YTD)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Expenses (YTD)</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {viewMode === 'accounts' ? (
        <>
          {/* Filter */}
          <div className="flex items-center gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="all">All Account Types</option>
              <option value="asset">Assets</option>
              <option value="liability">Liabilities</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expenses</option>
            </select>
          </div>

          {/* Accounts table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Code</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Account Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4 font-mono text-sm text-muted-foreground">{account.code}</td>
                    <td className="p-4 font-medium text-foreground">{account.name}</td>
                    <td className="p-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', typeConfig[account.type as keyof typeof typeConfig]?.color)}>
                        {typeConfig[account.type as keyof typeof typeConfig]?.label || account.type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-foreground">
                      {formatCurrency(account.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Journal Entries View */
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Description</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Reference</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {journalEntries.map((entry) => {
                const totalDebit = entry.debit;
                return (
                  <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4 text-muted-foreground">{formatDate(entry.date)}</td>
                    <td className="p-4 font-medium text-foreground">{entry.description}</td>
                    <td className="p-4 text-muted-foreground">{entry.reference || '—'}</td>
                    <td className="p-4">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        entry.debit > 0 ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                      )}>
                        {entry.debit > 0 ? 'Debit' : 'Credit'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-foreground">
                      {formatCurrency(totalDebit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Bill types
type Bill = {
  id: string;
  vendorName: string;
  vendorEmail?: string;
  number: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'approved' | 'paid' | 'overdue';
  category: string;
  createdAt: Date;
  paidAt?: Date;
};

// Payables Page
function PayablesPage() {
  const { items: bills, add: addBill, remove: removeBill } = useApiState<APIBill>(
    billsService.list, billsService.create, billsService.update, billsService.delete
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredBills = bills.filter(
    (b) =>
      (filterStatus === 'all' || b.status === filterStatus) &&
      (b.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusConfig: Record<Bill['status'], { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800' },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800' },
  };

  const handleCreateBill = async () => {
    await addBill({
      vendorName: 'New Vendor',
      billNumber: `BILL-${String(bills.length + 1).padStart(3, '0')}`,
      amount: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      category: 'General',
    } as Partial<APIBill>);
  };

  const handleApprove = async (id: string) => {
    const bill = bills.find((b) => b.id === id);
    if (bill) {
      await billsService.update(id, { status: 'approved' });
    }
  };

  const handlePay = async (id: string) => {
    const bill = bills.find((b) => b.id === id);
    if (bill) {
      await billsService.update(id, { status: 'paid', paidDate: new Date().toISOString() });
    }
  };

  const totalPending = bills
    .filter((b) => ['pending', 'approved'].includes(b.status))
    .reduce((sum, b) => sum + b.amount, 0);

  const totalOverdue = bills
    .filter((b) => b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalPaid = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowUpFromLine className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Accounts Payable</h1>
            <p className="text-muted-foreground">Bills and vendor payments</p>
          </div>
        </div>
        <button
          onClick={handleCreateBill}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Bill
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Bills</p>
          <p className="text-2xl font-bold text-foreground">{bills.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Paid (YTD)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Bills table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Bill #</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Vendor</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Due Date</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <ArrowUpFromLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bills found</p>
                  <button
                    onClick={handleCreateBill}
                    className="mt-2 text-primary hover:underline"
                  >
                    Add your first bill
                  </button>
                </td>
              </tr>
            ) : (
              filteredBills.map((bill) => (
                <tr key={bill.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 font-medium text-foreground">{bill.billNumber}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-foreground">{bill.vendorName}</p>
                      {bill.vendorEmail && (
                        <p className="text-xs text-muted-foreground">{bill.vendorEmail}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{bill.category}</td>
                  <td className="p-4 font-medium text-foreground">{formatCurrency(bill.amount)}</td>
                  <td className="p-4 text-muted-foreground">
                    {formatDate(bill.dueDate)}
                  </td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusConfig[bill.status as keyof typeof statusConfig]?.color)}>
                      {statusConfig[bill.status as keyof typeof statusConfig]?.label || bill.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {bill.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(bill.id)}
                          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                          Approve
                        </button>
                      )}
                      {(bill.status === 'approved' || bill.status === 'overdue') && (
                        <button
                          onClick={() => handlePay(bill.id)}
                          className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                        >
                          Pay
                        </button>
                      )}
                      <button className="p-2 rounded-md hover:bg-accent">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeBill(bill.id)}
                        className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reports Page
function ReportsPage() {
  const { invoices, deals, loadInvoices, loadDeals } = useDataStore();

  useEffect(() => {
    loadInvoices();
    loadDeals();
  }, [loadInvoices, loadDeals]);
  
  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPipeline = deals
    .filter((d) => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-muted-foreground">Financial statements and reporting</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Revenue Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Revenue</span>
              <span className="font-bold text-green-600">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pipeline Value</span>
              <span className="font-bold">{formatCurrency(totalPipeline)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Invoices</span>
              <span className="font-bold">{invoices.filter((i) => i.status === 'paid').length}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button onClick={() => exportToCSV(invoices, 'invoices', [
              { key: 'invoiceNumber', label: 'Invoice #' },
              { key: 'clientName', label: 'Client' },
              { key: 'clientEmail', label: 'Email' },
              { key: 'amount', label: 'Amount' },
              { key: 'status', label: 'Status' },
              { key: 'dueDate', label: 'Due Date' },
              { key: 'createdAt', label: 'Created' },
            ])} className="w-full h-10 rounded-md border border-input bg-background hover:bg-accent flex items-center justify-center gap-2">
              <Download className="h-4 w-4" />
              Export to CSV
            </button>
            <button className="w-full h-10 rounded-md border border-input bg-background hover:bg-accent flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Finance Overview
function FinanceOverview() {
  const { invoices, deals, loadInvoices, loadDeals } = useDataStore();

  useEffect(() => {
    loadInvoices();
    loadDeals();
  }, [loadInvoices, loadDeals]);
  
  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalReceivable = invoices
    .filter((i) => ['sent', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance & Accounting</h1>
          <p className="text-muted-foreground">Financial management and accounting</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <DollarSign className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-muted-foreground">Total Revenue</p>
        </div>
        <Link to="/finance/receivables" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <ArrowDownToLine className="h-8 w-8 text-orange-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalReceivable)}</p>
          <p className="text-sm text-muted-foreground">Receivables</p>
        </Link>
        <Link to="/finance/receivables" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <FileText className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
          <p className="text-sm text-muted-foreground">Invoices</p>
        </Link>
        <Link to="/finance/reports" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <FileText className="h-8 w-8 text-purple-600 mb-2" />
          <p className="text-sm text-muted-foreground">View Reports →</p>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No invoices yet</p>
        ) : (
          <div className="space-y-3">
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{formatRelativeTime(invoice.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(invoice.amount)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{invoice.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Finance() {
  return (
    <Routes>
      <Route index element={<FinanceOverview />} />
      <Route path="ledger/*" element={<LedgerPage />} />
      <Route path="receivables/*" element={<ReceivablesPage />} />
      <Route path="payables/*" element={<PayablesPage />} />
      <Route path="reports/*" element={<ReportsPage />} />
    </Routes>
  );
}
