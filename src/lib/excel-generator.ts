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

  const masterRatesData: (string | number)[][] = [
    ['Material / Item Name', 'Rate', 'Unit']
  ];
  uniqueMaterials.forEach(m => {
    masterRatesData.push([m.name, m.rate, m.unit]);
  });
  const masterRatesSheet = XLSX.utils.aoa_to_sheet(masterRatesData);
  masterRatesSheet['!cols'] = [
    { wch: 45 },
    { wch: 15 },
    { wch: 10 }
  ];

  // ---- 2. Build "Detailed BOQ" Sheet with Formulas ----
  const detailedData: any[][] = [
    ['DETAILED BILL OF QUANTITIES'],
    [],
    ['S.No', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount'],
  ];

  let currentExcelRow = 3; // header row is row 3
  let itemCounter = 0;
  const sectionSubtotals: { sectionTitle: string; rowNum: number }[] = [];

  boqSections.forEach((section) => {
    // Section header row
    detailedData.push([`--- ${section.title} ---`, '', '', '', '', '']);
    currentExcelRow++;

    const firstItemRow = currentExcelRow + 1;

    section.items.forEach((item) => {
      itemCounter++;
      currentExcelRow++;

      const key = item.materialName || item.description;
      const escapedKey = key.replace(/"/g, '""');
      
      // XLOOKUP rate from MasterRates, Amount = Qty * Rate
      const rateFormula = `XLOOKUP("${escapedKey}", MasterRates!A:A, MasterRates!B:B)`;
      const amountFormula = `D${currentExcelRow}*E${currentExcelRow}`;

      detailedData.push([
        itemCounter,
        item.description,
        item.unit,
        item.quantity,
        { t: 'n', f: rateFormula, v: item.rate },
        { t: 'n', f: amountFormula, v: item.amount }
      ]);
    });

    const lastItemRow = currentExcelRow;
    currentExcelRow++; // Subtotal row

    const subtotalFormula = firstItemRow <= lastItemRow 
      ? `SUM(F${firstItemRow}:F${lastItemRow})` 
      : '0';

    detailedData.push([
      '', '', '', '', 'Subtotal:',
      { t: 'n', f: subtotalFormula, v: section.items.reduce((s, i) => s + i.amount, 0) }
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
    { t: 'n', f: grandTotalFormula, v: precalculatedGrandTotal }
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
  ];
  detailedSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // ---- 3. Build "Summary" Sheet with Formulas ----
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

  // ---- 4. Build "Material Breakdown" Sheet with Formulas ----
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
    const escapedKey = key.replace(/"/g, '""');
    const rateFormula = `XLOOKUP("${escapedKey}", MasterRates!A:A, MasterRates!B:B)`;
    const totalFormula = `B${matExcelRow}*D${matExcelRow}`;
    const totalVal = val.quantity * val.rate;
    matGrandTotal += totalVal;

    matData.push([
      key,
      parseFloat(val.quantity.toFixed(3)),
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
