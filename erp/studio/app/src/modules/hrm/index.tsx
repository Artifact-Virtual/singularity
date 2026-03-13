import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useApiState } from '@core/hooks/useApiState';
import {
  jobsService, applicantsService, reviewsService, goalsService, payrollService,
  type JobPosting as APIJob, type Applicant as APIApplicant,
  type PerformanceReview as APIReview, type Goal as APIGoal, type PayrollRun as APIPayroll,
} from '@core/api/services';
import {
  UserCog,
  UserPlus,
  Target,
  Wallet,
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
} from 'lucide-react';
import { cn, formatRelativeTime, exportToCSV } from '@shared/utils';
import { useDataStore, type Employee } from '@core/services/dataStore';

// Employee Form Modal
function EmployeeForm({
  employee,
  onSave,
  onCancel,
}: {
  employee?: Employee;
  onSave: (data: Partial<Employee>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    department: employee?.department || '',
    position: employee?.position || '',
    status: employee?.status || 'active' as Employee['status'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {employee ? 'Edit Employee' : 'Add Employee'}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                required
              >
                <option value="">Select...</option>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Job Title</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Employee['status'] })}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
            >
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
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
              {employee ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Employees Page
function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, loadEmployees, isLoading } = useDataStore();

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [filterDept, setFilterDept] = useState<string>('all');

  const filteredEmployees = employees.filter(
    (e) =>
      (filterDept === 'all' || e.department === filterDept) &&
      (e.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = (data: Partial<Employee>) => {
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, data);
    } else {
      addEmployee({
        id: crypto.randomUUID(),
        ...data,
        startDate: new Date(),
      } as Employee);
    }
    setShowForm(false);
    setEditingEmployee(undefined);
  };

  const statusColors: Record<Employee['status'], string> = {
    active: 'bg-green-100 text-green-800',
    'on-leave': 'bg-yellow-100 text-yellow-800',
    terminated: 'bg-muted text-muted-foreground',
  };

  const departments = [...new Set(employees.map((e) => e.department))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground">Manage your team directory</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(employees, 'employees', [
              { key: 'firstName', label: 'First Name' }, { key: 'lastName', label: 'Last Name' },
              { key: 'email', label: 'Email' }, { key: 'department', label: 'Department' },
              { key: 'position', label: 'Position' }, { key: 'status', label: 'Status' },
              { key: 'hireDate', label: 'Hire Date' },
            ])}
            disabled={employees.length === 0}
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
            Add Employee
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold text-foreground">{employees.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {employees.filter((e) => e.status === 'active').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">On Leave</p>
          <p className="text-2xl font-bold text-yellow-600">
            {employees.filter((e) => e.status === 'on-leave').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Departments</p>
          <p className="text-2xl font-bold text-foreground">{departments.length}</p>
        </div>
      </div>

      {/* Employees grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full rounded-lg border border-border bg-card p-8 text-center">
            <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No employees found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-primary hover:underline"
            >
              Add your first employee
            </button>
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-medium text-primary">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full', statusColors[employee.status])}>
                  {employee.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {employee.department}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {formatRelativeTime(employee.hireDate)}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => {
                    setEditingEmployee(employee);
                    setShowForm(true);
                  }}
                  className="flex-1 h-9 rounded-md border border-input bg-background hover:bg-accent flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => deleteEmployee(employee.id)}
                  className="h-9 px-3 rounded-md border border-input bg-background hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingEmployee(undefined);
          }}
        />
      )}
    </div>
  );
}

// Job Posting types
type JobPosting = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full_time' | 'part_time' | 'contract' | 'internship';
  status: 'draft' | 'open' | 'paused' | 'closed';
  applicants: number;
  createdAt: Date;
};

// Applicant types
type Applicant = {
  id: string;
  name: string;
  email: string;
  jobId: string;
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  rating?: number;
  appliedAt: Date;
};

// Recruitment Page
function RecruitmentPage() {
  const { items: jobs, add: addJob, remove: removeJob } = useApiState<APIJob>(
    jobsService.list, jobsService.create, jobsService.update, jobsService.delete
  );
  const { items: applicants, add: addApplicant, update: updateApplicant, remove: removeApplicant } = useApiState<APIApplicant>(
    applicantsService.list, applicantsService.create, applicantsService.update, applicantsService.delete
  );
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'jobs' | 'pipeline'>('jobs');

  const typeConfig: Record<JobPosting['type'], { label: string; color: string }> = {
    full_time: { label: 'Full Time', color: 'bg-blue-100 text-blue-800' },
    part_time: { label: 'Part Time', color: 'bg-purple-100 text-purple-800' },
    contract: { label: 'Contract', color: 'bg-orange-100 text-orange-800' },
    internship: { label: 'Internship', color: 'bg-green-100 text-green-800' },
  };

  const statusConfig: Record<JobPosting['status'], { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
    open: { label: 'Open', color: 'bg-green-100 text-green-800' },
    paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
    closed: { label: 'Closed', color: 'bg-red-100 text-red-800' },
  };

  const stageConfig: Record<Applicant['stage'], { label: string; color: string }> = {
    applied: { label: 'Applied', color: 'bg-muted text-muted-foreground' },
    screening: { label: 'Screening', color: 'bg-blue-100 text-blue-800' },
    interview: { label: 'Interview', color: 'bg-purple-100 text-purple-800' },
    offer: { label: 'Offer', color: 'bg-orange-100 text-orange-800' },
    hired: { label: 'Hired', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  };

  const stages: Applicant['stage'][] = ['applied', 'screening', 'interview', 'offer', 'hired'];
  const [showJobForm, setShowJobForm] = useState(false);

  const handleCreateJob = async () => {
    await addJob({
      title: 'New Position',
      department: 'Engineering',
      location: 'Remote',
      type: 'full-time',
      status: 'draft',
    });
  };

  const totalApplicants = applicants.length;
  const openPositions = jobs.filter((j) => j.status === 'open').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recruitment</h1>
            <p className="text-muted-foreground">Applicant tracking and hiring</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-input bg-background">
            <button
              onClick={() => setViewMode('jobs')}
              className={cn('px-4 py-2 text-sm font-medium rounded-l-md', viewMode === 'jobs' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              Job Postings
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={cn('px-4 py-2 text-sm font-medium rounded-r-md', viewMode === 'pipeline' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              Pipeline
            </button>
          </div>
          <button
            onClick={() => setShowJobForm(true)}
            className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Post Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Open Positions</p>
          <p className="text-2xl font-bold text-green-600">{openPositions}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Applicants</p>
          <p className="text-2xl font-bold text-foreground">{totalApplicants}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">In Interview</p>
          <p className="text-2xl font-bold text-purple-600">
            {applicants.filter((a) => a.status === 'interview').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Offers Pending</p>
          <p className="text-2xl font-bold text-orange-600">
            {applicants.filter((a) => a.status === 'offer').length}
          </p>
        </div>
      </div>

      {viewMode === 'jobs' ? (
        /* Job Postings View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.department} • {job.location}</p>
                </div>
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusConfig[job.status as keyof typeof statusConfig]?.color)}>
                  {statusConfig[job.status as keyof typeof statusConfig]?.label || job.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig[job.type as keyof typeof typeConfig]?.color)}>
                  {typeConfig[job.type as keyof typeof typeConfig]?.label || job.type}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {applicants.filter((a) => a.jobId === job.id).length} applicants
                </span>
                <span className="text-muted-foreground">
                  Posted {formatRelativeTime(job.createdAt)}
                </span>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => setSelectedJob(job.id)}
                  className="flex-1 h-9 rounded-md border border-input bg-background hover:bg-accent text-sm"
                >
                  View Applicants
                </button>
                <button className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent" onClick={() => setShowJobForm(true)}>
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Pipeline View */
        <div className="grid grid-cols-5 gap-4 overflow-x-auto">
          {stages.map((stage) => {
            const stageApplicants = applicants.filter((a) => a.status === stage);
            return (
              <div key={stage} className="min-w-[220px]">
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', stageConfig[stage as keyof typeof stageConfig]?.color)}>
                    {stageConfig[stage as keyof typeof stageConfig]?.label || stage}
                  </span>
                  <span className="text-sm text-muted-foreground">{stageApplicants.length}</span>
                </div>
                <div className="space-y-2">
                  {stageApplicants.map((applicant) => {
                    const job = jobs.find((j) => j.id === applicant.jobId);
                    return (
                      <div key={applicant.id} className="rounded-lg border border-border bg-card p-3">
                        <p className="font-medium text-foreground text-sm">{applicant.firstName} {applicant.lastName}</p>
                        <p className="text-xs text-muted-foreground">{applicant.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">{job?.title}</p>
                        {applicant.rating && (
                          <div className="flex gap-0.5 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={applicant.rating && star <= applicant.rating ? 'text-yellow-500' : 'text-muted-foreground/50'}>★</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stageApplicants.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground text-xs">
                      No applicants
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job Form Modal */}
      {showJobForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowJobForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-foreground mb-4">New Job Posting</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const data = new FormData(form);
              await addJob({
                title: data.get('title') as string,
                department: data.get('department') as string,
                location: data.get('location') as string,
                type: data.get('type') as string,
                status: 'open',
              });
              setShowJobForm(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Job Title *</label>
                  <input name="title" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. Senior Engineer" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Department *</label>
                    <input name="department" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. Engineering" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Location *</label>
                    <input name="location" required className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground" placeholder="e.g. Remote" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                  <select name="type" className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground">
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowJobForm(false)} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-accent text-foreground">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Performance Review types
type PerformanceReview = {
  id: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  status: 'pending' | 'in_progress' | 'completed';
  overallRating?: number;
  goals: Goal[];
  feedback?: string;
  createdAt: Date;
  completedAt?: Date;
};

type Goal = {
  id: string;
  title: string;
  description: string;
  progress: number;
  dueDate: Date;
  status: 'not_started' | 'in_progress' | 'completed';
};

// Performance Page
function PerformancePage() {
  const { employees } = useDataStore();
  const { items: reviews } = useApiState<APIReview>(
    reviewsService.list, reviewsService.create, reviewsService.update, reviewsService.delete
  );
  const { items: goals, add: addGoal, update: updateGoal } = useApiState<APIGoal>(
    goalsService.list, goalsService.create, goalsService.update, goalsService.delete
  );
  const [viewMode, setViewMode] = useState<'reviews' | 'goals'>('reviews');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const statusConfig: Record<PerformanceReview['status'], { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  };

  const goalStatusConfig: Record<Goal['status'], { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: 'bg-muted text-muted-foreground' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  };

  const handleCreateGoal = async () => {
    await addGoal({
      title: 'New Goal',
      description: '',
      progress: 0,
      status: 'not-started',
      priority: 'medium',
    });
    setShowGoalForm(false);
  };

  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0;
  const pendingReviews = reviews.filter((r) => r.status !== 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Performance</h1>
            <p className="text-muted-foreground">Performance reviews and goals</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-input bg-background">
            <button
              onClick={() => setViewMode('reviews')}
              className={cn('px-4 py-2 text-sm font-medium rounded-l-md', viewMode === 'reviews' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              Reviews
            </button>
            <button
              onClick={() => setViewMode('goals')}
              className={cn('px-4 py-2 text-sm font-medium rounded-r-md', viewMode === 'goals' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              Goals
            </button>
          </div>
          {viewMode === 'goals' && (
            <button
              onClick={handleCreateGoal}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending Reviews</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingReviews}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Goals Progress</p>
          <p className="text-2xl font-bold text-blue-600">{avgProgress}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Goals Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedGoals}/{goals.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Team Members</p>
          <p className="text-2xl font-bold text-foreground">{employees.length}</p>
        </div>
      </div>

      {viewMode === 'reviews' ? (
        /* Reviews View */
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Employee</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Period</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rating</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => {
                const employee = employees.find((e) => e.id === review.employeeId);
                return (
                  <tr key={review.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : '??'}
                          </span>
                        </div>
                        <span className="font-medium">
                          {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-foreground">{review.period}</td>
                    <td className="p-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusConfig[review.status as keyof typeof statusConfig]?.color)}>
                        {statusConfig[review.status as keyof typeof statusConfig]?.label || review.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {review.rating ? (
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={review.rating && star <= review.rating ? 'text-yellow-500' : 'text-muted-foreground/50'}>★</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatRelativeTime(review.updatedAt || review.createdAt)}
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 rounded-md hover:bg-accent">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Goals View */
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <div key={goal.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{goal.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                </div>
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', goalStatusConfig[goal.status as keyof typeof goalStatusConfig]?.color)}>
                  {goalStatusConfig[goal.status as keyof typeof goalStatusConfig]?.label || goal.status}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{goal.progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', goal.progress === 100 ? 'bg-green-500' : 'bg-primary')}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border text-sm">
                <span className="text-muted-foreground">
                  Due: {goal.dueDate ? formatRelativeTime(goal.dueDate) : '—'}
                </span>
                <button className="text-primary hover:underline" onClick={() => {
                  const statuses = ['not_started', 'in_progress', 'completed', 'cancelled'] as const;
                  const currentIdx = statuses.indexOf(goal.status as typeof statuses[number]);
                  const nextStatus = statuses[(currentIdx + 1) % statuses.length];
                  updateGoal(goal.id, { status: nextStatus });
                }}>Edit Status</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Payroll types
type PayrollRun = {
  id: string;
  period: string;
  status: 'draft' | 'processing' | 'completed' | 'paid';
  totalAmount: number;
  employeeCount: number;
  createdAt: Date;
  processedAt?: Date;
  paidAt?: Date;
};

type EmployeeSalary = {
  employeeId: string;
  baseSalary: number;
  bonus?: number;
  deductions?: number;
  netPay: number;
};

// Payroll Page
function PayrollPage() {
  const { employees } = useDataStore();
  const { items: payrollRuns, add: addPayrollRun, update: updatePayrollRun } = useApiState<APIPayroll>(
    payrollService.list, payrollService.create, payrollService.update, payrollService.delete
  );
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
    processed: { label: 'Processed', color: 'bg-green-100 text-green-800' },
    paid: { label: 'Paid', color: 'bg-purple-100 text-purple-800' },
  };

  const handleCreateRun = async () => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await addPayrollRun({
      period,
      status: 'pending',
      baseSalary: 0,
      deductions: 0,
      bonuses: 0,
      netPay: 0,
    } as Partial<APIPayroll>);
  };

  const handleProcessRun = async (id: string) => {
    await updatePayrollRun(id, { status: 'processed' } as Partial<APIPayroll>);
  };

  const handleCompleteRun = async (id: string) => {
    await updatePayrollRun(id, { status: 'processed' } as Partial<APIPayroll>);
  };

  const handlePayRun = async (id: string) => {
    await updatePayrollRun(id, { status: 'paid' } as Partial<APIPayroll>);
  };

  const totalPaidThisYear = payrollRuns
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.netPay, 0);

  const paidRunsCount = payrollRuns.filter((r) => r.status === 'paid').length;
  const avgSalary = employees.length > 0 && paidRunsCount > 0
    ? Math.round(totalPaidThisYear / paidRunsCount / employees.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-muted-foreground">Salary and payroll management</p>
          </div>
        </div>
        <button
          onClick={handleCreateRun}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Payroll Run
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Paid (YTD)</p>
          <p className="text-2xl font-bold text-green-600">${totalPaidThisYear.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avg Salary</p>
          <p className="text-2xl font-bold text-foreground">${avgSalary.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Employees</p>
          <p className="text-2xl font-bold text-blue-600">{employees.filter((e) => e.status === 'active').length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Payroll Runs</p>
          <p className="text-2xl font-bold text-foreground">{payrollRuns.length}</p>
        </div>
      </div>

      {/* Payroll runs table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Period</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Employees</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total Amount</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrollRuns.map((run) => (
              <tr key={run.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-4 font-medium text-foreground">{run.period}</td>
                <td className="p-4">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusConfig[run.status as keyof typeof statusConfig]?.color)}>
                    {statusConfig[run.status as keyof typeof statusConfig]?.label || run.status}
                  </span>
                </td>
                <td className="p-4 text-foreground">
                  {1 > 0 ? 1 : '—'}
                </td>
                <td className="p-4 font-medium text-foreground">
                  {run.netPay > 0 ? `$${run.netPay.toLocaleString()}` : '—'}
                </td>
                <td className="p-4 text-muted-foreground">
                  {run.paidDate
                    ? `Paid ${formatRelativeTime(run.paidDate)}`
                    : run.updatedAt
                    ? `Processed ${formatRelativeTime(run.updatedAt)}`
                    : `Created ${formatRelativeTime(run.createdAt)}`}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    {run.status === 'draft' && (
                      <button
                        onClick={() => handleProcessRun(run.id)}
                        className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                      >
                        Process
                      </button>
                    )}
                    {run.status === 'processing' && (
                      <button
                        onClick={() => handleCompleteRun(run.id)}
                        className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                      >
                        Complete
                      </button>
                    )}
                    {run.status === 'completed' && (
                      <button
                        onClick={() => handlePayRun(run.id)}
                        className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700"
                      >
                        Pay
                      </button>
                    )}
                    <button className="p-2 rounded-md hover:bg-accent">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee salary breakdown */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Employee Salaries</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.slice(0, 6).map((employee) => (
            <div key={employee.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{employee.firstName} {employee.lastName}</p>
                  <p className="text-xs text-muted-foreground">{employee.position}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">${(8500).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">monthly</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// HRM Overview
function HRMOverview() {
  const { employees } = useDataStore();
  
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const departments = [...new Set(employees.map((e) => e.department))];
  
  const deptCounts = departments.map((dept) => ({
    name: dept,
    count: employees.filter((e) => e.department === dept).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <UserCog className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">HRM</h1>
          <p className="text-muted-foreground">Human resource management</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/hrm/employees" className="rounded-lg border border-border bg-card p-6 hover:shadow-md">
          <UserCog className="h-8 w-8 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{employees.length}</p>
          <p className="text-sm text-muted-foreground">Total Employees</p>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6">
          <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{activeEmployees.length}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Building2 className="h-8 w-8 text-purple-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">{departments.length}</p>
          <p className="text-sm text-muted-foreground">Departments</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Clock className="h-8 w-8 text-yellow-600 mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {employees.filter((e) => e.status === 'on-leave').length}
          </p>
          <p className="text-sm text-muted-foreground">On Leave</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">By Department</h2>
          {deptCounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No employees yet</p>
          ) : (
            <div className="space-y-3">
              {deptCounts.map((dept) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dept.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(dept.count / employees.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{dept.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Hires</h2>
          {employees.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No employees yet</p>
          ) : (
            <div className="space-y-3">
              {employees.slice(0, 5).map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{employee.firstName} {employee.lastName}</p>
                    <p className="text-xs text-muted-foreground">{employee.position} • {employee.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HRM() {
  return (
    <Routes>
      <Route index element={<HRMOverview />} />
      <Route path="employees/*" element={<EmployeesPage />} />
      <Route path="recruitment/*" element={<RecruitmentPage />} />
      <Route path="performance/*" element={<PerformancePage />} />
      <Route path="payroll/*" element={<PayrollPage />} />
    </Routes>
  );
}
