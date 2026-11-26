import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Heartbeat,
  LockKey,
  Pulse,
  Sliders,
  SpeakerHigh,
  UserCheck,
  UserCirclePlus,
} from '@phosphor-icons/react';
import { KioskDeviceScreen } from '../components/KioskDeviceScreen';
import { ProfileRecognitionSwitcher } from '../components/ProfileRecognitionSwitcher';
import {
  useSandbox,
  type ElderBaseline,
  type ElderProfile,
  type RegisteredProfileId,
} from '../context/SandboxContext';
import { computeAccessibilityTier } from '../utils/accessibilityTier';
import { audioEngine, type PromptLanguage } from '../utils/audioEngine';

function deriveThresholdsFromResting(
  restingHr: number,
  normalSpo2: number,
  normalTempF: number
): ElderBaseline {
  const hrMin = Math.max(40, Math.round(restingHr - 14));
  const hrMax = Math.min(140, Math.round(restingHr + 34));
  const spo2Min = Math.max(88, Math.min(96, Math.round(normalSpo2 - 5)));
  const tempMax = Number(Math.min(101.5, normalTempF + 1.3).toFixed(1));
  return { hrMin, hrMax, spo2Min, tempMax };
}

export function ElderSetup() {
  const {
    activeProfileId,
    profiles,
    selectProfile,
    updateElderProfile,
    saveProfileRegistration,
    speakSampleVoice,
  } = useSandbox();

  const [editingTargetId, setEditingTargetId] = useState<RegisteredProfileId>(
    activeProfileId === 'guest' ? 'subhashree' : activeProfileId
  );

  // Keep form target synced when switching between registered elders
  useEffect(() => {
    if (activeProfileId !== 'guest') {
      setEditingTargetId(activeProfileId);
    }
  }, [activeProfileId]);

  const targetProfile = profiles[editingTargetId];

  // Resting sample inputs for Step 2 baseline calibration
  const [restingHr, setRestingHr] = useState<number>(() =>
    Math.round((targetProfile.baseline.hrMin + targetProfile.baseline.hrMax) / 2 - 10)
  );
  const [normalSpo2, setNormalSpo2] = useState<number>(
    () => targetProfile.baseline.spo2Min + 5
  );
  const [normalTempF, setNormalTempF] = useState<number>(() =>
    Number((targetProfile.baseline.tempMax - 1.3).toFixed(1))
  );

  useEffect(() => {
    setRestingHr(
      Math.round((targetProfile.baseline.hrMin + targetProfile.baseline.hrMax) / 2 - 10)
    );
    setNormalSpo2(Math.min(100, targetProfile.baseline.spo2Min + 5));
    setNormalTempF(Number((targetProfile.baseline.tempMax - 1.3).toFixed(1)));
  }, [editingTargetId]);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [liveSampleReadout, setLiveSampleReadout] = useState<{
    hr: number;
    spo2: number;
    tempF: number;
  } | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const calibrationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (calibrationTimerRef.current !== null) {
        window.clearInterval(calibrationTimerRef.current);
      }
      audioEngine.cancelSpeech();
    };
  }, []);

  const liveTier = computeAccessibilityTier(targetProfile.age);

  const handleProfileFieldChange = (patch: Partial<ElderProfile>) => {
    setSavedNotice(null);
    updateElderProfile(patch, editingTargetId);
  };

  const handleRestingCalibrationInput = (
    nextHr: number,
    nextSpo2: number,
    nextTempF: number
  ) => {
    setRestingHr(nextHr);
    setNormalSpo2(nextSpo2);
    setNormalTempF(nextTempF);
    const derived = deriveThresholdsFromResting(nextHr, nextSpo2, nextTempF);
    handleProfileFieldChange({ baseline: derived });
  };

  const handleSimulateCalibration = () => {
    if (isCalibrating) return;
    audioEngine.unlock();
    setSavedNotice(null);
    setIsCalibrating(true);
    setCalibrationProgress(0);

    const baseTargetHr = editingTargetId === 'debashis' ? 56 : 68;
    const baseTargetSpo2 = editingTargetId === 'debashis' ? 97 : 98;
    const baseTargetTemp = editingTargetId === 'debashis' ? 98.2 : 98.5;

    let step = 0;
    const totalSteps = 20; // 20 x 300ms = 6.0 seconds

    calibrationTimerRef.current = window.setInterval(() => {
      step += 1;
      const pct = Math.min(100, Math.round((step / totalSteps) * 100));
      setCalibrationProgress(pct);

      const jitterHr = baseTargetHr + Math.round(Math.sin(step * 0.9) * 2);
      const jitterSpo2 = Math.min(100, baseTargetSpo2 + (step % 3 === 0 ? 1 : 0));
      const jitterTemp = Number(
        (baseTargetTemp + Math.cos(step * 0.6) * 0.1).toFixed(1)
      );

      setLiveSampleReadout({
        hr: jitterHr,
        spo2: jitterSpo2,
        tempF: jitterTemp,
      });

      if (step >= totalSteps) {
        if (calibrationTimerRef.current !== null) {
          window.clearInterval(calibrationTimerRef.current);
          calibrationTimerRef.current = null;
        }
        setIsCalibrating(false);
        audioEngine.playConfirmChime();
        handleRestingCalibrationInput(
          baseTargetHr,
          baseTargetSpo2,
          baseTargetTemp
        );
      }
    }, 300);
  };

  const handleSaveAndApply = () => {
    saveProfileRegistration(editingTargetId, targetProfile);
    setSavedNotice(
      `Saved ${targetProfile.name} (Age ${targetProfile.age} · ${liveTier.shortLabel}) and synced to Kiosk.`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header + Active Recognition Switcher */}
      <section
        className="clinical-card"
        style={{
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="status-pill blue">
              <UserCheck size={14} weight="duotone" />
              <span>Phase 3 — Age-Adaptive Registration &amp; Privacy</span>
            </span>
            <span className="status-pill emerald">
              <span>Live Baseline Calibration</span>
            </span>
          </div>
          <h1 style={{ fontSize: '23px', fontWeight: 800 }}>
            Elder Registration, Baseline Calibration &amp; Guest Privacy Lock
          </h1>
        </div>

        <ProfileRecognitionSwitcher />
      </section>

      {/* Main Two-Column Setup (55%) & Live Kiosk Preview (45%) */}
      <div className="setup-grid">
        {/* LEFT COLUMN (55%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeProfileId === 'guest' ? (
            <div
              className="clinical-card"
              style={{
                padding: '14px 18px',
                borderColor: 'var(--accent-amber-border)',
                backgroundColor: 'var(--accent-amber-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: 'var(--ink-primary)' }}>
                <LockKey size={18} weight="duotone" color="var(--accent-amber)" />
                <span>
                  <strong>Guest Privacy Mode active</strong> in the live preview.
                  Switch back to a registered parent to preview their calibrated UI.
                </span>
              </div>
              <button
                type="button"
                onClick={() => selectProfile(editingTargetId)}
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                Resume {targetProfile.name.split(' ')[0]}
              </button>
            </div>
          ) : null}

          {/* STEP 1: Family Member & Age-Adaptive Tier */}
          <section className="clinical-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCirclePlus size={19} weight="duotone" color="var(--accent-blue)" />
                <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
                  Step 1: Family Member &amp; Age-Adaptive UI Tier
                </h2>
              </div>
              <span className={`status-pill ${liveTier.tone} tabular-nums`}>
                {liveTier.fullLabel} ({liveTier.ageRange})
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label
                  htmlFor="elder-name"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '5px' }}
                >
                  Full Name
                </label>
                <input
                  id="elder-name"
                  type="text"
                  className="clinical-input"
                  value={targetProfile.name}
                  onChange={(e) => handleProfileFieldChange({ name: e.target.value })}
                />
              </div>

              <div>
                <label
                  htmlFor="elder-language"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '5px' }}
                >
                  Preferred Spoken Language
                </label>
                <select
                  id="elder-language"
                  className="clinical-input"
                  value={targetProfile.language}
                  onChange={(e) =>
                    handleProfileFieldChange({
                      language: e.target.value as PromptLanguage,
                    })
                  }
                >
                  <option value="en">English (en-IN)</option>
                  <option value="hi">Hindi — हिन्दी (hi-IN)</option>
                  <option value="bn">Bengali — বাংলা (bn-IN)</option>
                </select>
              </div>
            </div>

            {/* Age Slider + Numeric Input + Test Voice Cadence */}
            <div className="clinical-subtle-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <label htmlFor="elder-age-slider" style={{ fontSize: '13px', fontWeight: 700 }}>
                  Parent Age (Auto-Scales Kiosk UI &amp; Voice Pacing)
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="elder-age-number"
                    aria-label="Parent age numeric input"
                    type="number"
                    min={50}
                    max={100}
                    value={targetProfile.age}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      if (!Number.isNaN(parsed)) {
                        handleProfileFieldChange({
                          age: Math.max(50, Math.min(100, Math.round(parsed))),
                        });
                      }
                    }}
                    className="clinical-input tabular-nums"
                    style={{ width: '76px', textAlign: 'center', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      speakSampleVoice(
                        targetProfile.name,
                        targetProfile.language,
                        targetProfile.age
                      )
                    }
                    className="btn-secondary"
                    style={{ padding: '7px 11px', fontSize: '12.5px' }}
                  >
                    <SpeakerHigh size={15} weight="duotone" color="var(--accent-blue)" />
                    <span>Test Voice Cadence</span>
                  </button>
                </div>
              </div>

              <input
                id="elder-age-slider"
                type="range"
                min={50}
                max={100}
                step={1}
                value={targetProfile.age}
                onChange={(e) =>
                  handleProfileFieldChange({ age: Number(e.target.value) })
                }
                className="clinical-slider"
              />

              <div
                className="tabular-nums"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: 'var(--ink-secondary)',
                }}
              >
                <div>
                  Typography Scale:{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {liveTier.scaleLabel}
                  </strong>
                </div>
                <div>
                  Button Min Height:{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {liveTier.buttonMinHeightPx}px
                  </strong>
                </div>
                <div>
                  Speech Rate:{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {liveTier.speechRateLabel}
                  </strong>
                </div>
              </div>
            </div>

            {/* Emergency Contact & Home Pin */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label
                  htmlFor="guardian-name"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}
                >
                  Guardian Name
                </label>
                <input
                  id="guardian-name"
                  type="text"
                  className="clinical-input"
                  value={targetProfile.emergencyContactName}
                  onChange={(e) =>
                    handleProfileFieldChange({ emergencyContactName: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="guardian-phone"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}
                >
                  Guardian Phone
                </label>
                <input
                  id="guardian-phone"
                  type="text"
                  className="clinical-input tabular-nums"
                  value={targetProfile.emergencyContactPhone}
                  onChange={(e) =>
                    handleProfileFieldChange({ emergencyContactPhone: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="guardian-telegram"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}
                >
                  Telegram Alert Handle
                </label>
                <input
                  id="guardian-telegram"
                  type="text"
                  className="clinical-input"
                  value={targetProfile.telegramHandle}
                  onChange={(e) =>
                    handleProfileFieldChange({ telegramHandle: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="home-address"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}
              >
                Pre-Configured Home Address Pin (Sent on Confirmed Stage 4 Emergency)
              </label>
              <input
                id="home-address"
                type="text"
                className="clinical-input"
                value={targetProfile.homeAddress}
                onChange={(e) =>
                  handleProfileFieldChange({ homeAddress: e.target.value })
                }
              />
            </div>
          </section>

          {/* STEP 2: Personal Baseline Calibration (MAX30102 + MLX90614) */}
          <section className="clinical-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={19} weight="duotone" color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
                  Step 2: Personal Baseline Calibration (MAX30102 + MLX90614)
                </h2>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
              Every body is different — a resting heart rate of{' '}
              <strong>54 BPM</strong> may be completely healthy for one senior and
              an emergency breach for another. Calibrate resting readings below or
              run a simulated 6-second optical capture.
            </p>

            {/* 6-Second Guided Calibration Bar */}
            <div className="clinical-subtle-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleSimulateCalibration}
                  className="btn-primary"
                  disabled={isCalibrating}
                >
                  <Pulse size={16} weight="duotone" />
                  <span>
                    {isCalibrating
                      ? `Sampling Sensors (${calibrationProgress}%)...`
                      : 'Simulate 6-Second Sensor Calibration'}
                  </span>
                </button>

                {liveSampleReadout ? (
                  <span className="tabular-nums" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    Sample: {liveSampleReadout.hr} BPM · {liveSampleReadout.spo2}% SpO₂ · {liveSampleReadout.tempF}°F
                  </span>
                ) : null}
              </div>

              {isCalibrating || calibrationProgress > 0 ? (
                <div className="clinical-progress-track" aria-label="Calibration progress">
                  <div
                    className="clinical-progress-fill"
                    style={{ width: `${calibrationProgress}%` }}
                  />
                </div>
              ) : null}
            </div>

            {/* Resting Sample Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <div>
                <label htmlFor="resting-hr" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                  Resting HR (BPM)
                </label>
                <input
                  id="resting-hr"
                  type="number"
                  min={42}
                  max={105}
                  className="clinical-input tabular-nums"
                  value={restingHr}
                  onChange={(e) => {
                    const val = Math.max(42, Math.min(105, Number(e.target.value) || 68));
                    handleRestingCalibrationInput(val, normalSpo2, normalTempF);
                  }}
                />
              </div>

              <div>
                <label htmlFor="normal-spo2" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                  Normal SpO₂ (%)
                </label>
                <input
                  id="normal-spo2"
                  type="number"
                  min={90}
                  max={100}
                  className="clinical-input tabular-nums"
                  value={normalSpo2}
                  onChange={(e) => {
                    const val = Math.max(90, Math.min(100, Number(e.target.value) || 98));
                    handleRestingCalibrationInput(restingHr, val, normalTempF);
                  }}
                />
              </div>

              <div>
                <label htmlFor="normal-temp" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                  Normal Temp (°F)
                </label>
                <input
                  id="normal-temp"
                  type="number"
                  step={0.1}
                  min={96}
                  max={100}
                  className="clinical-input tabular-nums"
                  value={normalTempF}
                  onChange={(e) => {
                    const val = Math.max(96, Math.min(100, Number(e.target.value) || 98.5));
                    handleRestingCalibrationInput(restingHr, normalSpo2, val);
                  }}
                />
              </div>
            </div>

            {/* Computed / Fine-Tunable Alert Thresholds */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
              <div>
                <label htmlFor="thresh-hr-min" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '3px' }}>
                  HR Min (BPM)
                </label>
                <input
                  id="thresh-hr-min"
                  type="number"
                  min={35}
                  max={90}
                  className="clinical-input tabular-nums"
                  value={targetProfile.baseline.hrMin}
                  onChange={(e) =>
                    handleProfileFieldChange({
                      baseline: {
                        ...targetProfile.baseline,
                        hrMin: Number(e.target.value) || 55,
                      },
                    })
                  }
                />
              </div>

              <div>
                <label htmlFor="thresh-hr-max" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '3px' }}>
                  HR Max (BPM)
                </label>
                <input
                  id="thresh-hr-max"
                  type="number"
                  min={80}
                  max={150}
                  className="clinical-input tabular-nums"
                  value={targetProfile.baseline.hrMax}
                  onChange={(e) =>
                    handleProfileFieldChange({
                      baseline: {
                        ...targetProfile.baseline,
                        hrMax: Number(e.target.value) || 105,
                      },
                    })
                  }
                />
              </div>

              <div>
                <label htmlFor="thresh-spo2-min" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '3px' }}>
                  SpO₂ Min (%)
                </label>
                <input
                  id="thresh-spo2-min"
                  type="number"
                  min={85}
                  max={98}
                  className="clinical-input tabular-nums"
                  value={targetProfile.baseline.spo2Min}
                  onChange={(e) =>
                    handleProfileFieldChange({
                      baseline: {
                        ...targetProfile.baseline,
                        spo2Min: Number(e.target.value) || 93,
                      },
                    })
                  }
                />
              </div>

              <div>
                <label htmlFor="thresh-temp-max" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '3px' }}>
                  Temp Max (°F)
                </label>
                <input
                  id="thresh-temp-max"
                  type="number"
                  step={0.1}
                  min={97}
                  max={103}
                  className="clinical-input tabular-nums"
                  value={targetProfile.baseline.tempMax}
                  onChange={(e) =>
                    handleProfileFieldChange({
                      baseline: {
                        ...targetProfile.baseline,
                        tempMax: Number(e.target.value) || 99.8,
                      },
                    })
                  }
                />
              </div>
            </div>
          </section>

          {/* STEP 3: Save & Activate Profile */}
          <section className="clinical-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSaveAndApply}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  backgroundColor: 'var(--accent-emerald)',
                  color: '#FFFFFF',
                  border: '1px solid var(--accent-emerald)',
                }}
              >
                <CheckCircle size={17} weight="duotone" />
                <span>Save &amp; Apply to Kiosk</span>
              </button>

              <Link to="/sandbox" className="btn-secondary">
                <Heartbeat size={16} weight="duotone" />
                <span>Open Full Kiosk Sandbox</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>

            {savedNotice ? (
              <span className="status-pill emerald">
                <CheckCircle size={14} weight="duotone" />
                <span>{savedNotice}</span>
              </span>
            ) : null}
          </section>
        </div>

        {/* RIGHT COLUMN (45%): Live Age-Adaptive Kiosk Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="clinical-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                Live Age-Adaptive Kiosk Preview
              </div>
              <span className="tabular-nums" style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                {activeProfileId === 'guest'
                  ? 'Guest Lock Active'
                  : `${liveTier.scaleLabel} Scale · ${liveTier.buttonMinHeightPx}px Buttons · ${liveTier.speechRateLabel} Voice`}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
              Drag the Age slider (60 → 74 → 84), switch language, or activate
              Guest Mode to watch the 7-inch HUD morph in real time.
            </p>
          </div>

          <KioskDeviceScreen compactPreview showEscalationStrip={false} />
        </div>
      </div>
    </div>
  );
}
