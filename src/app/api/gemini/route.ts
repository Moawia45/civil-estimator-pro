// ============================================
// CivilEstimator Pro — Unified AI API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// ---- ONLY verified working/non-decommissioned Groq models ----
// Vision models: support image analysis
// Text models: text only (skip when image is provided)

const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
];

const GROQ_TEXT_MODELS = [
  'llama-3.3-70b-versatile',
];

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

const GROK_VISION_MODELS = [
  'grok-2-vision-1212',
  'grok-vision-beta',
];

const GROK_TEXT_MODELS = [
  'grok-2-1212',
];

// ---- Build the ordered list of models to try ----
// If image is present: vision models first, then text-only (they'll fail gracefully)
// If no image: all models

function buildModelList(
  provider: string,
  preferredModel: string | undefined,
  hasImage: boolean
): string[] {
  let visionModels: string[];
  let textModels: string[];

  if (provider === 'groq') {
    visionModels = GROQ_VISION_MODELS;
    textModels = hasImage ? [] : GROQ_TEXT_MODELS; // skip text-only when image present
  } else if (provider === 'grok') {
    visionModels = GROK_VISION_MODELS;
    textModels = hasImage ? [] : GROK_TEXT_MODELS;
  } else {
    visionModels = GEMINI_MODELS;
    textModels = [];
  }

  const allModels = [...visionModels, ...textModels];

  if (!preferredModel) return allModels;

  // Put preferred model first, then the rest
  return [preferredModel, ...allModels.filter((m) => m !== preferredModel)];
}

// ---- Call Groq (OpenAI-compatible) ----

async function callGroq(
  model: string,
  apiKey: string,
  prompt: string,
  imageBase64?: string,
  mimeType = 'image/jpeg'
): Promise<{ status: number; body: unknown }> {
  type Part = { type: string; text?: string; image_url?: { url: string } };

  const msgContent: string | Part[] = imageBase64
    ? [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: 'text', text: prompt },
      ]
    : prompt; // plain string for text-only — works with ALL models

  console.log(`[Groq→] ${model} | hasImage:${!!imageBase64} | key:${apiKey.slice(0, 8)}...`);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: msgContent }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  const body = await res.json();
  console.log(`[Groq←] ${model} status:${res.status} | ${JSON.stringify(body).slice(0, 200)}`);
  return { status: res.status, body };
}

// ---- Call Gemini ----

async function callGemini(
  model: string,
  apiKey: string,
  prompt: string,
  imageBase64?: string,
  mimeType = 'image/jpeg'
): Promise<{ status: number; body: unknown }> {
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  if (imageBase64) parts.push({ inlineData: { mimeType, data: imageBase64 } });
  parts.push({ text: prompt });

  console.log(`[Gemini→] ${model}`);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  );
  const body = await res.json();
  console.log(`[Gemini←] ${model} status:${res.status}`);
  return { status: res.status, body };
}

// ---- Call xAI Grok ----

async function callGrokXAI(
  model: string,
  apiKey: string,
  prompt: string,
  imageBase64?: string,
  mimeType = 'image/jpeg'
): Promise<{ status: number; body: unknown }> {
  type Part = { type: string; text?: string; image_url?: { url: string } };
  const msgContent: string | Part[] = imageBase64
    ? [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: 'text', text: prompt },
      ]
    : prompt;

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: msgContent }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

function dispatch(
  provider: string,
  model: string,
  apiKey: string,
  prompt: string,
  imageBase64?: string,
  mimeType?: string
) {
  if (provider === 'groq') return callGroq(model, apiKey, prompt, imageBase64, mimeType);
  if (provider === 'grok') return callGrokXAI(model, apiKey, prompt, imageBase64, mimeType);
  return callGemini(model, apiKey, prompt, imageBase64, mimeType);
}

function extractText(body: unknown): string {
  const b = body as Record<string, unknown>;
  return (
    (b?.candidates as Array<{ content: { parts: { text: string }[] } }> | undefined)
      ?.[0]?.content?.parts?.[0]?.text ||
    (b?.choices as Array<{ message: { content: string } }> | undefined)
      ?.[0]?.message?.content ||
    ''
  );
}

function extractError(body: unknown): string {
  const b = body as Record<string, unknown>;
  if (b?.error && typeof b.error === 'object') {
    const e = b.error as Record<string, unknown>;
    return String(e.message || JSON.stringify(e));
  }
  if (typeof b?.error === 'string') return b.error;
  if (typeof b?.message === 'string') return b.message;
  return JSON.stringify(b).slice(0, 300);
}

function isAuthError(status: number, msg: string): boolean {
  if (status === 401 || status === 403) return true;
  const l = msg.toLowerCase();
  return l.includes('invalid api key') || l.includes('incorrect api') || l.includes('unauthorized');
}

function isRateLimit(status: number): boolean {
  return status === 429;
}

