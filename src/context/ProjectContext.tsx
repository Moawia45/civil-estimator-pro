// ============================================
// CivilEstimator Pro — Project Context
// ============================================

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Project, StructuralElement, BOQSection, BOQItem, Material,
  CurrencyCode, ProjectVersion, UploadedFile
} from '../lib/types';
import { DEFAULT_MATERIALS } from '../lib/materials-db';
import { CURRENCIES } from '../lib/constants';

interface ProjectContextType {
  project: Project;
  projects: Project[];
  updateProject: (updates: Partial<Project>) => void;
  addElement: (element: StructuralElement) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<StructuralElement>) => void;
  addBOQSection: (section: BOQSection) => void;
  updateBOQSection: (id: string, updates: Partial<BOQSection>) => void;
  removeBOQSection: (id: string) => void;
  addBOQItem: (sectionId: string, item: BOQItem) => void;
  updateBOQItem: (sectionId: string, itemId: string, updates: Partial<BOQItem>) => void;
  removeBOQItem: (sectionId: string, itemId: string) => void;
  setMaterials: (materials: Material[]) => void;
  updateMaterialRate: (id: string, rate: number) => void;
  setCurrency: (code: CurrencyCode) => void;
  saveProject: () => void;
  loadProject: (id: string) => void;
  createNewProject: () => void;
  deleteProject: (id: string) => void;
  saveVersion: (description: string) => void;
  addDrawingFile: (file: UploadedFile) => void;
  currency: { code: CurrencyCode; symbol: string; rate: number; name: string };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function recalculateCompositeRates(materials: Material[]): Material[] {
  const findRate = (id: string): number => {
    return materials.find(m => m.id === id)?.rate ?? 0;
  };

  const cement = findRate('raw-cement');
  const sand = findRate('raw-sand');
  const aggregate = findRate('raw-aggregate');
  const bricks = findRate('raw-bricks');

  return materials.map(m => {
    switch (m.id) {
      case 'pcc-m10':
        return { ...m, rate: parseFloat((4.5 * cement + 0.47 * sand + 0.94 * aggregate).toFixed(2)) };
      case 'pcc-m15':
        return { ...m, rate: parseFloat((6.4 * cement + 0.45 * sand + 0.9 * aggregate).toFixed(2)) };
      case 'rcc-m20':
        return { ...m, rate: parseFloat((8.0 * cement + 0.425 * sand + 0.85 * aggregate).toFixed(2)) };
      case 'rcc-m25':
        return { ...m, rate: parseFloat((10.0 * cement + 0.4 * sand + 0.8 * aggregate).toFixed(2)) };
      case 'rcc-m30':
        return { ...m, rate: parseFloat((12.0 * cement + 0.38 * sand + 0.76 * aggregate).toFixed(2)) };
      case 'brick-9':
        return { ...m, rate: parseFloat((500 * bricks + 1.4 * cement + 0.3 * sand).toFixed(2)) };
      case 'brick-4.5':
        return { ...m, rate: parseFloat((55 * bricks + 0.16 * cement + 0.035 * sand).toFixed(2)) };
      case 'plaster-12':
        return { ...m, rate: parseFloat((0.09 * cement + 0.015 * sand).toFixed(2)) };
      case 'plaster-20':
        return { ...m, rate: parseFloat((0.15 * cement + 0.025 * sand).toFixed(2)) };
      default:
        return m;
    }
  });
}

