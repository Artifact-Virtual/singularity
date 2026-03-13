/**
 * Admin Module — User Management
 * Full CRUD for users and roles, API-backed
 */

import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import {
  Users,
  Shield,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  X,
  Save,
  UserPlus,
  Loader2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { cn, formatDate, exportToCSV } from '@shared/utils';
import { adminService, type AdminUser, type Role } from '@core/api/services';

// ============================================================================
// Users Page
// ============================================================================
function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        adminService.listUsers(),
        adminService.listRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    try {
      await adminService.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const updated = await adminService.updateUser(user.id, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    } catch (err: any) {
      setError(err?.message || 'Failed to update user');
    }
  };

  const handleSave = async (data: { email: string; password?: string; firstName: string; lastName: string; roleId: string }) => {
    try {
      if (editingUser) {
        const { password, ...updateData } = data;
        const updated = await adminService.updateUser(editingUser.id, updateData);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u));
      } else {
        if (!data.password) throw new Error('Password is required');
        const created = await adminService.createUser(data as any);
        setUsers(prev => [created, ...prev]);
      }
      setShowForm(false);
      setEditingUser(null);
    } catch (err: any) {
      throw err;
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} total users</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 rounded-md border border-input hover:bg-accent text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setEditingUser(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>
        <button
          onClick={() => exportToCSV(users, 'users', [
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'email', label: 'Email' },
            { key: 'isActive', label: 'Active' },
            { key: 'createdAt', label: 'Created' },
          ])}
          className="h-10 px-4 rounded-md border border-input bg-background hover:bg-accent flex items-center gap-2 text-sm whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <span className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      user.role?.name === 'admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    )}>
                      {user.role?.name || 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(user)} title={user.isActive ? 'Click to deactivate' : 'Click to activate'}>
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle className="h-3.5 w-3.5" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs"><XCircle className="h-3.5 w-3.5" /> Inactive</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingUser(user); setShowForm(true); }}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? 'No users match your search' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingUser(null); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// User Form Modal
// ============================================================================
function UserFormModal({
  user,
  roles,
  onSave,
  onClose,
}: {
  user: AdminUser | null;
  roles: Role[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    roleId: user?.roleId || (roles[0]?.id || ''),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{user ? 'Edit User' : 'Create User'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">First name</label>
              <input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} required
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Last name</label>
              <input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} required
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>

          {!user && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required={!user}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Role</label>
            <select value={form.roleId} onChange={e => setForm(f => ({...f, roleId: e.target.value}))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:outline-none">
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent text-foreground">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Admin Module Root
// ============================================================================
export default function AdminModule() {
  const tabs = [
    { id: 'users', label: 'Users', icon: Users, path: '' },
    { id: 'roles', label: 'Roles', icon: Shield, path: 'roles' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Administration</h1>
        <p className="text-muted-foreground mt-1">Manage users, roles, and system settings</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            to={`/admin/${tab.path}`}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              'text-muted-foreground border-transparent hover:text-foreground hover:border-border',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </div>

      <Routes>
        <Route index element={<UsersPage />} />
        <Route path="roles" element={<UsersPage />} />
      </Routes>
    </div>
  );
}