function isModelGone(status: number, msg: string): boolean {
  if (status === 404) return true;
  const l = msg.toLowerCase();
  return (
    l.includes('decommissioned') ||
    l.includes('no longer supported') ||
    l.includes('not found') ||
    l.includes('does not exist') ||
    l.includes('no longer available') ||
    l.includes('deprecated')
  );
}

// ---- Route handler ----

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      provider?: string;
      model?: string;
      apiKey?: string;
      prompt?: string;
      imageBase64?: string;
      mimeType?: string;
      testMode?: boolean;
    };

    const {
      provider: rawProvider = 'gemini',
      model,
      apiKey: userApiKey,
      prompt,
      imageBase64,
      mimeType = 'image/jpeg',
      testMode = false,
    } = body;

    // ── Key Resolution (server-side only) ──────────────────────────────
    // Priority: user-provided → matching env var → GROQ_API_KEY → GEMINI_API_KEY
    // The client NEVER needs to send an API key — env vars handle everything.

    const apiKey =
      userApiKey?.trim()                                          ||
      (rawProvider === 'groq'   ? process.env.GROQ_API_KEY   : undefined) ||
      (rawProvider === 'grok'   ? process.env.GROK_API_KEY   : undefined) ||
      (rawProvider === 'gemini' ? process.env.GEMINI_API_KEY : undefined) ||
      process.env.GROQ_API_KEY                                    ||
      process.env.GEMINI_API_KEY                                  ||
      '';

    // Auto-detect provider from whichever env key is set
    const provider: string =
      userApiKey?.trim()            ? rawProvider     :
      process.env.GROQ_API_KEY      ? 'groq'          :
      process.env.GEMINI_API_KEY    ? 'gemini'        :
      rawProvider;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please contact the administrator.' },
        { status: 503 }
      );
    }

    const hasImage = !!imageBase64;
    const modelsToTry = buildModelList(provider, model, hasImage);

    // =============================================
    // TEST MODE
    // =============================================
    if (testMode) {
      const working: string[] = [];
      const tested: string[] = [];
      const errors: Record<string, string> = {};

      for (const m of modelsToTry) {
        tested.push(m);
        try {
          const { status, body: rb } = await dispatch(provider, m, apiKey, 'Say OK');

          if (status === 200) {
            const text = extractText(rb);
            if (text.length > 0) {
              working.push(m);
              if (working.length >= 2) break;
            } else {
              errors[m] = 'Empty response';
            }
          } else {
            const err = extractError(rb);
            errors[m] = err;
            if (isAuthError(status, err)) {
              return NextResponse.json({ working: [], tested, errors, authError: `❌ Invalid API key: ${err}` });
            }
          }
        } catch (e) {
          errors[m] = e instanceof Error ? e.message : String(e);
        }
      }

      return NextResponse.json({ working, tested, errors });
    }

    // =============================================
    // NORMAL ANALYSIS CALL
    // =============================================
    if (!prompt) return NextResponse.json({ error: 'Prompt required.' }, { status: 400 });

    // Track the error from the PRIMARY (selected) model separately
    let primaryModelError: string | null = null;
    let lastError = 'Request failed';

    for (let i = 0; i < modelsToTry.length; i++) {
      const m = modelsToTry[i];
      const isPrimary = i === 0;

      try {
        const { status, body: rb } = await dispatch(provider, m, apiKey, prompt, imageBase64, mimeType);

        if (status === 200) {
          const text = extractText(rb);
          if (text) {
            const d = rb as Record<string, unknown>;
            d._model_used = m;
            return NextResponse.json(d);
          }
          const emptyErr = 'AI returned empty response';
          if (isPrimary) primaryModelError = emptyErr;
          lastError = emptyErr;
          continue;
        }

        const err = extractError(rb);
        if (isPrimary) primaryModelError = err;
        lastError = err;

        // Auth error → stop
        if (isAuthError(status, err)) {
          return NextResponse.json(
            { error: `Invalid API key: ${err}` },
            { status: 401 }
          );
        }

        // Rate limit → stop
        if (isRateLimit(status)) {
          return NextResponse.json(
            { error: 'Rate limit reached. Wait 30 seconds and try again.' },
            { status: 429 }
          );
        }

        // Model gone → try next silently
        if (isModelGone(status, err)) {
          console.warn(`[AI] ${m} gone, trying next`);
          continue;
        }

        // For image-related errors on vision models → try next vision model
        console.warn(`[AI] ${m} failed: ${err.slice(0, 100)}, trying next`);
        continue;

      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        if (isPrimary) primaryModelError = err;
        lastError = err;
        continue;
      }
    }

    // Show primary model error if available (more relevant than last fallback error)
    const errorToShow = primaryModelError
      ? `Model "${modelsToTry[0]}" failed: ${primaryModelError}`
      : lastError;

    return NextResponse.json({ error: errorToShow }, { status: 502 });

  } catch (err) {
    console.error('[API/ai]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
