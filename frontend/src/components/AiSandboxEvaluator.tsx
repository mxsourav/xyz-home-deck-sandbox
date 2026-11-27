import { useState } from 'react';
import {
  ArrowsClockwise,
  CaretDown,
  CaretUp,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Warning,
  WarningOctagon,
} from '@phosphor-icons/react';
import {
  analyzeTelemetryWithAi,
  type AiAnalyzeResponse,
} from '../config/api';
import { useSandbox } from '../context/SandboxContext';

export function AiSandboxEvaluator() {
  const { elderProfile, telemetry, escalationStage } = useSandbox();

  const [promptOpen, setPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiAnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await analyzeTelemetryWithAi({
        elder_name: elderProfile.name,
        elder_age: elderProfile.age,
        language: elderProfile.language,
        heart_rate: telemetry.heartRate,
        spo2: telemetry.spo2,
        body_temp_f: Number(telemetry.bodyTempF.toFixed(1)),
        lpg_ppm: telemetry.lpgPpm,
        radar_state: telemetry.radarState,
        tof_posture_state: telemetry.tofPostureState,
        ac_mains_connected: telemetry.acMainsConnected,
        escalation_stage: escalationStage,
        custom_prompt: customPrompt.trim() ? customPrompt.trim() : undefined,
      });
      setResult(response);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach /api/ai/analyze on backend.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const riskBadgeClass =
    result?.risk_level === 'CRITICAL'
      ? 'status-pill crimson'
      : result?.risk_level === 'CAUTION'
        ? 'status-pill amber'
        : 'status-pill emerald';

  return (
    <div
      className="clinical-card"
      style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: '15.5px', fontWeight: 700 }}>
            Guardian AI Telemetry Evaluator
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
            Live NVIDIA NIM clinical assessment &amp; local fallback engine
          </p>
        </div>

        {result ? (
          <span
            className={`status-pill ${result.mode === 'nim-live' ? 'emerald' : 'blue'}`}
          >
            <span className="status-dot" />
            <span>
              {result.mode === 'nim-live'
                ? 'NVIDIA NIM Live'
                : 'Local Rule Fallback'}
            </span>
          </span>
        ) : (
          <span className="status-pill">
            <span className="status-dot" style={{ backgroundColor: 'var(--ink-muted)' }} />
            <span>Standby</span>
          </span>
        )}
      </div>

      {/* Live Snapshot Strip */}
      <div
        className="clinical-subtle-panel tabular-nums"
        style={{
          padding: '8px 11px',
          fontSize: '12px',
          color: 'var(--ink-secondary)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <strong style={{ color: 'var(--ink-primary)' }}>
          {elderProfile.name} ({elderProfile.age}y)
        </strong>
        <span>·</span>
        <span>{telemetry.heartRate} BPM</span>
        <span>·</span>
        <span>SpO₂ {telemetry.spo2}%</span>
        <span>·</span>
        <span>{telemetry.bodyTempF.toFixed(1)}°F</span>
        <span>·</span>
        <span>LPG {telemetry.lpgPpm} ppm</span>
        <span>·</span>
        <span>{telemetry.acMainsConnected ? 'AC Mains' : '3S2P UPS'}</span>
      </div>

      {/* Primary CTA + Custom Prompt Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => void handleRunAnalysis()}
          disabled={isLoading}
          className="btn-primary"
          style={{
            opacity: isLoading ? 0.8 : 1,
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {isLoading ? (
            <ArrowsClockwise size={15} weight="bold" />
          ) : (
            <Play size={15} weight="fill" />
          )}
          <span>{isLoading ? 'Running AI Triage...' : 'Run AI Triage Analysis'}</span>
        </button>

        <button
          type="button"
          onClick={() => setPromptOpen((prev) => !prev)}
          className="btn-secondary"
          aria-expanded={promptOpen}
          style={{ fontSize: '12.5px', padding: '7px 10px' }}
        >
          <SlidersHorizontal size={14} weight="duotone" />
          <span>Custom Sandbox Prompt</span>
          {promptOpen ? (
            <CaretUp size={13} weight="bold" />
          ) : (
            <CaretDown size={13} weight="bold" />
          )}
        </button>
      </div>

      {/* Collapsible Custom Sandbox Prompt */}
      {promptOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor="ai-custom-prompt"
            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)' }}
          >
            Optional Operator Query (passed cleanly as a user message to NIM)
          </label>
          <textarea
            id="ai-custom-prompt"
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g., Assess nocturnal wandering risk or recommend next sensor verification step..."
            className="clinical-input"
            style={{ resize: 'vertical', minHeight: '56px' }}
          />
          {customPrompt.trim() ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCustomPrompt('')}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--ink-muted)',
                  background: 'transparent',
                  padding: '2px 4px',
                }}
              >
                Clear prompt
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Error State (if Render is cold-starting or offline) */}
      {errorMessage ? (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-amber-bg)',
            border: '1px solid var(--accent-amber-border)',
            color: 'var(--accent-amber)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            Backend connection timed out or is waking up ({errorMessage}).
          </span>
          <button
            type="button"
            onClick={() => void handleRunAnalysis()}
            className="btn-secondary"
            style={{ padding: '4px 9px', fontSize: '12px' }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Structured Triage Assessment Output */}
      {result ? (
        <div
          className="clinical-subtle-panel"
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#FFFFFF',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className={riskBadgeClass}>
                {result.risk_level === 'CRITICAL' ? (
                  <WarningOctagon size={13} weight="fill" />
                ) : result.risk_level === 'CAUTION' ? (
                  <Warning size={13} weight="fill" />
                ) : (
                  <ShieldCheck size={13} weight="fill" />
                )}
                <span>Risk: {result.risk_level}</span>
              </span>

              <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                {result.model}
              </span>
            </div>

            <span
              className="tabular-nums"
              style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-secondary)' }}
            >
              {result.latency_ms} ms
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--ink-muted)',
                marginBottom: '3px',
              }}
            >
              Clinical Assessment
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-primary)', lineHeight: 1.5 }}>
              {result.clinical_summary}
            </p>
          </div>

          <div
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--accent-blue)',
                marginBottom: '2px',
              }}
            >
              Recommended Hub / Guardian Action
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--ink-primary)', lineHeight: 1.45 }}>
              {result.recommended_action}
            </p>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
          Adjust any vital slider or exhibition scenario above, then run AI triage to test
          either live NVIDIA NIM reasoning or deterministic clinical rule fallback.
        </p>
      )}
    </div>
  );
}
