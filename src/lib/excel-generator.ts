// ============================================
// CivilEstimator Pro — Excel Export Generator
// ============================================

import * as XLSX from 'xlsx';
import { BOQSection, ReportConfig, MaterialBreakdown } from './types';

/**
 * Generate and download BOQ as Excel file
 */
export function downloadBOQExcel(
  config: ReportConfig,
  boqSections: BOQSection[],
  materialBreakdown?: MaterialBreakdown[]
): void {
  const wb = XLSX.utils.book_new();

  // ---- Sheet 1: BOQ Summary ----
  const summaryData: (string | number)[][] = [
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

  let grandTotal = 0;
  boqSections.forEach((section, idx) => {
    const subtotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    grandTotal += subtotal;
    summaryData.push([idx + 1, section.title, subtotal]);
  });

  summaryData.push([]);
  summaryData.push(['', 'GRAND TOTAL', grandTotal]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet['!cols'] = [
    { wch: 10 },
    { wch: 45 },
    { wch: 20 },
  ];

  // Merge title cell
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // ---- Sheet 2: Detailed BOQ ----
  const detailedData: (string | number)[][] = [
    ['DETAILED BILL OF QUANTITIES'],
    [],
    ['S.No', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount'],
  ];

  let itemCounter = 0;
  boqSections.forEach((section) => {
    // Section header row
    detailedData.push([`--- ${section.title} ---`, '', '', '', '', '']);

    section.items.forEach((item) => {
      itemCounter++;
      detailedData.push([
        itemCounter,
        item.description,
        item.unit,
        item.quantity,
        item.rate,
        item.amount,
      ]);
    });

    const subtotal = section.items.reduce((sum, item) => sum + item.amount, 0);
    detailedData.push(['', '', '', '', 'Subtotal:', subtotal]);
    detailedData.push([]);
  });

  detailedData.push(['', '', '', '', 'GRAND TOTAL:', grandTotal]);

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

  XLSX.utils.book_append_sheet(wb, detailedSheet, 'Detailed BOQ');

  // ---- Sheet 3: Material Breakdown ----
  if (materialBreakdown && materialBreakdown.length > 0) {
    const matData: (string | number)[][] = [
      ['MATERIAL BREAKDOWN'],
      [],
      ['Material', 'Quantity', 'Unit', 'Rate', 'Total'],
    ];

    let matTotal = 0;
    materialBreakdown.forEach((mb) => {
      matData.push([mb.material, mb.quantity, mb.unit, mb.rate, mb.total]);
      matTotal += mb.total;
    });

    matData.push([]);
    matData.push(['', '', '', 'TOTAL:', matTotal]);

    const matSheet = XLSX.utils.aoa_to_sheet(matData);
    matSheet['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 18 },
    ];
    matSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    XLSX.utils.book_append_sheet(wb, matSheet, 'Material Breakdown');
  }

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
