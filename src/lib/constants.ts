// ============================================
// CivilEstimator Pro — Engineering Constants
// ============================================

import { ConcreteMix, ConcreteGrade, Currency, CurrencyCode } from './types';

// ---- Concrete Mix Ratios (per m³ of concrete) ----
export const CONCRETE_MIXES: Record<ConcreteGrade, ConcreteMix> = {
  M10: { grade: 'M10', ratio: '1:3:6', cement: 4.44, sand: 0.44, aggregate: 0.88, water: 160 },
  M15: { grade: 'M15', ratio: '1:2:4', cement: 5.71, sand: 0.42, aggregate: 0.83, water: 170 },
  M20: { grade: 'M20', ratio: '1:1.5:3', cement: 8.0, sand: 0.42, aggregate: 0.83, water: 176 },
  M25: { grade: 'M25', ratio: '1:1:2', cement: 9.51, sand: 0.42, aggregate: 0.83, water: 180 },
  M30: { grade: 'M30', ratio: '1:0.75:1.5', cement: 10.93, sand: 0.41, aggregate: 0.82, water: 186 },
  M35: { grade: 'M35', ratio: '1:0.5:1', cement: 12.69, sand: 0.39, aggregate: 0.79, water: 190 },
  M40: { grade: 'M40', ratio: '1:0.4:0.8', cement: 13.33, sand: 0.38, aggregate: 0.76, water: 192 },
};

// ---- Brickwork Constants ----
export const BRICKWORK = {
  BRICKS_PER_M3: 500,        // Standard bricks per cubic meter
  BRICKS_PER_M2_HALF: 55,    // Bricks per m² for half-brick wall (4.5" / 115mm)
  BRICKS_PER_M2_FULL: 110,   // Bricks per m² for full-brick wall (9" / 230mm)
  MORTAR_RATIO: '1:6',       // Cement:Sand ratio for mortar
  CEMENT_PER_M3_MORTAR: 7.5, // Bags of cement per m³ of mortarr
  SAND_PER_M3_MORTAR: 1.05,  // m³ of sand per m³ of mortar
  MORTAR_FRACTION: 0.25,     // 25% of brickwork volume is mortar
  BRICK_SIZE: {
    length: 0.228,  // meters (9")
    width: 0.114,   // meters (4.5")
    height: 0.076,  // meters (3")
  },
};

// ---- Steel Constants ----
export const STEEL = {
  UNIT_WEIGHT: 7850,   // kg/m³ (density of steel)
  MIN_PERCENTAGE: 0.8, // Minimum steel % for RCC
  MAX_PERCENTAGE: 4.0, // Maximum steel % for RCC
  TYPICAL: {
    slab: 0.7,         // % of concrete volume
    beam: 1.5,         // %
    column: 2.5,       // %
    foundation: 0.5,   // %
    footing: 0.5,      // %
    staircase: 1.0,    // %
    lintel: 1.2,       // %
  },
  BAR_WEIGHTS: {    // kg per running meter
    '8mm': 0.395,
    '10mm': 0.617,
    '12mm': 0.889,
    '16mm': 1.580,
    '20mm': 2.470,
    '25mm': 3.854,
    '32mm': 6.313,
  } as Record<string, number>,
};

// ---- Plaster Constants ----
export const PLASTER = {
  CEMENT_SAND_RATIO_INNER: '1:6',  // For inner walls
  CEMENT_SAND_RATIO_OUTER: '1:4',  // For outer walls
  THICKNESS_INNER: 0.012,          // 12mm
  THICKNESS_OUTER: 0.020,          // 20mm
  CEMENT_PER_M2_12MM: 0.22,       // bags per m² (12mm thick, 1:6)
  SAND_PER_M2_12MM: 0.017,        // m³ per m² (12mm thick, 1:6)
  CEMENT_PER_M2_20MM: 0.42,       // bags per m² (20mm thick, 1:4)
  SAND_PER_M2_20MM: 0.028,        // m³ per m² (20mm thick, 1:4)
};

// ---- Excavation Constants ----
export const EXCAVATION = {
  LABOR_RATE_PER_M3: 2.5,  // man-hours per m³ (manual)
  MACHINE_RATE_PER_M3: 0.3, // machine-hours per m³
  BULKING_FACTOR: 1.3,     // Volume increase after excavation
};

// ---- Formwork Constants ----
export const FORMWORK = {
  PLYWOOD_REUSE: 3,         // Number of times plywood can be reused
  AREA_PER_SHEET: 2.88,    // m² per standard plywood sheet (1.2m x 2.4m)
  PROPS_PER_M2: 1.5,       // Support props per m²
};

// ---- Labor Productivity ----
export const LABOR = {
  BRICKLAYER_PER_DAY: 400,    // bricks laid per mason per day
  CONCRETE_PER_DAY: 3.0,      // m³ of concrete placed per gang per day
  PLASTER_PER_DAY: 8.0,       // m² of plaster per mason per day
  EXCAVATION_PER_DAY: 2.5,    // m³ of earth excavated per laborer per day
  STEEL_FIXING_PER_DAY: 100,  // kg of steel fixed per skilled worker per day
  FORMWORK_PER_DAY: 10,       // m² of formwork erected per carpenter per day
  PAINTING_PER_DAY: 15,       // m² of painting per painter per day
  TILING_PER_DAY: 5,          // m² of tiling per tiler per day
};

// ---- Currencies ----
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.0 },
  PKR: { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', rate: 278.50 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.50 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
};

// ---- Element Display Names ----
export const ELEMENT_NAMES: Record<string, string> = {
  wall: 'Wall',
  slab: 'Slab',
  column: 'Column',
  beam: 'Beam',
  foundation: 'Foundation',
  footing: 'Footing',
  staircase: 'Staircase',
  lintel: 'Lintel',
  plinth: 'Plinth Beam',
  parapet: 'Parapet Wall',
};

// ---- BOQ Categories ----
export const BOQ_CATEGORIES = [
  'Preliminaries',
  'Earthwork',
  'Concrete Work',
  'Brickwork / Masonry',
  'Steel Reinforcement',
  'Formwork',
  'Plastering',
  'Flooring & Tiling',
  'Painting',
  'Waterproofing',
  'Woodwork & Doors',
  'Plumbing',
  'Electrical',
  'Roofing',
  'Miscellaneous',
];

// ---- Unit Options ----
export const UNITS = [
  { value: 'm3', label: 'Cubic Meter (m³)' },
  { value: 'm2', label: 'Square Meter (m²)' },
  { value: 'rft', label: 'Running Feet (Rft)' },
  { value: 'rm', label: 'Running Meter (RM)' },
  { value: 'kg', label: 'Kilogram (Kg)' },
  { value: 'ton', label: 'Metric Ton' },
  { value: 'nos', label: 'Numbers (Nos)' },
  { value: 'bag', label: 'Bag (50kg)' },
  { value: 'ls', label: 'Lump Sum (LS)' },
  { value: 'sqft', label: 'Square Feet (Sqft)' },
  { value: 'cft', label: 'Cubic Feet (Cft)' },
  { value: 'liter', label: 'Liter' },
  { value: 'trip', label: 'Trip / Load' },
];
