// ============================================
// CivilEstimator Pro — Upload Drawing Page
// ============================================

'use client';

import React, { useState, useCallback } from 'react';
import { useProject } from '@/context/ProjectContext';
import { analyzeDrawing, isGeminiConfigured } from '@/lib/gemini';
import { AIAnalysisResult, DetectedElement, StructuralElement, UploadedFile } from '@/lib/types';
import { calculateVolume, calculateArea } from '@/lib/calculations';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default function UploadDrawingPage() {
  const { addElement, addDrawingFile } = useProject();
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [editedElements, setEditedElements] = useState<DetectedElement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    if (!isGeminiConfigured()) {
      setError('⚙️ Gemini API key not configured. Click the Settings button in the header to add your API key from https://aistudio.google.com/apikey');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Use only the base64 data, not the full data URL
      const base64 = imagePreview.includes(',')
        ? imagePreview.split(',')[1]
        : imagePreview;
      const mimeType = file?.type || 'image/jpeg';
      const result = await analyzeDrawing(base64, mimeType);

      setAnalysisResult(result);
      setEditedElements(result.elements);

      if (!result.success) {
        setError(`AI analysis returned no results: ${result.rawResponse}`);
      }

      // Save file reference
      const uploadedFile: UploadedFile = {
        id: generateId(),
        name: file?.name || 'drawing',
        type: file?.type || 'image/jpeg',
        size: file?.size || 0,
        url: imagePreview,
        base64: base64,
        uploadedAt: new Date().toISOString(),
      };
      addDrawingFile(uploadedFile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      console.error('[Upload] Analysis error:', msg);
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOverride = (index: number, field: string, value: number) => {
    setEditedElements(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        overridden: true,
        manualValues: {
          ...updated[index].manualValues,
          [field]: value,
        },
      };
      return updated;
    });
  };

  const handleAddToProject = () => {
    editedElements.forEach((el) => {
      const dims = el.overridden && el.manualValues
        ? { ...el.dimensions, ...el.manualValues }
        : el.dimensions;

      const element: StructuralElement = {
        id: generateId(),
        type: el.type,
        name: el.label,
        length: dims.length || 0,
        width: dims.width || 0,
        height: dims.height || 0,
        quantity: 1,
        unit: 'm',
        volume: calculateVolume(dims.length || 0, dims.width || 0, dims.height || 0),
        area: calculateArea(dims.length || 0, dims.width || 0),
        notes: `AI detected (confidence: ${(el.confidence * 100).toFixed(0)}%)`,
      };
      addElement(element);
    });

    setAnalysisResult(null);
    setEditedElements([]);
    setImagePreview(null);
    setFile(null);
  };

  const getConfidenceClass = (c: number) => c >= 0.7 ? 'high' : c >= 0.4 ? 'medium' : 'low';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upload Drawing</h1>
        <p>Upload construction drawings for AI-powered analysis and dimension extraction</p>
      </div>

      {/* Mode Toggle */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex-between">
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, marginRight: 'var(--space-3)' }}>
              Analysis Mode:
            </span>
            <span className={`badge ${mode === 'auto' ? 'badge-primary' : 'badge-warning'}`}>
              {mode === 'auto' ? '🤖 AI Auto-Detect' : '✏️ Manual Override'}
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={mode === 'manual'}
              onChange={() => setMode(mode === 'auto' ? 'manual' : 'auto')}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="grid-2">
        {/* Upload Area */}
        <div>
          <div
            className={`file-dropzone ${dragActive ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="file-dropzone-icon">📐</div>
            <div className="file-dropzone-text">
              <strong>Drop your drawing here</strong> or click to browse
            </div>
            <div className="file-dropzone-hint">
              Supports: PDF, PNG, JPG, WEBP, BMP, TIFF
            </div>
          </div>

          {/* Preview */}
          {imagePreview && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div className="drawing-preview">
                <img src={imagePreview} alt="Drawing preview" />
              </div>
              <div className="flex" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  style={{ flex: 1 }}
                >
                  {analyzing ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }}></span>
                      Analyzing...
                    </>
                  ) : (
                    <>🤖 Analyze with AI</>
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setFile(null); setImagePreview(null); setAnalysisResult(null); }}
                >
                  ✕ Clear
                </button>
              </div>
              {file && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                  📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="card" style={{ marginTop: 'var(--space-4)', borderColor: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ {error}</p>
            </div>
          )}
        </div>

        {/* Analysis Results */}
        <div>
          {analyzing && (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }}></div>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>AI Analyzing Drawing...</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Detecting walls, slabs, columns, beams and extracting dimensions
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                Retry logic: up to 3 attempts with exponential backoff
              </p>
            </div>
          )}

          {analysisResult && analysisResult.success && (
            <div className="card analysis-panel">
              <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🔍 Analysis Results</h3>
                <div className="analysis-confidence">
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Confidence: {(analysisResult.confidence * 100).toFixed(0)}%
                  </span>
                  <div className="confidence-bar" style={{ width: '80px' }}>
                    <div
                      className={`confidence-fill ${getConfidenceClass(analysisResult.confidence)}`}
                      style={{ width: `${analysisResult.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Detected {editedElements.length} elements. Edit values below if needed.
              </p>

              {/* Detected Elements Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Label</th>
                      <th>Length (m)</th>
                      <th>Width (m)</th>
                      <th>Height (m)</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedElements.map((el, idx) => {
                      const dims = el.overridden && el.manualValues
                        ? { ...el.dimensions, ...el.manualValues }
                        : el.dimensions;
                      return (
                        <tr key={idx}>
                          <td><span className="badge badge-primary">{el.type}</span></td>
                          <td style={{ fontSize: '0.82rem' }}>{el.label}</td>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input-number"
                              style={{ width: '80px', padding: '4px 8px', fontSize: '0.82rem' }}
                              value={dims.length || ''}
                              onChange={(e) => handleOverride(idx, 'length', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input-number"
                              style={{ width: '80px', padding: '4px 8px', fontSize: '0.82rem' }}
                              value={dims.width || ''}
                              onChange={(e) => handleOverride(idx, 'width', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input-number"
                              style={{ width: '80px', padding: '4px 8px', fontSize: '0.82rem' }}
                              value={dims.height || ''}
                              onChange={(e) => handleOverride(idx, 'height', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <div className="confidence-bar" style={{ width: '60px' }}>
                              <div
                                className={`confidence-fill ${getConfidenceClass(el.confidence)}`}
                                style={{ width: `${el.confidence * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Extracted Dimensions */}
              {analysisResult.dimensions.length > 0 && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                    📏 Extracted Dimensions
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {analysisResult.dimensions.map((dim, idx) => (
                      <div key={idx} className="badge badge-info" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        {dim.label}: {dim.value} {dim.unit}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Project Button */}
              <div style={{ marginTop: 'var(--space-6)' }}>
                <button className="btn btn-primary btn-lg w-full" onClick={handleAddToProject}>
                  ✅ Add {editedElements.length} Elements to Project
                </button>
              </div>
            </div>
          )}

          {!analyzing && !analysisResult && (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)', opacity: 0.15 }}>🤖</div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                AI Analysis Ready
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                Upload a construction drawing and click &quot;Analyze with AI&quot; to detect structural elements
              </p>
              <div style={{ marginTop: 'var(--space-6)', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                <p>✅ Detects: Walls, Slabs, Columns, Beams, Foundations</p>
                <p>✅ Extracts: Length, Width, Height, Area, Volume</p>
                <p>✅ Retry: 3 attempts with exponential backoff</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
