// ============================================
// CivilEstimator Pro — Premium PDF Report Generator
// Engineer: Moawia Husnain | UET Taxila, Pakistan
// ============================================

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BOQSection, ReportConfig, MaterialBreakdown } from './types';
import { formatNumber } from './calculations';

// ── Brand Identity ──────────────────────────────────────────
const BRAND = {
  name:       'CivilEstimator Pro',
  engineer:   'Moawia Husnain',
  title:      'Civil Engineering Student',
  university: 'UET Taxila, Pakistan',
  phone:      '+92 326 691 5744',
  email:      'moawiahussnaing@gmail.com',
  tagline:    'Professional Quantity Surveying & Cost Estimation',
};

// ── Color Palette ─────────────────────────────────────────
const C = {
  navy:       [10,  22,  40]   as [number,number,number],
  navyMid:    [18,  46,  84]   as [number,number,number],
  gold:       [212, 160,  23]  as [number,number,number],
  goldLight:  [255, 215, 100]  as [number,number,number],
  white:      [255, 255, 255]  as [number,number,number],
  offWhite:   [248, 249, 251]  as [number,number,number],
  lightBlue:  [235, 242, 255]  as [number,number,number],
  textDark:   [15,  20,  35]   as [number,number,number],
  textGray:   [90,  100, 120]  as [number,number,number],
  border:     [200, 210, 225]  as [number,number,number],
  rowAlt:     [245, 248, 255]  as [number,number,number],
  success:    [16,  130,  80]  as [number,number,number],
  danger:     [180,  40,  40]  as [number,number,number],
};

// ── Helpers ───────────────────────────────────────────────

function pageSetup(doc: jsPDF) {
  return {
    w:  doc.internal.pageSize.getWidth(),
    h:  doc.internal.pageSize.getHeight(),
    ml: 14,   // margin left
    mr: 14,   // margin right
    get cw() { return this.w - this.ml - this.mr; },
  };
}

function hrLine(
  doc: jsPDF,
  y: number,
  x1: number,
  x2: number,
  color: [number,number,number] = C.border,
  lw = 0.3
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

function pageNumber(doc: jsPDF, p: ReturnType<typeof pageSetup>, n: number, total: number) {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textGray);
  doc.text(`Page ${n} of ${total}`, p.w / 2, p.h - 6, { align: 'center' });
}

// ── Cover Page Footer ─────────────────────────────────────

