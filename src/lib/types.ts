// ============================================
// CivilEstimator Pro — TypeScript Type Definitions
// ============================================

// ---- Currency ----
export type CurrencyCode = 'USD' | 'PKR' | 'EUR' | 'GBP' | 'INR' | 'AED';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rate: number; // relative to USD
}

// ---- Structural Elements ----
export type ElementType =
  | 'wall'
  | 'slab'
  | 'column'
  | 'beam'
  | 'foundation'
  | 'footing'
  | 'staircase'
  | 'lintel'
  | 'plinth'
  | 'parapet';

export interface StructuralElement {
  id: string;
  type: ElementType;
  name: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  unit: string;
  volume: number;
  area: number;
  notes?: string;
}

// ---- Material ----
export type MaterialCategory =
  | 'concrete'
  | 'brickwork'
  | 'steel'
  | 'excavation'
  | 'plaster'
  | 'formwork'
  | 'waterproofing'
  | 'painting'
  | 'tiling'
  | 'flooring'
  | 'roofing'
  | 'plumbing'
  | 'electrical'
  | 'woodwork'
  | 'miscellaneous';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  rate: number;
  description?: string;
}

// ---- Concrete Mix ----
export type ConcreteGrade = 'M10' | 'M15' | 'M20' | 'M25' | 'M30' | 'M35' | 'M40';

export interface ConcreteMix {
  grade: ConcreteGrade;
  ratio: string;
  cement: number;   // bags per m³
  sand: number;     // m³ per m³
  aggregate: number; // m³ per m³
  water: number;    // liters per m³
}

// ---- BOQ Item ----
export interface BOQItem {
  id: string;
  sno: number;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  notes?: string;
}

export interface BOQSection {
  id: string;
  title: string;
  items: BOQItem[];
  subtotal: number;
}

// ---- Project ----
export interface Project {
  id: string;
  name: string;
  clientName: string;
  location: string;
  description: string;
  preparedBy: string;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in-progress' | 'completed';
  elements: StructuralElement[];
  boqSections: BOQSection[];
  materials: Material[];
  totalCost: number;
  notes: string;
  versions: ProjectVersion[];
  drawingFiles: UploadedFile[];
}

export interface ProjectVersion {
  id: string;
  timestamp: string;
  description: string;
  snapshot: string; // JSON string of project state
}

// ---- File Upload ----
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  base64?: string;
  uploadedAt: string;
}

// ---- AI Analysis ----
export interface AIAnalysisResult {
  success: boolean;
  elements: DetectedElement[];
  dimensions: DetectedDimension[];
  rawResponse: string;
  confidence: number;
  retryCount: number;
}

export interface DetectedElement {
  type: ElementType;
  label: string;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
  };
  confidence: number;
  overridden: boolean;
  manualValues?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface DetectedDimension {
  label: string;
  value: number;
  unit: string;
  confidence: number;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalEstimatedCost: number;
  recentProjects: Project[];
}

// ---- Scheduling (Future) ----
export interface ScheduleTask {
  id: string;
  name: string;
  startDay: number;
  duration: number;
  dependencies: string[];
  laborCount: number;
  status: 'pending' | 'in-progress' | 'completed';
  color: string;
}

// ---- Report ----
export interface ReportConfig {
  projectTitle: string;
  clientName: string;
  preparedBy: string;
  date: string;
  location: string;
  includeBreakdown: boolean;
  includeNotes: boolean;
  includeLaborEstimate: boolean;
  currency: Currency;
  logoBase64?: string;
}

// ---- Calculation Results ----
export interface ConcreteCalcResult {
  volume: number;
  cement_bags: number;
  sand_m3: number;
  aggregate_m3: number;
  water_liters: number;
  cost: number;
}

export interface BrickworkCalcResult {
  area: number;
  bricks: number;
  cement_bags: number;
  sand_m3: number;
  cost: number;
}

export interface SteelCalcResult {
  weight_kg: number;
  bars: number;
  cost: number;
}

export interface MaterialBreakdown {
  material: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

// ---- Toast / Notification ----
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
