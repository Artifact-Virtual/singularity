/**
 * CSV Data Service
 * Reads and parses department CSV dashboard files into structured data
 * Integrates all Singularity department data as a unified nervous system
 */

// CSV file paths configuration
export const CSV_DATA_SOURCES = {
  executive: '/departments/executive/EXECUTIVE_DASHBOARD.csv',
  hr: '/departments/hr/HR_DASHBOARD.csv',
  finance: '/departments/finance/FINANCE_DASHBOARD.csv',
  marketing: '/departments/marketing/MARKETING_OPS_DASHBOARD.csv',
  operations: '/departments/operations/OPERATIONS_DASHBOARD.csv',
  itInfrastructure: '/departments/it-infrastructure/IT_INFRASTRUCTURE_DASHBOARD.csv',
  legalCompliance: '/departments/legal-compliance/LEGAL_COMPLIANCE_DASHBOARD.csv',
  avrd: '/departments/avrd/AVRD_DASHBOARD.csv',
  avml: '/departments/avml/AVML_DASHBOARD.csv',
  projectManagement: '/project_management/data/projects-dashboard.csv',
} as const;

// Types for department data
export type DepartmentType = keyof typeof CSV_DATA_SOURCES;

// Financial data from Executive Dashboard
export interface FinancialOverview {
  period: string;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  ebitda: number;
  ebitdaMarginPercent: number;
  netIncome: number;
  netMarginPercent: number;
  headcount: number;
  revenuePerEmployee: number;
}

// Strategic objectives
export interface StrategicObjective {
  objectiveId: string;
  objective: string;
  category: string;
  owner: string;
  status: string;
  priority: string;
  startDate: string;
  targetDate: string;
  progressPercent: number;
  budget: number;
  kpi: string;
  current: number;
  target: number;
  health: string;
}

// Department performance
export interface DepartmentPerformance {
  department: string;
  head: string;
  headcount: number;
  budget: number;
  spend: number;
  budgetUtilPercent: number;
  keyMetric: string;
  current: number;
  target: number;
  performancePercent: number;
  status: string;
  topPriority: string;
  integrationScore: number;
}

// Risk register
export interface Risk {
  riskId: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  riskScore: number;
  owner: string;
  mitigationStrategy: string;
  status: string;
  lastReview: string;
  nextReview: string;
  costOfMitigation: number;
}

// HR headcount data
export interface HeadcountData {
  department: string;
  janHeadcount: number;
  febHeadcount: number;
  marHeadcount: number;
  q1Target: number;
  q2Target: number;
  q3Target: number;
  q4Target: number;
  yearEndTarget: number;
  currentVsTarget: number;
  hiringPriority: string;
  openPositions: number;
}

// Recruitment pipeline
export interface RecruitmentPipeline {
  requisitionId: string;
  positionTitle: string;
  department: string;
  level: string;
  status: string;
  dateOpened: string;
  daysOpen: number;
  candidatesScreened: number;
  interviewsScheduled: number;
  offersExtended: number;
  hiringManager: string;
  recruiter: string;
  targetStartDate: string;
}

// Employee data
export interface EmployeeRecord {
  employeeId: string;
  fullName: string;
  department: string;
  title: string;
  level: string;
  startDate: string;
  tenureYears: number;
  employmentType: string;
  location: string;
  manager: string;
  salary: number;
  performanceRating: string;
  status: string;
}

// Infrastructure asset
export interface InfrastructureAsset {
  assetId: string;
  assetName: string;
  type: string;
  environment: string;
  provider: string;
  region: string;
  status: string;
  provisionedDate: string;
  cpuCores: number;
  ramGb: number;
  storageTb: number;
  monthlyCost: number;
  owner: string;
  purpose: string;
}

// System performance metric
export interface SystemMetric {
  system: string;
  metric: string;
  currentValue: number;
  target: number;
  threshold: number;
  status: string;
  last7dAvg: number;
  last30dAvg: number;
  trend: string;
  lastIncident: string;
  sla: string;
  notes: string;
}