function drawFooterBar(doc: jsPDF, p: ReturnType<typeof pageSetup>) {
  // Gold accent bar at bottom
  doc.setFillColor(...C.gold);
  doc.rect(0, p.h - 14, p.w, 14, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text(BRAND.name, p.ml, p.h - 5);

  doc.setFont('helvetica', 'normal');
  doc.text(
    `${BRAND.engineer}  ·  ${BRAND.phone}  ·  ${BRAND.email}`,
    p.w / 2,
    p.h - 5,
    { align: 'center' }
  );

  const date = new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(date, p.w - p.mr, p.h - 5, { align: 'right' });
}

// ── Page Header (for internal pages) ─────────────────────

function drawPageHeader(
  doc: jsPDF,
  p: ReturnType<typeof pageSetup>,
  projectName: string
): number {
  // Navy top bar
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, p.w, 18, 'F');

  // Gold left accent
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, 5, 18, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(BRAND.name.toUpperCase(), 12, 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND.tagline, 12, 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(projectName, p.w - p.mr, 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Bill of Quantities', p.w - p.mr, 13, { align: 'right' });

  return 22; // yPos after header
}

// ── Main Export Function ──────────────────────────────────

export function generateBOQPdf(
  config: ReportConfig,
  boqSections: BOQSection[],
  materialBreakdown?: MaterialBreakdown[],
  notes?: string
): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const p   = pageSetup(doc);

  // =====================================================
  // PAGE 1 — COVER PAGE
  // =====================================================

  // Full navy background
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, p.w, p.h, 'F');

  // Decorative diagonal gold band (top-right)
  doc.setFillColor(...C.gold);
  doc.triangle(p.w - 80, 0, p.w, 0, p.w, 90, 'F');

  // Thin gold stripe on left
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, 6, p.h, 'F');

  // ── Logo circle ──
  const cx = p.ml + 22;
  const cy = 52;

  // outer glow ring
  doc.setFillColor(255, 200, 50, 0.15);
  doc.circle(cx, cy, 19, 'F');

  // main circle
  doc.setFillColor(...C.gold);
  doc.circle(cx, cy, 16, 'F');

  // MH monogram
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.navy);
  doc.text('MH', cx, cy + 3, { align: 'center' });

  // ── Name & Title block ──
  const textX = p.ml + 46;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...C.white);
  doc.text('MOAWIA HUSNAIN', textX, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.gold);
  doc.text('Civil Engineering Student  ·  UET Taxila, Pakistan', textX, 52);

  doc.setFontSize(9);
  doc.setTextColor(180, 190, 210);
  doc.text(`${BRAND.phone}   |   ${BRAND.email}`, textX, 60);

  // Separator line
  hrLine(doc, 70, p.ml, p.w - p.mr, C.gold, 0.8);

  // ── Document Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...C.white);
  doc.text('BILL OF', p.ml + 6, 94);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...C.gold);
  doc.text('QUANTITIES', p.ml + 6, 108);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(160, 180, 210);
  doc.text('& COST ESTIMATION REPORT', p.ml + 6, 118);

  hrLine(doc, 124, p.ml, p.w - p.mr, [60, 80, 120], 0.4);

  // ── Project Info Card ──
  const cardY = 132;
  const cardH = 66;

  // card background
  doc.setFillColor(20, 38, 68);
  doc.roundedRect(p.ml, cardY, p.cw, cardH, 4, 4, 'F');

  // gold top bar on card
  doc.setFillColor(...C.gold);
  doc.roundedRect(p.ml, cardY, p.cw, 8, 4, 4, 'F');
  doc.rect(p.ml, cardY + 4, p.cw, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.navy);
  doc.text('PROJECT INFORMATION', p.ml + 8, cardY + 5.5);

  const infoRows = [
    ['Project Name',  config.projectName  || '—'],
    ['Client',        config.clientName   || '—'],
    ['Location',      config.location     || '—'],
    ['Project Value', config.totalValue   ? `PKR ${formatNumber(config.totalValue)}` : '—'],
    ['Prepared By',   BRAND.engineer],
    ['Date',          new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })],
  ];

  let iy = cardY + 16;
  infoRows.forEach(([label, value], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255, 0.04);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text(`${label}:`, p.ml + 8, iy);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text(String(value), p.ml + 52, iy);

    iy += 9;
  });

  // ── Total Summary Banner ──
  const bannerY = cardY + cardH + 14;
  doc.setFillColor(...C.gold);
  doc.roundedRect(p.ml, bannerY, p.cw, 24, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.navy);
  doc.text('TOTAL PROJECT VALUE', p.ml + 8, bannerY + 10);

  doc.setFontSize(18);
  if (config.totalValue) {
    doc.text(`PKR ${formatNumber(config.totalValue)}`, p.ml + 8, bannerY + 20);
  } else {
    doc.text('See Summary Inside', p.ml + 8, bannerY + 20);
  }

  // Confidential note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 130, 170);
  doc.text(
    'This document is prepared for estimation purposes only. Actual costs may vary.',
    p.w / 2,
    p.h - 22,
    { align: 'center' }
  );

  // Bottom footer bar
  doc.setFillColor(...C.gold);
  doc.rect(0, p.h - 14, p.w, 14, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text(BRAND.name.toUpperCase(), p.ml + 6, p.h - 5);
  doc.text('CONFIDENTIAL ESTIMATION REPORT', p.w / 2, p.h - 5, { align: 'center' });
  doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`, p.w - p.mr, p.h - 5, { align: 'right' });

  // =====================================================
  // PAGE 2 — BOQ SECTIONS
  // =====================================================

  doc.addPage();
  let yPos = drawPageHeader(doc, p, config.projectName || 'Project');

  // Section title
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.navy);
  doc.text('DETAILED BILL OF QUANTITIES', p.ml, yPos);

  yPos += 2;
  hrLine(doc, yPos, p.ml, p.w - p.mr, C.gold, 0.8);
  yPos += 6;

  let grandTotal = 0;
  let pageCount  = 2;

  boqSections.forEach((section, sIdx) => {
    if (!section) return; // skip null/undefined sections

    const sectionName  = section.name  || `Section ${sIdx + 1}`;
    const sectionItems = Array.isArray(section.items) ? section.items : [];

    // Check page overflow
    if (yPos > p.h - 50) {
      drawFooterBar(doc, p);
      pageNumber(doc, p, pageCount++, pageCount + 1);
      doc.addPage();
      yPos = drawPageHeader(doc, p, config.projectName || 'Project');
      yPos += 6;
    }

    // Section header block
    doc.setFillColor(...C.navyMid);
    doc.roundedRect(p.ml, yPos, p.cw, 9, 2, 2, 'F');

    doc.setFillColor(...C.gold);
    doc.roundedRect(p.ml, yPos, 4, 9, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(`${sIdx + 1}.  ${sectionName.toUpperCase()}`, p.ml + 8, yPos + 6);

    const secTotal = sectionItems.reduce((s, i) => s + ((i?.quantity ?? 0) * (i?.rate ?? 0)), 0);
    doc.text(`PKR ${formatNumber(secTotal)}`, p.w - p.mr, yPos + 6, { align: 'right' });
    grandTotal += secTotal;

    yPos += 12;

    // BOQ table
    const tableRows = sectionItems.map((item, idx) => [
      String(idx + 1),
      item?.description || '—',
      item?.unit        || '—',
      formatNumber(item?.quantity ?? 0),
      formatNumber(item?.rate     ?? 0),
      formatNumber((item?.quantity ?? 0) * (item?.rate ?? 0)),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Description of Work', 'Unit', 'Qty', 'Rate (PKR)', 'Amount (PKR)']],
      body: tableRows,
      margin: { left: p.ml, right: p.mr },
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        textColor: C.textDark,
        lineColor: C.border,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: C.navy,
        textColor: C.white,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center',  cellWidth: 10  },
        1: { halign: 'left',    cellWidth: 'auto' },
        2: { halign: 'center',  cellWidth: 14  },
        3: { halign: 'right',   cellWidth: 20  },
        4: { halign: 'right',   cellWidth: 28  },
        5: { halign: 'right',   cellWidth: 30  },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      didParseCell(data) {
        if (data.row.section === 'head') {
          if (data.column.index === 5) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage() {
        drawFooterBar(doc, p);
      },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  });

  // =====================================================
  // SUMMARY PAGE
  // =====================================================

  doc.addPage();
  pageCount++;
  yPos = drawPageHeader(doc, p, config.projectName || 'Project');
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.navy);
  doc.text('COST SUMMARY', p.ml, yPos);
  yPos += 2;
  hrLine(doc, yPos, p.ml, p.w - p.mr, C.gold, 0.8);
  yPos += 8;

  // Summary table per section
  const summaryRows = boqSections
    .filter((sec) => sec && Array.isArray(sec.items))
    .map((sec, i) => [
      String(i + 1),
      sec.name || `Section ${i + 1}`,
      `PKR ${formatNumber((sec.items || []).reduce((s, it) => s + ((it?.quantity ?? 0) * (it?.rate ?? 0)), 0))}`,
    ]);

  autoTable(doc, {
    startY: yPos,
    head:   [['#', 'Section Description', 'Sub-Total']],
    body:   summaryRows,
    margin: { left: p.ml, right: p.mr },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 50, halign: 'right' },
    },
    alternateRowStyles: { fillColor: C.rowAlt },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Grand Total Box ──
  const contingency = grandTotal * (config.contingency || 0.1);
  const vat         = (grandTotal + contingency) * (config.vatRate || 0.17);
  const finalTotal  = grandTotal + contingency + vat;

  const rows = [
    ['Sub-Total',         formatNumber(grandTotal)],
    [`Contingency (${((config.contingency || 0.1) * 100).toFixed(0)}%)`, formatNumber(contingency)],
    [`GST/VAT (${((config.vatRate || 0.17) * 100).toFixed(0)}%)`, formatNumber(vat)],
  ];

  rows.forEach(([label, amount]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.textDark);
    doc.text(label, p.w - p.mr - 80, yPos);
    doc.text(`PKR ${amount}`, p.w - p.mr, yPos, { align: 'right' });
    yPos += 8;
  });

  hrLine(doc, yPos, p.w - p.mr - 80, p.w - p.mr, C.navy, 0.5);
  yPos += 4;

  // Grand total banner
  doc.setFillColor(...C.navy);
  doc.roundedRect(p.w - p.mr - 90, yPos, 90, 16, 3, 3, 'F');

  doc.setFillColor(...C.gold);
  doc.roundedRect(p.w - p.mr - 90, yPos, 6, 16, 2, 2, 'F');
  doc.rect(p.w - p.mr - 84, yPos, 6, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.gold);
  doc.text('GRAND TOTAL', p.w - p.mr - 78, yPos + 6);

  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.text(`PKR ${formatNumber(finalTotal)}`, p.w - p.mr - 78, yPos + 13);

  yPos += 28;

  // ── Material Breakdown (if provided) ──
  if (materialBreakdown && materialBreakdown.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.navy);
    doc.text('MATERIAL BREAKDOWN', p.ml, yPos);
    yPos += 2;
    hrLine(doc, yPos, p.ml, p.w - p.mr, C.gold, 0.6);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head:   [['Material', 'Quantity', 'Unit', 'Unit Rate (PKR)', 'Total (PKR)']],
      body:   materialBreakdown.map((m) => [
        m.material,
        formatNumber(m.quantity),
        m.unit,
        formatNumber(m.unitRate),
        formatNumber(m.totalCost),
      ]),
      margin: { left: p.ml, right: p.mr },
      styles: { fontSize: 8.5, cellPadding: 3.5 },
      headStyles: { fillColor: C.navyMid, textColor: C.white, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 28 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'right', cellWidth: 36 },
        4: { halign: 'right', cellWidth: 36 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Notes ──
  if (notes) {
    if (yPos > p.h - 70) {
      drawFooterBar(doc, p);
      doc.addPage();
      pageCount++;
      yPos = drawPageHeader(doc, p, config.projectName || 'Project');
      yPos += 8;
    }

    doc.setFillColor(...C.lightBlue);
    doc.roundedRect(p.ml, yPos, p.cw, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.navy);
    doc.text('NOTES & ASSUMPTIONS', p.ml + 4, yPos + 5.5);
    yPos += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    const lines = doc.splitTextToSize(notes, p.cw);
    doc.text(lines, p.ml, yPos);
    yPos += lines.length * 5 + 10;
  }

  // ── Signature Block ──
  if (yPos > p.h - 65) {
    drawFooterBar(doc, p);
    doc.addPage();
    pageCount++;
    yPos = drawPageHeader(doc, p, config.projectName || 'Project');
    yPos += 10;
  }

  yPos = Math.max(yPos, p.h - 70);

  hrLine(doc, yPos, p.ml, p.w - p.mr, C.border);
  yPos += 10;

  const sigCols = [p.ml, p.ml + p.cw / 3, p.ml + (2 * p.cw) / 3];
  const sigLabels  = ['Prepared By', 'Checked By', 'Approved By'];
  const sigNames   = [BRAND.engineer, '_______________', '_______________'];
  const sigTitles  = ['Quantity Surveyor', '', ''];

  sigCols.forEach((sx, i) => {
    hrLine(doc, yPos + 18, sx + 2, sx + 52, C.navy, 0.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textGray);
    doc.text(sigLabels[i].toUpperCase(), sx + 2, yPos + 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    doc.text(sigNames[i], sx + 2, yPos + 31);

    if (sigTitles[i]) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.textGray);
      doc.text(sigTitles[i], sx + 2, yPos + 37);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textGray);
    doc.text('Date: _______________', sx + 2, yPos + 44);
  });

  // ── Stamp circle ──
  const stampX = p.w - p.mr - 22;
  const stampY = yPos + 24;
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.6);
  doc.circle(stampX, stampY, 18, 'S');
  doc.setLineWidth(0.3);
  doc.circle(stampX, stampY, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.navy);
  doc.text('OFFICIAL', stampX, stampY - 5, { align: 'center' });
  doc.text('STAMP', stampX, stampY + 1, { align: 'center' });
  doc.setFontSize(5.5);
  doc.text('CIVIL ESTIMATOR', stampX, stampY + 7, { align: 'center' });

  // Final footers
  drawFooterBar(doc, p);

  return doc;
}

// ── Convenience export ───────────────────────────────────

export function downloadBOQPdf(
  config: ReportConfig,
  boqSections: BOQSection[],
  materialBreakdown?: MaterialBreakdown[],
  notes?: string
): void {
  const doc  = generateBOQPdf(config, boqSections, materialBreakdown, notes);
  const name = `BOQ_${(config.projectName || 'Project').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(name);
}
