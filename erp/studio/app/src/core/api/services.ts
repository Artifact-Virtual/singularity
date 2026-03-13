/**
 * API Services
 * Functions that interact with the backend API
 * All endpoints wired to Fastify backend via apiClient
 */

import { apiClient, APIError } from './client';
import { API_ENDPOINTS } from './endpoints';

// ============================================================================
// Types (matching backend models)
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  role?: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  address?: string;
  status: 'active' | 'inactive' | 'lead';
  source?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  contactId: string;
  contact?: Contact;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  salary?: number;
  hireDate: string;
  status: 'active' | 'on-leave' | 'terminated';
  address?: string;
  emergencyContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate?: string;
  budget?: number;
  progress: number;
  employeeId: string;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  paymentMethod?: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items?: any[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  dueDate?: string;
  completedAt?: string;
  userId: string;
  user?: User;
  contactId?: string;
  contact?: Contact;
  dealId?: string;
  deal?: Deal;
  projectId?: string;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStats {
  stage: string;
  count: number;
  totalValue: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Auth Service
// ============================================================================

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    apiClient.setToken(response.token);
    localStorage.setItem('refresh_token', response.refreshToken);
    return response;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
    apiClient.setToken(response.token);
    localStorage.setItem('refresh_token', response.refreshToken);
    return response;
  },

  async refresh(): Promise<{ token: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new APIError('No refresh token', 401);
    }
    const response = await apiClient.post<{ token: string; refreshToken: string }>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken }
    );
    apiClient.setToken(response.token);
    localStorage.setItem('refresh_token', response.refreshToken);
    return response;
  },

  async me(): Promise<User> {
    const response = await apiClient.get<{ user: User }>(API_ENDPOINTS.AUTH.ME);
    return response.user;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password });
  },

  logout(): void {
    apiClient.setToken(null);
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  },
};

// ============================================================================
// Contacts Service
// ============================================================================

export const contactsService = {
  async list(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Contact[]> {
    const res = await apiClient.get<{ contacts: Contact[]; pagination: any }>(API_ENDPOINTS.CONTACTS.LIST, params);
    return res.contacts;
  },

  async get(id: string): Promise<Contact> {
    const res = await apiClient.get<{ contact: Contact }>(API_ENDPOINTS.CONTACTS.GET(id));
    return res.contact;
  },

  async create(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const res = await apiClient.post<{ contact: Contact }>(API_ENDPOINTS.CONTACTS.CREATE, data);
    return res.contact;
  },

  async update(id: string, data: Partial<Contact>): Promise<Contact> {
    const res = await apiClient.put<{ contact: Contact }>(API_ENDPOINTS.CONTACTS.UPDATE(id), data);
    return res.contact;
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.CONTACTS.DELETE(id));
  },
};

// ============================================================================
// Deals Service
// ============================================================================

export const dealsService = {
  async list(params?: {
    stage?: string;
    contactId?: string;
    page?: number;
    limit?: number;
  }): Promise<Deal[]> {
    const res = await apiClient.get<{ deals: Deal[]; pagination: any }>(API_ENDPOINTS.DEALS.LIST, params);
    return res.deals;
  },

  async get(id: string): Promise<Deal> {
    const res = await apiClient.get<{ deal: Deal }>(API_ENDPOINTS.DEALS.GET(id));
    return res.deal;
  },

  async create(data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const res = await apiClient.post<{ deal: Deal }>(API_ENDPOINTS.DEALS.CREATE, data);
    return res.deal;
  },

  async update(id: string, data: Partial<Deal>): Promise<Deal> {
    const res = await apiClient.put<{ deal: Deal }>(API_ENDPOINTS.DEALS.UPDATE(id), data);
    return res.deal;
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.DEALS.DELETE(id));
  },

  async getPipeline(): Promise<PipelineStats[]> {
    const res = await apiClient.get<{ pipeline: PipelineStats[] }>(API_ENDPOINTS.DEALS.PIPELINE);
    return res.pipeline;
  },
};

// ============================================================================
// Employees Service
// ============================================================================

