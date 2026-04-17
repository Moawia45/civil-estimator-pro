// ============================================
// CivilEstimator Pro — Dashboard Page
// ============================================

'use client';

import React from 'react';
import { useProject } from '@/context/ProjectContext';
import { formatCurrency } from '@/lib/calculations';
import { CURRENCIES } from '@/lib/constants';

export default function DashboardPage() {
  const { project, projects, currency } = useProject();

  const totalElements = project.elements.length;
  const totalBOQItems = project.boqSections.reduce((s, sec) => s + sec.items.length, 0);
  const totalCost = project.boqSections.reduce(
    (s, sec) => s + sec.items.reduce((a, i) => a + i.amount, 0), 0
  );

  // Cost by section for chart
  const sectionCosts = project.boqSections.map(s => ({
    name: s.title,
    cost: s.items.reduce((a, i) => a + i.amount, 0),
  }));

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your current project estimation</p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card stat-card blue">
          <div className="stat-icon">📐</div>
          <div className="stat-value">{totalElements}</div>
          <div className="stat-label">Structural Elements</div>
          <div className="stat-bg-icon">📐</div>
        </div>

        <div className="card stat-card cyan">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{totalBOQItems}</div>
          <div className="stat-label">BOQ Items</div>
          <div className="stat-bg-icon">📋</div>
        </div>

        <div className="card stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatCurrency(totalCost, currency.symbol, 0)}</div>
          <div className="stat-label">Estimated Cost</div>
          <div className="stat-bg-icon">💰</div>
        </div>

        <div className="card stat-card orange">
          <div className="stat-icon">💾</div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Saved Projects</div>
          <div className="stat-bg-icon">💾</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid-2">
        {/* Project Info */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            📝 Project Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <InfoRow label="Project Name" value={project.name || '—'} />
            <InfoRow label="Client" value={project.clientName || 'Not set'} />
            <InfoRow label="Location" value={project.location || 'Not set'} />
            <InfoRow label="Prepared By" value={project.preparedBy} />
            <InfoRow label="Currency" value={`${CURRENCIES[project.currency].name} (${CURRENCIES[project.currency].symbol})`} />
            <InfoRow label="Status" value={project.status} badge />
            <InfoRow label="Last Updated" value={new Date(project.updatedAt).toLocaleString()} />
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            📊 Cost Breakdown by Section
          </h3>
          {sectionCosts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sectionCosts.map((sec, idx) => {
                const max = Math.max(...sectionCosts.map(s => s.cost), 1);
                const pct = (sec.cost / max) * 100;
                const colors = ['#1a56db', '#00d4ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                return (
                  <div key={idx}>
                    <div className="flex-between" style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{sec.name}</span>
                      <span className="text-mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-accent)' }}>
                        {formatCurrency(sec.cost, currency.symbol)}
                      </span>
                    </div>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill high"
                        style={{
                          width: `${pct}%`,
                          background: colors[idx % colors.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon">📊</div>
              <h3>No BOQ Data Yet</h3>
              <p>Add items in the BOQ module to see cost breakdown</p>
            </div>
          )}
        </div>

        {/* Elements Summary */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            🏗️ Structural Elements
          </h3>
          {project.elements.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>L × W × H (m)</th>
                  <th className="col-number">Qty</th>
                </tr>
              </thead>
              <tbody>
                {project.elements.slice(0, 8).map((el) => (
                  <tr key={el.id}>
                    <td><span className="badge badge-primary">{el.type}</span></td>
                    <td>{el.name}</td>
                    <td className="text-mono" style={{ fontSize: '0.8rem' }}>
                      {el.length} × {el.width} × {el.height}
                    </td>
                    <td className="col-number">{el.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon">🏗️</div>
              <h3>No Elements Added</h3>
              <p>Upload a drawing or add elements manually</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            ⚡ Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <QuickAction icon="📐" label="Upload Drawing for AI Analysis" path="/upload" />
            <QuickAction icon="✏️" label="Add Structural Elements Manually" path="/manual-input" />
            <QuickAction icon="🧱" label="Edit Material Rates" path="/materials" />
            <QuickAction icon="📋" label="Generate Bill of Quantities" path="/boq" />
            <QuickAction icon="📄" label="Export Reports (PDF / Excel)" path="/reports" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex-between">
      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
      {badge ? (
        <span className={`badge badge-${value === 'completed' ? 'success' : value === 'in-progress' ? 'info' : 'warning'}`}>
          {value}
        </span>
      ) : (
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{value}</span>
      )}
    </div>
  );
}

function QuickAction({ icon, label, path }: { icon: string; label: string; path: string }) {
  return (
    <a
      href={path}
      className="nav-item"
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        textDecoration: 'none',
      }}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>→</span>
    </a>
  );
}
