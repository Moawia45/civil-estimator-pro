// ============================================
// CivilEstimator Pro — Scheduling Page (Future)
// ============================================

'use client';

import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { estimateLabor } from '@/lib/calculations';
import { ScheduleTask } from '@/lib/types';

const DEMO_TASKS: ScheduleTask[] = [
  { id: '1', name: 'Site Preparation', startDay: 1, duration: 5, dependencies: [], laborCount: 4, status: 'completed', color: '#10b981' },
  { id: '2', name: 'Excavation', startDay: 6, duration: 8, dependencies: ['1'], laborCount: 6, status: 'completed', color: '#f59e0b' },
  { id: '3', name: 'Foundation PCC', startDay: 14, duration: 3, dependencies: ['2'], laborCount: 8, status: 'in-progress', color: '#3b82f6' },
  { id: '4', name: 'Foundation RCC', startDay: 17, duration: 7, dependencies: ['3'], laborCount: 10, status: 'in-progress', color: '#1a56db' },
  { id: '5', name: 'Backfilling', startDay: 24, duration: 4, dependencies: ['4'], laborCount: 5, status: 'pending', color: '#8b5cf6' },
  { id: '6', name: 'Plinth Beam', startDay: 28, duration: 5, dependencies: ['5'], laborCount: 8, status: 'pending', color: '#00d4ff' },
  { id: '7', name: 'Brickwork (Ground)', startDay: 33, duration: 12, dependencies: ['6'], laborCount: 6, status: 'pending', color: '#ef4444' },
  { id: '8', name: 'RCC Columns', startDay: 33, duration: 8, dependencies: ['6'], laborCount: 8, status: 'pending', color: '#1a56db' },
  { id: '9', name: 'First Floor Slab', startDay: 45, duration: 7, dependencies: ['7', '8'], laborCount: 12, status: 'pending', color: '#3b82f6' },
  { id: '10', name: 'Brickwork (First)', startDay: 52, duration: 10, dependencies: ['9'], laborCount: 6, status: 'pending', color: '#ef4444' },
  { id: '11', name: 'Roof Slab', startDay: 62, duration: 7, dependencies: ['10'], laborCount: 12, status: 'pending', color: '#3b82f6' },
  { id: '12', name: 'Plastering', startDay: 69, duration: 15, dependencies: ['11'], laborCount: 8, status: 'pending', color: '#f59e0b' },
  { id: '13', name: 'Flooring & Tiling', startDay: 84, duration: 10, dependencies: ['12'], laborCount: 4, status: 'pending', color: '#10b981' },
  { id: '14', name: 'Painting', startDay: 94, duration: 8, dependencies: ['13'], laborCount: 4, status: 'pending', color: '#ec4899' },
  { id: '15', name: 'Finishing & Handover', startDay: 102, duration: 5, dependencies: ['14'], laborCount: 6, status: 'pending', color: '#8b5cf6' },
];

