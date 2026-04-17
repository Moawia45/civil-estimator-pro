// ============================================
// CivilEstimator Pro — Calculation Engine
// ============================================

import { CONCRETE_MIXES, BRICKWORK, STEEL, PLASTER, EXCAVATION, FORMWORK, LABOR } from './constants';
import { ConcreteGrade, ConcreteCalcResult, BrickworkCalcResult, SteelCalcResult, ElementType, MaterialBreakdown } from './types';

/**
 * Calculate volume of a rectangular element
 */
export function calculateVolume(length: number, width: number, height: number): number {
  return parseFloat((length * width * height).toFixed(4));
}

/**
 * Calculate area (L × W)
 */
export function calculateArea(length: number, width: number): number {
  return parseFloat((length * width).toFixed(4));
}

/**
 * Calculate perimeter of a rectangular section
 */
export function calculatePerimeter(length: number, width: number): number {
  return parseFloat((2 * (length + width)).toFixed(4));
}

/**
 * Calculate concrete material requirements
 * @param volume - Volume of concrete in m³
 * @param grade - Concrete grade (M10-M40)
 * @param ratePerBagCement - Rate per bag of cement
 * @param ratePerM3Sand - Rate per m³ of sand
 * @param ratePerM3Aggregate - Rate per m³ of aggregate
 * @returns Detailed breakdown of materials needed
 */
export function calculateConcrete(
  volume: number,
  grade: ConcreteGrade = 'M20',
  ratePerBagCement: number = 8.00,
  ratePerM3Sand: number = 25.00,
  ratePerM3Aggregate: number = 30.00
): ConcreteCalcResult {
  const mix = CONCRETE_MIXES[grade];
  const dryVolume = volume * 1.54; // Dry volume is 54% more than wet volume

  const cementBags = parseFloat((mix.cement * volume).toFixed(2));
  const sandM3 = parseFloat((mix.sand * dryVolume).toFixed(3));
  const aggregateM3 = parseFloat((mix.aggregate * dryVolume).toFixed(3));
  const waterLiters = parseFloat((mix.water * volume).toFixed(1));

  const cost = (cementBags * ratePerBagCement) + (sandM3 * ratePerM3Sand) + (aggregateM3 * ratePerM3Aggregate);

  return {
    volume,
    cement_bags: cementBags,
    sand_m3: sandM3,
    aggregate_m3: aggregateM3,
    water_liters: waterLiters,
    cost: parseFloat(cost.toFixed(2)),
  };
}

/**
 * Calculate brickwork material requirements
 * @param area - Wall area in m²
 * @param thickness - Wall thickness in inches (4.5 or 9)
 * @param ratePerBrick - Rate per brick
 * @param ratePerBagCement - Rate per bag of cement
 * @param ratePerM3Sand - Rate per m³ of sand
 */
export function calculateBrickwork(
  area: number,
  thickness: number = 9,
  ratePerBrick: number = 0.10,
  ratePerBagCement: number = 8.00,
  ratePerM3Sand: number = 25.00
): BrickworkCalcResult {
  const bricksPerM2 = thickness <= 4.5 ? BRICKWORK.BRICKS_PER_M2_HALF : BRICKWORK.BRICKS_PER_M2_FULL;
  const totalBricks = Math.ceil(area * bricksPerM2 * 1.05); // 5% wastage

  // Mortar calculation
  const wallThicknessM = thickness * 0.0254; // convert inches to meters
  const volume = area * wallThicknessM;
  const mortarVolume = volume * BRICKWORK.MORTAR_FRACTION;
  const cementBags = parseFloat((mortarVolume * BRICKWORK.CEMENT_PER_M3_MORTAR).toFixed(2));
  const sandM3 = parseFloat((mortarVolume * BRICKWORK.SAND_PER_M3_MORTAR).toFixed(3));

  const cost = (totalBricks * ratePerBrick) + (cementBags * ratePerBagCement) + (sandM3 * ratePerM3Sand);

  return {
    area,
    bricks: totalBricks,
    cement_bags: cementBags,
    sand_m3: sandM3,
    cost: parseFloat(cost.toFixed(2)),
  };
}

