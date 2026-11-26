export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  phase: number;
  nim_configured: boolean;
  nim_model: string;
  nim_base_url: string;
  mode: 'live' | 'stub';
  timestamp: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:8000';

export async function fetchBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
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

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