// Incident record
export interface Incident {
  incidentId: string;
  title: string;
  severity: string;
  status: string;
  reportedDate: string;
  resolvedDate: string;
  durationHours: number;
  impact: string;
  rootCause: string;
  owner: string;
  resolution: string;
  costImpact: number;
}

// Operations process
export interface OperationalProcess {
  processId: string;
  processName: string;
  category: string;
  owner: string;
  status: string;
  efficiencyScore: number;
  cycleTimeDays: number;
  costPerCycle: number;
  monthlyVolume: number;
  automationLevelPercent: number;
  priority: string;
  nextReview: string;
  notes: string;
}

// Vendor record
export interface Vendor {
  vendorId: string;
  vendorName: string;
  category: string;
  serviceProvided: string;
  contractValue: number;
  contractStart: string;
  contractEnd: string;
  performanceScore: number;
  slaCompliancePercent: number;
  paymentTerms: string;
  status: string;
  accountManager: string;
  notes: string;
}

// Aggregated department data
export interface DepartmentData {
  executive: {
    financials: FinancialOverview[];
    objectives: StrategicObjective[];
    departmentPerformance: DepartmentPerformance[];
    risks: Risk[];
  };
  hr: {
    headcount: HeadcountData[];
    recruitment: RecruitmentPipeline[];
    employees: EmployeeRecord[];
  };
  finance: {
    profitLoss: FinancialOverview[];
    // Additional finance data structures
  };
  operations: {
    processes: OperationalProcess[];
    vendors: Vendor[];
  };
  itInfrastructure: {
    assets: InfrastructureAsset[];
    metrics: SystemMetric[];
    incidents: Incident[];
  };
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parse numeric value, handling formula references
 */
function parseNumeric(value: string): number {
  if (!value || value === '' || value === '—' || value === 'N/A') return 0;
  if (value.startsWith('=')) return 0; // Formula reference
  const cleaned = value.replace(/[,$%]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Find sheet section in CSV rows
 */
function findSheetSection(rows: string[][], sheetName: string): string[][] {
  const result: string[][] = [];
  let inSection = false;
  
  for (const row of rows) {
    const firstCell = row[0]?.toUpperCase() || '';
    
    if (firstCell.includes(sheetName.toUpperCase())) {
      inSection = true;
      continue;
    }
    
    if (inSection) {
      // Check if we've hit the next section
      if (firstCell.startsWith('SHEET ') && !firstCell.includes(sheetName.toUpperCase())) {
        break;
      }
      // Skip empty rows at start
      if (result.length === 0 && row.every(cell => !cell)) {
        continue;
      }
      result.push(row);
    }
  }
  
  return result;
}

/**
 * Parse Executive Dashboard CSV
 */
export async function parseExecutiveDashboard(content: string): Promise<DepartmentData['executive']> {
  const rows = parseCSV(content);
  
  // Parse Financial Overview (Sheet 1)
  const financialRows = findSheetSection(rows, 'FINANCIAL OVERVIEW');
  const financials: FinancialOverview[] = [];
  
  let headerFound = false;
  for (const row of financialRows) {
    if (row[0]?.toLowerCase() === 'period') {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0] && !row[0].includes('Target') && row[0] !== '') {
      financials.push({
        period: row[0],
        totalRevenue: parseNumeric(row[1]),
        cogs: parseNumeric(row[2]),
        grossProfit: parseNumeric(row[3]),
        grossMarginPercent: parseNumeric(row[4]),
        operatingExpenses: parseNumeric(row[5]),
        ebitda: parseNumeric(row[6]),
        ebitdaMarginPercent: parseNumeric(row[7]),
        netIncome: parseNumeric(row[8]),
        netMarginPercent: parseNumeric(row[9]),
        headcount: parseNumeric(row[10]),
        revenuePerEmployee: parseNumeric(row[11]),
      });
    }
  }

  // Parse Strategic Objectives (Sheet 2)
  const objectiveRows = findSheetSection(rows, 'STRATEGIC OBJECTIVES');
  const objectives: StrategicObjective[] = [];
  
  headerFound = false;
  for (const row of objectiveRows) {
    if (row[0]?.toLowerCase().includes('objective id')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('OBJ-')) {
      objectives.push({
        objectiveId: row[0],
        objective: row[1],
        category: row[2],
        owner: row[3],
        status: row[4],
        priority: row[5],
        startDate: row[6],
        targetDate: row[7],
        progressPercent: parseNumeric(row[8]),
        budget: parseNumeric(row[9]),
        kpi: row[10],
        current: parseNumeric(row[11]),
        target: parseNumeric(row[12]),
        health: row[13],
      });
    }
  }

  // Parse Department Performance (Sheet 3)
  const deptRows = findSheetSection(rows, 'DEPARTMENTAL PERFORMANCE');
  const departmentPerformance: DepartmentPerformance[] = [];
  
  headerFound = false;
  for (const row of deptRows) {
    if (row[0]?.toLowerCase() === 'department') {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0] && row[0] !== 'TOTALS' && row[0] !== '') {
      departmentPerformance.push({
        department: row[0],
        head: row[1],
        headcount: parseNumeric(row[2]),
        budget: parseNumeric(row[3]),
        spend: parseNumeric(row[4]),
        budgetUtilPercent: parseNumeric(row[5]),
        keyMetric: row[6],
        current: parseNumeric(row[7]),
        target: parseNumeric(row[8]),
        performancePercent: parseNumeric(row[9]),
        status: row[10],
        topPriority: row[11],
        integrationScore: parseNumeric(row[12]),
      });
    }
  }

  // Parse Risk Register (Sheet 4)
  const riskRows = findSheetSection(rows, 'RISK REGISTER');
  const risks: Risk[] = [];
  
  headerFound = false;
  for (const row of riskRows) {
    if (row[0]?.toLowerCase().includes('risk id')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('RISK-')) {
      risks.push({
        riskId: row[0],
        description: row[1],
        category: row[2],
        probability: row[3],
        impact: row[4],
        riskScore: parseNumeric(row[5]),
        owner: row[6],
        mitigationStrategy: row[7],
        status: row[8],
        lastReview: row[9],
        nextReview: row[10],
        costOfMitigation: parseNumeric(row[11]),
      });
    }
  }

  return {
    financials,
    objectives,
    departmentPerformance,
    risks,
  };
}

/**
 * Parse HR Dashboard CSV
 */
export async function parseHRDashboard(content: string): Promise<DepartmentData['hr']> {
  const rows = parseCSV(content);
  
  // Parse Headcount (Sheet 1)
  const headcountRows = findSheetSection(rows, 'HEADCOUNT');
  const headcount: HeadcountData[] = [];
  
  let headerFound = false;
  for (const row of headcountRows) {
    if (row[0]?.toLowerCase() === 'department') {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0] && row[0] !== 'TOTALS' && row[0] !== '') {
      headcount.push({
        department: row[0],
        janHeadcount: parseNumeric(row[1]),
        febHeadcount: parseNumeric(row[2]),
        marHeadcount: parseNumeric(row[3]),
        q1Target: parseNumeric(row[4]),
        q2Target: parseNumeric(row[5]),
        q3Target: parseNumeric(row[6]),
        q4Target: parseNumeric(row[7]),
        yearEndTarget: parseNumeric(row[8]),
        currentVsTarget: parseNumeric(row[9]),
        hiringPriority: row[10],
        openPositions: parseNumeric(row[11]),
      });
    }
  }

