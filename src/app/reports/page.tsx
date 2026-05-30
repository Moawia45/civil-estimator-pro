// ============================================
// CivilEstimator Pro — Reports & Export Page
// ============================================

'use client';

import React, { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { formatCurrency, formatNumber, generateMaterialBreakdown } from '@/lib/calculations';
import { CURRENCIES } from '@/lib/constants';
import { ReportConfig } from '@/lib/types';
import { downloadBOQPdf } from '@/lib/pdf-generator';
import { downloadBOQExcel } from '@/lib/excel-generator';

export default function ReportsPage() {
  const { project, currency, updateProject } = useProject();
  const [exporting, setExporting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'boq' | 'takeoff'>('boq');

  const grandTotal = project.boqSections.reduce(
    (s, sec) => s + sec.items.reduce((a, i) => a + i.amount, 0), 0
  );

  const totalItems = project.boqSections.reduce((s, sec) => s + sec.items.length, 0);

  const reportConfig: ReportConfig = {
    projectTitle: project.name,
    clientName: project.clientName || 'N/A',
    preparedBy: project.preparedBy || 'Moawia Husnain',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    location: project.location || 'N/A',
    includeBreakdown: true,
    includeNotes: true,
    includeLaborEstimate: true,
    currency: CURRENCIES[project.currency],
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await new Promise(r => setTimeout(r, 500));
      downloadBOQPdf(reportConfig, project.boqSections, [], project.notes);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Error generating PDF. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      await new Promise(r => setTimeout(r, 500));
      downloadBOQExcel(reportConfig, project.boqSections, project.materials, project.elements);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Error generating Excel. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  // Dynamic engineering quantity verification & cross-checks
  const materialBreakdownList = useMemo(() => {
    const uniqueTotals = new Map<string, { quantity: number; unit: string; rate: number }>();

    project.elements.forEach(el => {
      // Find deductions if any
      let deductions = { area: 0, volume: 0 };
      if (['wall', 'parapet'].includes(el.type)) {
        let areaDeduction = 0;
        let volumeDeduction = 0;
        const nameLower = el.name.toLowerCase();
        let direction = "";
        if (nameLower.includes("north")) direction = "north";
        else if (nameLower.includes("south")) direction = "south";
        else if (nameLower.includes("east")) direction = "east";
        else if (nameLower.includes("west")) direction = "west";

        if (direction) {
          project.elements.forEach(subEl => {
            if (subEl.type === 'door' || subEl.type === 'window') {
              if (subEl.name.toLowerCase().includes(direction)) {
                areaDeduction += subEl.length * subEl.height * subEl.quantity;
                volumeDeduction += subEl.length * subEl.width * subEl.height * subEl.quantity;
              }
            }
          });
        }
        deductions = { area: areaDeduction, volume: volumeDeduction };
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
        const mat = project.materials.find(m => m.name.toLowerCase() === mb.material.toLowerCase() || 
                                                mb.material.toLowerCase().includes(m.name.toLowerCase()) || 
                                                m.name.toLowerCase().includes(mb.material.toLowerCase()));
        
        const matName = mat ? mat.name : mb.material;
        const matUnit = mat ? mat.unit : mb.unit;
        const matRate = mat ? mat.rate * currency.rate : mb.rate;

        const existing = uniqueTotals.get(matName);
        if (existing) {
          existing.quantity += mb.quantity;
        } else {
          uniqueTotals.set(matName, { quantity: mb.quantity, unit: matUnit, rate: matRate });
        }
      });
    });

    const list: Array<{ name: string; quantity: number; unit: string; rate: number; total: number }> = [];
    uniqueTotals.forEach((val, key) => {
      list.push({
        name: key,
        quantity: val.quantity,
        unit: val.unit,
        rate: val.rate,
        total: val.quantity * val.rate
      });
    });
    return list;
  }, [project.elements, project.materials, currency.rate]);

  const rawMaterialsTotalCost = materialBreakdownList.reduce((sum, item) => sum + item.total, 0);

  const takeoffItems = useMemo(() => {
    const itemsList: Array<{
      elementName: string;
      elementType: string;
      confidence: number;
      takeoffs: Array<{
        description: string;
        dimensions: string;
        formula: string;
        deduction: number;
        netQty: number;
        unit: string;
      }>;
    }> = [];

    project.elements.forEach(el => {
      const is9Inch = el.width > 0.15;
      const confidenceVal = el.confidence !== undefined ? el.confidence : 1.0;
      const takeoffs: Array<{
        description: string;
        dimensions: string;
        formula: string;
        deduction: number;
        netQty: number;
        unit: string;
      }> = [];

      const l = el.length;
      const w = el.width;
      const h = el.height;
      const q = el.quantity;
      const volVal = l * w * h * q;
      const areaVal = l * w * q;

      if (el.type === 'footing' || el.type === 'foundation') {
        takeoffs.push({
          description: 'Foundation Excavation (1.2m depth)',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × 1.20m × ${q}`,
          formula: 'L × W × 1.2 × Qty',
          deduction: 0,
          netQty: l * w * 1.2 * q,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'PCC M10 Bedding (100mm)',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × 0.10m × ${q}`,
          formula: 'L × W × 0.1 × Qty',
          deduction: 0,
          netQty: l * w * 0.1 * q,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'RCC Footing Concrete',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${h.toFixed(2)}m × ${q}`,
          formula: 'L × W × H × Qty',
          deduction: 0,
          netQty: volVal,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'Footing Reinforcement Steel',
          dimensions: `${volVal.toFixed(3)}m³ concrete × 80 kg/m³`,
          formula: 'Vol × 80',
          deduction: 0,
          netQty: volVal * 80,
          unit: 'kg'
        });
        takeoffs.push({
          description: 'Footing Plywood Formwork',
          dimensions: `2 × (${l.toFixed(2)}m + ${w.toFixed(2)}m) × ${h.toFixed(2)}m × ${q}`,
          formula: '2 × (L + W) × H × Qty',
          deduction: 0,
          netQty: 2 * (l + w) * h * q,
          unit: 'm²'
        });
        takeoffs.push({
          description: 'Plinth Brickwork Masonry (0.9m)',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × 0.90m × ${q}`,
          formula: 'L × W × 0.9 × Qty',
          deduction: 0,
          netQty: l * w * 0.9 * q,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'Damp Proof Course (DPC)',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${q}`,
          formula: 'L × W × Qty',
          deduction: 0,
          netQty: areaVal,
          unit: 'm²'
        });
        takeoffs.push({
          description: 'Plinth Sand Filling (0.6m)',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × 0.60m × ${q}`,
          formula: 'L × W × 0.6 × Qty',
          deduction: 0,
          netQty: l * w * 0.6 * q,
          unit: 'm³'
        });
      }
      else if (el.type === 'slab') {
        takeoffs.push({
          description: 'Floor PCC Bedding (100mm)',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × 0.10m × ${q}`,
          formula: 'L × W × 0.1 × Qty',
          deduction: 0,
          netQty: l * w * 0.1 * q,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'Cement Screed Bed (50mm)',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × 0.05m × ${q}`,
          formula: 'L × W × 0.05 × Qty',
          deduction: 0,
          netQty: l * w * 0.05 * q,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'Vitrified Floor Tiles',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${q}`,
          formula: 'L × W × Qty',
          deduction: 0,
          netQty: areaVal,
          unit: 'm²'
        });
        takeoffs.push({
          description: 'RCC Slab Concrete',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${h.toFixed(2)}m × ${q}`,
          formula: 'L × W × H × Qty',
          deduction: 0,
          netQty: volVal,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'Roof Slab Reinforcement Steel',
          dimensions: `${volVal.toFixed(3)}m³ concrete × 80 kg/m³`,
          formula: 'Vol × 80',
          deduction: 0,
          netQty: volVal * 80,
          unit: 'kg'
        });
        takeoffs.push({
          description: 'Slab Bottom Formwork',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${q}`,
          formula: 'L × W × Qty',
          deduction: 0,
          netQty: areaVal,
          unit: 'm²'
        });
        takeoffs.push({
          description: 'Ceiling Plaster 12mm',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${q}`,
          formula: 'L × W × Qty',
          deduction: 0,
          netQty: areaVal,
          unit: 'm²'
        });
        takeoffs.push({
          description: 'Bituminous Membrane Waterproofing',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${q}`,
          formula: 'L × W × Qty',
          deduction: 0,
          netQty: areaVal,
          unit: 'm²'
        });
      }
      else if (el.type === 'wall' || el.type === 'parapet') {
        let areaDeduction = 0;
        let volumeDeduction = 0;
        const nameLower = el.name.toLowerCase();
        let direction = "";
        if (nameLower.includes("north")) direction = "north";
        else if (nameLower.includes("south")) direction = "south";
        else if (nameLower.includes("east")) direction = "east";
        else if (nameLower.includes("west")) direction = "west";

        if (direction) {
          project.elements.forEach(subEl => {
            if (subEl.type === 'door' || subEl.type === 'window') {
              if (subEl.name.toLowerCase().includes(direction)) {
                areaDeduction += subEl.length * subEl.height * subEl.quantity;
                volumeDeduction += subEl.length * subEl.width * subEl.height * subEl.quantity;
              }
            }
          });
        }

        takeoffs.push({
          description: `Superstructure Brickwork (${is9Inch ? '9" Full Wall' : '4.5" Half Wall'})`,
          dimensions: is9Inch 
            ? `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${h.toFixed(2)}m × ${q}` 
            : `${l.toFixed(2)}m × ${h.toFixed(2)}m × ${q}`,
          formula: is9Inch ? 'L × W × H × Qty' : 'L × H × Qty',
          deduction: is9Inch ? volumeDeduction : areaDeduction,
          netQty: is9Inch ? (volVal - volumeDeduction) : ((l * h * q) - areaDeduction),
          unit: is9Inch ? 'm³' : 'm²'
        });

        takeoffs.push({
          description: 'Cement Plaster 12mm (Both Sides)',
          dimensions: `${l.toFixed(2)}m × ${h.toFixed(2)}m × ${q} × 2`,
          formula: 'L × H × Qty × 2',
          deduction: areaDeduction * 2,
          netQty: (l * h * q * 2) - (areaDeduction * 2),
          unit: 'm²'
        });
      }
      else if (['column', 'beam', 'lintel', 'staircase', 'plinth'].includes(el.type)) {
        const steelRatio = el.type === 'column' ? 180 : el.type === 'beam' ? 120 : 100;
        takeoffs.push({
          description: 'RCC Structural Concrete',
          dimensions: `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${h.toFixed(2)}m × ${q}`,
          formula: 'L × W × H × Qty',
          deduction: 0,
          netQty: volVal,
          unit: 'm³'
        });
        takeoffs.push({
          description: 'Reinforcement Steel',
          dimensions: `${volVal.toFixed(3)}m³ concrete × ${steelRatio} kg/m³`,
          formula: `Vol × ${steelRatio}`,
          deduction: 0,
          netQty: volVal * steelRatio,
          unit: 'kg'
        });

        let formShutteringDims = '';
        let formShutteringFormula = '';
        let formShutteringQty = 0;
        if (el.type === 'column') {
          formShutteringDims = `2 × (${l.toFixed(2)}m + ${w.toFixed(2)}m) × ${h.toFixed(2)}m × ${q}`;
          formShutteringFormula = '2 × (L + W) × H × Qty';
          formShutteringQty = 2 * (l + w) * h * q;
        } else if (el.type === 'beam') {
          formShutteringDims = `(2 × ${h.toFixed(2)}m + ${w.toFixed(2)}m) × ${l.toFixed(2)}m × ${q}`;
          formShutteringFormula = '(2H + W) × L × Qty';
          formShutteringQty = (2 * h + w) * l * q;
        } else if (el.type === 'staircase') {
          formShutteringDims = `${l.toFixed(2)}m × ${w.toFixed(2)}m × ${q}`;
          formShutteringFormula = 'L × W × Qty';
          formShutteringQty = l * w * q;
        } else {
          formShutteringDims = `2 × ${h.toFixed(2)}m × ${l.toFixed(2)}m × ${q}`;
          formShutteringFormula = '2H × L × Qty';
          formShutteringQty = 2 * h * l * q;
        }

        takeoffs.push({
          description: 'Plywood Formwork',
          dimensions: formShutteringDims,
          formula: formShutteringFormula,
          deduction: 0,
          netQty: formShutteringQty,
          unit: 'm²'
        });
      }
      else if (el.type === 'door') {
        takeoffs.push({
          description: 'Door Frame & Shutters Supply',
          dimensions: `${q} nos`,
          formula: 'Qty',
          deduction: 0,
          netQty: q,
          unit: 'nos'
        });
        takeoffs.push({
          description: 'Enamel Painting (Both Sides)',
          dimensions: `${l.toFixed(2)}m × ${h.toFixed(2)}m × ${q} × 2`,
          formula: 'L × H × Qty × 2',
          deduction: 0,
          netQty: l * h * q * 2,
          unit: 'm²'
        });
      }
      else if (el.type === 'window') {
        takeoffs.push({
          description: 'Window Frame & Glazing Supply',
          dimensions: `${q} nos`,
          formula: 'Qty',
          deduction: 0,
          netQty: q,
          unit: 'nos'
        });
      }

      itemsList.push({
        elementName: el.name,
        elementType: el.type,
        confidence: confidenceVal,
        takeoffs
      });
    });

    return itemsList;
  }, [project.elements]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reports & Export</h1>
        <p>Generate professional BOQ reports in PDF and Excel formats</p>
      </div>

      {/* Export Actions */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📄</div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>PDF Report</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Professional formatted BOQ report with headers, tables, and totals
          </p>
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleExportPDF}
            disabled={exporting === 'pdf' || totalItems === 0}
          >
            {exporting === 'pdf' ? (
              <><span className="spinner" style={{ width: 16, height: 16 }}></span> Generating...</>
            ) : (
              '📄 Download PDF'
            )}
          </button>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>📊</div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Excel Workbook</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Editable Excel file with 5 sheets: Summary, Detailed BOQ, Takeoff Calculations, MasterRates, and Material Breakdown
          </p>
          <button
            className="btn btn-success btn-lg w-full"
            onClick={handleExportExcel}
            disabled={exporting === 'excel' || totalItems === 0}
          >
            {exporting === 'excel' ? (
              <><span className="spinner" style={{ width: 16, height: 16 }}></span> Generating...</>
            ) : (
              '📊 Download Excel'
            )}
          </button>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🖨️</div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Print Report</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Print the BOQ report directly from your browser in a clean format
          </p>
          <button
            className="btn btn-secondary btn-lg w-full"
            onClick={() => window.print()}
            disabled={totalItems === 0}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)' }}>
        <button
          className={`btn ${activeTab === 'boq' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('boq')}
          style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'boq' ? 'none' : '1px solid var(--border-color)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          📋 BOQ Report Preview
        </button>
        <button
          className={`btn ${activeTab === 'takeoff' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('takeoff')}
          style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'takeoff' ? 'none' : '1px solid var(--border-color)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          🔍 Engineering Takeoff & Material Costing
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'boq' ? (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
            👁️ Report Preview
          </h3>

          {totalItems > 0 ? (
            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', border: '1px solid var(--border-color)' }}>
              {/* Report Header */}
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '3px solid var(--accent-primary)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-2)', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  BILL OF QUANTITIES
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>CivilEstimator Pro — Professional Estimation Report</p>
              </div>

              {/* Project Info */}
              <div className="grid-2" style={{ marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
                <div>
                  <InfoLine label="Project" value={project.name} />
                  <InfoLine label="Client" value={project.clientName || 'N/A'} />
                  <InfoLine label="Location" value={project.location || 'N/A'} />
                </div>
                <div>
                  <InfoLine label="Date" value={reportConfig.date} />
                  <InfoLine label="Prepared By" value={project.preparedBy || 'Moawia Husnain'} />
                  <InfoLine label="Currency" value={`${currency.name} (${currency.symbol})`} />
                </div>
              </div>

              {/* BOQ Table */}
              {project.boqSections.map((section, sIdx) => (
                <div key={section.id} style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{
                    background: 'var(--accent-gradient)',
                    color: 'white',
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}>
                    {sIdx + 1}. {section.title}
                  </div>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>S.No</th>
                        <th>Description</th>
                        <th style={{ width: '50px' }}>Unit</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>Qty</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Rate</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, iIdx) => (
                        <tr key={item.id}>
                          <td>{sIdx + 1}.{iIdx + 1}</td>
                          <td>{item.description}</td>
                          <td>{item.unit}</td>
                          <td className="col-number">{formatNumber(item.quantity)}</td>
                          <td className="col-number">{formatCurrency(item.rate, currency.symbol)}</td>
                          <td className="col-number font-bold">{formatCurrency(item.amount, currency.symbol)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--accent-gradient-soft)' }}>
                        <td colSpan={4}></td>
                        <td className="col-number font-bold">Subtotal:</td>
                        <td className="col-number font-bold text-accent">
                          {formatCurrency(section.items.reduce((s, i) => s + i.amount, 0), currency.symbol)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Grand Total */}
              <div className="boq-grand-total" style={{ marginTop: 'var(--space-6)' }}>
                <h3>GRAND TOTAL</h3>
                <div className="total-value">{formatCurrency(grandTotal, currency.symbol)}</div>
              </div>

              {/* Notes */}
              {project.notes && (
                <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Notes & Assumptions:</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{project.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                  Generated by CivilEstimator Pro | Prepared by: {project.preparedBy || 'Moawia Husnain'} | {reportConfig.date}
                </p>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <h3>No BOQ Data to Preview</h3>
              <p>Add items in the BOQ Generator module first, then return here to preview and export your report.</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Engineering Takeoff & Audit Trail */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
              🔍 Quantity Takeoff & Engineering Audit Trail
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              Detailed dimensions, mathematical formulas, window/door deductions, and AI extraction confidence levels per element.
            </p>

            {takeoffItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {takeoffItems.map((elGroup, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                    <div className="flex-between" style={{ marginBottom: 'var(--space-3)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{elGroup.elementType}</span>
                        <strong style={{ fontSize: '0.9rem' }}>{elGroup.elementName}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Confidence:</span>
                        <span className="font-bold" style={{ fontSize: '0.82rem', color: elGroup.confidence >= 0.7 ? 'var(--success)' : elGroup.confidence >= 0.4 ? 'var(--warning)' : 'var(--danger)' }}>
                          {(elGroup.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <table className="data-table" style={{ fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          <th>Measurement Sub-Item</th>
                          <th>Dimensions (L × W × H × Qty)</th>
                          <th>Formula</th>
                          <th className="col-number">Deductions</th>
                          <th className="col-number">Net Quantity</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {elGroup.takeoffs.map((item, itemIdx) => (
                          <tr key={itemIdx}>
                            <td style={{ fontWeight: 600 }}>{item.description}</td>
                            <td className="text-mono" style={{ color: 'var(--text-secondary)' }}>{item.dimensions}</td>
                            <td style={{ color: 'var(--text-tertiary)' }}>{item.formula}</td>
                            <td className="col-number text-mono" style={{ color: item.deduction > 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                              {item.deduction > 0 ? `-${formatNumber(item.deduction, 3)}` : '0.000'}
                            </td>
                            <td className="col-number text-mono font-bold text-accent">
                              {formatNumber(item.netQty, 3)}
                            </td>
                            <td style={{ fontWeight: 600 }}>{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No Takeoff Measurements</h3>
                <p>Add structural elements to view dynamic takeoff details.</p>
              </div>
            )}
          </div>

          {/* Material Cost Breakdown */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
              🧱 Raw Material Cost Breakdown & Aggregation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              Aggregated quantities multiplied by the active project master rates (inclusive of composite ingredients calculations).
            </p>

            {materialBreakdownList.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Material / Ingredient Description</th>
                      <th className="col-number" style={{ width: '120px' }}>Total Quantity</th>
                      <th style={{ width: '80px' }}>Unit</th>
                      <th className="col-number" style={{ width: '150px' }}>Master Rate ({currency.symbol})</th>
                      <th className="col-number" style={{ width: '180px' }}>Total Cost ({currency.symbol})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialBreakdownList.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td className="col-number text-mono">{formatNumber(item.quantity, 2)}</td>
                        <td style={{ textTransform: 'lowercase' }}>{item.unit}</td>
                        <td className="col-number text-mono">{formatCurrency(item.rate, currency.symbol)}</td>
                        <td className="col-number text-mono font-bold text-accent">{formatCurrency(item.total, currency.symbol)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--accent-gradient-soft)', fontWeight: 800 }}>
                      <td colSpan={5} className="text-right">TOTAL MATERIAL COST:</td>
                      <td className="col-number text-mono text-accent" style={{ fontSize: '1.05rem' }}>
                        {formatCurrency(rawMaterialsTotalCost, currency.symbol)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🧱</div>
                <h3>No Materials Calculated</h3>
                <p>Add structural elements to compute material cost summaries.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Notes */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          📝 Report Notes & Assumptions
        </h3>
        <textarea
          className="form-textarea"
          value={project.notes}
          onChange={(e) => updateProject({ notes: e.target.value })}
          placeholder="Add notes, assumptions, exclusions, or special conditions for this report...

Example:
- All rates are inclusive of material, labor, and overheads
- Prices are based on current market rates as of April 2026
- Wastage factor of 5% has been applied to all materials
- Steel reinforcement calculated at standard ratios per element type"
          style={{ minHeight: '120px' }}
        />
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', marginBottom: 'var(--space-2)', fontSize: '0.85rem' }}>
      <span style={{ fontWeight: 600, width: '100px', color: 'var(--text-secondary)' }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
