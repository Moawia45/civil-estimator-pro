// ============================================
// CivilEstimator Pro — Saved Projects Page
// ============================================

'use client';

import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { formatCurrency } from '@/lib/calculations';
import { CURRENCIES } from '@/lib/constants';

export default function ProjectsPage() {
  const {
    project, projects,
    loadProject, createNewProject, deleteProject, saveProject,
    saveVersion,
  } = useProject();
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionDesc, setVersionDesc] = useState('');

  const handleSaveVersion = () => {
    saveVersion(versionDesc || 'Manual snapshot');
    saveProject();
    setVersionDesc('');
    setShowVersionModal(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Saved Projects</h1>
        <p>Manage your estimation projects and version history</p>
      </div>

      {/* Actions */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex-between">
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className="btn btn-primary" onClick={() => { createNewProject(); }}>
              ➕ New Project
            </button>
            <button className="btn btn-success" onClick={() => saveProject()}>
              💾 Save Current Project
            </button>
            <button className="btn btn-secondary" onClick={() => setShowVersionModal(true)}>
              📸 Save Version Snapshot
            </button>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {projects.length} saved projects
          </span>
        </div>
      </div>

      {/* Current Project */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', borderColor: 'var(--accent-primary)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            📌 Current Active Project
          </h3>
          <span className={`badge badge-${project.status === 'completed' ? 'success' : project.status === 'in-progress' ? 'info' : 'warning'}`}>
            {project.status}
          </span>
        </div>
        <div className="grid-4" style={{ gap: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</div>
            <div style={{ fontWeight: 600 }}>{project.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Elements</div>
            <div className="text-mono font-bold">{project.elements.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BOQ Items</div>
            <div className="text-mono font-bold">{project.boqSections.reduce((s, sec) => s + sec.items.length, 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Cost</div>
            <div className="text-mono font-bold text-accent">
              {formatCurrency(project.totalCost, CURRENCIES[project.currency].symbol, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          💾 All Saved Projects
        </h3>

        {projects.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Elements</th>
                  <th>BOQ Items</th>
                  <th>Total Cost</th>
                  <th>Last Updated</th>
                  <th className="col-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} style={{ background: p.id === project.id ? 'var(--accent-gradient-soft)' : undefined }}>
                    <td style={{ fontWeight: 600 }}>
                      {p.name}
                      {p.id === project.id && <span className="badge badge-primary" style={{ marginLeft: '8px' }}>Active</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.clientName || '—'}</td>
                    <td>
                      <span className={`badge badge-${p.status === 'completed' ? 'success' : p.status === 'in-progress' ? 'info' : 'warning'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="col-number">{p.elements.length}</td>
                    <td className="col-number">{p.boqSections.reduce((s, sec) => s + sec.items.length, 0)}</td>
                    <td className="col-number font-bold text-accent">
                      {formatCurrency(p.totalCost, CURRENCIES[p.currency].symbol, 0)}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="col-action" style={{ width: '120px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {p.id !== project.id && (
                          <button className="btn btn-sm btn-primary" onClick={() => loadProject(p.id)}
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                            Open
                          </button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => {
                          if (confirm(`Delete project "${p.name}"?`)) deleteProject(p.id);
                        }} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💾</div>
            <h3>No Saved Projects</h3>
            <p>Click &quot;Save Current Project&quot; to save your first project</p>
          </div>
        )}
      </div>

      {/* Version History */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          📜 Version History
        </h3>

        {project.versions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {project.versions.map((ver, idx) => (
              <div key={ver.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{
                  width: '28px', height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  v{idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ver.description}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                    {new Date(ver.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-4)' }}>
            No version snapshots yet. Save a version to track changes over time.
          </p>
        )}
      </div>

      {/* Version Modal */}
      {showVersionModal && (
        <div className="modal-overlay" onClick={() => setShowVersionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📸 Save Version Snapshot</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowVersionModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Version Description</label>
                <input
                  className="form-input"
                  value={versionDesc}
                  onChange={(e) => setVersionDesc(e.target.value)}
                  placeholder="e.g., Initial estimate, Updated steel rates, Final revision..."
                />
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                This will save a complete snapshot of your current project state.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVersionModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveVersion}>Save Version</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
