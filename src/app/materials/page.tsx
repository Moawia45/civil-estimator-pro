// ============================================
// CivilEstimator Pro — Materials & Rates Page
// ============================================

'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useProject } from '@/context/ProjectContext';
import { CURRENCIES } from '@/lib/constants';
import { CurrencyCode, Material, MaterialCategory } from '@/lib/types';
import { DEFAULT_MATERIALS } from '@/lib/materials-db';
import { formatNumber } from '@/lib/calculations';
import { parseRateSheet } from '@/lib/excel-generator';

const categories: { value: MaterialCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'excavation', label: '🏗️ Excavation' },
  { value: 'concrete', label: '🧱 Concrete' },
  { value: 'brickwork', label: '🧱 Brickwork' },
  { value: 'steel', label: '⚙️ Steel' },
  { value: 'plaster', label: '🎨 Plastering' },
  { value: 'formwork', label: '🪵 Formwork' },
  { value: 'waterproofing', label: '💧 Waterproofing' },
  { value: 'painting', label: '🎨 Painting' },
  { value: 'tiling', label: '🔲 Tiling' },
  { value: 'flooring', label: '🏠 Flooring' },
  { value: 'roofing', label: '🏠 Roofing' },
  { value: 'plumbing', label: '🔧 Plumbing' },
  { value: 'electrical', label: '⚡ Electrical' },
  { value: 'woodwork', label: '🪵 Woodwork' },
  { value: 'miscellaneous', label: '📦 Misc' },
];

export default function MaterialsPage() {
  const { project, updateMaterialRate, setMaterials, setCurrency, currency } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'all'>('all');
  const [uploading, setUploading] = useState(false);

  const filteredMaterials = useMemo(() => {
    return project.materials.filter(m => {
      const matchCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [project.materials, selectedCategory, search]);

  const handleResetRates = () => {
    if (confirm('Reset all material rates to default values?')) {
      setMaterials([...DEFAULT_MATERIALS]);
    }
  };

  const handleUploadRates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const rates = await parseRateSheet(file);
      const updated = project.materials.map(m => {
        const match = rates.find(r =>
          r.name.toLowerCase().includes(m.name.toLowerCase()) ||
          m.name.toLowerCase().includes(r.name.toLowerCase())
        );
        if (match) return { ...m, rate: match.rate };
        return m;
      });
      setMaterials(updated);
      alert(`Updated ${rates.length} rates from file.`);
    } catch (err) {
      alert('Error reading rate sheet. Please check the format.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const convertRate = (rateUSD: number): number => {
    return rateUSD * currency.rate;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Materials & Rates</h1>
        <p>Manage material database and pricing rates</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
          {/* Search */}
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">Search Material</label>
            <input
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by name..."
            />
          </div>

          {/* Category Filter */}
          <div className="form-group" style={{ minWidth: '180px', marginBottom: 0 }}>
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as MaterialCategory | 'all')}
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div className="form-group" style={{ minWidth: '160px', marginBottom: 0 }}>
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={project.currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            >
              {Object.values(CURRENCIES).map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              {uploading ? '⏳ Uploading...' : '📤 Upload Rate Sheet'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleUploadRates}
            />
            <button className="btn btn-outline" onClick={handleResetRates}>
              🔄 Reset Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <div className="text-mono font-bold" style={{ fontSize: '1.3rem', color: 'var(--accent-primary)' }}>
            {project.materials.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Total Materials</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <div className="text-mono font-bold" style={{ fontSize: '1.3rem', color: 'var(--success)' }}>
            {filteredMaterials.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Showing</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <div className="text-mono font-bold" style={{ fontSize: '1.3rem', color: 'var(--warning)' }}>
            {new Set(project.materials.map(m => m.category)).size}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Categories</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <div className="text-mono font-bold" style={{ fontSize: '1.3rem' }}>
            {currency.symbol} {currency.code}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Active Currency</div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Material Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Rate ({currency.symbol})</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((material, idx) => (
                <tr key={material.id}>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{material.name}</td>
                  <td>
                    <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                      {material.category}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{material.unit}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input form-input-number"
                      style={{ width: '120px', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 600 }}
                      value={parseFloat(convertRate(material.rate).toFixed(2))}
                      onChange={(e) => {
                        const newRate = (parseFloat(e.target.value) || 0) / currency.rate;
                        updateMaterialRate(material.id, newRate);
                      }}
                    />
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '250px' }}>
                    {material.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMaterials.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No Materials Found</h3>
            <p>Try a different search term or category filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
