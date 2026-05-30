// ============================================
// CivilEstimator Pro — Excel Export Generator
// ============================================

import * as XLSX from 'xlsx';
import { BOQSection, ReportConfig, MaterialBreakdown, Material, StructuralElement } from './types';
import { generateMaterialBreakdown, calculateVolume, calculateArea } from './calculations';

/**
 * Helper to calculate door/window deductions for a wall based on direction match
 */
function getLocalWallDeductions(wallName: string, elements: StructuralElement[]) {
  let areaDeduction = 0;
  let volumeDeduction = 0;
  const nameLower = wallName.toLowerCase();
  
  let direction = "";
  if (nameLower.includes("north")) direction = "north";
  else if (nameLower.includes("south")) direction = "south";
  else if (nameLower.includes("east")) direction = "east";
  else if (nameLower.includes("west")) direction = "west";
  
  if (!direction) return { area: 0, volume: 0 };
  
  elements.forEach(el => {
    if (el.type === 'door' || el.type === 'window') {
      const elNameLower = el.name.toLowerCase();
      if (elNameLower.includes(direction)) {
        const opArea = el.length * el.height * el.quantity;
        const opVolume = el.length * el.width * el.height * el.quantity;
        areaDeduction += opArea;
        volumeDeduction += opVolume;
      }
    }
  });
  
  return { area: areaDeduction, volume: volumeDeduction };
}

/**
 * Helper to get the rate formula for a composite item referencing raw materials in MasterRates.
 */
function getCompositeRateFormula(materialName: string): string | undefined {
  const name = materialName.trim().toLowerCase();
  
  if (name.includes('rcc m20') || name === 'concrete m20' || name === 'rcc m20 (1:1.5:3)' || name === 'concrete rcc m20') {
    return `8*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.425*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0)) + 0.85*INDEX(B:B, MATCH("Coarse Aggregate", A:A, 0))`;
  }
  if (name.includes('pcc m15') || name === 'concrete m15' || name === 'pcc m15 (1:2:4)') {
    return `6.4*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.45*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0)) + 0.9*INDEX(B:B, MATCH("Coarse Aggregate", A:A, 0))`;
  }
  if (name.includes('pcc m10') || name === 'concrete m10' || name === 'pcc m10 (1:3:6)') {
    return `4.5*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.47*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0)) + 0.94*INDEX(B:B, MATCH("Coarse Aggregate", A:A, 0))`;
  }
  if (name.includes('rcc m25') || name === 'concrete m25') {
    return `10*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.4*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0)) + 0.8*INDEX(B:B, MATCH("Coarse Aggregate", A:A, 0))`;
  }
  if (name.includes('rcc m30') || name === 'concrete m30') {
    return `12*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.38*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0)) + 0.76*INDEX(B:B, MATCH("Coarse Aggregate", A:A, 0))`;
  }
  if (name.includes('brickwork in cement mortar (9")') || name.includes('brickwork (9")') || name.includes('brickwork 9"')) {
    return `500*INDEX(B:B, MATCH("Bricks", A:A, 0)) + 1.4*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.3*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0))`;
  }
  if (name.includes('brickwork in cement mortar (4.5")') || name.includes('brickwork (4.5")') || name.includes('brickwork 4.5"')) {
    return `55*INDEX(B:B, MATCH("Bricks", A:A, 0)) + 0.16*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.035*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0))`;
  }
  if (name.includes('cement plaster 12mm') || name.includes('plaster 12mm')) {
    return `0.09*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.015*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0))`;
  }
  if (name.includes('cement plaster 20mm') || name.includes('plaster 20mm')) {
    return `0.15*INDEX(B:B, MATCH("Cement", A:A, 0)) + 0.025*INDEX(B:B, MATCH("Sand (Fine Agg.)", A:A, 0))`;
  }
  return undefined;
}

/**
 * Helper to get the quantity formula for a raw material referencing composite items in Detailed BOQ.
 */
