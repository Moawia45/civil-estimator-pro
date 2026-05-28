// ============================================
// CivilEstimator Pro — AI Client
// Supports Google Gemini · Groq · xAI Grok
// ============================================

import { AIAnalysisResult, DetectedElement, DetectedDimension } from './types';

// ---- Provider & Model Registry ----

export type AIProvider = 'gemini' | 'groq' | 'grok';

export interface AIModelOption {
  id: string;
  label: string;
  vision: boolean;
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

export const GEMINI_MODELS: AIModelOption[] = [
  { id: 'gemini-2.0-flash',              label: 'Gemini 2.0 Flash ✨ (Recommended, Free)', vision: true  },
  { id: 'gemini-2.0-flash-lite',         label: 'Gemini 2.0 Flash Lite (Fastest, Free)',   vision: true  },
  { id: 'gemini-1.5-flash',              label: 'Gemini 1.5 Flash (Free)',                  vision: true  },
  { id: 'gemini-1.5-flash-8b',           label: 'Gemini 1.5 Flash 8B (Lightest, Free)',     vision: true  },
  { id: 'gemini-1.5-pro',                label: 'Gemini 1.5 Pro (Best Quality)',             vision: true  },
  { id: 'gemini-2.5-flash-preview-04-17',label: 'Gemini 2.5 Flash Preview',                vision: true  },
];

export const GROQ_MODELS: AIModelOption[] = [
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct',     label: 'Llama 4 Scout 17B ✨ (Vision, Recommended)', vision: true  },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick 17B (Vision)',             vision: true  },
  { id: 'llama-3.2-90b-vision-preview',                  label: 'Llama 3.2 90B Vision (Free)',                vision: true  },
  { id: 'llama-3.2-11b-vision-preview',                  label: 'Llama 3.2 11B Vision (Fastest)',             vision: true  },
  { id: 'llama-3.3-70b-versatile',                       label: 'Llama 3.3 70B (Text Only — no drawing)',     vision: false },
];

export const GROK_MODELS: AIModelOption[] = [
  { id: 'grok-2-vision-1212', label: 'Grok 2 Vision ✨ (Image Support)',  vision: true  },
  { id: 'grok-vision-beta',   label: 'Grok Vision Beta (Image Support)',   vision: true  },
  { id: 'grok-2-1212',        label: 'Grok 2 (Text Only)',                 vision: false },
  { id: 'grok-3-mini',        label: 'Grok 3 Mini (Text Only)',            vision: false },
];

export const PROVIDERS: { id: AIProvider; label: string; icon: string; hint: string; keyPrefix?: string }[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    icon: '🔮',
    hint: 'Free key → aistudio.google.com/apikey',
    keyPrefix: 'AI',
  },
  {
    id: 'groq',
    label: 'Groq (groq.com)',
    icon: '⚡',
    hint: 'Free key → console.groq.com/keys  (key starts with gsk_)',
    keyPrefix: 'gsk_',
  },
  {
    id: 'grok',
    label: 'xAI Grok',
    icon: '🌌',
    hint: 'Free key → console.x.ai',
    keyPrefix: 'xai-',
  },
];

export function modelsForProvider(p: AIProvider): AIModelOption[] {
  if (p === 'groq')   return GROQ_MODELS;
  if (p === 'grok')   return GROK_MODELS;
  return GEMINI_MODELS;
}

export function defaultModelForProvider(p: AIProvider): string {
  return modelsForProvider(p)[0].id;
}

// ---- LocalStorage Config ----

const CONFIG_KEY = 'civil_ai_config';

export function getAIConfig(): AIConfig {
  if (typeof window === 'undefined') {
    return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: '' };
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const p = JSON.parse(raw) as AIConfig;
      if (!p.provider) p.provider = 'gemini';
      if (!p.model)    p.model    = defaultModelForProvider(p.provider);
      return p;
    }
    // Migrate old key
    const legacy = localStorage.getItem('gemini_api_key') || '';
    return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: legacy };
  } catch {
    return { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: '' };
  }
}

export function setAIConfig(cfg: AIConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    if (cfg.provider === 'gemini') localStorage.setItem('gemini_api_key', cfg.apiKey);
  }
}

export function isAIConfigured(): boolean {
  return !!getAIConfig().apiKey;
}

// Legacy compat
export const isGeminiConfigured = isAIConfigured;
export function setGeminiApiKey(key: string) { setAIConfig({ ...getAIConfig(), apiKey: key }); }
export function getGeminiApiKey(): string     { return getAIConfig().apiKey; }

// ---- Core Call (via server route) ----
// NOTE: No API key is sent from the client.
// The server uses GROQ_API_KEY from .env.local automatically.

async function callAI(
  prompt: string,
  imageBase64?: string,
  mimeType = 'image/jpeg'
): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      imageBase64: imageBase64
        ? imageBase64.replace(/^data:[^;]+;base64,/, '')
        : undefined,
      mimeType,
    }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data?.error || `API error ${res.status}`);
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));

  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.choices?.[0]?.message?.content;

  if (!text) {
    const finish = data?.candidates?.[0]?.finishReason || data?.choices?.[0]?.finish_reason;
    if (finish === 'SAFETY') throw new Error('Blocked by safety filters.');
    throw new Error('Empty AI response. Try again.');
  }

  return text;
}

