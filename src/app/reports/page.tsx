// ============================================
// CivilEstimator Pro — Reports & Export Page
// ============================================

'use client';

import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { CURRENCIES } from '@/lib/constants';
import { ReportConfig } from '@/lib/types';
import { downloadBOQPdf } from '@/lib/pdf-generator';
import { downloadBOQExcel } from '@/lib/excel-generator';

export default function ReportsPage() {
  const { project, currency } = useProject();
  const [exporting, setExporting] = useState<string | null>(null);

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
      downloadBOQExcel(reportConfig, project.boqSections);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Error generating Excel. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reports & Export</h1>
        <p>Generate professional BOQ reports in PDF and Excel formats</p>
      </div>

      {/* Export Actions */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📄</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>PDF Report</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
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

        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>📊</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Excel Workbook</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Editable Excel file with Summary, Detailed BOQ, and Material Breakdown sheets
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

        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🖨️</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Print Report</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
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

      {/* Report Preview */}
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

      {/* Project Notes */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          📝 Report Notes & Assumptions
        </h3>
        <textarea
          className="form-textarea"
          value={project.notes}
          onChange={(e) => {
            // Direct update via context
          }}
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
