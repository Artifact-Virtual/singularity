import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  HandshakeIcon,
  Megaphone,
  HeadphonesIcon,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Download,
} from 'lucide-react';
import { cn, formatRelativeTime, exportToCSV } from '@shared/utils';
import { useDataStore, type Contact, type Deal } from '@core/services/dataStore';
import { useApiState } from '@core/hooks/useApiState';
import { campaignsService, ticketsService, type Campaign as APICampaign, type Ticket as APITicket } from '@core/api/services';

// Contact Form Modal
function ContactForm({ 
  contact, 
  onSave, 
  onCancel 
}: { 
  contact?: Contact; 
  onSave: (data: Partial<Contact>) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    company: contact?.company || '',
    position: contact?.position || '',
    status: contact?.status || 'lead' as Contact['status'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {contact ? 'Edit Contact' : 'Add Contact'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Position</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Contact['status'] })}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
            >
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {contact ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Contacts List Page
function ContactsPage() {
  const { contacts, addContact, updateContact, deleteContact, loadContacts, isLoading } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = contacts.filter(
    (c) =>
      c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (data: Partial<Contact>) => {
    try {
      if (editingContact) {
        await updateContact(editingContact.id, data);
      } else {
        await addContact(data as Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setShowForm(false);
      setEditingContact(undefined);
    } catch (err) {
      console.error('Failed to save contact:', err);
    }
  };

  const statusColors: Record<Contact['status'], string> = {
    lead: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and companies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(contacts, 'contacts', [
              { key: 'firstName', label: 'First Name' }, { key: 'lastName', label: 'Last Name' },
              { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
              { key: 'company', label: 'Company' }, { key: 'position', label: 'Position' },
              { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Created' },
            ])}
            disabled={contacts.length === 0}
            className="h-10 px-3 rounded-md border border-input text-foreground hover:bg-accent flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background"
          />
        </div>
        <button className="h-10 px-4 rounded-md border border-input bg-background hover:bg-accent flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Contacts</p>
          <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Leads</p>
          <p className="text-2xl font-bold text-yellow-600">
            {contacts.filter((c) => c.status === 'lead').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Prospects</p>
          <p className="text-2xl font-bold text-blue-600">
            {contacts.filter((c) => c.status === 'lead').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Customers</p>
          <p className="text-2xl font-bold text-green-600">
            {contacts.filter((c) => c.status === 'active').length}
          </p>
        </div>
      </div>

      {/* Contacts table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Company</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No contacts found</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-2 text-primary hover:underline"
                  >
                    Add your first contact
                  </button>
                </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.position && (
                          <p className="text-xs text-muted-foreground">{contact.position}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">{contact.email}</td>
                  <td className="p-4 text-sm text-foreground">{contact.company || '-'}</td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColors[contact.status])}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatRelativeTime(contact.createdAt)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingContact(contact);
                          setShowForm(true);
                        }}
                        className="p-2 rounded-md hover:bg-accent"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteContact(contact.id)}
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

      {/* Form modal */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingContact(undefined);
          }}
        />
      )}
    </div>
  );
}

// Deals Page
function DealsPage() {
  const { deals, contacts, addDeal, updateDeal, deleteDeal, loadDeals, loadContacts, isLoading } = useDataStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadDeals();
    loadContacts();
  }, [loadDeals, loadContacts]);

  const stages = ['discovery', 'proposal', 'negotiation', 'closed-won', 'closed-lost'] as const;
  const stageColors: Record<string, string> = {
    discovery: 'bg-blue-500',
    proposal: 'bg-yellow-500',
    negotiation: 'bg-orange-500',
    closed_won: 'bg-green-500',
    closed_lost: 'bg-red-500',
  };

  const dealsByStage = stages.map((stage) => ({
    stage,
    deals: deals.filter((d) => d.stage === stage),
    total: deals.filter((d) => d.stage === stage).reduce((sum, d) => sum + d.value, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals</h1>
          <p className="text-muted-foreground">Track and manage sales pipeline</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Deal
        </button>
      </div>

      {/* Pipeline view */}
      <div className="grid grid-cols-5 gap-4 overflow-x-auto">
        {dealsByStage.map(({ stage, deals: stageDeals, total }) => (
          <div key={stage} className="min-w-[250px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', stageColors[stage])} />
                <span className="font-medium text-foreground capitalize">
                  {stage.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{stageDeals.length}</span>
            </div>
            <div className="space-y-3">
              {stageDeals.map((deal) => {
                const contact = contacts.find((c) => c.id === deal.contactId);
                return (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:shadow-md"
                  >
                    <h3 className="font-medium text-foreground">{deal.title}</h3>
                    {contact && (
                      <p className="text-sm text-muted-foreground">
                        {contact.firstName} {contact.lastName}
                      </p>
                    )}
                    <p className="text-lg font-bold text-foreground mt-2">
                      ${deal.value.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                    </div>
                  </div>
                );
              })}
              {stageDeals.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground text-sm">
                  No deals
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">${total.toLocaleString()}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Campaign types
type Campaign = {
  id: string;
  name: string;
  type: 'email' | 'social' | 'ads' | 'event';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  budget?: number;
  spent?: number;
  recipients?: number;
  opened?: number;
  clicked?: number;
  conversions?: number;
};

// Campaigns Page
function CampaignsPage() {
  const { items: campaigns, add: addCampaign, remove: removeCampaign, loading } = useApiState<APICampaign>(
    campaignsService.list, campaignsService.create, campaignsService.update, campaignsService.delete
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredCampaigns = campaigns.filter(
    (c) =>
      (filterType === 'all' || c.type === filterType) &&
      (filterStatus === 'all' || c.status === filterStatus) &&
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeConfig: Record<Campaign['type'], { label: string; color: string }> = {
    email: { label: 'Email', color: 'bg-blue-100 text-blue-800' },
    social: { label: 'Social', color: 'bg-purple-100 text-purple-800' },
    ads: { label: 'Ads', color: 'bg-orange-100 text-orange-800' },
    event: { label: 'Event', color: 'bg-green-100 text-green-800' },
  };

  const statusConfig: Record<Campaign['status'], { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
    scheduled: { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' },
    active: { label: 'Active', color: 'bg-green-100 text-green-800' },
    paused: { label: 'Paused', color: 'bg-orange-100 text-orange-800' },
    completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  };

  const handleCreateCampaign = async () => {
    await addCampaign({
      name: 'New Campaign',
      type: 'email',
      status: 'draft',
    });
    setShowForm(false);
  };

  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const avgConversionRate = totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
            <p className="text-muted-foreground">Marketing campaign management</p>
          </div>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Campaigns</p>
          <p className="text-2xl font-bold text-foreground">{campaigns.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {campaigns.filter((c) => c.status === 'active').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg Open Rate</p>
          <p className="text-2xl font-bold text-blue-600">{avgConversionRate}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Conversions</p>
          <p className="text-2xl font-bold text-purple-600">{totalConversions}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="all">All Types</option>
          <option value="email">Email</option>
          <option value="social">Social</option>
          <option value="ads">Ads</option>
          <option value="event">Event</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Campaigns table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Campaign</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Performance</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Start Date</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No campaigns found</p>
                  <button
                    onClick={handleCreateCampaign}
                    className="mt-2 text-primary hover:underline"
                  >
                    Create your first campaign
                  </button>
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4">
                    <p className="font-medium text-foreground">{campaign.name}</p>
                    {campaign.budget && (
                      <p className="text-xs text-muted-foreground">
                        Budget: ${campaign.budget.toLocaleString()}
                        {campaign.spent && ` • Spent: $${campaign.spent.toLocaleString()}`}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', typeConfig[campaign.type as keyof typeof typeConfig]?.color)}>
                      {typeConfig[campaign.type as keyof typeof typeConfig]?.label || campaign.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusConfig[campaign.status as keyof typeof statusConfig]?.color)}>
                      {statusConfig[campaign.status as keyof typeof statusConfig]?.label || campaign.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {campaign.leads ? (
                      <div className="text-sm">
                        <p className="text-foreground">{campaign.leads.toLocaleString()} leads</p>
                        <p className="text-muted-foreground">
                          {campaign.conversions || 0} conversions
                          {campaign.revenue ? ` • $${campaign.revenue.toLocaleString()}` : ''}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {campaign.startDate ? formatRelativeTime(campaign.startDate) : '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-md hover:bg-accent" onClick={() => alert(`Campaign: ${campaign.name}\nType: ${campaign.type}\nStatus: ${campaign.status}\nLeads: ${campaign.leads || 0}`)}>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-md hover:bg-accent" onClick={() => { setShowForm(true); }}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeCampaign(campaign.id)}
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

// Support Ticket types
type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'technical' | 'billing' | 'feature_request';
  contactId?: string;
  assigneeId?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Support Page
function SupportPage() {
  const { items: tickets, add: addTicket, update: updateTicket, remove: removeTicket, loading: ticketsLoading } = useApiState<APITicket>(
    ticketsService.list, ticketsService.create, ticketsService.update, ticketsService.delete
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filteredTickets = tickets.filter(
    (t) =>
      (filterStatus === 'all' || t.status === filterStatus) &&
      (filterPriority === 'all' || t.priority === filterPriority) &&
      (t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusConfig: Record<Ticket['status'], { label: string; color: string }> = {
    open: { label: 'Open', color: 'bg-red-100 text-red-800' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
    closed: { label: 'Closed', color: 'bg-muted text-muted-foreground' },
  };

  const priorityConfig: Record<Ticket['priority'], { label: string; color: string }> = {
    low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
    urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
  };

  const categoryConfig: Record<Ticket['category'], string> = {
    general: 'General',
    technical: 'Technical',
    billing: 'Billing',
    feature_request: 'Feature Request',
  };

  const handleCreateTicket = async () => {
    await addTicket({
      subject: 'New Support Ticket',
      description: '',
      status: 'open',
      priority: 'medium',
      category: 'general',
    });
    setShowForm(false);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateTicket(id, { status });
  };

  const openTickets = tickets.filter((t) => ['open', 'in_progress', 'waiting'].includes(t.status)).length;
  const avgResponseTime = '2.5 hours'; // Would calculate from real data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HeadphonesIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support</h1>
            <p className="text-muted-foreground">Customer support ticketing</p>
          </div>
        </div>
        <button
          onClick={handleCreateTicket}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Tickets</p>
          <p className="text-2xl font-bold text-foreground">{tickets.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Open</p>
          <p className="text-2xl font-bold text-red-600">{openTickets}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Resolved Today</p>
          <p className="text-2xl font-bold text-green-600">
            {tickets.filter((t) => t.status === 'resolved').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg Response</p>
          <p className="text-2xl font-bold text-blue-600">{avgResponseTime}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search tickets..."
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
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tickets list */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <HeadphonesIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tickets found</p>
            <button
              onClick={handleCreateTicket}
              className="mt-2 text-primary hover:underline"
            >
              Create a ticket
            </button>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priorityConfig[ticket.priority as keyof typeof priorityConfig]?.color)}>
                      {priorityConfig[ticket.priority as keyof typeof priorityConfig]?.label || ticket.priority}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig[ticket.status as keyof typeof statusConfig]?.color)}>
                      {statusConfig[ticket.status as keyof typeof statusConfig]?.label || ticket.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {categoryConfig[ticket.category as keyof typeof categoryConfig] || ticket.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {ticket.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {formatRelativeTime(ticket.createdAt)} • Updated {formatRelativeTime(ticket.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {ticket.status === 'open' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}
                      className="px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-accent"
                    >
                      Start
                    </button>
                  )}
                  {ticket.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'resolved')}
                      className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  )}
                  <button className="p-2 rounded-md hover:bg-accent">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeTicket(ticket.id)}
                    className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// CRM Overview
function CRMOverview() {
  const { contacts, deals, loadContacts, loadDeals, isLoading } = useDataStore();

  useEffect(() => {
    loadContacts();
    loadDeals();
  }, [loadContacts, loadDeals]);
  
  const totalPipeline = deals
    .filter((d) => !['closed-won', 'closed-lost'].includes(d.stage))
    .reduce((sum, d) => sum + d.value, 0);
  
  const wonDeals = deals.filter((d) => d.stage === 'closed-won');
  const totalWon = wonDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-muted-foreground">Customer relationship management</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/crm/contacts" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <Users className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
          <p className="text-sm text-muted-foreground">Total Contacts</p>
        </Link>
        <Link to="/crm/deals" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <HandshakeIcon className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{deals.length}</p>
          <p className="text-sm text-muted-foreground">Total Deals</p>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-2xl font-bold text-foreground">${totalPipeline.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Pipeline Value</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-2xl font-bold text-green-600">${totalWon.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Won This Period</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Contacts</h2>
          {contacts.slice(0, 5).map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {contact.firstName[0]}{contact.lastName[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{contact.firstName} {contact.lastName}</p>
                <p className="text-xs text-muted-foreground">{contact.email}</p>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No contacts yet</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Deals</h2>
          {deals.slice(0, 5).map((deal) => (
            <div key={deal.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{deal.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{deal.stage.replace('_', ' ')}</p>
              </div>
              <p className="font-medium">${deal.value.toLocaleString()}</p>
            </div>
          ))}
          {deals.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No deals yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CRM() {
  return (
    <Routes>
      <Route index element={<CRMOverview />} />
      <Route path="contacts/*" element={<ContactsPage />} />
      <Route path="deals/*" element={<DealsPage />} />
      <Route path="campaigns/*" element={<CampaignsPage />} />
      <Route path="support/*" element={<SupportPage />} />
    </Routes>
  );
}
