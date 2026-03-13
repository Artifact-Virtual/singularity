/**
 * Stakeholders Module
 * Manages investors, board members, and partners
 * Data persisted via Stakeholder API (type field distinguishes categories)
 */

import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useApiState } from '@core/hooks/useApiState';
import {
  stakeholdersService,
  type Stakeholder,
} from '@core/api/services';
import {
  Building2,
  PiggyBank,
  Users,
  Handshake,
  TrendingUp,
  Mail,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { cn, formatCurrency } from '@shared/utils';

// Filtered hooks for each stakeholder type
function useInvestors() {
  const state = useApiState<Stakeholder>(
    async () => (await stakeholdersService.list({ type: 'investor' })),
    stakeholdersService.create,
    stakeholdersService.update,
    stakeholdersService.delete
  );
  return state;
}

function useBoardMembers() {
  const state = useApiState<Stakeholder>(
    async () => (await stakeholdersService.list({ type: 'board' })),
    stakeholdersService.create,
    stakeholdersService.update,
    stakeholdersService.delete
  );
  return state;
}

function usePartners() {
  const state = useApiState<Stakeholder>(
    async () => (await stakeholdersService.list({ type: 'partner' })),
    stakeholdersService.create,
    stakeholdersService.update,
    stakeholdersService.delete
  );
  return state;
}

// Stakeholders Overview
function StakeholdersOverview() {
  const { items: investors } = useInvestors();
  const { items: board } = useBoardMembers();
  const { items: partners } = usePartners();

  const totalInvestment = investors.reduce((sum, i) => sum + (i.investment || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stakeholder Management</h1>
          <p className="text-muted-foreground">Manage investors, board, and partners</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/stakeholders/investors" className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
          <PiggyBank className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{investors.length}</p>
          <p className="text-sm text-muted-foreground">Investors</p>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalInvestment)}</p>
          <p className="text-sm text-muted-foreground">Total Raised</p>
        </div>
        <Link to="/stakeholders/board" className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
          <Users className="h-8 w-8 text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{board.length}</p>
          <p className="text-sm text-muted-foreground">Board Members</p>
        </Link>
        <Link to="/stakeholders/partners" className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
          <Handshake className="h-8 w-8 text-orange-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{partners.length}</p>
          <p className="text-sm text-muted-foreground">Partners</p>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Cap Table</h2>
          <div className="space-y-3">
            {investors.map((investor) => (
              <div key={investor.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <span className="font-medium text-foreground">{investor.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({investor.company || 'Direct'})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">{investor.equity || 0}%</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatCurrency(investor.investment || 0)}</span>
                </div>
              </div>
            ))}
            {investors.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No investors yet</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Board of Directors</h2>
          <div className="space-y-3">
            {board.map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-medium text-primary">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.title || 'Member'}</p>
                </div>
              </div>
            ))}
            {board.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No board members yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic CRUD form modal
function FormModal({ title, children, onClose, onSave }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-input bg-background text-foreground text-sm hover:bg-accent">
            Cancel
          </button>
          <button onClick={onSave} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// Investors Page
function InvestorsPage() {
  const { items: investors, add, update, remove } = useInvestors();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [form, setForm] = useState({ name: '', company: '', investment: '', equity: '', email: '', joinDate: '', notes: '' });

  const handleSave = async () => {
    const data: Partial<Stakeholder> = {
      name: form.name,
      type: 'investor',
      company: form.company,
      investment: parseFloat(form.investment) || 0,
      equity: parseFloat(form.equity) || 0,
      email: form.email,
      joinDate: form.joinDate || new Date().toISOString().slice(0, 10),
      notes: form.notes,
      status: 'active',
    };
    if (editing) {
      await update(editing.id, data);
    } else {
      await add(data);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', company: '', investment: '', equity: '', email: '', joinDate: '', notes: '' });
  };

  const handleEdit = (inv: Stakeholder) => {
    setForm({
      name: inv.name, company: inv.company || '', investment: String(inv.investment || 0),
      equity: String(inv.equity || 0), email: inv.email || '', joinDate: inv.joinDate || '', notes: inv.notes || '',
    });
    setEditing(inv);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <PiggyBank className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Investors</h1>
            <p className="text-muted-foreground">Investor relations and cap table</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', company: '', investment: '', equity: '', email: '', joinDate: '', notes: '' }); setShowForm(true); }} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Investor
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Investor</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Company</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Investment</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Equity</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {investors.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No investors yet. Add your first investor.</td></tr>
            ) : (
              investors.map((investor) => (
                <tr key={investor.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 font-medium text-foreground">{investor.name}</td>
                  <td className="p-4"><span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{investor.company || '—'}</span></td>
                  <td className="p-4 font-medium text-foreground">{formatCurrency(investor.investment || 0)}</td>
                  <td className="p-4 text-foreground">{investor.equity || 0}%</td>
                  <td className="p-4 text-muted-foreground">{investor.email || '—'}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(investor)} className="p-1.5 rounded hover:bg-accent"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(investor.id)} className="p-1.5 rounded hover:bg-accent"><Trash2 className="h-4 w-4 text-destructive" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <FormModal title={editing ? 'Edit Investor' : 'Add Investor'} onClose={() => setShowForm(false)} onSave={handleSave}>
          <FormField label="Name"><input className={inputClass} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></FormField>
          <FormField label="Company"><input className={inputClass} value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Investment ($)"><input className={inputClass} type="number" value={form.investment} onChange={e => setForm(f => ({...f, investment: e.target.value}))} /></FormField>
            <FormField label="Equity (%)"><input className={inputClass} type="number" step="0.01" value={form.equity} onChange={e => setForm(f => ({...f, equity: e.target.value}))} /></FormField>
          </div>
          <FormField label="Email"><input className={inputClass} type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></FormField>
          <FormField label="Investment Date"><input className={inputClass} type="date" value={form.joinDate} onChange={e => setForm(f => ({...f, joinDate: e.target.value}))} /></FormField>
          <FormField label="Notes"><textarea className={cn(inputClass, 'h-20 py-2')} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></FormField>
        </FormModal>
      )}
    </div>
  );
}

// Board Page
function BoardPage() {
  const { items: board, add, update, remove } = useBoardMembers();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '', notes: '' });

  const handleSave = async () => {
    const data: Partial<Stakeholder> = {
      name: form.name,
      type: 'board',
      title: form.title,
      email: form.email,
      phone: form.phone,
      notes: form.notes,
      status: 'active',
    };
    if (editing) {
      await update(editing.id, data);
    } else {
      await add(data);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', title: '', email: '', phone: '', notes: '' });
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Board of Directors</h1>
            <p className="text-muted-foreground">Board meetings and governance</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', title: '', email: '', phone: '', notes: '' }); setShowForm(true); }} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus className="h-4 w-4" />Add Member
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {board.map((member) => (
          <div key={member.id} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-medium text-primary">{member.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.title || 'Member'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ name: member.name, title: member.title || '', email: member.email || '', phone: member.phone || '', notes: member.notes || '' }); setEditing(member); setShowForm(true); }} className="p-1 rounded hover:bg-accent"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                <button onClick={() => handleDelete(member.id)} className="p-1 rounded hover:bg-accent"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {member.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{member.email}</p>}
              {member.notes && <p className="mt-2">{member.notes}</p>}
            </div>
          </div>
        ))}
        {board.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No board members yet. Add your first member.
          </div>
        )}
      </div>

      {showForm && (
        <FormModal title={editing ? 'Edit Member' : 'Add Board Member'} onClose={() => setShowForm(false)} onSave={handleSave}>
          <FormField label="Full Name"><input className={inputClass} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></FormField>
          <FormField label="Role / Title"><input className={inputClass} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email"><input className={inputClass} type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></FormField>
            <FormField label="Phone"><input className={inputClass} value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></FormField>
          </div>
          <FormField label="Notes"><textarea className={cn(inputClass, 'h-20 py-2')} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></FormField>
        </FormModal>
      )}
    </div>
  );
}

// Partners Page
function PartnersPage() {
  const { items: partners, add, update, remove } = usePartners();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [form, setForm] = useState({ name: '', company: '', status: 'active', email: '', joinDate: '', notes: '' });

  const handleSave = async () => {
    const data: Partial<Stakeholder> = {
      name: form.name,
      type: 'partner',
      company: form.company,
      email: form.email,
      joinDate: form.joinDate || undefined,
      notes: form.notes,
      status: form.status,
    };
    if (editing) {
      await update(editing.id, data);
    } else {
      await add(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Handshake className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Partners</h1>
            <p className="text-muted-foreground">Strategic partnerships</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', company: '', status: 'active', email: '', joinDate: '', notes: '' }); setShowForm(true); }} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2">
          <Plus className="h-4 w-4" />Add Partner
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {partners.map((partner) => (
          <div key={partner.id} className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Handshake className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold text-foreground">{partner.name}</h3>
                <p className="text-sm text-muted-foreground">{partner.company || 'Partner'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-1 rounded-full', partner.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-muted-foreground')}>
                  {partner.status}
                </span>
                <button onClick={() => { setForm({ name: partner.name, company: partner.company || '', status: partner.status, email: partner.email || '', joinDate: partner.joinDate || '', notes: partner.notes || '' }); setEditing(partner); setShowForm(true); }} className="p-1 rounded hover:bg-accent"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                <button onClick={() => handleDelete(partner.id)} className="p-1 rounded hover:bg-accent"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            </div>
            {partner.notes && <p className="text-sm text-muted-foreground">{partner.notes}</p>}
          </div>
        ))}
        {partners.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            No partners yet. Add your first strategic partner.
          </div>
        )}
      </div>

      {showForm && (
        <FormModal title={editing ? 'Edit Partner' : 'Add Partner'} onClose={() => setShowForm(false)} onSave={handleSave}>
          <FormField label="Name"><input className={inputClass} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company"><input className={inputClass} value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} /></FormField>
            <FormField label="Status">
              <select className={inputClass} value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                <option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <FormField label="Email"><input className={inputClass} type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></FormField>
          <FormField label="Partnership Since"><input className={inputClass} type="date" value={form.joinDate} onChange={e => setForm(f => ({...f, joinDate: e.target.value}))} /></FormField>
          <FormField label="Notes"><textarea className={cn(inputClass, 'h-20 py-2')} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></FormField>
        </FormModal>
      )}
    </div>
  );
}

export default function Stakeholders() {
  return (
    <Routes>
      <Route index element={<StakeholdersOverview />} />
      <Route path="investors/*" element={<InvestorsPage />} />
      <Route path="board/*" element={<BoardPage />} />
      <Route path="partners/*" element={<PartnersPage />} />
    </Routes>
  );
}
