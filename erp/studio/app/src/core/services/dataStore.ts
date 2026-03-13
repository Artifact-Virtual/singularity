/**
 * Data Store Service
 * Manages enterprise data with API integration
 * Updated: 2026-02-02 - Now uses real backend API
 */

import { create } from 'zustand';
import {
  contactsService,
  dealsService,
  employeesService,
  projectsService,
  invoicesService,
  activitiesService,
  type Contact as APIContact,
  type Deal as APIDeal,
  type Employee as APIEmployee,
  type Project as APIProject,
  type Invoice as APIInvoice,
  type Activity as APIActivity,
} from '../api/services';

// Re-export API types with aliases for backwards compatibility
export type Contact = APIContact;
export type Deal = APIDeal;
export type Employee = APIEmployee;
export type Project = APIProject;
export type Invoice = APIInvoice;
export type Activity = APIActivity;

// Activity log for UI (simplified)
export type ActivityLog = {
  id: string;
  type: 'contact' | 'deal' | 'employee' | 'project' | 'invoice' | 'system';
  action: string;
  description: string;
  userId: string;
  userName: string;
  entityId?: string;
  timestamp: Date;
};

// Store state
type DataState = {
  contacts: Contact[];
  deals: Deal[];
  employees: Employee[];
  projects: Project[];
  invoices: Invoice[];
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions - Contacts
  loadContacts: () => Promise<void>;
  addContact: (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  
  // Actions - Deals
  loadDeals: () => Promise<void>;
  addDeal: (data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Deal>;
  updateDeal: (id: string, data: Partial<Deal>) => Promise<Deal>;
  deleteDeal: (id: string) => Promise<void>;
  
  // Actions - Employees
  loadEmployees: () => Promise<void>;
  addEmployee: (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Employee>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;
  
  // Actions - Projects
  loadProjects: () => Promise<void>;
  addProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectProgress: (id: string, progress: number) => Promise<Project>;
  
  // Actions - Invoices
  loadInvoices: () => Promise<void>;
  addInvoice: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  recordPayment: (id: string, amount: number, method: string) => Promise<Invoice>;
  
  // Actions - Activities
  loadActivities: () => Promise<void>;
  addActivity: (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Activity>;
  completeActivity: (id: string) => Promise<Activity>;
  
  // General actions
  loadAllData: () => Promise<void>;
  clearError: () => void;
};

// Audit trail helper — fire-and-forget activity log on every CRUD
async function logAudit(action: string, entity: string, entityName: string) {
  try {
    await activitiesService.create({
      type: 'note',
      subject: `${action} ${entity}: ${entityName}`,
      description: `User ${action.toLowerCase()} ${entity.toLowerCase()} "${entityName}"`,
      status: 'completed',
      userId: 'system',
    });
  } catch {
    // Audit logging should never block operations
  }
}

// Create the store
export const useDataStore = create<DataState>((set, get) => ({
  contacts: [],
  deals: [],
  employees: [],
  projects: [],
  invoices: [],
  activities: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // ========== CONTACTS ==========
  loadContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const contacts = await contactsService.list();
      set({ contacts, isLoading: false, lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  addContact: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const contact = await contactsService.create(data);
      set((state) => ({ 
        contacts: [...state.contacts, contact],
        isLoading: false 
      }));
      logAudit('Created', 'Contact', contact.firstName + ' ' + contact.lastName);
      return contact;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateContact: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const contact = await contactsService.update(id, data);
      set((state) => ({
        contacts: state.contacts.map((c) => c.id === id ? contact : c),
        isLoading: false,
      }));
      logAudit('Updated', 'Contact', contact.firstName + ' ' + contact.lastName);
      return contact;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteContact: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const contact = get().contacts.find(c => c.id === id);
      await contactsService.delete(id);
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
        isLoading: false,
      }));
      if (contact) logAudit('Deleted', 'Contact', contact.firstName + ' ' + contact.lastName);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ========== DEALS ==========
  loadDeals: async () => {
    set({ isLoading: true, error: null });
    try {
      const deals = await dealsService.list();
      set({ deals, isLoading: false, lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  addDeal: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const deal = await dealsService.create(data);
      set((state) => ({ 
        deals: [...state.deals, deal],
        isLoading: false 
      }));
      logAudit('Created', 'Deal', deal.title);
      return deal;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateDeal: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const deal = await dealsService.update(id, data);
      set((state) => ({
        deals: state.deals.map((d) => d.id === id ? deal : d),
        isLoading: false,
      }));
      logAudit('Updated', 'Deal', deal.title);
      return deal;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteDeal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const deal = get().deals.find(d => d.id === id);
      await dealsService.delete(id);
      set((state) => ({
        deals: state.deals.filter((d) => d.id !== id),
        isLoading: false,
      }));
      if (deal) logAudit('Deleted', 'Deal', deal.title);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ========== EMPLOYEES ==========
  loadEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      const employees = await employeesService.list();
      set({ employees, isLoading: false, lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  addEmployee: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const employee = await employeesService.create(data);
      set((state) => ({ 
        employees: [...state.employees, employee],
        isLoading: false 
      }));
      logAudit('Created', 'Employee', employee.firstName + ' ' + employee.lastName);
      return employee;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateEmployee: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const employee = await employeesService.update(id, data);
      set((state) => ({
        employees: state.employees.map((e) => e.id === id ? employee : e),
        isLoading: false,
      }));
      logAudit('Updated', 'Employee', employee.firstName + ' ' + employee.lastName);
      return employee;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteEmployee: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const emp = get().employees.find(e => e.id === id);
      await employeesService.delete(id);
      set((state) => ({
        employees: state.employees.filter((e) => e.id !== id),
        isLoading: false,
      }));
      if (emp) logAudit('Deleted', 'Employee', emp.firstName + ' ' + emp.lastName);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ========== PROJECTS ==========
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectsService.list();
      set({ projects, isLoading: false, lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  addProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsService.create(data);
      set((state) => ({ 
        projects: [...state.projects, project],
        isLoading: false 
      }));
      logAudit('Created', 'Project', project.name);
      return project;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsService.update(id, data);
      set((state) => ({
        projects: state.projects.map((p) => p.id === id ? project : p),
        isLoading: false,
      }));
      logAudit('Updated', 'Project', project.name);
      return project;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const proj = get().projects.find(p => p.id === id);
      await projectsService.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        isLoading: false,
      }));
      if (proj) logAudit('Deleted', 'Project', proj.name);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateProjectProgress: async (id, progress) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectsService.updateProgress(id, progress);
      set((state) => ({
        projects: state.projects.map((p) => p.id === id ? project : p),
        isLoading: false,
      }));
      logAudit('Updated', 'Project Progress', `${project.name} → ${progress}%`);
      return project;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ========== INVOICES ==========
  loadInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await invoicesService.list();
      set({ invoices, isLoading: false, lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  addInvoice: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const invoice = await invoicesService.create(data);
      set((state) => ({ 
        invoices: [...state.invoices, invoice],
        isLoading: false 
      }));
      logAudit('Created', 'Invoice', invoice.invoiceNumber);
      return invoice;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateInvoice: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const invoice = await invoicesService.update(id, data);
      set((state) => ({
        invoices: state.invoices.map((i) => i.id === id ? invoice : i),
        isLoading: false,
      }));
      logAudit('Updated', 'Invoice', invoice.invoiceNumber);
      return invoice;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteInvoice: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const inv = get().invoices.find(i => i.id === id);
      await invoicesService.delete(id);
      set((state) => ({
        invoices: state.invoices.filter((i) => i.id !== id),
        isLoading: false,
      }));
      if (inv) logAudit('Deleted', 'Invoice', inv.invoiceNumber);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  recordPayment: async (id, amount, method) => {
    set({ isLoading: true, error: null });
    try {
      const invoice = await invoicesService.recordPayment(id, { amount, method });
      set((state) => ({
        invoices: state.invoices.map((i) => i.id === id ? invoice : i),
        isLoading: false,
      }));
      logAudit('Payment Recorded', 'Invoice', `${invoice.invoiceNumber} — $${amount} via ${method}`);
      return invoice;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ========== ACTIVITIES ==========
  loadActivities: async () => {
    set({ isLoading: true, error: null });
    try {
      const activities = await activitiesService.list();
      set({ activities, isLoading: false, lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  addActivity: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const activity = await activitiesService.create(data);
      set((state) => ({ 
        activities: [activity, ...state.activities],
        isLoading: false 
      }));
      return activity;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  completeActivity: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const activity = await activitiesService.complete(id);
      set((state) => ({
        activities: state.activities.map((a) => a.id === id ? activity : a),
        isLoading: false,
      }));
      return activity;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // ========== GENERAL ==========
  loadAllData: async () => {
    const { loadContacts, loadDeals, loadEmployees, loadProjects, loadInvoices, loadActivities } = get();
    
    set({ isLoading: true, error: null });
    
    try {
      await Promise.all([
        loadContacts(),
        loadDeals(),
        loadEmployees(),
        loadProjects(),
        loadInvoices(),
        loadActivities(),
      ]);
      set({ lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// Helper to reset store (for testing)
export const resetDataStore = () => {
  useDataStore.setState({
    contacts: [],
    deals: [],
    employees: [],
    projects: [],
    invoices: [],
    activities: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  });
};