/**
 * Calculate steel reinforcement requirements
 * @param concreteVolume - Volume of concrete in m³
 * @param elementType - Type of structural element
 * @param ratePerKg - Rate per kg of steel
 */
export function calculateSteel(
  concreteVolume: number,
  elementType: ElementType = 'slab',
  ratePerKg: number = 0.95
): SteelCalcResult {
  const steelPercentage = STEEL.TYPICAL[elementType as keyof typeof STEEL.TYPICAL] ?? 1.0;
  const steelVolume = concreteVolume * (steelPercentage / 100);
  const weightKg = parseFloat((steelVolume * STEEL.UNIT_WEIGHT).toFixed(2));

  // Estimate number of 12mm bars (most common)
  const barWeight = STEEL.BAR_WEIGHTS['12mm'];
  const avgBarLength = 12; // meters
  const barsCount = Math.ceil(weightKg / (barWeight * avgBarLength));

  const cost = parseFloat((weightKg * ratePerKg).toFixed(2));

  return {
    weight_kg: weightKg,
    bars: barsCount,
    cost,
  };
}

/**
 * Calculate plaster material requirements
 * @param area - Area to plaster in m²
 * @param thickness - Plaster thickness in mm (12 or 20)
 */
export function calculatePlaster(
  area: number,
  thickness: number = 12
): { cementBags: number; sandM3: number; cost: number } {
  const isInternal = thickness <= 15;
  const cementPerM2 = isInternal ? PLASTER.CEMENT_PER_M2_12MM : PLASTER.CEMENT_PER_M2_20MM;
  const sandPerM2 = isInternal ? PLASTER.SAND_PER_M2_12MM : PLASTER.SAND_PER_M2_20MM;

  const cementBags = parseFloat((area * cementPerM2).toFixed(2));
  const sandM3 = parseFloat((area * sandPerM2).toFixed(3));

  return { cementBags, sandM3, cost: 0 };
}

/**
 * Calculate excavation requirements
 * @param length - Length in meters
 * @param width - Width in meters
 * @param depth - Depth in meters
 */
export function calculateExcavation(
  length: number,
  width: number,
  depth: number
): { volume: number; bulkedVolume: number; laborHours: number; laborDays: number } {
  const volume = calculateVolume(length, width, depth);
  const bulkedVolume = parseFloat((volume * EXCAVATION.BULKING_FACTOR).toFixed(3));
  const laborHours = parseFloat((volume * EXCAVATION.LABOR_RATE_PER_M3).toFixed(1));
  const laborDays = parseFloat((laborHours / 8).toFixed(1));

  return { volume, bulkedVolume, laborHours, laborDays };
}

/**
 * Calculate formwork area required
 * @param elementType - Type of element
 * @param dimensions - { length, width, height }
 */
export function calculateFormwork(
  elementType: ElementType,
  length: number,
  width: number,
  height: number
): { area: number; plywoodSheets: number; props: number } {
  let area = 0;
  switch (elementType) {
    case 'column':
      area = 2 * (length + width) * height;
      break;
    case 'beam':
      area = (2 * height + width) * length; // bottom + 2 sides
      break;
    case 'slab':
      area = length * width; // bottom only
      break;
    case 'foundation':
    case 'footing':
      area = 2 * (length + width) * height;
      break;
    default:
      area = length * width;
  }
  area = parseFloat(area.toFixed(2));
  const plywoodSheets = Math.ceil(area / FORMWORK.AREA_PER_SHEET / FORMWORK.PLYWOOD_REUSE);
  const props = Math.ceil(area * FORMWORK.PROPS_PER_M2);

  return { area, plywoodSheets, props };
}

/**
 * Estimate labor days for a given work item
 */
