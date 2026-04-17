// ============================================
// CivilEstimator Pro — Header Bar
// AI key is server-side only — users never configure it
// ============================================

'use client';

import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { useTheme } from '@/context/ThemeContext';

export default function Header() {
  const { project, saveProject, updateProject } = useProject();
  const { theme, toggleTheme } = useTheme();

  const [showSettings, setShowSettings] = useState(false);
  const [saved, setSaved]               = useState(false);

  const handleProjectSave = () => {
    saveProject();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <input
            className="form-input"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              padding: '4px 8px',
              width: '300px',
            }}
            value={project.name}
            onChange={(e) => updateProject({ name: e.target.value })}
            placeholder="Project Name"
          />
          <span className={`header-project-status ${project.status}`}>
            {project.status}
          </span>
        </div>

        <div className="header-right">
          {/* AI always ready — powered by server-side key */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '0.75rem', color: 'var(--success)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 6px var(--success)',
              animation: 'pulse 2s infinite',
            }} />
            AI Ready
          </div>

          <button className="btn btn-sm btn-secondary" onClick={() => setShowSettings(true)}>
            ⚙️ Settings
          </button>

          <button className="btn btn-sm btn-primary" onClick={handleProjectSave}>
            {saved ? '✅ Saved!' : '💾 Save'}
          </button>

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ---- Settings Modal (Project Info Only) ---- */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', width: '95vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>⚙️ Project Settings</h3>
              <button
                className="btn btn-icon btn-secondary"
                onClick={() => setShowSettings(false)}
              >✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

              {/* AI Status Card */}
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid var(--success)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>
                    AI Drawing Analysis — Ready
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    Powered by Llama 4 Scout · Groq · No setup required
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div>
                <div className="form-label" style={{ marginBottom: 'var(--space-3)', fontWeight: 700 }}>
                  Project Information
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Project Name</label>
                    <input
                      className="form-input"
                      value={project.name}
                      onChange={(e) => updateProject({ name: e.target.value })}
                      placeholder="e.g. Residential Villa - Phase 1"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client Name</label>
                    <input
                      className="form-input"
                      value={project.clientName}
                      onChange={(e) => updateProject({ clientName: e.target.value })}
                      placeholder="Client / Owner Name"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Project Location</label>
                    <input
                      className="form-input"
                      value={project.location}
                      onChange={(e) => updateProject({ location: e.target.value })}
                      placeholder="City, Province, Pakistan"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      value={project.description}
                      onChange={(e) => updateProject({ description: e.target.value })}
                      placeholder="Brief project description..."
                      rows={3}
                      style={{ minHeight: '70px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Project Status</label>
                    <select
                      className="form-select"
                      value={project.status}
                      onChange={(e) =>
                        updateProject({ status: e.target.value as 'draft' | 'in-progress' | 'completed' })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                  CivilEstimator Pro
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                  Developed by Moawia Husnain · UET Taxila, Pakistan
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                  +92 326 691 5744 · moawiahussnaing@gmail.com
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => { handleProjectSave(); setShowSettings(false); }}
              >
                💾 Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