// ---- JSON Extraction ----

function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fence) return fence[1].trim();
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  return text.trim();
}

// ---- Drawing Analysis ----

export async function analyzeDrawing(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<AIAnalysisResult> {
  const prompt = `You are an expert Civil Engineer and Quantity Surveyor.
Analyze this construction floor plan drawing carefully. Look for text, annotations, scale, or labels indicating the units used (e.g., feet, inches, meters, mm).
Extract ALL structural elements (walls, slab, door openings, window openings).

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "detectedUnit": "ft", // Must be "ft" if the drawing uses feet/inches, or "m" if the drawing uses meters/metric
  "elements": [
    {
      "type": "wall",
      "label": "External Wall North",
      "dimensions": { "length": 11.5, "width": 0.75, "height": 10.0 }, // Keep dimensions in the native drawing unit!
      "confidence": 0.9
    }
  ],
  "dimensions": [
    { "label": "Outer Length", "value": 11.5, "unit": "ft", "confidence": 0.95 }
  ],
  "overall_confidence": 0.85
}

Element type must be one of: wall | slab | column | beam | foundation | footing | staircase | lintel | plinth | parapet | door | window

IMPORTANT RULES FOR ACCURATE EXTRACTION:
1. DETECTING DRAWING UNIT:
   - Identify whether the drawing is annotated in feet/inches (e.g. 10', 9", 11'6") or meters/mm.
   - Set the root-level "detectedUnit" to "ft" (imperial) or "m" (metric).
   - If the drawing is in feet/inches, all dimensions in the JSON "elements" array must be in FEET (with inches converted to decimal feet, e.g. 9 inches = 0.75 ft, 6 inches = 0.5 ft). Do NOT convert them to meters in the JSON output!
   - If the drawing is in meters, all dimensions must be in METERS.

2. WALL QUANTITY DUPLICATION (Long-Wall / Short-Wall Method):
   - To avoid duplicate corner calculations:
     - North and South walls: Use OUTER length (e.g. 11.5 ft or 3.505 m).
     - East and West walls: Use INNER length (e.g. 10.0 ft or 3.048 m).
     - Standard walls height is 10 ft (3.048 m) and thickness is 9 inches (0.75 ft or 0.2286 m).

3. DOORS & WINDOWS (Openings):
   - Explicitly detect and extract all doors and windows as "door" or "window" element types.
   - Set dimensions: Length is the opening width (e.g. Door = 3 ft = 0.914 m, Window = 4 ft = 1.219 m), Height is opening height (e.g. Door = 7 ft = 2.134 m, Window = 4 ft = 1.219 m), Width is wall thickness (9 inches = 0.75 ft or 0.2286 m).
   - Use clear directional labels indicating their wall placement (e.g., "Door (South Wall)", "Window (West Wall)") so they can be deducted from the correct wall.

4. SLAB THICKNESS:
   - For slabs, the Length and Width represent the floor plan footprint (e.g., outer dimensions 11.5 ft x 11.5 ft).
   - The slab height represents its actual structural thickness (e.g. 6 inches = 0.5 ft or 0.15 m), NOT the room height of 10 ft.

Return ONLY the JSON.`;

  try {
    const raw  = await callAI(prompt, imageBase64, mimeType);
    const json = extractJSON(raw);
    let parsed: { 
      elements?: Record<string, unknown>[]; 
      dimensions?: Record<string, unknown>[]; 
      overall_confidence?: number;
      detectedUnit?: string;
    };

    try { parsed = JSON.parse(json); }
    catch { throw new Error('Could not parse AI response. Try a clearer image.'); }

    const elements: DetectedElement[] = (parsed.elements || []).map((e) => ({
      type:       (e.type as DetectedElement['type']) || 'wall',
      label:      (e.label as string)    || 'Element',
      dimensions: (e.dimensions as { length?: number; width?: number; height?: number }) || {},
      confidence: (e.confidence as number) || 0.5,
      overridden: false,
    }));

    const dimensions: DetectedDimension[] = (parsed.dimensions || []).map((d) => ({
      label:      (d.label      as string) || 'Dimension',
      value:      (d.value      as number) || 0,
      unit:       (d.unit       as string) || 'm',
      confidence: (d.confidence as number) || 0.5,
    }));

    const detectedUnit = (parsed.detectedUnit === 'm' || parsed.detectedUnit === 'meters') ? 'm' : 'ft';

    return { 
      success: true, 
      elements, 
      dimensions, 
      rawResponse: raw, 
      confidence: parsed.overall_confidence ?? 0.7, 
      retryCount: 0,
      detectedUnit
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, elements: [], dimensions: [], rawResponse: msg, confidence: 0, retryCount: 0 };
  }
}

export async function parseBOQWithAI(text: string) {
  const prompt = `Parse this BOQ text and return JSON only:\n{\n  "projectName": "...",\n  "items": [{ "description": "...", "unit": "m3", "quantity": 1, "rate": 100, "amount": 100 }]\n}\n\nInput:\n${text}`;
  const raw = await callAI(prompt);
  return JSON.parse(extractJSON(raw));
}
