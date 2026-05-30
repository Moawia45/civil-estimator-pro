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
  concreteGrade: ConcreteGrade = 'M20',
  deductions: { area: number; volume: number } = { area: 0, volume: 0 }
): MaterialBreakdown[] {
  const breakdown: MaterialBreakdown[] = [];
  const vol = calculateVolume(length, width, height) * quantity;
  const area = calculateArea(length, width) * quantity;

  // 1. Footings & Foundations (Full foundation takeoff)
  if (elementType === 'footing' || elementType === 'foundation') {
    // Excavation depth 1.2m
    const excVol = length * width * 1.2 * quantity;
    breakdown.push({ material: 'Excavation in Earth (Manual)', quantity: parseFloat(excVol.toFixed(3)), unit: 'm³', rate: 0, total: 0 });

    // PCC Bedding 100mm thick (PCC M10)
    const pccVol = length * width * 0.1 * quantity;
    const pccConc = calculateConcrete(pccVol, 'M10');
    breakdown.push(
      { material: 'PCC M10 (1:3:6)', quantity: parseFloat(pccVol.toFixed(3)), unit: 'm³', rate: 0, total: 0 },
      { material: 'Cement', quantity: pccConc.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: pccConc.sand_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Coarse Aggregate', quantity: pccConc.aggregate_m3, unit: 'm³', rate: 0, total: 0 }
    );

    // RCC Footing concrete (RCC M20)
    const rccVol = vol; // matching the height of footing
    const rccConc = calculateConcrete(rccVol, concreteGrade);
    const steel = calculateSteel(rccVol, 'footing');
    const form = calculateFormwork('footing', length, width, height);

    breakdown.push(
      { material: 'RCC M20 (1:1.5:3)', quantity: parseFloat(rccVol.toFixed(3)), unit: 'm³', rate: 0, total: 0 },
      { material: 'Cement', quantity: rccConc.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: rccConc.sand_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Coarse Aggregate', quantity: rccConc.aggregate_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Steel Reinforcement', quantity: steel.weight_kg, unit: 'kg', rate: 0, total: 0 },
      { material: 'Binding Wire', quantity: parseFloat((steel.weight_kg * 0.01).toFixed(2)), unit: 'kg', rate: 0, total: 0 },
      { material: 'Plywood Formwork', quantity: parseFloat((form.area * quantity).toFixed(2)), unit: 'm²', rate: 0, total: 0 }
    );

    // Foundation Masonry (brickwork below ground 0.9m)
    const brickVol = length * width * 0.9 * quantity;
    const bw = calculateBrickwork(length * 0.9 * quantity, 9); // simplified as length * 0.9 wall area
    breakdown.push(
      { material: 'Brickwork in Cement Mortar (9")', quantity: parseFloat(brickVol.toFixed(3)), unit: 'm³', rate: 0, total: 0 },
      { material: 'Bricks', quantity: bw.bricks, unit: 'nos', rate: 0, total: 0 },
      { material: 'Cement', quantity: bw.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: bw.sand_m3, unit: 'm³', rate: 0, total: 0 }
    );

    // DPC Damp Proof Course
    const dpcArea = length * width * quantity;
    breakdown.push({ material: 'DPC (Damp Proof Course)', quantity: parseFloat(dpcArea.toFixed(2)), unit: 'm²', rate: 0, total: 0 });

    // Sand Filling (plinth filling 0.6m depth)
    const sandFillVol = length * width * 0.6 * quantity;
    breakdown.push({ material: 'Sand Filling', quantity: parseFloat(sandFillVol.toFixed(3)), unit: 'm³', rate: 0, total: 0 });
  }

  // 2. Slab (Floor & Roof takeoffs combined)
  else if (elementType === 'slab') {
    // Floor: PCC bedding 100mm (PCC M10)
    const pccVol = length * width * 0.1 * quantity;
    const pccConc = calculateConcrete(pccVol, 'M10');
    breakdown.push(
      { material: 'PCC M10 (1:3:6)', quantity: parseFloat(pccVol.toFixed(3)), unit: 'm³', rate: 0, total: 0 },
      { material: 'Cement', quantity: pccConc.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: pccConc.sand_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Coarse Aggregate', quantity: pccConc.aggregate_m3, unit: 'm³', rate: 0, total: 0 }
    );

    // Floor: Cement Screed bed (50mm thick)
    const screedVol = length * width * 0.05 * quantity;
    const screedConc = calculateConcrete(screedVol, 'M15'); // matching PCC M15 cement/sand
    breakdown.push(
      { material: 'Cement', quantity: screedConc.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: screedConc.sand_m3, unit: 'm³', rate: 0, total: 0 }
    );

    // Floor: Tiling
    const tileArea = area;
    breakdown.push({ material: 'Floor Tiles (Standard)', quantity: parseFloat(tileArea.toFixed(2)), unit: 'm²', rate: 0, total: 0 });

    // Roof: RCC Slab Concrete (RCC M20)
    const rccVol = vol; // length * width * height
    const rccConc = calculateConcrete(rccVol, concreteGrade);
    const steel = calculateSteel(rccVol, 'slab');
    const form = calculateFormwork('slab', length, width, height);

    breakdown.push(
      { material: 'RCC M20 (1:1.5:3)', quantity: parseFloat(rccVol.toFixed(3)), unit: 'm³', rate: 0, total: 0 },
      { material: 'Cement', quantity: rccConc.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: rccConc.sand_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Coarse Aggregate', quantity: rccConc.aggregate_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Steel Reinforcement', quantity: steel.weight_kg, unit: 'kg', rate: 0, total: 0 },
      { material: 'Binding Wire', quantity: parseFloat((steel.weight_kg * 0.01).toFixed(2)), unit: 'kg', rate: 0, total: 0 },
      { material: 'Plywood Formwork', quantity: parseFloat((form.area * quantity).toFixed(2)), unit: 'm²', rate: 0, total: 0 }
    );

    // Roof Plaster / Ceiling plaster (12mm)
    const plasterArea = area;
    const pl = calculatePlaster(plasterArea, 12);
    breakdown.push(
      { material: 'Cement Plaster 12mm (1:6)', quantity: parseFloat(plasterArea.toFixed(2)), unit: 'm²', rate: 0, total: 0 },
      { material: 'Cement', quantity: pl.cementBags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: pl.sandM3, unit: 'm³', rate: 0, total: 0 }
    );

    // Roof Waterproofing
    breakdown.push({ material: 'Bituminous Waterproofing', quantity: parseFloat(area.toFixed(2)), unit: 'm²', rate: 0, total: 0 });
  }

  // 3. Walls & Parapets
  else if (['wall', 'parapet'].includes(elementType)) {
    const grossWallArea = length * height * quantity;
    const wallArea = Math.max(0, grossWallArea - deductions.area);
    const wallVol = Math.max(0, vol - deductions.volume);

    const is9Inch = width > 0.15;
    const bwKey = is9Inch ? 'Brickwork in Cement Mortar (9")' : 'Brickwork in Cement Mortar (4.5")';
    const bw = calculateBrickwork(wallArea, is9Inch ? 9 : 4.5);

    breakdown.push(
      { material: bwKey, quantity: is9Inch ? parseFloat(wallVol.toFixed(3)) : parseFloat(wallArea.toFixed(2)), unit: is9Inch ? 'm³' : 'm²', rate: 0, total: 0 },
      { material: 'Bricks', quantity: bw.bricks, unit: 'nos', rate: 0, total: 0 },
      { material: 'Cement', quantity: bw.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: bw.sand_m3, unit: 'm³', rate: 0, total: 0 }
    );

    // Plaster both sides
    const plasterArea = wallArea * 2;
    const pl = calculatePlaster(plasterArea, 12);
    breakdown.push(
      { material: 'Cement Plaster 12mm (1:6)', quantity: parseFloat(plasterArea.toFixed(2)), unit: 'm²', rate: 0, total: 0 },
      { material: 'Cement', quantity: pl.cementBags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: pl.sandM3, unit: 'm³', rate: 0, total: 0 }
    );
  }

  // 4. Other Concrete Elements (beams, columns, lintels, staircase, plinth)
  else if (['beam', 'column', 'lintel', 'staircase', 'plinth'].includes(elementType)) {
    const rccConc = calculateConcrete(vol, concreteGrade);
    const steel = calculateSteel(vol, elementType);
    const form = calculateFormwork(elementType, length, width, height);

    breakdown.push(
      { material: 'RCC M20 (1:1.5:3)', quantity: parseFloat(vol.toFixed(3)), unit: 'm³', rate: 0, total: 0 },
      { material: 'Cement', quantity: rccConc.cement_bags, unit: 'bags', rate: 0, total: 0 },
      { material: 'Sand (Fine Agg.)', quantity: rccConc.sand_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Coarse Aggregate', quantity: rccConc.aggregate_m3, unit: 'm³', rate: 0, total: 0 },
      { material: 'Steel Reinforcement', quantity: steel.weight_kg, unit: 'kg', rate: 0, total: 0 },
      { material: 'Binding Wire', quantity: parseFloat((steel.weight_kg * 0.01).toFixed(2)), unit: 'kg', rate: 0, total: 0 },
      { material: 'Plywood Formwork', quantity: parseFloat((form.area * quantity).toFixed(2)), unit: 'm²', rate: 0, total: 0 }
    );
  }

  // 5. Doors
  else if (elementType === 'door') {
    breakdown.push(
      { material: 'Flush Door (Standard)', quantity: quantity, unit: 'nos', rate: 0, total: 0 },
      { material: 'Enamel Paint', quantity: parseFloat((length * height * 2 * quantity).toFixed(2)), unit: 'm²', rate: 0, total: 0 }
    );
  }

  // 6. Windows
  else if (elementType === 'window') {
    breakdown.push(
      { material: 'Wooden Window', quantity: quantity, unit: 'nos', rate: 0, total: 0 }
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

// ---- Unit Conversions ----
export function feetToMeters(feet: number): number {
  return parseFloat((feet * 0.3048).toFixed(4));
}

export function metersToFeet(meters: number): number {
  return parseFloat((meters / 0.3048).toFixed(4));
}

export function cubicMetersToCubicFeet(m3: number): number {
  return parseFloat((m3 * 35.3147).toFixed(4));
}

export function cubicFeetToCubicMeters(cft: number): number {
  return parseFloat((cft / 35.3147).toFixed(4));
}

export function squareMetersToSquareFeet(m2: number): number {
  return parseFloat((m2 * 10.7639).toFixed(4));
}

export function squareFeetToSquareMeters(sqft: number): number {
  return parseFloat((sqft / 10.7639).toFixed(4));
}
