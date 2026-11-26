import { useCallback, useEffect, useState } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  CloudSlash,
  Cpu,
} from '@phosphor-icons/react';
import {
  getApiBaseUrl,
  warmUpBackend,
  type HealthResponse,
} from '../config/api';

type StatusState =
  | { kind: 'waking' }
  | { kind: 'online'; data: HealthResponse }
  | { kind: 'offline'; error: string };

export function BackendStatus() {
  const [state, setState] = useState<StatusState>({ kind: 'waking' });

  const checkHealth = useCallback(async (forceRefresh = false) => {
    setState({ kind: 'waking' });
    try {
      const data = await warmUpBackend(forceRefresh);
      setState({ kind: 'online', data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reach FastAPI service';
      setState({ kind: 'offline', error: message });
    }
  }, []);

  useEffect(() => {
    void checkHealth(false);
  }, [checkHealth]);

  if (state.kind === 'waking') {
    return (
      <button
        type="button"
        onClick={() => void checkHealth(true)}
        className="status-pill amber"
        title={`Waking up backend service at ${getApiBaseUrl()}/api/health`}
      >
        <ArrowsClockwise size={13} weight="bold" />
        <span>Backend: Waking Up...</span>
      </button>
    );
  }

  if (state.kind === 'offline') {
    return (
      <button
        type="button"
        onClick={() => void checkHealth(true)}
        className="status-pill amber"
        title={`Backend unreachable at ${getApiBaseUrl()} (${state.error}). Click to retry.`}
      >
        <CloudSlash size={13} weight="duotone" />
        <span>Backend: Retry Connection</span>
      </button>
    );
  }

  const nimReady = state.data.nim_configured;

  return (
    <button
      type="button"
      onClick={() => void checkHealth(true)}
      className={`status-pill ${nimReady ? 'emerald' : 'blue'}`}
      title={
        nimReady
          ? `FastAPI v${state.data.version} connected · NVIDIA NIM Ready (${state.data.nim_model})`
          : `FastAPI v${state.data.version} connected · Fallback Mode active (${state.data.nim_model})`
      }
    >
      {nimReady ? (
        <CheckCircle size={13} weight="duotone" />
      ) : (
        <Cpu size={13} weight="duotone" />
      )}
      <span>
        {nimReady
          ? 'Backend: Connected · NIM Ready'
          : 'Backend: Connected · Fallback Mode'}
      </span>
    </button>
  );
}