export function estimateLabor(
  workType: string,
  quantity: number
): { laborDays: number; workers: number } {
  let productivityPerDay = 1;
  switch (workType) {
    case 'brickwork':
      productivityPerDay = LABOR.BRICKLAYER_PER_DAY;
      break;
    case 'concrete':
      productivityPerDay = LABOR.CONCRETE_PER_DAY;
      break;
    case 'plaster':
      productivityPerDay = LABOR.PLASTER_PER_DAY;
      break;
    case 'excavation':
      productivityPerDay = LABOR.EXCAVATION_PER_DAY;
      break;
    case 'steelfixing':
      productivityPerDay = LABOR.STEEL_FIXING_PER_DAY;
      break;
    case 'formwork':
      productivityPerDay = LABOR.FORMWORK_PER_DAY;
      break;
    case 'painting':
      productivityPerDay = LABOR.PAINTING_PER_DAY;
      break;
    case 'tiling':
      productivityPerDay = LABOR.TILING_PER_DAY;
      break;
    default:
      productivityPerDay = 5;
  }
  const laborDays = parseFloat((quantity / productivityPerDay).toFixed(1));
  const workers = Math.max(1, Math.ceil(laborDays / 30)); // estimate workers needed for 30-day timeline
  return { laborDays, workers };
}

/**
 * Generate full material breakdown for a structural element
 */
export function generateMaterialBreakdown(
  elementType: ElementType,
  length: number,
  width: number,
  height: number,
  quantity: number = 1,
  concreteGrade: ConcreteGrade = 'M20'
): MaterialBreakdown[] {
  const breakdown: MaterialBreakdown[] = [];
  const vol = calculateVolume(length, width, height) * quantity;
  const area = calculateArea(length, width) * quantity;

  // Concrete
  if (['slab', 'beam', 'column', 'foundation', 'footing', 'lintel', 'staircase', 'plinth'].includes(elementType)) {
    const conc = calculateConcrete(vol, concreteGrade);
    breakdown.push(
      { material: `Concrete ${concreteGrade}`, quantity: vol, unit: 'm³', rate: 0, total: 0 },
      { material: 'Cement', quantity: conc.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: conc.sand_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Coarse Aggregate', quantity: conc.aggregate_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Water', quantity: conc.water_liters, unit: 'liters', rate: 0, total: 0 },
    );

    // Steel
    const steel = calculateSteel(vol, elementType);
    breakdown.push(
      { material: 'Steel Reinforcement', quantity: steel.weight_kg, unit: 'kg', rate: 0, total: 0 },
      { material: 'Binding Wire', quantity: parseFloat((steel.weight_kg * 0.01).toFixed(2)), unit: 'kg', rate: 0, total: 0 },
    );

    // Formwork
    const form = calculateFormwork(elementType, length, width, height);
    breakdown.push(
      { material: 'Formwork', quantity: form.area * quantity, unit: 'm²', rate: 0, total: 0 },
    );
  }

  // Brickwork
  if (['wall', 'parapet'].includes(elementType)) {
    const wallArea = length * height * quantity;
    const bw = calculateBrickwork(wallArea, width > 0.15 ? 9 : 4.5);
    breakdown.push(
      { material: 'Bricks', quantity: bw.bricks, unit: 'nos', rate: 0, total: 0 },
      { material: 'Cement (Mortar)', quantity: bw.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Mortar)', quantity: bw.sand_m3, unit: 'm³', rate: 0, total: 0 },
    );

    // Plaster on both sides
    const plastered = wallArea * 2;
    const pl = calculatePlaster(plastered, 12);
    breakdown.push(
      { material: 'Plaster Cement', quantity: pl.cementBags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Plaster Sand', quantity: pl.sandM3, unit: 'm³', rate: 0, total: 0 },
    );
  }

  return breakdown;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, symbol: string = '$', decimals: number = 2): string {
  return `${symbol}${formatNumber(amount, decimals)}`;
}