  // Parse Recruitment Pipeline (Sheet 2)
  const recruitmentRows = findSheetSection(rows, 'RECRUITMENT PIPELINE');
  const recruitment: RecruitmentPipeline[] = [];
  
  headerFound = false;
  for (const row of recruitmentRows) {
    if (row[0]?.toLowerCase().includes('requisition')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('REQ-')) {
      recruitment.push({
        requisitionId: row[0],
        positionTitle: row[1],
        department: row[2],
        level: row[3],
        status: row[4],
        dateOpened: row[5],
        daysOpen: parseNumeric(row[6]),
        candidatesScreened: parseNumeric(row[7]),
        interviewsScheduled: parseNumeric(row[8]),
        offersExtended: parseNumeric(row[9]),
        hiringManager: row[10],
        recruiter: row[11],
        targetStartDate: row[12],
      });
    }
  }

  // Parse Employee Roster (Sheet 3)
  const employeeRows = findSheetSection(rows, 'EMPLOYEE ROSTER');
  const employees: EmployeeRecord[] = [];
  
  headerFound = false;
  for (const row of employeeRows) {
    if (row[0]?.toLowerCase().includes('employee id')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('EMP-')) {
      employees.push({
        employeeId: row[0],
        fullName: row[1],
        department: row[2],
        title: row[3],
        level: row[4],
        startDate: row[5],
        tenureYears: parseNumeric(row[6]),
        employmentType: row[7],
        location: row[8],
        manager: row[9],
        salary: parseNumeric(row[10]),
        performanceRating: row[11],
        status: row[12],
      });
    }
  }