function getMaterialQtyFormula(key: string): string | undefined {
  const k = key.trim().toLowerCase();
  
  if (k === 'cement') {
    return `8*SUMIF('Detailed BOQ'!B:B, "*M20*", 'Detailed BOQ'!D:D) + 6.4*SUMIF('Detailed BOQ'!B:B, "*M15*", 'Detailed BOQ'!D:D) + 4.5*SUMIF('Detailed BOQ'!B:B, "*M10*", 'Detailed BOQ'!D:D) + 10*SUMIF('Detailed BOQ'!B:B, "*M25*", 'Detailed BOQ'!D:D) + 12*SUMIF('Detailed BOQ'!B:B, "*M30*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'cement (mortar)') {
    return `1.4*SUMIF('Detailed BOQ'!B:B, "*Brickwork*9""*", 'Detailed BOQ'!D:D) + 0.16*SUMIF('Detailed BOQ'!B:B, "*Brickwork*4.5""*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'plaster cement') {
    return `0.09*SUMIF('Detailed BOQ'!B:B, "*Plaster*12mm*", 'Detailed BOQ'!D:D) + 0.15*SUMIF('Detailed BOQ'!B:B, "*Plaster*20mm*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'sand (fine agg.)') {
    return `0.425*SUMIF('Detailed BOQ'!B:B, "*M20*", 'Detailed BOQ'!D:D) + 0.45*SUMIF('Detailed BOQ'!B:B, "*M15*", 'Detailed BOQ'!D:D) + 0.47*SUMIF('Detailed BOQ'!B:B, "*M10*", 'Detailed BOQ'!D:D) + 0.4*SUMIF('Detailed BOQ'!B:B, "*M25*", 'Detailed BOQ'!D:D) + 0.38*SUMIF('Detailed BOQ'!B:B, "*M30*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'sand (mortar)') {
    return `0.3*SUMIF('Detailed BOQ'!B:B, "*Brickwork*9""*", 'Detailed BOQ'!D:D) + 0.035*SUMIF('Detailed BOQ'!B:B, "*Brickwork*4.5""*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'plaster sand') {
    return `0.015*SUMIF('Detailed BOQ'!B:B, "*Plaster*12mm*", 'Detailed BOQ'!D:D) + 0.025*SUMIF('Detailed BOQ'!B:B, "*Plaster*20mm*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'coarse aggregate') {
    return `0.85*SUMIF('Detailed BOQ'!B:B, "*M20*", 'Detailed BOQ'!D:D) + 0.9*SUMIF('Detailed BOQ'!B:B, "*M15*", 'Detailed BOQ'!D:D) + 0.94*SUMIF('Detailed BOQ'!B:B, "*M10*", 'Detailed BOQ'!D:D) + 0.8*SUMIF('Detailed BOQ'!B:B, "*M25*", 'Detailed BOQ'!D:D) + 0.76*SUMIF('Detailed BOQ'!B:B, "*M30*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'bricks') {
    return `500*SUMIF('Detailed BOQ'!B:B, "*Brickwork*9""*", 'Detailed BOQ'!D:D) + 55*SUMIF('Detailed BOQ'!B:B, "*Brickwork*4.5""*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'steel reinforcement' || k.includes('steel')) {
    return `SUMIF('Detailed BOQ'!B:B, "*Steel*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'binding wire') {
    return `0.01*SUMIF('Detailed BOQ'!B:B, "*Steel*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'formwork') {
    return `SUMIF('Detailed BOQ'!B:B, "*Formwork*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'flush door (standard)' || k === 'flush door') {
    return `SUMIF('Detailed BOQ'!B:B, "*Door*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'wooden window') {
    return `SUMIF('Detailed BOQ'!B:B, "*Window*", 'Detailed BOQ'!D:D)`;
  }
  if (k === 'enamel paint') {
    return `SUMIF('Detailed BOQ'!B:B, "*Paint*", 'Detailed BOQ'!D:D)`;
  }
  return undefined;
}

/**
 * Generate and download BOQ as Excel file with formulas
 */
export function downloadBOQExcel(
  config: ReportConfig,
  boqSections: BOQSection[],
  materials: Material[],
  elements: StructuralElement[]
): void {
  const wb = XLSX.utils.book_new();

  // ---- 1. Build Centralized "MasterRates" Sheet ----
  const uniqueMaterials = new Map<string, { name: string; rate: number; unit: string }>();

  // Add all standard materials from project.materials
  materials.forEach(m => {
    const convertedRate = m.rate * (config.currency.rate || 1);
    uniqueMaterials.set(m.name, { name: m.name, rate: convertedRate, unit: m.unit });
  });

  // Add any manual BOQ items not in materials database
  boqSections.forEach(section => {
    section.items.forEach(item => {
      const key = item.materialName || item.description;
      if (!uniqueMaterials.has(key)) {
        uniqueMaterials.set(key, { name: key, rate: item.rate, unit: item.unit });
      }
    });
  });

  const masterRatesData: any[][] = [
    ['Material / Item Name', 'Rate', 'Unit']
  ];
  uniqueMaterials.forEach(m => {
    const compositeFormula = getCompositeRateFormula(m.name);
    if (compositeFormula) {
      masterRatesData.push([
        m.name,
        { t: 'n', f: compositeFormula, v: m.rate },
        m.unit
      ]);
    } else {
      masterRatesData.push([m.name, m.rate, m.unit]);
    }
  });
  const masterRatesSheet = XLSX.utils.aoa_to_sheet(masterRatesData);
  masterRatesSheet['!cols'] = [
    { wch: 45 },
    { wch: 15 },
    { wch: 10 }
  ];

  // ---- 2. Build "Takeoff Calculations" Sheet ----
  const takeoffData: any[][] = [
    ['TAKEOFF CALCULATIONS & DIMENSION Takeoff'],
    [],
    ['S.No', 'Element Name', 'Takeoff Item Description', 'L (m)', 'W (m)', 'H (m)', 'Qty', 'Gross Qty', 'Unit', 'Deductions', 'Net Qty', 'AI Confidence', 'Takeoff Formula']
  ];

  const descriptionToCellMap = new Map<string, string>();
  let takeoffExcelRow = 3;
  let takeoffCounter = 0;

  elements.forEach((el) => {
    const is9Inch = el.width > 0.15;
    const confidenceVal = el.confidence !== undefined ? el.confidence : 1.0;

    // Helper to add takeoff row with dynamic Excel formulas
    const addTakeoffRow = (desc: string, l: number, w: number, h: number, qty: number, unit: string, calcType: string, deductionVal: number, formulaText: string) => {
      takeoffCounter++;
      takeoffExcelRow++;

      const r = takeoffExcelRow; // current 1-indexed row in Excel
      let grossFormula = '';
      if (calcType === 'vol') {
        grossFormula = `D${r}*E${r}*F${r}*G${r}`;
      } else if (calcType === 'area') {
        grossFormula = `D${r}*E${r}*G${r}`;
      } else if (calcType === 'area_wall') {
        grossFormula = `D${r}*F${r}*G${r}`;
      } else if (calcType === 'plaster_wall') {
        grossFormula = `D${r}*F${r}*G${r}*2`;
      } else if (calcType === 'steel') {
        grossFormula = `D${r}*E${r}*F${r}*G${r}*80`;
      } else if (calcType === 'steel_column') {
        grossFormula = `D${r}*E${r}*F${r}*G${r}*180`;
      } else if (calcType === 'steel_beam') {
        grossFormula = `D${r}*E${r}*F${r}*G${r}*120`;
      } else if (calcType === 'steel_other') {
        grossFormula = `D${r}*E${r}*F${r}*G${r}*100`;
      } else if (calcType === 'formwork_footing') {
        grossFormula = `2*(D${r}+E${r})*F${r}*G${r}`;
      } else if (calcType === 'formwork_column') {
        grossFormula = `2*(D${r}+E${r})*F${r}*G${r}`;
      } else if (calcType === 'formwork_beam') {
        grossFormula = `(2*F${r}+E${r})*D${r}*G${r}`;
      } else if (calcType === 'formwork_plinth') {
        grossFormula = `2*F${r}*D${r}*G${r}`;
      } else if (calcType === 'qty') {
        grossFormula = `G${r}`;
      } else if (calcType === 'paint_door') {
        grossFormula = `D${r}*F${r}*G${r}*2`;
      } else {
        grossFormula = `D${r}*E${r}*F${r}*G${r}`;
      }

      const netFormula = `H${r}-J${r}`;
      const grossVal = l * w * h * qty;

      descriptionToCellMap.set(desc, `'Takeoff Calculations'!K${r}`);

      takeoffData.push([
        takeoffCounter,
        el.name,
        desc,
        l,
        w,
        h,
        qty,
        { t: 'n', f: grossFormula, v: grossVal },
        unit,
        deductionVal,
        { t: 'n', f: netFormula, v: grossVal - deductionVal },
        confidenceVal,
        formulaText
      ]);
    };

    if (el.type === 'footing' || el.type === 'foundation') {
      addTakeoffRow(
        `Excavation in earth for foundation of ${el.name} (1.2m deep)`,
        el.length, el.width, 1.2, el.quantity, 'm³', 'vol', 0, 'L * W * 1.2 * Qty'
      );

      addTakeoffRow(
        `PCC M10 (1:3:6) bedding under footing of ${el.name} (100mm thick)`,
        el.length, el.width, 0.1, el.quantity, 'm³', 'vol', 0, 'L * W * 0.1 * Qty'
      );

      addTakeoffRow(
        `RCC M20 (1:1.5:3) concrete in footing of ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'm³', 'vol', 0, 'L * W * H * Qty'
      );

      addTakeoffRow(
        `Steel reinforcement for footing of ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'kg', 'steel', 0, 'Vol * 80 kg/m³'
      );

      addTakeoffRow(
        `Plywood formwork for footing of ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'm²', 'formwork_footing', 0, '2 * (L + W) * H * Qty'
      );

      addTakeoffRow(
        `Brickwork in cement mortar (9") below ground level for ${el.name}`,
        el.length, el.width, 0.9, el.quantity, 'm³', 'vol', 0, 'L * W * 0.9 * Qty'
      );

      addTakeoffRow(
        `Damp Proof Course (50mm thick) for plinth of ${el.name}`,
        el.length, el.width, 1, el.quantity, 'm²', 'area', 0, 'L * W * Qty'
      );

      addTakeoffRow(
        `Sand filling under foundation/plinth of ${el.name} (0.6m deep)`,
        el.length, el.width, 0.6, el.quantity, 'm³', 'vol', 0, 'L * W * 0.6 * Qty'
      );
    }
    else if (el.type === 'slab') {
      addTakeoffRow(
        `PCC M10 (1:3:6) floor bedding under slab of ${el.name} (100mm thick)`,
        el.length, el.width, 0.1, el.quantity, 'm³', 'vol', 0, 'L * W * 0.1 * Qty'
      );

      addTakeoffRow(
        `Cement screed bed (50mm thick) for flooring of ${el.name}`,
        el.length, el.width, 0.05, el.quantity, 'm³', 'vol', 0, 'L * W * 0.05 * Qty'
      );

      addTakeoffRow(
        `Vitrified floor tiles with adhesive for slab ${el.name}`,
        el.length, el.width, 1, el.quantity, 'm²', 'area', 0, 'L * W * Qty'
      );

      addTakeoffRow(
        `RCC M20 (1:1.5:3) concrete in roof slab of ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'm³', 'vol', 0, 'L * W * H * Qty'
      );

      addTakeoffRow(
        `Steel reinforcement for roof slab of ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'kg', 'steel', 0, 'Vol * 80 kg/m³'
      );

      addTakeoffRow(
        `Plywood formwork (bottom shuttering) for slab of ${el.name}`,
        el.length, el.width, 1, el.quantity, 'm²', 'area', 0, 'L * W * Qty'
      );

      addTakeoffRow(
        `Cement plaster 12mm (1:6) to ceiling of slab ${el.name}`,
        el.length, el.width, 1, el.quantity, 'm²', 'area', 0, 'L * W * Qty'
      );

      addTakeoffRow(
        `Bituminous membrane waterproofing to top of slab ${el.name}`,
        el.length, el.width, 1, el.quantity, 'm²', 'area', 0, 'L * W * Qty'
      );
    }
    else if (el.type === 'wall' || el.type === 'parapet') {
      const deductions = getLocalWallDeductions(el.name, elements);

      addTakeoffRow(
        `Brickwork in cement mortar (${is9Inch ? '9"' : '4.5"'}) for wall ${el.name} (deducting openings)`,
        el.length, el.width, el.height, el.quantity, is9Inch ? 'm³' : 'm²',
        is9Inch ? 'vol' : 'area_wall',
        is9Inch ? deductions.volume : deductions.area,
        is9Inch ? 'L * W * H * Qty - Deductions' : 'L * H * Qty - Deductions'
      );

      addTakeoffRow(
        `Cement plaster 12mm (1:6) to wall ${el.name} on both sides (deducting openings)`,
        el.length, el.width, el.height, el.quantity, 'm²',
        'plaster_wall',
        deductions.area * 2,
        'L * H * Qty * 2 - Deductions'
      );
    }
    else if (['column', 'beam', 'lintel', 'staircase', 'plinth'].includes(el.type)) {
      const steelRatio = el.type === 'column' ? 180 : el.type === 'beam' ? 120 : 100;

      addTakeoffRow(
        `RCC M20 (1:1.5:3) concrete in ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'm³', 'vol', 0, 'L * W * H * Qty'
      );

      addTakeoffRow(
        `Steel reinforcement for ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'kg',
        el.type === 'column' ? 'steel_column' : el.type === 'beam' ? 'steel_beam' : 'steel_other',
        0,
        `Vol * ${steelRatio} kg/m³`
      );

      addTakeoffRow(
        `Plywood formwork for ${el.name}`,
        el.length, el.width, el.height, el.quantity, 'm²',
        el.type === 'column' ? 'formwork_column' : el.type === 'beam' ? 'formwork_beam' : el.type === 'plinth' || el.type === 'lintel' ? 'formwork_plinth' : 'area',
        0,
        el.type === 'column' ? '2*(L+W)*H*Qty' : el.type === 'beam' ? '(2*H+W)*L*Qty' : 'Formwork Area'
      );
    }
    else if (el.type === 'door') {
      addTakeoffRow(
        `Flush door supply and installation for ${el.name}`,
        1, 1, 1, el.quantity, 'nos', 'qty', 0, 'Qty'
      );

      addTakeoffRow(
        `Enamel painting on door surfaces for ${el.name} (both sides)`,
        el.length, el.width, el.height, el.quantity, 'm²', 'paint_door', 0, 'L * H * Qty * 2'
      );
    }
    else if (el.type === 'window') {
      addTakeoffRow(
        `Wooden window supply and installation for ${el.name}`,
        1, 1, 1, el.quantity, 'nos', 'qty', 0, 'Qty'
      );
    }
  });

  const takeoffSheet = XLSX.utils.aoa_to_sheet(takeoffData);
  takeoffSheet['!cols'] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 45 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 25 }
  ];
  takeoffSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

  // ---- 3. Build "Detailed BOQ" Sheet with Formulas ----
  const detailedData: any[][] = [
    ['DETAILED BILL OF QUANTITIES'],
    [],
    ['S.No', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount', 'Rate Reference'],
  ];

  let currentExcelRow = 3; // header row is row 3
  let itemCounter = 0;
  const sectionSubtotals: { sectionTitle: string; rowNum: number }[] = [];

  boqSections.forEach((section) => {
    // Section header row
    detailedData.push([`--- ${section.title} ---`, '', '', '', '', '', '']);
    currentExcelRow++;

    const firstItemRow = currentExcelRow + 1;

    section.items.forEach((item) => {
      itemCounter++;
      currentExcelRow++;

      const key = item.materialName || item.description;

      // VLOOKUP rate from MasterRates using the exact Rate Reference cell (column G)
      const rateFormula = `VLOOKUP(G${currentExcelRow}, 'MasterRates'!A:C, 2, FALSE)`;
      const amountFormula = `D${currentExcelRow}*E${currentExcelRow}`;

      // Quantities reference the cells in the Takeoff Calculations sheet dynamically if available!
      const takeoffCellRef = descriptionToCellMap.get(item.description);
      const qtyCell = takeoffCellRef ? { t: 'n', f: takeoffCellRef, v: item.quantity } : item.quantity;

      detailedData.push([
        itemCounter,
        item.description,
        item.unit,
        qtyCell,
        { t: 'n', f: rateFormula, v: item.rate },
        { t: 'n', f: amountFormula, v: item.amount },
        key // column G: Rate Reference
      ]);
    });

    const lastItemRow = currentExcelRow;
    currentExcelRow++; // Subtotal row

    const subtotalFormula = firstItemRow <= lastItemRow 
      ? `SUM(F${firstItemRow}:F${lastItemRow})` 
      : '0';

    detailedData.push([
      '', '', '', '', 'Subtotal:',
      { t: 'n', f: subtotalFormula, v: section.items.reduce((s, i) => s + i.amount, 0) },
      ''
    ]);

    sectionSubtotals.push({
      sectionTitle: section.title,
      rowNum: currentExcelRow
    });

    detailedData.push([]);
    currentExcelRow++;
  });

  // GRAND TOTAL row in Detailed BOQ
  currentExcelRow++;
  const grandTotalFormula = `SUMIF(E4:E${currentExcelRow - 1}, "Subtotal:", F4:F${currentExcelRow - 1})`;
  const precalculatedGrandTotal = boqSections.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.amount, 0), 0);

  detailedData.push([
    '', '', '', '', 'GRAND TOTAL:',
    { t: 'n', f: grandTotalFormula, v: precalculatedGrandTotal },
    ''
  ]);
  const grandTotalDetailedRow = currentExcelRow;

  const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
  detailedSheet['!cols'] = [
    { wch: 8 },
    { wch: 50 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 30 }
  ];
  detailedSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

  // ---- 4. Build "Summary" Sheet with Formulas ----
  const summaryData: any[][] = [
    ['BILL OF QUANTITIES - SUMMARY'],
    [],
    ['Project:', config.projectTitle],
    ['Client:', config.clientName],
    ['Location:', config.location],
    ['Date:', config.date],
    ['Prepared By:', config.preparedBy || 'Moawia Husnain'],
    ['Currency:', `${config.currency.name} (${config.currency.symbol})`],
    [],
    ['Section', 'Description', 'Subtotal'],
  ];

  let summaryExcelRow = 10;
  sectionSubtotals.forEach((sec, idx) => {
    summaryExcelRow++;
    // Reference subtotal cell in Detailed BOQ sheet
    const subtotalRef = `'Detailed BOQ'!F${sec.rowNum}`;
    const subtotalVal = boqSections.find(s => s.title === sec.sectionTitle)?.items.reduce((s, i) => s + i.amount, 0) || 0;

    summaryData.push([
      idx + 1,
      sec.sectionTitle,
      { t: 'n', f: subtotalRef, v: subtotalVal }
    ]);
  });

  summaryData.push([]);
  summaryExcelRow++;

  summaryData.push([
    '',
    'GRAND TOTAL',
    { t: 'n', f: `'Detailed BOQ'!F${grandTotalDetailedRow}`, v: precalculatedGrandTotal }
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 10 },
    { wch: 45 },
    { wch: 20 },
  ];
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  // ---- 5. Build "Material Breakdown" Sheet with Formulas ----
  const materialTotals = new Map<string, { quantity: number; unit: string; rate: number }>();

  elements.forEach(el => {
    let deductions = { area: 0, volume: 0 };
    if (['wall', 'parapet'].includes(el.type)) {
      deductions = getLocalWallDeductions(el.name, elements);
    }
    
    const elementBreakdown = generateMaterialBreakdown(
      el.type, 
      el.length, 
      el.width, 
      el.height, 
      el.quantity, 
      'M20', 
      deductions
    );
    
    elementBreakdown.forEach(mb => {
      const mat = materials.find(m => m.name.toLowerCase() === mb.material.toLowerCase() || 
                                      mb.material.toLowerCase().includes(m.name.toLowerCase()) || 
                                      m.name.toLowerCase().includes(mb.material.toLowerCase()));
      const matName = mat ? mat.name : mb.material;
      const matUnit = mat ? mat.unit : mb.unit;
      const matRate = mat ? mat.rate * (config.currency.rate || 1) : mb.rate;
      
      const existing = materialTotals.get(matName);
      if (existing) {
        existing.quantity += mb.quantity;
      } else {
        materialTotals.set(matName, { quantity: mb.quantity, unit: matUnit, rate: matRate });
      }
    });
  });

  const matData: any[][] = [
    ['MATERIAL BREAKDOWN'],
    [],
    ['Material', 'Quantity', 'Unit', 'Rate', 'Total'],
  ];

  let matExcelRow = 3;
  let matGrandTotal = 0;
  
  materialTotals.forEach((val, key) => {
    matExcelRow++;
    const rateFormula = `VLOOKUP(A${matExcelRow}, 'MasterRates'!A:C, 2, FALSE)`;
    const totalFormula = `B${matExcelRow}*D${matExcelRow}`;
    const totalVal = val.quantity * val.rate;
    matGrandTotal += totalVal;

    // Use SUMIF formula referencing Detailed BOQ quantities
    const qtyFormula = getMaterialQtyFormula(key);
    const qtyCell = qtyFormula 
      ? { t: 'n', f: qtyFormula, v: val.quantity } 
      : parseFloat(val.quantity.toFixed(3));

    matData.push([
      key,
      qtyCell,
      val.unit,
      { t: 'n', f: rateFormula, v: val.rate },
      { t: 'n', f: totalFormula, v: totalVal }
    ]);
  });

  matData.push([]);
  matExcelRow++;

  matData.push([
    '', '', '', 'TOTAL:',
    { t: 'n', f: `SUM(E4:E${matExcelRow - 1})`, v: matGrandTotal }
  ]);

  const matSheet = XLSX.utils.aoa_to_sheet(matData);
  matSheet['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
  ];
  matSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  // ---- Append all sheets to Workbook ----
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, detailedSheet, 'Detailed BOQ');
  XLSX.utils.book_append_sheet(wb, takeoffSheet, 'Takeoff Calculations');
  XLSX.utils.book_append_sheet(wb, masterRatesSheet, 'MasterRates');
  XLSX.utils.book_append_sheet(wb, matSheet, 'Material Breakdown');

  // ---- Download ----
  const fileName = `BOQ_${config.projectTitle.replace(/\s+/g, '_')}_${config.date}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Parse an uploaded Excel/CSV file and extract BOQ data
 */
export function parseExcelFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse an uploaded CSV rate sheet
 */
export function parseRateSheet(file: File): Promise<Array<{ name: string; unit: string; rate: number }>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(firstSheet);

        const rates = rows.map((row) => ({
          name: String(row['Name'] || row['name'] || row['Material'] || row['material'] || row['Description'] || ''),
          unit: String(row['Unit'] || row['unit'] || ''),
          rate: Number(row['Rate'] || row['rate'] || row['Price'] || row['price'] || 0),
        })).filter(r => r.name && r.rate > 0);

        resolve(rates);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
