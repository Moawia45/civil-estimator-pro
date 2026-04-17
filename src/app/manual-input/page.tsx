// ============================================
// CivilEstimator Pro — Manual Input Page
// ============================================

'use client';

import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { StructuralElement, ElementType } from '@/lib/types';
import { calculateVolume, calculateArea, formatNumber } from '@/lib/calculations';
import { ELEMENT_NAMES } from '@/lib/constants';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const elementTypes: ElementType[] = [
  'wall', 'slab', 'column', 'beam', 'foundation',
  'footing', 'staircase', 'lintel', 'plinth', 'parapet'
];

export default function ManualInputPage() {
  const { project, addElement, removeElement, updateElement } = useProject();
  const [formData, setFormData] = useState({
    type: 'wall' as ElementType,
    name: '',
    length: '',
    width: '',
    height: '',
    quantity: '1',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(formData.length) || 0;
    const w = parseFloat(formData.width) || 0;
    const h = parseFloat(formData.height) || 0;
    const qty = parseInt(formData.quantity) || 1;

    const element: StructuralElement = {
      id: generateId(),
      type: formData.type,
      name: formData.name || `${ELEMENT_NAMES[formData.type]} ${project.elements.length + 1}`,
      length: l,
      width: w,
      height: h,
      quantity: qty,
      unit: 'm',
      volume: calculateVolume(l, w, h),
      area: calculateArea(l, w),
      notes: formData.notes,
    };

    addElement(element);
    setFormData({
      type: formData.type,
      name: '',
      length: '',
      width: '',
      height: '',
      quantity: '1',
      notes: '',
    });
  };

  const totalVolume = project.elements.reduce((s, el) => s + el.volume * el.quantity, 0);
  const totalArea = project.elements.reduce((s, el) => s + el.area * el.quantity, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manual Input</h1>
        <p>Add structural elements with dimensions manually</p>
      </div>

      <div className="grid-2">
        {/* Input Form */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
            ➕ Add Structural Element
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Element Type Selector */}
            <div className="form-group">
              <label className="form-label">Element Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}>
                {elementTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`btn btn-sm ${formData.type === type ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormData({ ...formData, type })}
                    style={{ fontSize: '0.72rem', padding: '6px 4px' }}
                  >
                    {ELEMENT_NAMES[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="form-group">
              <label className="form-label">Element Name (Optional)</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`e.g., External ${ELEMENT_NAMES[formData.type]} A`}
              />
            </div>

            {/* Dimensions */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Length (m)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input form-input-number"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Width (m)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input form-input-number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Height (m)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input form-input-number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Quantity & Notes */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-input form-input-number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  className="form-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            {/* Live Preview */}
            {formData.length && formData.width && formData.height && (
              <div className="card" style={{ background: 'var(--accent-gradient-soft)', marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                  Calculated Preview:
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                  <div>
                    <div className="text-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-accent)' }}>
                      {formatNumber(calculateVolume(
                        parseFloat(formData.length) || 0,
                        parseFloat(formData.width) || 0,
                        parseFloat(formData.height) || 0
                      ) * (parseInt(formData.quantity) || 1))} m³
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Total Volume</div>
                  </div>
                  <div>
                    <div className="text-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-accent)' }}>
                      {formatNumber(calculateArea(
                        parseFloat(formData.length) || 0,
                        parseFloat(formData.width) || 0,
                      ) * (parseInt(formData.quantity) || 1))} m²
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Total Area</div>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full">
              ➕ Add Element
            </button>
          </form>
        </div>

        {/* Elements List */}
        <div>
          {/* Summary */}
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="flex-between">
              <div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total Elements: </span>
                <span className="text-mono font-bold">{project.elements.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-mono" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {formatNumber(totalVolume)} m³
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Total Volume</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-mono" style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {formatNumber(totalArea)} m²
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Total Area</div>
                </div>
              </div>
            </div>
          </div>

          {/* Elements Table */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
              🏗️ Added Elements ({project.elements.length})
            </h3>

            {project.elements.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Type</th>
                      <th>Name</th>
                      <th>L (m)</th>
                      <th>W (m)</th>
                      <th>H (m)</th>
                      <th>Qty</th>
                      <th>Volume (m³)</th>
                      <th className="col-action"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.elements.map((el, idx) => (
                      <tr key={el.id}>
                        <td style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                        <td><span className="badge badge-primary">{el.type}</span></td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 500 }}>{el.name}</td>
                        <td className="col-number">{el.length}</td>
                        <td className="col-number">{el.width}</td>
                        <td className="col-number">{el.height}</td>
                        <td className="col-number">
                          <input
                            type="number"
                            className="form-input form-input-number"
                            style={{ width: '50px', padding: '2px 4px', fontSize: '0.8rem' }}
                            value={el.quantity}
                            min={1}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              updateElement(el.id, { quantity: qty });
                            }}
                          />
                        </td>
                        <td className="col-number text-accent font-bold">
                          {formatNumber(el.volume * el.quantity)}
                        </td>
                        <td className="col-action">
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => removeElement(el.id)}
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">✏️</div>
                <h3>No Elements Added</h3>
                <p>Fill the form and click &quot;Add Element&quot; to start</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