function createEmptyProject(): Project {
  return {
    id: generateId(),
    name: 'New Project',
    clientName: '',
    location: '',
    description: '',
    preparedBy: 'Moawia Husnain',
    currency: 'USD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    elements: [],
    boqSections: [],
    materials: [...DEFAULT_MATERIALS],
    totalCost: 0,
    notes: '',
    versions: [],
    drawingFiles: [],
  };
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project>(createEmptyProject());
  const [projects, setProjects] = useState<Project[]>([]);
  const currency = CURRENCIES[project.currency];

  // Load saved projects on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('civil_projects');
      if (saved) {
        const parsed = JSON.parse(saved) as Project[];
        setProjects(parsed);
        if (parsed.length > 0) {
          const lastId = localStorage.getItem('civil_last_project');
          const lastProject = parsed.find(p => p.id === lastId) || parsed[0];
          setProject(lastProject);
        }
      }
    } catch (e) {
      console.error('Error loading projects:', e);
    }
  }, []);

  // Recalculate total cost when BOQ changes
  useEffect(() => {
    const total = project.boqSections.reduce((sum, section) =>
      sum + section.items.reduce((s, item) => s + item.amount, 0), 0
    );
    if (total !== project.totalCost) {
      setProject(prev => ({ ...prev, totalCost: total }));
    }
  }, [project.boqSections, project.totalCost]);

  const persistProjects = useCallback((updatedProjects: Project[]) => {
    localStorage.setItem('civil_projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  }, []);

  const updateProject = useCallback((updates: Partial<Project>) => {
    setProject(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  }, []);

  const addElement = useCallback((element: StructuralElement) => {
    setProject(prev => ({
      ...prev,
      elements: [...prev.elements, element],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeElement = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      elements: prev.elements.filter(e => e.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<StructuralElement>) => {
    setProject(prev => ({
      ...prev,
      elements: prev.elements.map(e => e.id === id ? { ...e, ...updates } : e),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addBOQSection = useCallback((section: BOQSection) => {
    setProject(prev => ({
      ...prev,
      boqSections: [...prev.boqSections, section],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateBOQSection = useCallback((id: string, updates: Partial<BOQSection>) => {
    setProject(prev => ({
      ...prev,
      boqSections: prev.boqSections.map(s => s.id === id ? { ...s, ...updates } : s),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeBOQSection = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      boqSections: prev.boqSections.filter(s => s.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addBOQItem = useCallback((sectionId: string, item: BOQItem) => {
    setProject(prev => ({
      ...prev,
      boqSections: prev.boqSections.map(s =>
        s.id === sectionId
          ? { ...s, items: [...s.items, item], subtotal: s.subtotal + item.amount }
          : s
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateBOQItem = useCallback((sectionId: string, itemId: string, updates: Partial<BOQItem>) => {
    setProject(prev => ({
      ...prev,
      boqSections: prev.boqSections.map(s => {
        if (s.id !== sectionId) return s;
        const newItems = s.items.map(item => {
          if (item.id !== itemId) return item;
          const updated = { ...item, ...updates };
          updated.amount = updated.quantity * updated.rate;
          return updated;
        });
        return { ...s, items: newItems, subtotal: newItems.reduce((sum, i) => sum + i.amount, 0) };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const removeBOQItem = useCallback((sectionId: string, itemId: string) => {
    setProject(prev => ({
      ...prev,
      boqSections: prev.boqSections.map(s => {
        if (s.id !== sectionId) return s;
        const newItems = s.items.filter(i => i.id !== itemId);
        return { ...s, items: newItems, subtotal: newItems.reduce((sum, i) => sum + i.amount, 0) };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const setMaterials = useCallback((materials: Material[]) => {
    setProject(prev => {
      const updatedMaterials = recalculateCompositeRates(materials);
      const updatedBoqSections = prev.boqSections.map(s => {
        const newItems = s.items.map(item => {
          const mat = updatedMaterials.find(m => m.id === item.materialId || m.name === item.materialName || m.name === item.description);
          if (mat) {
            const newRate = mat.rate * currency.rate;
            return {
              ...item,
              rate: newRate,
              amount: item.quantity * newRate
            };
          }
          return item;
        });
        return {
          ...s,
          items: newItems,
          subtotal: newItems.reduce((sum, i) => sum + i.amount, 0)
        };
      });

      return {
        ...prev,
        materials: updatedMaterials,
        boqSections: updatedBoqSections,
        updatedAt: new Date().toISOString()
      };
    });
  }, [currency.rate]);

  const updateMaterialRate = useCallback((id: string, rate: number) => {
    setProject(prev => {
      let updatedMaterials = prev.materials.map(m => m.id === id ? { ...m, rate } : m);
      updatedMaterials = recalculateCompositeRates(updatedMaterials);

      const updatedBoqSections = prev.boqSections.map(s => {
        const newItems = s.items.map(item => {
          const mat = updatedMaterials.find(m => m.id === item.materialId || m.name === item.materialName || m.name === item.description);
          if (mat) {
            const newRate = mat.rate * currency.rate;
            return {
              ...item,
              rate: newRate,
              amount: item.quantity * newRate
            };
          }
          return item;
        });
        return {
          ...s,
          items: newItems,
          subtotal: newItems.reduce((sum, i) => sum + i.amount, 0)
        };
      });

      return {
        ...prev,
        materials: updatedMaterials,
        boqSections: updatedBoqSections,
        updatedAt: new Date().toISOString()
      };
    });
  }, [currency.rate]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setProject(prev => ({ ...prev, currency: code, updatedAt: new Date().toISOString() }));
  }, []);

  const saveProject = useCallback(() => {
    const updated = { ...project, updatedAt: new Date().toISOString() };
    setProject(updated);
    const idx = projects.findIndex(p => p.id === updated.id);
    let newProjects: Project[];
    if (idx >= 0) {
      newProjects = [...projects];
      newProjects[idx] = updated;
    } else {
      newProjects = [...projects, updated];
    }
    persistProjects(newProjects);
    localStorage.setItem('civil_last_project', updated.id);
  }, [project, projects, persistProjects]);

  const loadProject = useCallback((id: string) => {
    const found = projects.find(p => p.id === id);
    if (found) {
      setProject(found);
      localStorage.setItem('civil_last_project', id);
    }
  }, [projects]);

  const createNewProject = useCallback(() => {
    const newProj = createEmptyProject();
    setProject(newProj);
  }, []);

  const deleteProject = useCallback((id: string) => {
    const newProjects = projects.filter(p => p.id !== id);
    persistProjects(newProjects);
    if (project.id === id) {
      setProject(newProjects.length ? newProjects[0] : createEmptyProject());
    }
  }, [projects, project.id, persistProjects]);

  const saveVersion = useCallback((description: string) => {
    const version: ProjectVersion = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      description,
      snapshot: JSON.stringify(project),
    };
    setProject(prev => ({
      ...prev,
      versions: [...prev.versions, version],
      updatedAt: new Date().toISOString(),
    }));
  }, [project]);

  const addDrawingFile = useCallback((file: UploadedFile) => {
    setProject(prev => ({
      ...prev,
      drawingFiles: [...prev.drawingFiles, file],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  return (
    <ProjectContext.Provider value={{
      project, projects,
      updateProject, addElement, removeElement, updateElement,
      addBOQSection, updateBOQSection, removeBOQSection,
      addBOQItem, updateBOQItem, removeBOQItem,
      setMaterials, updateMaterialRate, setCurrency,
      saveProject, loadProject, createNewProject, deleteProject,
      saveVersion, addDrawingFile, currency,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