export const employeesService = {
  async list(params?: {
    department?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Employee[]> {
    const res = await apiClient.get<{ employees: Employee[]; pagination: any }>(API_ENDPOINTS.EMPLOYEES.LIST, params);
    return res.employees;
  },

  async get(id: string): Promise<Employee> {
    const res = await apiClient.get<{ employee: Employee }>(API_ENDPOINTS.EMPLOYEES.GET(id));
    return res.employee;
  },

  async create(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const res = await apiClient.post<{ employee: Employee }>(API_ENDPOINTS.EMPLOYEES.CREATE, data);
    return res.employee;
  },

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const res = await apiClient.put<{ employee: Employee }>(API_ENDPOINTS.EMPLOYEES.UPDATE(id), data);
    return res.employee;
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.EMPLOYEES.DELETE(id));
  },

  async updateStatus(id: string, status: Employee['status']): Promise<Employee> {
    const res = await apiClient.patch<{ employee: Employee }>(API_ENDPOINTS.EMPLOYEES.STATUS(id), { status });
    return res.employee;
  },

  async getByDepartment(): Promise<{ department: string; employees: Employee[] }[]> {
    const res = await apiClient.get<{ departments: { department: string; employees: Employee[] }[] }>(API_ENDPOINTS.EMPLOYEES.BY_DEPARTMENT);
    return res.departments;
  },
};

// ============================================================================
// Projects Service
// ============================================================================

export const projectsService = {
  async list(params?: {
    status?: string;
    priority?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
  }): Promise<Project[]> {
    const res = await apiClient.get<{ projects: Project[]; pagination: any }>(API_ENDPOINTS.PROJECTS.LIST, params);
    return res.projects;
  },

  async get(id: string): Promise<Project> {
    const res = await apiClient.get<{ project: Project }>(API_ENDPOINTS.PROJECTS.GET(id));
    return res.project;
  },

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const res = await apiClient.post<{ project: Project }>(API_ENDPOINTS.PROJECTS.CREATE, data);
    return res.project;
  },

  async update(id: string, data: Partial<Project>): Promise<Project> {
    const res = await apiClient.put<{ project: Project }>(API_ENDPOINTS.PROJECTS.UPDATE(id), data);
    return res.project;
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.PROJECTS.DELETE(id));
  },

  async updateStatus(id: string, status: Project['status']): Promise<Project> {
    const res = await apiClient.patch<{ project: Project }>(API_ENDPOINTS.PROJECTS.STATUS(id), { status });
    return res.project;
  },

  async updateProgress(id: string, progress: number): Promise<Project> {
    const res = await apiClient.patch<{ project: Project }>(API_ENDPOINTS.PROJECTS.PROGRESS(id), { progress });
    return res.project;
  },
};

// ============================================================================
// Invoices Service
// ============================================================================

export const invoicesService = {
  async list(params?: {
    status?: string;
    clientName?: string;
    page?: number;
    limit?: number;
  }): Promise<Invoice[]> {
    const res = await apiClient.get<{ invoices: Invoice[]; pagination: any }>(API_ENDPOINTS.INVOICES.LIST, params);
    return Array.isArray(res) ? res : (res.invoices ?? []);
  },

  async get(id: string): Promise<Invoice> {
    const res = await apiClient.get<{ invoice: Invoice } | Invoice>(API_ENDPOINTS.INVOICES.GET(id));
    return (res as any).invoice ?? res as Invoice;
  },

  async create(data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const res = await apiClient.post<{ invoice: Invoice } | Invoice>(API_ENDPOINTS.INVOICES.CREATE, data);
    return (res as any).invoice ?? res as Invoice;
  },

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const res = await apiClient.put<{ invoice: Invoice } | Invoice>(API_ENDPOINTS.INVOICES.UPDATE(id), data);
    return (res as any).invoice ?? res as Invoice;
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.INVOICES.DELETE(id));
  },

  async recordPayment(id: string, data: {
    amount: number;
    method: string;
    date?: string;
  }): Promise<Invoice> {
    const res = await apiClient.post<{ invoice: Invoice } | Invoice>(API_ENDPOINTS.INVOICES.PAYMENT(id), {
      paidAmount: data.amount,
      paymentMethod: data.method,
    });
    return (res as any).invoice ?? res as Invoice;
  },
};

// ============================================================================
// Activities Service
// ============================================================================

