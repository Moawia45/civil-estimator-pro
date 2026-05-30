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
    updateProject,
  } = useProject();

  // Dynamic engineering quantity verification & cross-checks
  const crossChecks = React.useMemo(() => {
    let wetConcrete = 0;
    let steelWeight = 0;
    let brickworkVol = 0;
    let brickCount = 0;
    let cementBags = 0;

    project.elements.forEach(el => {
      const vol = calculateVolume(el.length, el.width, el.height) * el.quantity;
      const area = calculateArea(el.length, el.width) * el.quantity;

      if (['slab', 'beam', 'column', 'staircase', 'lintel', 'plinth'].includes(el.type)) {
        wetConcrete += vol;
        const steelRatio = el.type === 'column' ? 2.5 : el.type === 'beam' ? 1.5 : el.type === 'slab' ? 0.7 : 1.0;
        steelWeight += vol * (steelRatio / 100) * 7850;
      } else if (el.type === 'footing' || el.type === 'foundation') {
        wetConcrete += vol; // footing RCC concrete
        wetConcrete += el.length * el.width * 0.1 * el.quantity; // bedding PCC concrete
        steelWeight += vol * 0.005 * 7850; // 0.5% steel ratio for footing
      }

      if (['wall', 'parapet'].includes(el.type)) {
        const is9Inch = el.width > 0.15;
        brickworkVol += is9Inch ? vol : area * 0.115;
      }
    });

    // Sum brick counts from current BOQ if available
    project.boqSections.forEach(sec => {
      sec.items.forEach(item => {
        const desc = item.description.toLowerCase();
        if (desc.includes('brick') && item.unit === 'nos') {
          brickCount += item.quantity;
        }
        if (desc.includes('cement') && item.unit === 'bags') {
          cementBags += item.quantity;
        }
      });
    });

    const concreteDryVol = wetConcrete * 1.54;
    const estimatedBricks = Math.ceil(brickworkVol * 500 * 1.05); // 5% wastage
    
    // Cement requirements: RCC concrete is ~8 bags/m3, PCC is ~4.44 bags/m3, brickwork is ~1.875 bags/m3
    const estimatedCementConcrete = wetConcrete * 7.5;
    const estimatedCementBrickwork = brickworkVol * 1.875;
    const totalCementBags = cementBags > 0 ? cementBags : (estimatedCementConcrete + estimatedCementBrickwork);

    return {
      wetConcrete,
      dryConcrete: concreteDryVol,
      steelWeight,
      avgSteelDensity: wetConcrete > 0 ? steelWeight / wetConcrete : 0,
      brickworkVol,
      estimatedBricks,
      brickCount,
      totalCementBags
    };
  }, [project.elements, project.boqSections]);

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

    // Helper to calculate door/window deductions for a wall based on direction match
    const getWallDeductions = (wallName: string) => {
      let areaDeduction = 0;
      let volumeDeduction = 0;
      const nameLower = wallName.toLowerCase();
      
      let direction = "";
      if (nameLower.includes("north")) direction = "north";
      else if (nameLower.includes("south")) direction = "south";
      else if (nameLower.includes("east")) direction = "east";
      else if (nameLower.includes("west")) direction = "west";
      
      if (!direction) return { area: 0, volume: 0 };
      
      project.elements.forEach(el => {
        if (el.type === 'door' || el.type === 'window') {
          const elNameLower = el.name.toLowerCase();
          if (elNameLower.includes(direction)) {
            const opArea = el.length * el.height * el.quantity;
            const opVolume = el.length * el.width * el.height * el.quantity;
            areaDeduction += opArea;
            volumeDeduction += opVolume;
          }
        }
      });
      
      return { area: areaDeduction, volume: volumeDeduction };
    };

    const findMaterial = (keyword: string) => {
      const mat = project.materials.find(m =>
        m.name.toLowerCase().includes(keyword.toLowerCase())
      );
      return mat;
    };

    const findRate = (keyword: string) => {
      const mat = findMaterial(keyword);
      return mat ? mat.rate * currency.rate : 0;
    };

    // Initialize list of items per category
    const sectionMap = new Map<string, BOQItem[]>();
    const getOrCreateItems = (title: string) => {
      if (!sectionMap.has(title)) {
        sectionMap.set(title, []);
      }
      return sectionMap.get(title)!;
    };

    project.elements.forEach((el) => {
      const vol = calculateVolume(el.length, el.width, el.height) * el.quantity;
      const area = calculateArea(el.length, el.width) * el.quantity;

      // 1. Footing & Foundation elements
      if (el.type === 'footing' || el.type === 'foundation') {
        const matExc = findMaterial('Excavation in Earth (Manual)');
        getOrCreateItems('Earthwork').push({
          id: generateId(),
          sno: 0,
          category: 'Earthwork',
          description: `Excavation in earth for foundation of ${el.name} (1.2m deep)`,
          unit: 'm³',
          quantity: parseFloat((el.length * el.width * 1.2 * el.quantity).toFixed(3)),
          rate: findRate('Excavation in Earth (Manual)'),
          amount: parseFloat((el.length * el.width * 1.2 * el.quantity * findRate('Excavation in Earth (Manual)')).toFixed(2)),
          materialId: matExc?.id,
          materialName: matExc?.name,
        });

        const matPcc = findMaterial('PCC M10 (1:3:6)');
        getOrCreateItems('Concrete Work').push({
          id: generateId(),
          sno: 0,
          category: 'Concrete Work',
          description: `PCC M10 (1:3:6) bedding under footing of ${el.name} (100mm thick)`,
          unit: 'm³',
          quantity: parseFloat((el.length * el.width * 0.1 * el.quantity).toFixed(3)),
          rate: findRate('PCC M10 (1:3:6)'),
          amount: parseFloat((el.length * el.width * 0.1 * el.quantity * findRate('PCC M10 (1:3:6)')).toFixed(2)),
          materialId: matPcc?.id,
          materialName: matPcc?.name,
        });

        const matRcc = findMaterial('RCC M20 (1:1.5:3)');
        getOrCreateItems('Concrete Work').push({
          id: generateId(),
          sno: 0,
          category: 'Concrete Work',
          description: `RCC M20 (1:1.5:3) concrete in footing of ${el.name}`,
          unit: 'm³',
          quantity: parseFloat(vol.toFixed(3)),
          rate: findRate('RCC M20 (1:1.5:3)'),
          amount: parseFloat((vol * findRate('RCC M20 (1:1.5:3)')).toFixed(2)),
          materialId: matRcc?.id,
          materialName: matRcc?.name,
        });

        const matSteel = findMaterial('TMT / Deformed Bars');
        const steelQty = vol * 80;
        getOrCreateItems('Steel Reinforcement').push({
          id: generateId(),
          sno: 0,
          category: 'Steel Reinforcement',
          description: `Steel reinforcement for footing of ${el.name}`,
          unit: 'kg',
          quantity: parseFloat(steelQty.toFixed(2)),
          rate: findRate('TMT / Deformed Bars'),
          amount: parseFloat((steelQty * findRate('TMT / Deformed Bars')).toFixed(2)),
          materialId: matSteel?.id,
          materialName: matSteel?.name,
        });

        const matForm = findMaterial('Plywood Formwork');
        const formArea = 2 * (el.length + el.width) * el.height * el.quantity;
        getOrCreateItems('Formwork').push({
          id: generateId(),
          sno: 0,
          category: 'Formwork',
          description: `Plywood formwork for footing of ${el.name}`,
          unit: 'm²',
          quantity: parseFloat(formArea.toFixed(2)),
          rate: findRate('Plywood Formwork'),
          amount: parseFloat((formArea * findRate('Plywood Formwork')).toFixed(2)),
          materialId: matForm?.id,
          materialName: matForm?.name,
        });

        const matBrick = findMaterial('Brickwork in Cement Mortar (9")');
        const brickVol = el.length * el.width * 0.9 * el.quantity;
        getOrCreateItems('Brickwork / Masonry').push({
          id: generateId(),
          sno: 0,
          category: 'Brickwork / Masonry',
          description: `Brickwork in cement mortar (9") below ground level for ${el.name}`,
          unit: 'm³',
          quantity: parseFloat(brickVol.toFixed(3)),
          rate: findRate('Brickwork in Cement Mortar (9")'),
          amount: parseFloat((brickVol * findRate('Brickwork in Cement Mortar (9")')).toFixed(2)),
          materialId: matBrick?.id,
          materialName: matBrick?.name,
        });

        const matDpc = findMaterial('DPC (Damp Proof Course)');
        const dpcArea = el.length * el.width * el.quantity;
        getOrCreateItems('Waterproofing').push({
          id: generateId(),
          sno: 0,
          category: 'Waterproofing',
          description: `Damp Proof Course (50mm thick) for plinth of ${el.name}`,
          unit: 'm²',
          quantity: parseFloat(dpcArea.toFixed(2)),
          rate: findRate('DPC (Damp Proof Course)'),
          amount: parseFloat((dpcArea * findRate('DPC (Damp Proof Course)')).toFixed(2)),
          materialId: matDpc?.id,
          materialName: matDpc?.name,
        });

        const matSand = findMaterial('Sand Filling');
        const sandVol = el.length * el.width * 0.6 * el.quantity;
        getOrCreateItems('Earthwork').push({
          id: generateId(),
          sno: 0,
          category: 'Earthwork',
          description: `Sand filling under foundation/plinth of ${el.name} (0.6m deep)`,
          unit: 'm³',
          quantity: parseFloat(sandVol.toFixed(3)),
          rate: findRate('Sand Filling'),
          amount: parseFloat((sandVol * findRate('Sand Filling')).toFixed(2)),
          materialId: matSand?.id,
          materialName: matSand?.name,
        });
      }

      // 2. Slab elements (Roof & Floor takeoffs combined)
      else if (el.type === 'slab') {
        const matPcc = findMaterial('PCC M10 (1:3:6)');
        getOrCreateItems('Concrete Work').push({
          id: generateId(),
          sno: 0,
          category: 'Concrete Work',
          description: `PCC M10 (1:3:6) floor bedding under slab of ${el.name} (100mm thick)`,
          unit: 'm³',
          quantity: parseFloat((el.length * el.width * 0.1 * el.quantity).toFixed(3)),
          rate: findRate('PCC M10 (1:3:6)'),
          amount: parseFloat((el.length * el.width * 0.1 * el.quantity * findRate('PCC M10 (1:3:6)')).toFixed(2)),
          materialId: matPcc?.id,
          materialName: matPcc?.name,
        });

        const matScreed = findMaterial('PCC M15 (1:2:4)');
        const screedVol = el.length * el.width * 0.05 * el.quantity;
        getOrCreateItems('Flooring & Tiling').push({
          id: generateId(),
          sno: 0,
          category: 'Flooring & Tiling',
          description: `Cement screed bed (50mm thick) for flooring of ${el.name}`,
          unit: 'm³',
          quantity: parseFloat(screedVol.toFixed(3)),
          rate: findRate('PCC M15 (1:2:4)'),
          amount: parseFloat((screedVol * findRate('PCC M15 (1:2:4)')).toFixed(2)),
          materialId: matScreed?.id,
          materialName: matScreed?.name,
        });

        const matTile = findMaterial('Floor Tiles (Standard)');
        getOrCreateItems('Flooring & Tiling').push({
          id: generateId(),
          sno: 0,
          category: 'Flooring & Tiling',
          description: `Vitrified floor tiles with adhesive for slab ${el.name}`,
          unit: 'm²',
          quantity: parseFloat(area.toFixed(2)),
          rate: findRate('Floor Tiles (Standard)'),
          amount: parseFloat((area * findRate('Floor Tiles (Standard)')).toFixed(2)),
          materialId: matTile?.id,
          materialName: matTile?.name,
        });

        const matRcc = findMaterial('RCC M20 (1:1.5:3)');
        getOrCreateItems('Concrete Work').push({
          id: generateId(),
          sno: 0,
          category: 'Concrete Work',
          description: `RCC M20 (1:1.5:3) concrete in roof slab of ${el.name}`,
          unit: 'm³',
          quantity: parseFloat(vol.toFixed(3)),
          rate: findRate('RCC M20 (1:1.5:3)'),
          amount: parseFloat((vol * findRate('RCC M20 (1:1.5:3)')).toFixed(2)),
          materialId: matRcc?.id,
          materialName: matRcc?.name,
        });

        const matSteel = findMaterial('TMT / Deformed Bars');
        const steelQty = vol * 80;
        getOrCreateItems('Steel Reinforcement').push({
          id: generateId(),
          sno: 0,
          category: 'Steel Reinforcement',
          description: `Steel reinforcement for roof slab of ${el.name}`,
          unit: 'kg',
          quantity: parseFloat(steelQty.toFixed(2)),
          rate: findRate('TMT / Deformed Bars'),
          amount: parseFloat((steelQty * findRate('TMT / Deformed Bars')).toFixed(2)),
          materialId: matSteel?.id,
          materialName: matSteel?.name,
        });

        const matForm = findMaterial('Plywood Formwork');
        getOrCreateItems('Formwork').push({
          id: generateId(),
          sno: 0,
          category: 'Formwork',
          description: `Plywood formwork (bottom shuttering) for slab of ${el.name}`,
          unit: 'm²',
          quantity: parseFloat(area.toFixed(2)),
          rate: findRate('Plywood Formwork'),
          amount: parseFloat((area * findRate('Plywood Formwork')).toFixed(2)),
          materialId: matForm?.id,
          materialName: matForm?.name,
        });

        const matPlaster = findMaterial('Cement Plaster 12mm (1:6)');
        getOrCreateItems('Plastering').push({
          id: generateId(),
          sno: 0,
          category: 'Plastering',
          description: `Cement plaster 12mm (1:6) to ceiling of slab ${el.name}`,
          unit: 'm²',
          quantity: parseFloat(area.toFixed(2)),
          rate: findRate('Cement Plaster 12mm (1:6)'),
          amount: parseFloat((area * findRate('Cement Plaster 12mm (1:6)')).toFixed(2)),
          materialId: matPlaster?.id,
          materialName: matPlaster?.name,
        });

        const matWp = findMaterial('Bituminous Waterproofing');
        getOrCreateItems('Waterproofing').push({
          id: generateId(),
          sno: 0,
          category: 'Waterproofing',
          description: `Bituminous membrane waterproofing to top of slab ${el.name}`,
          unit: 'm²',
          quantity: parseFloat(area.toFixed(2)),
          rate: findRate('Bituminous Waterproofing'),
          amount: parseFloat((area * findRate('Bituminous Waterproofing')).toFixed(2)),
          materialId: matWp?.id,
          materialName: matWp?.name,
        });
      }

      // 3. Wall elements
      else if (el.type === 'wall' || el.type === 'parapet') {
        const deductions = getWallDeductions(el.name);
        const wallArea = Math.max(0, el.length * el.height * el.quantity - deductions.area);
        const wallVol = Math.max(0, vol - deductions.volume);

        const is9Inch = el.width > 0.15;
        const bwKey = is9Inch ? 'Brickwork in Cement Mortar (9")' : 'Brickwork in Cement Mortar (4.5")';
        const matBrick = findMaterial(bwKey);

        getOrCreateItems('Brickwork / Masonry').push({
          id: generateId(),
          sno: 0,
          category: 'Brickwork / Masonry',
          description: `Brickwork in cement mortar (${is9Inch ? '9"' : '4.5"'}) for wall ${el.name} (deducting openings)`,
          unit: is9Inch ? 'm³' : 'm²',
          quantity: is9Inch ? parseFloat(wallVol.toFixed(3)) : parseFloat(wallArea.toFixed(2)),
          rate: findRate(bwKey),
          amount: parseFloat(((is9Inch ? wallVol : wallArea) * findRate(bwKey)).toFixed(2)),
          materialId: matBrick?.id,
          materialName: matBrick?.name,
        });

        const matPlaster = findMaterial('Cement Plaster 12mm (1:6)');
        getOrCreateItems('Plastering').push({
          id: generateId(),
          sno: 0,
          category: 'Plastering',
          description: `Cement plaster 12mm (1:6) to wall ${el.name} on both sides (deducting openings)`,
          unit: 'm²',
          quantity: parseFloat((wallArea * 2).toFixed(2)),
          rate: findRate('Cement Plaster 12mm (1:6)'),
          amount: parseFloat((wallArea * 2 * findRate('Cement Plaster 12mm (1:6)')).toFixed(2)),
          materialId: matPlaster?.id,
          materialName: matPlaster?.name,
        });
      }

      // 4. Other Concrete elements (column, beam, lintel, staircase, plinth)
      else if (['column', 'beam', 'lintel', 'staircase', 'plinth'].includes(el.type)) {
        const matRcc = findMaterial('RCC M20 (1:1.5:3)');
        getOrCreateItems('Concrete Work').push({
          id: generateId(),
          sno: 0,
          category: 'Concrete Work',
          description: `RCC M20 (1:1.5:3) concrete in ${el.name}`,
          unit: 'm³',
          quantity: parseFloat(vol.toFixed(3)),
          rate: findRate('RCC M20 (1:1.5:3)'),
          amount: parseFloat((vol * findRate('RCC M20 (1:1.5:3)')).toFixed(2)),
          materialId: matRcc?.id,
          materialName: matRcc?.name,
        });

        const steelRatio = el.type === 'column' ? 180 : el.type === 'beam' ? 120 : 100;
        const matSteel = findMaterial('TMT / Deformed Bars');
        const steelQty = vol * steelRatio;
        getOrCreateItems('Steel Reinforcement').push({
          id: generateId(),
          sno: 0,
          category: 'Steel Reinforcement',
          description: `Steel reinforcement for ${el.name}`,
          unit: 'kg',
          quantity: parseFloat(steelQty.toFixed(2)),
          rate: findRate('TMT / Deformed Bars'),
          amount: parseFloat((steelQty * findRate('TMT / Deformed Bars')).toFixed(2)),
          materialId: matSteel?.id,
          materialName: matSteel?.name,
        });

        let formArea = 0;
        if (el.type === 'column') formArea = 2 * (el.length + el.width) * el.height * el.quantity;
        else if (el.type === 'beam') formArea = (2 * el.height + el.width) * el.length * el.quantity;
        else if (el.type === 'staircase') formArea = area;
        else formArea = 2 * el.height * el.length * el.quantity; // plinth / lintels side shuttering

        const matForm = findMaterial('Plywood Formwork');
        getOrCreateItems('Formwork').push({
          id: generateId(),
          sno: 0,
          category: 'Formwork',
          description: `Plywood formwork for ${el.name}`,
          unit: 'm²',
          quantity: parseFloat(formArea.toFixed(2)),
          rate: findRate('Plywood Formwork'),
          amount: parseFloat((formArea * findRate('Plywood Formwork')).toFixed(2)),
          materialId: matForm?.id,
          materialName: matForm?.name,
        });
      }

      // 5. Door elements
      else if (el.type === 'door') {
        const matDoor = findMaterial('Flush Door (Standard)');
        getOrCreateItems('Woodwork & Doors').push({
          id: generateId(),
          sno: 0,
          category: 'Woodwork & Doors',
          description: `Flush door supply and installation for ${el.name}`,
          unit: 'nos',
          quantity: el.quantity,
          rate: findRate('Flush Door (Standard)'),
          amount: parseFloat((el.quantity * findRate('Flush Door (Standard)')).toFixed(2)),
          materialId: matDoor?.id,
          materialName: matDoor?.name,
        });

        const matPaint = findMaterial('Enamel Paint');
        const paintArea = el.length * el.height * 2 * el.quantity;
        getOrCreateItems('Painting').push({
          id: generateId(),
          sno: 0,
          category: 'Painting',
          description: `Enamel painting on door surfaces for ${el.name} (both sides)`,
          unit: 'm²',
          quantity: parseFloat(paintArea.toFixed(2)),
          rate: findRate('Enamel Paint'),
          amount: parseFloat((paintArea * findRate('Enamel Paint')).toFixed(2)),
          materialId: matPaint?.id,
          materialName: matPaint?.name,
        });
      }

      // 6. Window elements
      else if (el.type === 'window') {
        const matWin = findMaterial('Wooden Window');
        getOrCreateItems('Woodwork & Doors').push({
          id: generateId(),
          sno: 0,
          category: 'Woodwork & Doors',
          description: `Wooden window supply and installation for ${el.name}`,
          unit: 'nos',
          quantity: el.quantity,
          rate: findRate('Wooden Window'),
          amount: parseFloat((el.quantity * findRate('Wooden Window')).toFixed(2)),
          materialId: matWin?.id,
          materialName: matWin?.name,
        });
      }
    });

    const newSections: BOQSection[] = [];
    sectionMap.forEach((items, title) => {
      if (items.length > 0) {
        items.forEach((item, index) => {
          item.sno = index + 1;
        });
        newSections.push({
          id: generateId(),
          title,
          items,
          subtotal: items.reduce((s, i) => s + i.amount, 0),
        });
      }
    });

    updateProject({ boqSections: newSections });
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
          <div className="boq-grand-total" style={{ marginBottom: 'var(--space-6)' }}>
            <h3>GRAND TOTAL</h3>
            <div className="total-value">{formatCurrency(grandTotal, currency.symbol)}</div>
          </div>

          {/* Quantity Verification & Cross-check Panel */}
          <div className="card" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-8)', padding: 'var(--space-6)', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              🔍 Engineering Quantity Verification & Cross-Checks
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
              Audit panel validating mathematical consistency and typical engineering ratios of the current estimate.
            </p>
            <div className="grid-3" style={{ gap: 'var(--space-4)' }}>
              {/* Card 1: Concrete & Steel */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--accent-primary)' }}>🏗️ Concrete & Steel Ratio</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                  <div className="flex-between">
                    <span>Wet Concrete Volume:</span>
                    <span className="font-bold text-mono">{crossChecks.wetConcrete.toFixed(2)} m³</span>
                  </div>
                  <div className="flex-between">
                    <span>Dry Concrete (1.54×):</span>
                    <span className="font-bold text-mono">{crossChecks.dryConcrete.toFixed(2)} m³</span>
                  </div>
                  <div className="flex-between">
                    <span>Total Reinforcement:</span>
                    <span className="font-bold text-mono">{crossChecks.steelWeight.toFixed(0)} kg</span>
                  </div>
                  <div className="flex-between" style={{ paddingTop: 'var(--space-2)', borderTop: '1px dashed var(--border-color)', marginTop: 'var(--space-2)' }}>
                    <span>Avg Steel Density:</span>
                    <span className={`font-bold text-mono ${crossChecks.avgSteelDensity >= 70 && crossChecks.avgSteelDensity <= 180 ? 'text-success' : 'text-warning'}`}>
                      {crossChecks.avgSteelDensity.toFixed(1)} kg/m³
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {crossChecks.wetConcrete === 0 ? 'No concrete elements found.' :
                     crossChecks.avgSteelDensity >= 70 && crossChecks.avgSteelDensity <= 180 
                      ? '✅ Standard Range (70-180 kg/m³)' 
                      : '⚠️ Steel ratio is outside typical ranges.'}
                  </div>
                </div>
              </div>

              {/* Card 2: Masonry & Bricks */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--success)' }}>🧱 Masonry & Brick Count</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                  <div className="flex-between">
                    <span>Total Brickwork Vol:</span>
                    <span className="font-bold text-mono">{crossChecks.brickworkVol.toFixed(2)} m³</span>
                  </div>
                  <div className="flex-between">
                    <span>Expected Bricks:</span>
                    <span className="font-bold text-mono">{crossChecks.estimatedBricks.toLocaleString()} nos</span>
                  </div>
                  <div className="flex-between">
                    <span>Mortar Vol (25%):</span>
                    <span className="font-bold text-mono">{(crossChecks.brickworkVol * 0.25).toFixed(2)} m³</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px dashed var(--border-color)' }}>
                    ℹ️ Bricks calculated at 500 nos per m³ with 5% wastage factor included.
                  </div>
                </div>
              </div>

              {/* Card 3: Material Aggregates */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--warning)' }}>📦 Material Aggregates</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                  <div className="flex-between">
                    <span>Projected Cement:</span>
                    <span className="font-bold text-mono">{crossChecks.totalCementBags.toFixed(0)} bags</span>
                  </div>
                  <div className="flex-between">
                    <span>Projected Sand:</span>
                    <span className="font-bold text-mono">{(crossChecks.wetConcrete * 0.425 + crossChecks.brickworkVol * 0.25 * 1.05).toFixed(1)} m³</span>
                  </div>
                  <div className="flex-between">
                    <span>Projected Aggregates:</span>
                    <span className="font-bold text-mono">{(crossChecks.wetConcrete * 0.85).toFixed(1)} m³</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px dashed var(--border-color)' }}>
                    ℹ️ Estimated cement bags based on concrete mixes and plaster requirements.
                  </div>
                </div>
              </div>
            </div>
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