  return {
    headcount,
    recruitment,
    employees,
  };
}

/**
 * Parse IT Infrastructure Dashboard CSV
 */
export async function parseITInfrastructureDashboard(content: string): Promise<DepartmentData['itInfrastructure']> {
  const rows = parseCSV(content);
  
  // Parse Infrastructure Inventory (Sheet 1)
  const assetRows = findSheetSection(rows, 'INFRASTRUCTURE INVENTORY');
  const assets: InfrastructureAsset[] = [];
  
  let headerFound = false;
  for (const row of assetRows) {
    if (row[0]?.toLowerCase().includes('asset id')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('INF-')) {
      assets.push({
        assetId: row[0],
        assetName: row[1],
        type: row[2],
        environment: row[3],
        provider: row[4],
        region: row[5],
        status: row[6],
        provisionedDate: row[7],
        cpuCores: parseNumeric(row[8]),
        ramGb: parseNumeric(row[9]),
        storageTb: parseNumeric(row[10]),
        monthlyCost: parseNumeric(row[11]),
        owner: row[12],
        purpose: row[13],
      });
    }
  }

  // Parse System Performance Metrics (Sheet 2)
  const metricRows = findSheetSection(rows, 'SYSTEM PERFORMANCE');
  const metrics: SystemMetric[] = [];
  
  headerFound = false;
  for (const row of metricRows) {
    if (row[0]?.toLowerCase() === 'system') {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0] && row[0] !== '' && !row[0].includes('SHEET')) {
      metrics.push({
        system: row[0],
        metric: row[1],
        currentValue: parseNumeric(row[2]),
        target: parseNumeric(row[3]),
        threshold: parseNumeric(row[4]),
        status: row[5],
        last7dAvg: parseNumeric(row[6]),
        last30dAvg: parseNumeric(row[7]),
        trend: row[8],
        lastIncident: row[9],
        sla: row[10],
        notes: row[11],
      });
    }
  }

  // Parse Incidents (Sheet 4)
  const incidentRows = findSheetSection(rows, 'INCIDENTS');
  const incidents: Incident[] = [];
  
  headerFound = false;
  for (const row of incidentRows) {
    if (row[0]?.toLowerCase().includes('incident id')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('INC-')) {
      incidents.push({
        incidentId: row[0],
        title: row[1],
        severity: row[2],
        status: row[3],
        reportedDate: row[4],
        resolvedDate: row[5],
        durationHours: parseNumeric(row[6]),
        impact: row[7],
        rootCause: row[8],
        owner: row[9],
        resolution: row[10],
        costImpact: parseNumeric(row[11]),
      });
    }
  }

  return {
    assets,
    metrics,
    incidents,
  };
}

/**
 * Parse Operations Dashboard CSV
 */