export const activitiesService = {
  async list(params?: {
    type?: string;
    status?: string;
    userId?: string;
    contactId?: string;
    dealId?: string;
    projectId?: string;
    page?: number;
    limit?: number;
  }): Promise<Activity[]> {
    const res = await apiClient.get<{ activities: Activity[]; pagination: any } | Activity[]>(API_ENDPOINTS.ACTIVITIES.LIST, params);
    return Array.isArray(res) ? res : ((res as any).activities ?? []);
  },

  async get(id: string): Promise<Activity> {
    const res = await apiClient.get<{ activity: Activity } | Activity>(API_ENDPOINTS.ACTIVITIES.GET(id));
    return (res as any).activity ?? res as Activity;
  },

  async create(data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
    const res = await apiClient.post<{ activity: Activity } | Activity>(API_ENDPOINTS.ACTIVITIES.CREATE, data);
    return (res as any).activity ?? res as Activity;
  },

  async update(id: string, data: Partial<Activity>): Promise<Activity> {
    const res = await apiClient.put<{ activity: Activity } | Activity>(API_ENDPOINTS.ACTIVITIES.UPDATE(id), data);
    return (res as any).activity ?? res as Activity;
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.ACTIVITIES.DELETE(id));
  },

  async complete(id: string): Promise<Activity> {
    const res = await apiClient.patch<{ activity: Activity } | Activity>(API_ENDPOINTS.ACTIVITIES.COMPLETE(id), {});
    return (res as any).activity ?? res as Activity;
  },
};

// ============================================================================
// Roles Service
// ============================================================================

export const rolesService = {
  async list(): Promise<Role[]> {
    const res = await apiClient.get<{ roles: Role[] } | { data: Role[] } | Role[]>(API_ENDPOINTS.ROLES.LIST);
    if (Array.isArray(res)) return res;
    if ((res as any).roles) return (res as any).roles;
    if ((res as any).data) return (res as any).data;
    return [];
  },

  async get(id: string): Promise<Role> {
    const res = await apiClient.get<{ role: Role } | Role>(API_ENDPOINTS.ROLES.GET(id));
    return (res as any).role ?? res as Role;
  },

  async create(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const res = await apiClient.post<{ role: Role } | Role>(API_ENDPOINTS.ROLES.CREATE, data);
    return (res as any).role ?? res as Role;
  },

  async update(id: string, data: Partial<Role>): Promise<Role> {
    const res = await apiClient.put<{ role: Role } | Role>(API_ENDPOINTS.ROLES.UPDATE(id), data);
    return (res as any).role ?? res as Role;
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.ROLES.DELETE(id));
  },
};

// ============================================================================
// Health Check
// ============================================================================

export const healthService = {
  async check(): Promise<{ status: string; timestamp: string }> {
    // /health is registered outside /api prefix on the backend
    // Hit it directly to avoid double /api prefix
    const response = await fetch('/health');
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },
};

// ============================================================================
// Admin - User Management
// ============================================================================

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  role?: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const adminService = {
  async listUsers(): Promise<AdminUser[]> {
    const response = await apiClient.get<{ data: AdminUser[]; total: number }>(API_ENDPOINTS.ADMIN.USERS.LIST);
    return response.data;
  },

  async getUser(id: string): Promise<AdminUser> {
    return apiClient.get<AdminUser>(API_ENDPOINTS.ADMIN.USERS.GET(id));
  },

  async createUser(data: { email: string; password: string; firstName: string; lastName: string; roleId?: string }): Promise<AdminUser> {
    return apiClient.post<AdminUser>(API_ENDPOINTS.ADMIN.USERS.CREATE, data);
  },

  async updateUser(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    return apiClient.put<AdminUser>(API_ENDPOINTS.ADMIN.USERS.UPDATE(id), data);
  },

  async deleteUser(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.ADMIN.USERS.DELETE(id));
  },

  async listRoles(): Promise<Role[]> {
    const response = await apiClient.get<{ data: Role[]; total: number }>(API_ENDPOINTS.ADMIN.ROLES.LIST);
    return response.data;
  },
};

