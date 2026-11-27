export type PromptLanguage = 'en' | 'hi' | 'bn';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  phase: number;
  nim_configured: boolean;
  nim_model: string;
  nim_base_url: string;
  mode: 'nim-live' | 'local-fallback' | 'live' | 'stub';
  timestamp: string;
}

export interface AiAnalyzeRequest {
  elder_name: string;
  elder_age: number;
  language: PromptLanguage;
  heart_rate: number;
  spo2: number;
  body_temp_f: number;
  lpg_ppm: number;
  radar_state: string;
  tof_posture_state: 'UPRIGHT' | 'IN_BED' | 'BED_EDGE_DROP' | 'FLOOR_SILHOUETTE';
  ac_mains_connected: boolean;
  escalation_stage: number;
  custom_prompt?: string;
}

export interface AiAnalyzeResponse {
  mode: 'nim-live' | 'local-fallback';
  model: string;
  risk_level: 'NORMAL' | 'CAUTION' | 'CRITICAL';
  clinical_summary: string;
  recommended_action: string;
  latency_ms: number;
}

export type CareAlarmCategory =
  | 'VITALS'
  | 'EXERCISE'
  | 'MEDICATION'
  | 'HYDRATION'
  | 'MEAL';

export interface CareAlarmItem {
  time: string;
  category: CareAlarmCategory;
  title: string;
  spoken_prompt: string;
}

export interface CarePlanRequest {
  name: string;
  age: number;
  language: PromptLanguage;
  allergies: string[];
  conditions: string[];
  medications: string[];
  wake_time: string;
  sleep_time: string;
}

export interface CarePlanResponse {
  mode: 'nim-live' | 'local-fallback';
  model: string;
  latency_ms: number;
  profile_summary: string;
  ui_mode: 'STANDARD_50' | 'HIGH_ASSIST_78';
  hydration_goal_ml: number;
  sleep_watch_window: {
    start: string;
    end: string;
    absence_timeout_min: number;
  };
  daily_alarms: CareAlarmItem[];
  nutrition_rules: {
    recommended: string[];
    strictly_avoid: string[];
  };
}

export const DEFAULT_RENDER_API_URL = 'https://xyz-home-deck-api.onrender.com';

const rawEnvBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL =
  rawEnvBaseUrl?.trim().replace(/\/+$/, '') || DEFAULT_RENDER_API_URL;

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function fetchBackendHealth(
  signal?: AbortSignal
): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Health endpoint responded with HTTP ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}

let warmupPromise: Promise<HealthResponse> | null = null;

/**
 * Trigger a shared non-blocking GET /api/health wake-up call with a generous
 * timeout for Render free-tier cold starts. Deduplicates React mount calls.
 */
export function warmUpBackend(forceRefresh = false): Promise<HealthResponse> {
  if (!forceRefresh && warmupPromise) {
    return warmupPromise;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 55_000);

  const pending = fetchBackendHealth(controller.signal)
    .catch((error: unknown) => {
      warmupPromise = null;
      throw error;
    })
    .finally(() => {
      window.clearTimeout(timeoutId);
    });

  warmupPromise = pending;
  return pending;
}

export async function analyzeTelemetryWithAi(
  payload: AiAnalyzeRequest,
  signal?: AbortSignal
): Promise<AiAnalyzeResponse> {
  const controller = signal ? null : new AbortController();
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), 45_000)
    : undefined;

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`AI triage endpoint responded with HTTP ${response.status}`);
    }

    return (await response.json()) as AiAnalyzeResponse;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function generateCarePlanWithAi(
  payload: CarePlanRequest,
  signal?: AbortSignal
): Promise<CarePlanResponse> {
  const controller = signal ? null : new AbortController();
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), 45_000)
    : undefined;

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/care-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`Care plan endpoint responded with HTTP ${response.status}`);
    }

    return (await response.json()) as CarePlanResponse;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}