export default function SchedulingPage() {
  const { project } = useProject();
  const [tasks] = useState<ScheduleTask[]>(DEMO_TASKS);

  const totalDays = Math.max(...tasks.map(t => t.startDay + t.duration));
  const totalLabor = tasks.reduce((s, t) => s + t.laborCount * t.duration, 0);
  const dayWidth = 12; // pixels per day

  // Auto-generate labor estimates from project elements
  const laborEstimates = project.elements.length > 0 ? (() => {
    const estimates: { type: string; quantity: number; laborDays: number; workers: number }[] = [];
    const grouped = new Map<string, number>();

    project.elements.forEach(el => {
      const vol = el.length * el.width * el.height * el.quantity;
      const key = el.type;
      grouped.set(key, (grouped.get(key) || 0) + vol);
    });

    grouped.forEach((qty, type) => {
      const workType = type === 'wall' ? 'brickwork' : type === 'slab' || type === 'beam' || type === 'column' ? 'concrete' : 'excavation';
      const est = estimateLabor(workType, qty);
      estimates.push({ type, quantity: qty, ...est });
    });

    return estimates;
  })() : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Construction Scheduling</h1>
        <p>Project timeline, labor estimation, and Gantt chart visualization</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card stat-card blue">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{totalDays}</div>
          <div className="stat-label">Total Days</div>
        </div>
        <div className="card stat-card green">
          <div className="stat-icon">👷</div>
          <div className="stat-value">{Math.max(...tasks.map(t => t.laborCount))}</div>
          <div className="stat-label">Peak Workers</div>
        </div>
        <div className="card stat-card cyan">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="card stat-card orange">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{totalLabor}</div>
          <div className="stat-label">Man-Days</div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>📊 Gantt Chart — Construction Timeline</h3>
          <span className="badge badge-info">Demo Schedule</span>
        </div>

        <div className="gantt-container" style={{ overflowX: 'auto' }}>
          {/* Day headers */}
          <div style={{ display: 'flex', marginLeft: '220px', marginBottom: '4px' }}>
            {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
              <div key={i} style={{
                width: `${7 * dayWidth}px`,
                flexShrink: 0,
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                borderLeft: '1px solid var(--border-color)',
                paddingLeft: '4px',
              }}>
                Week {i + 1}
              </div>
            ))}
          </div>

          {/* Tasks */}
          {tasks.map(task => (
            <div key={task.id} className="gantt-row">
              <div className="gantt-label" style={{ width: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: task.status === 'completed' ? 'var(--success)' : task.status === 'in-progress' ? 'var(--warning)' : 'var(--text-tertiary)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '0.78rem' }}>{task.name}</span>
                </div>
              </div>
              <div className="gantt-bar-container" style={{ minWidth: `${totalDays * dayWidth + 20}px` }}>
                {/* Grid lines */}
                {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${i * 7 * dayWidth}px`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    background: 'var(--border-color)',
                  }} />
                ))}
                <div
                  className="gantt-bar"
                  style={{
                    left: `${(task.startDay - 1) * dayWidth}px`,
                    width: `${task.duration * dayWidth}px`,
                    background: task.color,
                  }}
                  title={`${task.name}: Day ${task.startDay} — Day ${task.startDay + task.duration - 1} (${task.duration} days, ${task.laborCount} workers)`}
                >
                  <span style={{
                    fontSize: '0.6rem',
                    color: 'white',
                    padding: '2px 4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    lineHeight: '20px',
                  }}>
                    {task.duration > 3 ? `${task.duration}d` : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Details */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            📋 Task Details
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Task</th>
                <th>Start</th>
                <th>Duration</th>
                <th>Workers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr key={task.id}>
                  <td style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 500, fontSize: '0.82rem' }}>{task.name}</td>
                  <td className="text-mono" style={{ fontSize: '0.8rem' }}>Day {task.startDay}</td>
                  <td className="text-mono" style={{ fontSize: '0.8rem' }}>{task.duration} days</td>
                  <td className="col-number">{task.laborCount}</td>
                  <td>
                    <span className={`badge badge-${task.status === 'completed' ? 'success' : task.status === 'in-progress' ? 'warning' : 'info'}`}>
                      {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Labor Estimates from Project */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            👷 Labor Estimation from Project
          </h3>

          {laborEstimates.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work Type</th>
                  <th>Quantity</th>
                  <th>Labor Days</th>
                  <th>Workers Needed</th>
                </tr>
              </thead>
              <tbody>
                {laborEstimates.map((est, idx) => (
                  <tr key={idx}>
                    <td><span className="badge badge-primary">{est.type}</span></td>
                    <td className="col-number">{est.quantity.toFixed(2)}</td>
                    <td className="col-number font-bold">{est.laborDays}</td>
                    <td className="col-number">{est.workers}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--accent-gradient-soft)' }}>
                  <td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
                  <td className="col-number font-bold text-accent">
                    {laborEstimates.reduce((s, e) => s + e.laborDays, 0).toFixed(1)}
                  </td>
                  <td className="col-number font-bold">
                    {laborEstimates.reduce((s, e) => s + e.workers, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon">👷</div>
              <h3>No Elements Added</h3>
              <p>Add structural elements to auto-calculate labor requirements</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
