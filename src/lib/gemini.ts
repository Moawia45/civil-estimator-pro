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
Analyze this construction floor plan drawing carefully and extract ALL structural elements.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "elements": [
    {
      "type": "wall",
      "label": "External Wall North",
      "dimensions": { "length": 7.62, "width": 0.23, "height": 3.0 },
      "confidence": 0.9
    }
  ],
  "dimensions": [
    { "label": "Building Width", "value": 7.62, "unit": "m", "confidence": 0.95 }
  ],
  "overall_confidence": 0.85
}

Element type must be one of: wall | slab | column | beam | foundation | footing | staircase | lintel | plinth | parapet

Dimension conversion:
- 1 ft = 0.3048 m, 1 inch = 0.0254 m
- 25' = 7.62 m, 40' = 12.19 m
- "6'-0\\"x5'-0\\"" → L=1.83, W=1.524
- Rooms → type "slab" with floor dimensions, height=3.0m
- Walls → width=0.23m (9" brick) or 0.115m (4.5" brick)
- Extract EVERY room, wall, staircase visible in the drawing.

Return ONLY the JSON.`;

  try {
    const raw  = await callAI(prompt, imageBase64, mimeType);
    const json = extractJSON(raw);
    let parsed: { elements?: Record<string, unknown>[]; dimensions?: Record<string, unknown>[]; overall_confidence?: number };

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

    return { success: true, elements, dimensions, rawResponse: raw, confidence: parsed.overall_confidence ?? 0.7, retryCount: 0 };
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
