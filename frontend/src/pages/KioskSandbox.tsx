import { useState } from 'react';
import {
  BellRinging,
  Heartbeat,
  SlidersHorizontal,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { IMAGE_SLOTS } from '../data/imageSlots';
import { SafeImage } from '../components/SafeImage';
import { getApiBaseUrl } from '../services/apiClient';

interface AnalyzeStubResult {
  mode: string;
  nim_configured: boolean;
  model: string;
  summary: string;
  escalation_stage_hint: string;
}

export function KioskSandbox() {
  const [testingNim, setTestingNim] = useState(false);
  const [nimPreview, setNimPreview] = useState<AnalyzeStubResult | null>(null);
  const [nimError, setNimError] = useState<string | null>(null);

  const kioskSlots = IMAGE_SLOTS.filter((slot) => slot.category === 'kiosk-ui');

  const handleTestNimPlaceholder = async () => {
    setTestingNim(true);
    setNimError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            'Verify Phase 1 NVIDIA NIM sandbox readiness for XYZ Home Deck kiosk telemetry.',
          telemetry: {
            heart_rate_bpm: 72,
            spo2_pct: 98,
            body_temp_f: 98.6,
            radar_presence: true,
            mq2_gas_ok: true,
          },
          language: 'en',
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as AnalyzeStubResult;
      setNimPreview(data);
    } catch (err) {
      setNimError(
        err instanceof Error
          ? `${err.message} — start backend uvicorn server on port 8000 to verify.`
          : 'Request failed'
      );
    } finally {
      setTestingNim(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="clinical-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="status-pill blue">
            <SlidersHorizontal size={14} weight="duotone" />
            <span>Phase 2 Route Shell</span>
          </span>
          <span className="status-pill">60 FPS Capacitive Kiosk + Audio</span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
          Kiosk Sandbox &amp; Escalation Simulator
        </h1>
        <p style={{ fontSize: '14.5px', color: 'var(--ink-secondary)', maxWidth: '780px' }}>
          In Phase 2, this workspace hosts the live 7-inch capacitive touch
          kiosk simulator (Standby, Daily Vitals Check-In, and 10-second
          Emergency Countdown), manual sensor telemetry sliders, gas-relay fan
          triggers, and native Bengali / Hindi / English audio synthesis.
        </p>

        <div
          style={{
            marginTop: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <div className="clinical-subtle-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
              <Heartbeat size={16} weight="duotone" color="var(--accent-emerald)" />
              <span>Sensor Telemetry Sliders</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
              MAX30102 BPM/SpO2, MLX90614 body temp, LD2410B radar stillness,
              MQ-2 LPG/smoke, KY-037 thud spike, and INA219 battery outage rail.
            </p>
          </div>

          <div className="clinical-subtle-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
              <BellRinging size={16} weight="duotone" color="var(--accent-crimson)" />
              <span>10s Autonomous Countdown</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
              Interactive t+0s to t+40s pipeline with oversized &quot;I&apos;M OKAY&quot;
              false-alarm cancellation and child phone notification preview.
            </p>
          </div>

          <div className="clinical-subtle-panel" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
              <SpeakerHigh size={16} weight="duotone" color="var(--accent-blue)" />
              <span>Native Multilingual Voice</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
              Built-in Bengali, Hindi, and English voice prompts for daily
              check-ins, reminders, and hazard warnings.
            </p>
          </div>
        </div>
      </section>

      {/* Kiosk UI Image Slots Ready for Phase 2 */}
      <section className="clinical-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px' }}>
          Three Core Kiosk HUD Reference Slots
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {kioskSlots.map((slot) => (
            <SafeImage
              key={slot.id}
              filename={slot.filename}
              alt={slot.title}
              slotTitle={slot.title}
              slotCaption={slot.caption}
              aspectRatio={slot.aspectRatio}
              phaseTarget={slot.phaseTarget}
            />
          ))}
        </div>
      </section>

      {/* Backend NVIDIA NIM Placeholder Handshake Check */}
      <section className="clinical-card" style={{ padding: '22px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
              NVIDIA NIM Endpoint Readiness (Phase 1 Stub Verification)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '3px' }}>
              Tests <code>POST /api/ai/analyze</code> against the FastAPI backend
              without requiring <code>NVIDIA_API_KEY</code> to be populated yet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleTestNimPlaceholder()}
            className="btn-primary"
            disabled={testingNim}
          >
            {testingNim ? 'Checking Endpoint...' : 'Test /api/ai/analyze'}
          </button>
        </div>

        {nimPreview ? (
          <div
            className="clinical-subtle-panel"
            style={{ marginTop: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className={`status-pill ${nimPreview.nim_configured ? 'emerald' : 'blue'}`}>
                Mode: {nimPreview.mode}
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Model: {nimPreview.model}
              </span>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-primary)' }}>
              {nimPreview.summary}
            </p>
          </div>
        ) : null}

        {nimError ? (
          <div
            className="status-pill amber"
            style={{ marginTop: '14px', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}
          >
            {nimError}
          </div>
        ) : null}
      </section>
    </div>
  );
}
