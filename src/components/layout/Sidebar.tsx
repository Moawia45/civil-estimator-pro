// ============================================
// CivilEstimator Pro — Sidebar Navigation
// ============================================

'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  section?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: '📊', path: '/', section: 'MAIN' },
  { label: 'Upload Drawing', icon: '📐', path: '/upload', section: 'INPUT' },
  { label: 'Manual Input', icon: '✏️', path: '/manual-input' },
  { label: 'Materials & Rates', icon: '🧱', path: '/materials', section: 'DATA' },
  { label: 'BOQ Generator', icon: '📋', path: '/boq', section: 'OUTPUT' },
  { label: 'Reports', icon: '📄', path: '/reports' },
  { label: 'Saved Projects', icon: '💾', path: '/projects', section: 'MANAGEMENT' },
  { label: 'Scheduling', icon: '📅', path: '/scheduling', section: 'FUTURE' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  let lastSection = '';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">CE</div>
        <div className="sidebar-brand-text">
          <h2>CivilEstimator</h2>
          <span>Professional Suite</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <React.Fragment key={item.path}>
              {showSection && (
                <div className="sidebar-section-label">{item.section}</div>
              )}
              <button
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => router.push(item.path)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>CivilEstimator Pro v1.0</div>
          <div>by Moawia Husnain</div>
        </div>
      </div>
    </aside>
  );
}
