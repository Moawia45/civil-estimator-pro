// ============================================
// CivilEstimator Pro — BOQ Generator Page
// ============================================

'use client';

import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { BOQSection, BOQItem, ConcreteGrade } from '@/lib/types';
import { formatCurrency, generateMaterialBreakdown, calculateVolume, calculateArea } from '@/lib/calculations';
import { BOQ_CATEGORIES, UNITS, ELEMENT_NAMES } from '@/lib/constants';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default function BOQPage() {
  const {
    project, currency,
    addBOQSection, removeBOQSection,
    addBOQItem, updateBOQItem, removeBOQItem,
  } = useProject();

  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [itemForm, setItemForm] = useState({
    description: '',
    unit: 'm3',
    quantity: '',
    rate: '',
    notes: '',
  });

  const handleAddSection = () => {
    if (!newSectionTitle) return;
    const section: BOQSection = {
      id: generateId(),
      title: newSectionTitle,
      items: [],
      subtotal: 0,
    };
    addBOQSection(section);
    setNewSectionTitle('');
    setShowAddSection(false);
  };

  const handleAddItem = (sectionId: string) => {
    const qty = parseFloat(itemForm.quantity) || 0;
    const rate = parseFloat(itemForm.rate) || 0;
    const item: BOQItem = {
      id: generateId(),
      sno: project.boqSections.find(s => s.id === sectionId)?.items.length ?? 0 + 1,
      category: project.boqSections.find(s => s.id === sectionId)?.title || '',
      description: itemForm.description,
      unit: itemForm.unit,
      quantity: qty,
      rate: rate,
      amount: qty * rate,
      notes: itemForm.notes,
    };
    addBOQItem(sectionId, item);
    setItemForm({ description: '', unit: 'm3', quantity: '', rate: '', notes: '' });
    setShowAddItem(null);
  };

  const handleAutoGenerate = () => {
    if (project.elements.length === 0) {
      alert('Please add structural elements first (Upload Drawing or Manual Input).');
      return;
    }

    // Group elements by type
    const groups = new Map<string, typeof project.elements>();
    project.elements.forEach(el => {
      const key = el.type;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(el);
    });

    // Generate BOQ sections from elements
    groups.forEach((elements, type) => {
      const sectionTitle = `${ELEMENT_NAMES[type] || type} Work`;
      const section: BOQSection = {
        id: generateId(),
        title: sectionTitle,
        items: [],
        subtotal: 0,
      };

      elements.forEach((el) => {
        const vol = calculateVolume(el.length, el.width, el.height) * el.quantity;
        const area = calculateArea(el.length, el.width) * el.quantity;

        // Find matching material rate
        const findRate = (keyword: string) => {
          const mat = project.materials.find(m =>
            m.name.toLowerCase().includes(keyword.toLowerCase())
          );
          return mat ? mat.rate * currency.rate : 0;
        };

        if (['slab', 'beam', 'column', 'foundation', 'footing', 'lintel', 'staircase', 'plinth'].includes(type)) {
          // Concrete work
          section.items.push({
            id: generateId(),
            sno: section.items.length + 1,
            category: sectionTitle,
            description: `RCC M20 for ${el.name}`,
            unit: 'm³',
            quantity: parseFloat(vol.toFixed(3)),
            rate: findRate('RCC M20'),
            amount: parseFloat((vol * findRate('RCC M20')).toFixed(2)),
          });

          // Steel
          const steelKg = vol * 78.5; // ~1% steel ratio simplified
          section.items.push({
            id: generateId(),
            sno: section.items.length + 1,
            category: sectionTitle,
            description: `Steel Reinforcement for ${el.name}`,
            unit: 'kg',
            quantity: parseFloat(steelKg.toFixed(2)),
            rate: findRate('TMT'),
            amount: parseFloat((steelKg * findRate('TMT')).toFixed(2)),
          });

          // Formwork
          let formArea = 0;
          if (type === 'slab') formArea = area;
          else if (type === 'column') formArea = 2 * (el.length + el.width) * el.height * el.quantity;
          else if (type === 'beam') formArea = (2 * el.height + el.width) * el.length * el.quantity;
          else formArea = area;

          section.items.push({
            id: generateId(),
            sno: section.items.length + 1,
            category: sectionTitle,
            description: `Formwork for ${el.name}`,
            unit: 'm²',
            quantity: parseFloat(formArea.toFixed(2)),
            rate: findRate('Plywood Formwork'),
            amount: parseFloat((formArea * findRate('Plywood Formwork')).toFixed(2)),
          });
        }

        if (['wall', 'parapet'].includes(type)) {
          // Brickwork
          const wallArea = el.length * el.height * el.quantity;
          section.items.push({
            id: generateId(),
            sno: section.items.length + 1,
            category: sectionTitle,
            description: `Brickwork for ${el.name} (${el.width > 0.15 ? '9"' : '4.5"'})`,
            unit: el.width > 0.15 ? 'm³' : 'm²',
            quantity: el.width > 0.15 ? parseFloat(vol.toFixed(3)) : parseFloat(wallArea.toFixed(2)),
            rate: findRate(el.width > 0.15 ? 'Brickwork in Cement Mortar (9")' : 'Brickwork in Cement Mortar (4.5")'),
            amount: 0,
          });

          // Set amount
          const lastItem = section.items[section.items.length - 1];
          lastItem.amount = parseFloat((lastItem.quantity * lastItem.rate).toFixed(2));

          // Plaster both sides
          section.items.push({
            id: generateId(),
            sno: section.items.length + 1,
            category: sectionTitle,
            description: `Cement Plaster 12mm for ${el.name} (Both sides)`,
            unit: 'm²',
            quantity: parseFloat((wallArea * 2).toFixed(2)),
            rate: findRate('Cement Plaster 12mm'),
            amount: parseFloat((wallArea * 2 * findRate('Cement Plaster 12mm')).toFixed(2)),
          });
        }
      });

      section.subtotal = section.items.reduce((s, i) => s + i.amount, 0);
      addBOQSection(section);
    });

    setShowAutoGenerate(false);
  };

  const grandTotal = project.boqSections.reduce(
    (s, sec) => s + sec.items.reduce((a, i) => a + i.amount, 0), 0
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>BOQ Generator</h1>
        <p>Build and manage your Bill of Quantities</p>
      </div>

      {/* Actions Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex-between">
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className="btn btn-primary" onClick={() => setShowAddSection(true)}>
              ➕ Add Section
            </button>
            <button className="btn btn-success" onClick={() => setShowAutoGenerate(true)}>
              🤖 Auto-Generate from Elements
            </button>
          </div>
          <div className="flex" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {project.boqSections.length} sections, {project.boqSections.reduce((s, sec) => s + sec.items.length, 0)} items
            </span>
          </div>
        </div>
      </div>

      {/* BOQ Sections */}
      {project.boqSections.length > 0 ? (
        <>
          {project.boqSections.map((section, sIdx) => (
            <div key={section.id} className="boq-section">
              <div className="boq-section-header">
                <div className="boq-section-title">
                  {sIdx + 1}. {section.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="boq-subtotal">
                    {formatCurrency(section.items.reduce((s, i) => s + i.amount, 0), currency.symbol)}
                  </span>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowAddItem(section.id)}
                  >
                    ➕ Add Item
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => { if (confirm('Remove this section?')) removeBOQSection(section.id); }}
                    style={{ padding: '2px 8px' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="card" style={{ borderRadius: '0 0 var(--radius-md) var(--radius-md)', borderTop: 'none' }}>
                {section.items.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>S.No</th>
                        <th>Description</th>
                        <th style={{ width: '60px' }}>Unit</th>
                        <th style={{ width: '100px' }}>Quantity</th>
                        <th style={{ width: '110px' }}>Rate ({currency.symbol})</th>
                        <th style={{ width: '120px' }}>Amount ({currency.symbol})</th>
                        <th className="col-action"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, iIdx) => (
                        <tr key={item.id}>
                          <td style={{ color: 'var(--text-tertiary)' }}>{sIdx + 1}.{iIdx + 1}</td>
                          <td>
                            <input
                              className="form-input"
                              style={{ padding: '4px 8px', fontSize: '0.82rem', border: 'none', background: 'transparent' }}
                              value={item.description}
                              onChange={(e) => updateBOQItem(section.id, item.id, { description: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              className="form-select"
                              style={{ padding: '4px', fontSize: '0.78rem', minWidth: '55px' }}
                              value={item.unit}
                              onChange={(e) => updateBOQItem(section.id, item.id, { unit: e.target.value })}
                            >
                              {UNITS.map(u => (
                                <option key={u.value} value={u.value}>{u.value}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="form-input form-input-number"
                              style={{ padding: '4px 8px', fontSize: '0.82rem', width: '90px' }}
                              value={item.quantity}
                              onChange={(e) => updateBOQItem(section.id, item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="form-input form-input-number"
                              style={{ padding: '4px 8px', fontSize: '0.82rem', width: '100px' }}
                              value={item.rate}
                              onChange={(e) => updateBOQItem(section.id, item.id, { rate: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="col-number text-accent font-bold">
                            {formatCurrency(item.amount, currency.symbol)}
                          </td>
                          <td className="col-action">
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => removeBOQItem(section.id, item.id)}
                              style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    No items yet. Click &quot;Add Item&quot; to add.
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Grand Total */}
          <div className="boq-grand-total">
            <h3>GRAND TOTAL</h3>
            <div className="total-value">{formatCurrency(grandTotal, currency.symbol)}</div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No BOQ Sections Yet</h3>
            <p>Add sections manually or auto-generate from your structural elements</p>
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowAddSection(true)}>
                ➕ Add Section
              </button>
              <button className="btn btn-success" onClick={() => setShowAutoGenerate(true)}>
                🤖 Auto-Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="modal-overlay" onClick={() => setShowAddSection(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add BOQ Section</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowAddSection(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Section Title</label>
                <select
                  className="form-select"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                >
                  <option value="">Select or type custom...</option>
                  {BOQ_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Or enter custom title</label>
                <input
                  className="form-input"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Custom section title..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddSection(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSection} disabled={!newSectionTitle}>
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="modal-overlay" onClick={() => setShowAddItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add BOQ Item</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowAddItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Item description..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    className="form-select"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  >
                    {UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input form-input-number"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate ({currency.symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input form-input-number"
                    value={itemForm.rate}
                    onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {itemForm.quantity && itemForm.rate && (
                <div style={{ textAlign: 'right', padding: 'var(--space-3)', background: 'var(--accent-gradient-soft)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Amount: </span>
                  <span className="text-mono font-bold text-accent" style={{ fontSize: '1.1rem' }}>
                    {formatCurrency((parseFloat(itemForm.quantity) || 0) * (parseFloat(itemForm.rate) || 0), currency.symbol)}
                  </span>
                </div>
              )}
              <div className="form-group mt-4">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="form-input"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  placeholder="Item notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddItem(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => handleAddItem(showAddItem)}
                disabled={!itemForm.description || !itemForm.quantity || !itemForm.rate}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Generate Confirmation */}
      {showAutoGenerate && (
        <div className="modal-overlay" onClick={() => setShowAutoGenerate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 Auto-Generate BOQ</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowAutoGenerate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>
                This will automatically generate BOQ sections and items from your <strong>{project.elements.length}</strong> structural elements.
              </p>
              <div style={{ padding: 'var(--space-3)', background: 'var(--accent-gradient-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
                <p>Items generated per element:</p>
                <ul style={{ paddingLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                  <li>Concrete (RCC/PCC) work</li>
                  <li>Steel reinforcement</li>
                  <li>Formwork</li>
                  <li>Brickwork (for walls)</li>
                  <li>Plastering (for walls)</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAutoGenerate(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleAutoGenerate}>
                🤖 Generate BOQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