// ============================================================================
// Tier 3: Campaigns Service
// ============================================================================

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  budget: number;
  spent: number;
  startDate?: string;
  endDate?: string;
  leads: number;
  conversions: number;
  revenue: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const campaignsService = {
  async list(params?: { status?: string; type?: string }): Promise<Campaign[]> {
    const res = await apiClient.get<{ campaigns: Campaign[] }>(API_ENDPOINTS.CAMPAIGNS.LIST, params);
    return res.campaigns;
  },
  async create(data: Partial<Campaign>): Promise<Campaign> {
    const res = await apiClient.post<{ campaign: Campaign }>(API_ENDPOINTS.CAMPAIGNS.CREATE, data);
    return res.campaign;
  },
  async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const res = await apiClient.put<{ campaign: Campaign }>(API_ENDPOINTS.CAMPAIGNS.UPDATE(id), data);
    return res.campaign;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.CAMPAIGNS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Tickets Service
// ============================================================================

export interface Ticket {
  id: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  contactId?: string;
  contact?: { id: string; firstName: string; lastName: string; email: string };
  assignee?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export const ticketsService = {
  async list(params?: { status?: string; priority?: string }): Promise<Ticket[]> {
    const res = await apiClient.get<{ tickets: Ticket[] }>(API_ENDPOINTS.TICKETS.LIST, params);
    return res.tickets;
  },
  async create(data: Partial<Ticket>): Promise<Ticket> {
    const res = await apiClient.post<{ ticket: Ticket }>(API_ENDPOINTS.TICKETS.CREATE, data);
    return res.ticket;
  },
  async update(id: string, data: Partial<Ticket>): Promise<Ticket> {
    const res = await apiClient.put<{ ticket: Ticket }>(API_ENDPOINTS.TICKETS.UPDATE(id), data);
    return res.ticket;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.TICKETS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Job Postings Service
// ============================================================================

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location?: string;
  type: string;
  status: string;
  description?: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  _count?: { applicants: number };
  createdAt: string;
  updatedAt: string;
}

export const jobsService = {
  async list(params?: { status?: string; department?: string }): Promise<JobPosting[]> {
    const res = await apiClient.get<{ jobs: JobPosting[] }>(API_ENDPOINTS.JOBS.LIST, params);
    return res.jobs;
  },
  async create(data: Partial<JobPosting>): Promise<JobPosting> {
    const res = await apiClient.post<{ job: JobPosting }>(API_ENDPOINTS.JOBS.CREATE, data);
    return res.job;
  },
  async update(id: string, data: Partial<JobPosting>): Promise<JobPosting> {
    const res = await apiClient.put<{ job: JobPosting }>(API_ENDPOINTS.JOBS.UPDATE(id), data);
    return res.job;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.JOBS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Applicants Service
// ============================================================================

export interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resume?: string;
  status: string;
  rating?: number;
  notes?: string;
  jobId: string;
  job?: { id: string; title: string; department: string };
  createdAt: string;
  updatedAt: string;
}

export const applicantsService = {
  async list(params?: { jobId?: string; status?: string }): Promise<Applicant[]> {
    const res = await apiClient.get<{ applicants: Applicant[] }>(API_ENDPOINTS.APPLICANTS.LIST, params);
    return res.applicants;
  },
  async create(data: Partial<Applicant>): Promise<Applicant> {
    const res = await apiClient.post<{ applicant: Applicant }>(API_ENDPOINTS.APPLICANTS.CREATE, data);
    return res.applicant;
  },
  async update(id: string, data: Partial<Applicant>): Promise<Applicant> {
    const res = await apiClient.put<{ applicant: Applicant }>(API_ENDPOINTS.APPLICANTS.UPDATE(id), data);
    return res.applicant;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.APPLICANTS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Performance Reviews Service
// ============================================================================

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string; department: string; position: string };
  reviewerId?: string;
  period: string;
  rating: number;
  strengths?: string;
  improvements?: string;
  goals?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const reviewsService = {
  async list(params?: { employeeId?: string; status?: string }): Promise<PerformanceReview[]> {
    const res = await apiClient.get<{ reviews: PerformanceReview[] }>(API_ENDPOINTS.REVIEWS.LIST, params);
    return res.reviews;
  },
  async create(data: Partial<PerformanceReview>): Promise<PerformanceReview> {
    const res = await apiClient.post<{ review: PerformanceReview }>(API_ENDPOINTS.REVIEWS.CREATE, data);
    return res.review;
  },
  async update(id: string, data: Partial<PerformanceReview>): Promise<PerformanceReview> {
    const res = await apiClient.put<{ review: PerformanceReview }>(API_ENDPOINTS.REVIEWS.UPDATE(id), data);
    return res.review;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.REVIEWS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Goals Service
// ============================================================================

export interface Goal {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string };
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export const goalsService = {
  async list(params?: { employeeId?: string; status?: string }): Promise<Goal[]> {
    const res = await apiClient.get<{ goals: Goal[] }>(API_ENDPOINTS.GOALS.LIST, params);
    return res.goals;
  },
  async create(data: Partial<Goal>): Promise<Goal> {
    const res = await apiClient.post<{ goal: Goal }>(API_ENDPOINTS.GOALS.CREATE, data);
    return res.goal;
  },
  async update(id: string, data: Partial<Goal>): Promise<Goal> {
    const res = await apiClient.put<{ goal: Goal }>(API_ENDPOINTS.GOALS.UPDATE(id), data);
    return res.goal;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.GOALS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Payroll Service
// ============================================================================

export interface PayrollRun {
  id: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string; department: string; position: string; salary?: number };
  period: string;
  baseSalary: number;
  deductions: number;
  bonuses: number;
  netPay: number;
  status: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const payrollService = {
  async list(params?: { employeeId?: string; status?: string; period?: string }): Promise<PayrollRun[]> {
    const res = await apiClient.get<{ payrollRuns: PayrollRun[] }>(API_ENDPOINTS.PAYROLL.LIST, params);
    return res.payrollRuns;
  },
  async create(data: Partial<PayrollRun>): Promise<PayrollRun> {
    const res = await apiClient.post<{ payrollRun: PayrollRun }>(API_ENDPOINTS.PAYROLL.CREATE, data);
    return res.payrollRun;
  },
  async update(id: string, data: Partial<PayrollRun>): Promise<PayrollRun> {
    const res = await apiClient.put<{ payrollRun: PayrollRun }>(API_ENDPOINTS.PAYROLL.UPDATE(id), data);
    return res.payrollRun;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.PAYROLL.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Ledger Accounts Service
// ============================================================================

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ledgerAccountsService = {
  async list(params?: { type?: string }): Promise<LedgerAccount[]> {
    const res = await apiClient.get<{ accounts: LedgerAccount[] }>(API_ENDPOINTS.LEDGER_ACCOUNTS.LIST, params);
    return res.accounts;
  },
  async create(data: Partial<LedgerAccount>): Promise<LedgerAccount> {
    const res = await apiClient.post<{ account: LedgerAccount }>(API_ENDPOINTS.LEDGER_ACCOUNTS.CREATE, data);
    return res.account;
  },
  async update(id: string, data: Partial<LedgerAccount>): Promise<LedgerAccount> {
    const res = await apiClient.put<{ account: LedgerAccount }>(API_ENDPOINTS.LEDGER_ACCOUNTS.UPDATE(id), data);
    return res.account;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.LEDGER_ACCOUNTS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Journal Entries Service
// ============================================================================

export interface JournalEntry {
  id: string;
  accountId: string;
  account?: { id: string; code: string; name: string; type: string };
  date: string;
  description: string;
  debit: number;
  credit: number;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export const journalService = {
  async list(params?: { accountId?: string }): Promise<JournalEntry[]> {
    const res = await apiClient.get<{ entries: JournalEntry[] }>(API_ENDPOINTS.JOURNAL.LIST, params);
    return res.entries;
  },
  async create(data: Partial<JournalEntry>): Promise<JournalEntry> {
    const res = await apiClient.post<{ entry: JournalEntry }>(API_ENDPOINTS.JOURNAL.CREATE, data);
    return res.entry;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.JOURNAL.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Bills Service
// ============================================================================

export interface Bill {
  id: string;
  billNumber: string;
  vendorName: string;
  vendorEmail?: string;
  description?: string;
  amount: number;
  currency: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const billsService = {
  async list(params?: { status?: string; category?: string }): Promise<Bill[]> {
    const res = await apiClient.get<{ bills: Bill[] }>(API_ENDPOINTS.BILLS.LIST, params);
    return res.bills;
  },
  async create(data: Partial<Bill>): Promise<Bill> {
    const res = await apiClient.post<{ bill: Bill }>(API_ENDPOINTS.BILLS.CREATE, data);
    return res.bill;
  },
  async update(id: string, data: Partial<Bill>): Promise<Bill> {
    const res = await apiClient.put<{ bill: Bill }>(API_ENDPOINTS.BILLS.UPDATE(id), data);
    return res.bill;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.BILLS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Pipelines Service
// ============================================================================

export interface Pipeline {
  id: string;
  name: string;
  repository?: string;
  branch: string;
  status: string;
  lastRunAt?: string;
  duration?: number;
  stages?: any[];
  trigger?: string;
  createdAt: string;
  updatedAt: string;
}

export const pipelinesService = {
  async list(params?: { status?: string }): Promise<Pipeline[]> {
    const res = await apiClient.get<{ pipelines: Pipeline[] }>(API_ENDPOINTS.PIPELINES.LIST, params);
    return res.pipelines;
  },
  async create(data: Partial<Pipeline>): Promise<Pipeline> {
    const res = await apiClient.post<{ pipeline: Pipeline }>(API_ENDPOINTS.PIPELINES.CREATE, data);
    return res.pipeline;
  },
  async update(id: string, data: Partial<Pipeline>): Promise<Pipeline> {
    const res = await apiClient.put<{ pipeline: Pipeline }>(API_ENDPOINTS.PIPELINES.UPDATE(id), data);
    return res.pipeline;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.PIPELINES.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Deployments Service
// ============================================================================

export interface Deployment {
  id: string;
  environment: string;
  version: string;
  status: string;
  deployedBy?: string;
  deployedAt?: string;
  completedAt?: string;
  duration?: number;
  changelog?: string;
  rollbackOf?: string;
  createdAt: string;
  updatedAt: string;
}

export const deploymentsService = {
  async list(params?: { environment?: string; status?: string }): Promise<Deployment[]> {
    const res = await apiClient.get<{ deployments: Deployment[] }>(API_ENDPOINTS.DEPLOYMENTS.LIST, params);
    return res.deployments;
  },
  async create(data: Partial<Deployment>): Promise<Deployment> {
    const res = await apiClient.post<{ deployment: Deployment }>(API_ENDPOINTS.DEPLOYMENTS.CREATE, data);
    return res.deployment;
  },
  async update(id: string, data: Partial<Deployment>): Promise<Deployment> {
    const res = await apiClient.put<{ deployment: Deployment }>(API_ENDPOINTS.DEPLOYMENTS.UPDATE(id), data);
    return res.deployment;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.DEPLOYMENTS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Stakeholders Service
// ============================================================================

export interface Stakeholder {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  investment?: number;
  equity?: number;
  status: string;
  notes?: string;
  joinDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const stakeholdersService = {
  async list(params?: { type?: string; status?: string }): Promise<Stakeholder[]> {
    const res = await apiClient.get<{ stakeholders: Stakeholder[] }>(API_ENDPOINTS.STAKEHOLDERS.LIST, params);
    return res.stakeholders;
  },
  async create(data: Partial<Stakeholder>): Promise<Stakeholder> {
    const res = await apiClient.post<{ stakeholder: Stakeholder }>(API_ENDPOINTS.STAKEHOLDERS.CREATE, data);
    return res.stakeholder;
  },
  async update(id: string, data: Partial<Stakeholder>): Promise<Stakeholder> {
    const res = await apiClient.put<{ stakeholder: Stakeholder }>(API_ENDPOINTS.STAKEHOLDERS.UPDATE(id), data);
    return res.stakeholder;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.STAKEHOLDERS.DELETE(id));
  },
};

// ============================================================================
// Tier 3: Workflows Service
// ============================================================================

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  trigger?: string;
  steps?: any[];
  lastRunAt?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export const workflowsService = {
  async list(params?: { status?: string }): Promise<WorkflowItem[]> {
    const res = await apiClient.get<{ workflows: WorkflowItem[] }>(API_ENDPOINTS.WORKFLOWS.LIST, params);
    return res.workflows;
  },
  async create(data: Partial<WorkflowItem>): Promise<WorkflowItem> {
    const res = await apiClient.post<{ workflow: WorkflowItem }>(API_ENDPOINTS.WORKFLOWS.CREATE, data);
    return res.workflow;
  },
  async update(id: string, data: Partial<WorkflowItem>): Promise<WorkflowItem> {
    const res = await apiClient.put<{ workflow: WorkflowItem }>(API_ENDPOINTS.WORKFLOWS.UPDATE(id), data);
    return res.workflow;
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.WORKFLOWS.DELETE(id));
  },
};
