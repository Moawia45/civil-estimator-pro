// ============================================
// CivilEstimator Pro — Materials Database
// ============================================

import { Material } from './types';

export const DEFAULT_MATERIALS: Material[] = [
  // ---- Earthwork ----
  { id: 'exc-earth', name: 'Excavation in Earth (Manual)', category: 'excavation', unit: 'm3', rate: 8.50, description: 'Manual excavation in ordinary soil' },
  { id: 'exc-hard', name: 'Excavation in Hard Rock', category: 'excavation', unit: 'm3', rate: 25.00, description: 'Excavation in hard rock with machinery' },
  { id: 'exc-soft', name: 'Excavation in Soft Rock', category: 'excavation', unit: 'm3', rate: 15.00, description: 'Excavation in soft/weathered rock' },
  { id: 'backfill', name: 'Backfilling', category: 'excavation', unit: 'm3', rate: 5.00, description: 'Backfilling with excavated material' },
  { id: 'sand-fill', name: 'Sand Filling', category: 'excavation', unit: 'm3', rate: 12.00, description: 'Sand filling under foundation/floor' },

  // ---- Concrete ----
  { id: 'pcc-m10', name: 'PCC M10 (1:3:6)', category: 'concrete', unit: 'm3', rate: 65.00, description: 'Plain Cement Concrete M10' },
  { id: 'pcc-m15', name: 'PCC M15 (1:2:4)', category: 'concrete', unit: 'm3', rate: 80.00, description: 'Plain Cement Concrete M15' },
  { id: 'rcc-m20', name: 'RCC M20 (1:1.5:3)', category: 'concrete', unit: 'm3', rate: 110.00, description: 'Reinforced Cement Concrete M20' },
  { id: 'rcc-m25', name: 'RCC M25', category: 'concrete', unit: 'm3', rate: 130.00, description: 'Reinforced Cement Concrete M25' },
  { id: 'rcc-m30', name: 'RCC M30', category: 'concrete', unit: 'm3', rate: 155.00, description: 'Reinforced Cement Concrete M30' },
  { id: 'rcc-m35', name: 'RCC M35', category: 'concrete', unit: 'm3', rate: 175.00, description: 'Reinforced Cement Concrete M35' },

  // ---- Brickwork ----
  { id: 'brick-9', name: 'Brickwork in Cement Mortar (9")', category: 'brickwork', unit: 'm3', rate: 55.00, description: '9 inch brick masonry in 1:6 cement mortar' },
  { id: 'brick-4.5', name: 'Brickwork in Cement Mortar (4.5")', category: 'brickwork', unit: 'm2', rate: 12.00, description: '4.5 inch brick masonry in 1:6 cement mortar' },
  { id: 'brick-13.5', name: 'Brickwork in Cement Mortar (13.5")', category: 'brickwork', unit: 'm3', rate: 62.00, description: '13.5 inch brick masonry' },
  { id: 'block-6', name: 'Concrete Block Work (6")', category: 'brickwork', unit: 'm2', rate: 18.00, description: '6 inch concrete block masonry' },
  { id: 'block-8', name: 'Concrete Block Work (8")', category: 'brickwork', unit: 'm2', rate: 22.00, description: '8 inch concrete block masonry' },

  // ---- Steel ----
  { id: 'steel-ms', name: 'Mild Steel Bars', category: 'steel', unit: 'kg', rate: 0.85, description: 'Mild steel reinforcement bars' },
  { id: 'steel-tmt', name: 'TMT / Deformed Bars', category: 'steel', unit: 'kg', rate: 0.95, description: 'High yield strength deformed bars (Fe500)' },
  { id: 'steel-struct', name: 'Structural Steel', category: 'steel', unit: 'kg', rate: 1.20, description: 'Structural steel sections (I-beams, channels)' },
  { id: 'wire-mesh', name: 'Welded Wire Mesh', category: 'steel', unit: 'm2', rate: 4.50, description: 'Welded wire mesh for slabs' },
  { id: 'binding-wire', name: 'Binding Wire', category: 'steel', unit: 'kg', rate: 1.50, description: '18 gauge binding wire' },

  // ---- Plastering ----
  { id: 'plaster-12', name: 'Cement Plaster 12mm (1:6)', category: 'plaster', unit: 'm2', rate: 5.00, description: '12mm cement plaster with 1:6 ratio (internal)' },
  { id: 'plaster-20', name: 'Cement Plaster 20mm (1:4)', category: 'plaster', unit: 'm2', rate: 7.50, description: '20mm cement plaster with 1:4 ratio (external)' },
  { id: 'plaster-pop', name: 'POP Plaster / Finish', category: 'plaster', unit: 'm2', rate: 4.00, description: 'Plaster of Paris finish coat' },
  { id: 'render', name: 'Rendering (Sand-Cement)', category: 'plaster', unit: 'm2', rate: 6.00, description: 'Sand-cement rendering on walls' },

  // ---- Formwork ----
  { id: 'form-ply', name: 'Plywood Formwork', category: 'formwork', unit: 'm2', rate: 15.00, description: 'Plywood formwork for RCC elements' },
  { id: 'form-steel', name: 'Steel Formwork', category: 'formwork', unit: 'm2', rate: 22.00, description: 'Steel shuttering for columns/beams' },

  // ---- Waterproofing ----
  { id: 'wp-bitumen', name: 'Bituminous Waterproofing', category: 'waterproofing', unit: 'm2', rate: 8.00, description: 'Bituminous membrane waterproofing' },
  { id: 'wp-chemical', name: 'Chemical Waterproofing', category: 'waterproofing', unit: 'm2', rate: 12.00, description: 'Polymer-based chemical waterproofing' },

  // ---- Painting ----
  { id: 'paint-primer', name: 'Primer Coat', category: 'painting', unit: 'm2', rate: 2.00, description: 'Primer coat on plastered surface' },
  { id: 'paint-emulsion', name: 'Emulsion Paint (2 Coats)', category: 'painting', unit: 'm2', rate: 3.50, description: 'Interior emulsion paint, 2 coats' },
  { id: 'paint-weather', name: 'Weather Coat Paint', category: 'painting', unit: 'm2', rate: 4.50, description: 'Exterior weatherproof paint, 2 coats' },
  { id: 'paint-enamel', name: 'Enamel Paint', category: 'painting', unit: 'm2', rate: 5.00, description: 'Enamel paint for doors/windows' },
  { id: 'paint-distemper', name: 'Distemper (2 Coats)', category: 'painting', unit: 'm2', rate: 2.50, description: 'Acrylic distemper, 2 coats' },

  // ---- Tiling ----
  { id: 'tile-floor', name: 'Floor Tiles (Standard)', category: 'tiling', unit: 'm2', rate: 18.00, description: 'Ceramic floor tiles with adhesive' },
  { id: 'tile-wall', name: 'Wall Tiles (Bathroom)', category: 'tiling', unit: 'm2', rate: 15.00, description: 'Glazed ceramic wall tiles' },
  { id: 'tile-marble', name: 'Marble Flooring', category: 'tiling', unit: 'm2', rate: 35.00, description: 'Polished marble flooring' },
  { id: 'tile-granite', name: 'Granite Flooring', category: 'tiling', unit: 'm2', rate: 45.00, description: 'Polished granite flooring' },
  { id: 'tile-vitrified', name: 'Vitrified Tiles', category: 'tiling', unit: 'm2', rate: 22.00, description: 'Vitrified tiles with adhesive' },

  // ---- Flooring ----
  { id: 'floor-pcc', name: 'PCC Flooring (100mm)', category: 'flooring', unit: 'm2', rate: 12.00, description: 'PCC flooring 100mm thick' },
  { id: 'floor-terrazzo', name: 'Terrazzo Flooring', category: 'flooring', unit: 'm2', rate: 28.00, description: 'In-situ terrazzo flooring' },

  // ---- Roofing ----
  { id: 'roof-gi', name: 'GI Sheet Roofing', category: 'roofing', unit: 'm2', rate: 14.00, description: 'Galvanized iron corrugated sheet roofing' },
  { id: 'roof-rcc', name: 'RCC Roof Slab', category: 'roofing', unit: 'm2', rate: 42.00, description: 'RCC roof slab 150mm thick' },

  // ---- Plumbing ----
  { id: 'plumb-pvc', name: 'PVC Pipe (4")', category: 'plumbing', unit: 'rm', rate: 6.00, description: '4 inch PVC drainage pipe' },
  { id: 'plumb-gi', name: 'GI Pipe (1")', category: 'plumbing', unit: 'rm', rate: 8.00, description: '1 inch GI water supply pipe' },
  { id: 'plumb-cpvc', name: 'CPVC Pipe (3/4")', category: 'plumbing', unit: 'rm', rate: 5.50, description: '3/4 inch CPVC hot/cold water pipe' },

  // ---- Electrical ----
  { id: 'elec-wiring', name: 'Electrical Wiring Point', category: 'electrical', unit: 'nos', rate: 15.00, description: 'Single electrical wiring point with accessories' },
  { id: 'elec-conduit', name: 'PVC Conduit (25mm)', category: 'electrical', unit: 'rm', rate: 3.50, description: '25mm PVC electrical conduit' },

  // ---- Woodwork ----
  { id: 'wood-door', name: 'Flush Door (Standard)', category: 'woodwork', unit: 'nos', rate: 120.00, description: 'Standard flush door with frame' },
  { id: 'wood-window', name: 'Wooden Window', category: 'woodwork', unit: 'nos', rate: 85.00, description: 'Standard wooden window with glass' },
  { id: 'wood-alum-window', name: 'Aluminium Window', category: 'woodwork', unit: 'm2', rate: 45.00, description: 'Aluminium sliding window with glass' },

  // ---- Miscellaneous ----
  { id: 'misc-scaffolding', name: 'Scaffolding', category: 'miscellaneous', unit: 'm2', rate: 6.00, description: 'Steel scaffolding for construction' },
  { id: 'misc-curing', name: 'Curing (Water Curing)', category: 'miscellaneous', unit: 'm2', rate: 1.50, description: 'Water curing for concrete/plaster' },
  { id: 'misc-dpc', name: 'DPC (Damp Proof Course)', category: 'miscellaneous', unit: 'm2', rate: 10.00, description: 'Damp proof course with bitumen' },
  { id: 'misc-antitermite', name: 'Anti-Termite Treatment', category: 'miscellaneous', unit: 'm2', rate: 3.00, description: 'Chemical anti-termite treatment' },
];
