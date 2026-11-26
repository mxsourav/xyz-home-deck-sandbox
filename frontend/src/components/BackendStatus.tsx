import { useCallback, useEffect, useState } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  CloudSlash,
  Cpu,
} from '@phosphor-icons/react';
import {
  fetchBackendHealth,
  getApiBaseUrl,
  type HealthResponse,
} from '../services/apiClient';

type StatusState =
  | { kind: 'checking' }
  | { kind: 'online'; data: HealthResponse }
  | { kind: 'offline'; error: string };

export function BackendStatus() {
  const [state, setState] = useState<StatusState>({ kind: 'checking' });

  const checkHealth = useCallback(async () => {
    setState({ kind: 'checking' });
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    try {
      const data = await fetchBackendHealth(controller.signal);
      setState({ kind: 'online', data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reach FastAPI service';
      setState({ kind: 'offline', error: message });
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  if (state.kind === 'checking') {
    return (
      <button
        type="button"
        onClick={() => void checkHealth()}
        className="status-pill"
        title={`Checking backend at ${getApiBaseUrl()}/api/health`}
      >
        <ArrowsClockwise size={14} weight="regular" />
        <span>Checking API</span>
      </button>
    );
  }

  if (state.kind === 'offline') {
    return (
      <button
        type="button"
        onClick={() => void checkHealth()}
        className="status-pill amber"
        title={`Backend unreachable at ${getApiBaseUrl()} (${state.error}). Click to retry.`}
      >
        <CloudSlash size={14} weight="duotone" />
        <span>API Offline</span>
      </button>
    );
  }

  const nimReady = state.data.nim_configured;

  return (
    <button
      type="button"
      onClick={() => void checkHealth()}
      className={`status-pill ${nimReady ? 'emerald' : 'blue'}`}
      title={
        nimReady
          ? `FastAPI v${state.data.version} online · NVIDIA NIM live (${state.data.nim_model})`
          : `FastAPI v${state.data.version} online · NVIDIA NIM in Phase 1 stub mode (${state.data.nim_model})`
      }
    >
      {nimReady ? (
        <CheckCircle size={14} weight="duotone" />
      ) : (
        <Cpu size={14} weight="duotone" />
      )}
      <span>{nimReady ? 'API + NIM Live' : 'API Ready · NIM Stub'}</span>
    </button>
  );
}