export async function parseOperationsDashboard(content: string): Promise<DepartmentData['operations']> {
  const rows = parseCSV(content);
  
  // Parse Processes (Sheet 1)
  const processRows = findSheetSection(rows, 'OPERATIONAL PROCESSES');
  const processes: OperationalProcess[] = [];
  
  let headerFound = false;
  for (const row of processRows) {
    if (row[0]?.toLowerCase().includes('process id')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('PRC-')) {
      processes.push({
        processId: row[0],
        processName: row[1],
        category: row[2],
        owner: row[3],
        status: row[4],
        efficiencyScore: parseNumeric(row[5]),
        cycleTimeDays: parseNumeric(row[6]),
        costPerCycle: parseNumeric(row[7]),
        monthlyVolume: parseNumeric(row[8]),
        automationLevelPercent: parseNumeric(row[9]),
        priority: row[10],
        nextReview: row[11],
        notes: row[12],
      });
    }
  }

  // Parse Vendors (Sheet 3)
  const vendorRows = findSheetSection(rows, 'VENDOR MANAGEMENT');
  const vendors: Vendor[] = [];
  
  headerFound = false;
  for (const row of vendorRows) {
    if (row[0]?.toLowerCase().includes('vendor id')) {
      headerFound = true;
      continue;
    }
    if (headerFound && row[0]?.startsWith('VEN-')) {
      vendors.push({
        vendorId: row[0],
        vendorName: row[1],
        category: row[2],
        serviceProvided: row[3],
        contractValue: parseNumeric(row[4]),
        contractStart: row[5],
        contractEnd: row[6],
        performanceScore: parseNumeric(row[7]),
        slaCompliancePercent: parseNumeric(row[8]),
        paymentTerms: row[9],
        status: row[10],
        accountManager: row[11],
        notes: row[12],
      });
    }
  }

  return {
    processes,
    vendors,
  };
}

// Data loading state
let cachedData: Partial<DepartmentData> | null = null;

/**
 * Load all department CSV data
 */
export async function loadAllDepartmentData(): Promise<DepartmentData> {
  if (cachedData) {
    return cachedData as DepartmentData;
  }

  // In a real implementation, this would fetch from the API
  // For now, return empty structures that will be populated by the backend
  const data: DepartmentData = {
    executive: {
      financials: [],
      objectives: [],
      departmentPerformance: [],
      risks: [],
    },
    hr: {
      headcount: [],
      recruitment: [],
      employees: [],
    },
    finance: {
      profitLoss: [],
    },
    operations: {
      processes: [],
      vendors: [],
    },
    itInfrastructure: {
      assets: [],
      metrics: [],
      incidents: [],
    },
  };

  cachedData = data;
  return data;
}

/**
 * Clear cached data
 */
export function clearDepartmentDataCache(): void {
  cachedData = null;
}

/**
 * Get department summary statistics
 */
export function getDepartmentSummary(data: DepartmentData): {
  totalHeadcount: number;
  totalBudget: number;
  activeObjectives: number;
  openRisks: number;
  openPositions: number;
  activeIncidents: number;
  monthlyInfrastructureCost: number;
} {
  const totalHeadcount = data.executive.departmentPerformance
    .reduce((sum, d) => sum + d.headcount, 0);
    
  const totalBudget = data.executive.departmentPerformance
    .reduce((sum, d) => sum + d.budget, 0);
    
  const activeObjectives = data.executive.objectives
    .filter(o => o.status === 'In Progress').length;
    
  const openRisks = data.executive.risks
    .filter(r => r.status === 'Active').length;
    
  const openPositions = data.hr.headcount
    .reduce((sum, h) => sum + h.openPositions, 0);
    
  const activeIncidents = data.itInfrastructure.incidents
    .filter(i => i.status !== 'Resolved').length;
    
  const monthlyInfrastructureCost = data.itInfrastructure.assets
    .reduce((sum, a) => sum + a.monthlyCost, 0);

  return {
    totalHeadcount,
    totalBudget,
    activeObjectives,
    openRisks,
    openPositions,
    activeIncidents,
    monthlyInfrastructureCost,
  };
}
