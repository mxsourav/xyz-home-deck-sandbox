import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRinging,
  CaretDown,
  CaretUp,
  CheckCircle,
  Clock,
  Code,
  FirstAidKit,
  Heartbeat,
  LockKey,
  MoonStars,
  Pill,
  Plus,
  Pulse,
  Sliders,
  SpeakerHigh,
  UserCirclePlus,
  WarningOctagon,
  X,
} from '@phosphor-icons/react';
import { KioskDeviceScreen } from '../components/KioskDeviceScreen';
import { ProfileRecognitionSwitcher } from '../components/ProfileRecognitionSwitcher';
import { WebcamCaptureBox } from '../components/WebcamCaptureBox';
import {
  generateCarePlanWithAi,
  type CarePlanResponse,
} from '../config/api';
import {
  useSandbox,
  type ElderBaseline,
  type ElderProfile,
  type RegisteredProfileId,
} from '../context/SandboxContext';
import {
  ALLERGY_SUGGESTIONS,
  buildOfflineCarePlanFallback,
  CONDITION_SUGGESTIONS,
} from '../utils/carePlanFallback';
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
    applyCarePlanToProfile,
    speakSampleVoice,
    screenMode,
    setScreenModeManual,
    triggerCareAlarm,
  } = useSandbox();

  const [editingTargetId, setEditingTargetId] = useState<RegisteredProfileId>(
    activeProfileId === 'guest' ? 'subhashree' : activeProfileId
  );

  useEffect(() => {
    if (activeProfileId !== 'guest') {
      setEditingTargetId(activeProfileId);
    }
  }, [activeProfileId]);

  const targetProfile = profiles[editingTargetId];

  // Resting sample inputs for Step 3 baseline calibration
  const [restingHr, setRestingHr] = useState<number>(() =>
    Math.round((targetProfile.baseline.hrMin + targetProfile.baseline.hrMax) / 2 - 10)
  );
  const [normalSpo2, setNormalSpo2] = useState<number>(
    () => targetProfile.baseline.spo2Min + 5
  );
  const [normalTempF, setNormalTempF] = useState<number>(() =>
    Number((targetProfile.baseline.tempMax - 1.3).toFixed(1))
  );

  // Step 2 quick add drafts
  const [customAllergyDraft, setCustomAllergyDraft] = useState('');
  const [customConditionDraft, setCustomConditionDraft] = useState('');
  const [medicationDraft, setMedicationDraft] = useState('');

  // Step 3 calibration timer state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [liveSampleReadout, setLiveSampleReadout] = useState<{
    hr: number;
    spo2: number;
    tempF: number;
  } | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Step 4 AI Care & Alarm JSON state
  const [generatedPlan, setGeneratedPlan] = useState<CarePlanResponse | null>(
    () => targetProfile.carePlan ?? null
  );
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showRawJsonDrawer, setShowRawJsonDrawer] = useState(false);
  const [planPushNotice, setPlanPushNotice] = useState<string | null>(null);

  useEffect(() => {
    setRestingHr(
      Math.round((targetProfile.baseline.hrMin + targetProfile.baseline.hrMax) / 2 - 10)
    );
    setNormalSpo2(Math.min(100, targetProfile.baseline.spo2Min + 5));
    setNormalTempF(Number((targetProfile.baseline.tempMax - 1.3).toFixed(1)));
    setGeneratedPlan(targetProfile.carePlan ?? null);
    setPlanPushNotice(null);
  }, [editingTargetId, targetProfile.baseline, targetProfile.carePlan]);

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

  const toggleTagInList = (
    field: 'allergies' | 'conditions',
    value: string
  ) => {
    if (value === 'None') {
      handleProfileFieldChange({ [field]: [] });
      return;
    }
    const current = targetProfile[field];
    const exists = current.some(
      (item) => item.toLowerCase() === value.toLowerCase()
    );
    const next = exists
      ? current.filter((item) => item.toLowerCase() !== value.toLowerCase())
      : [...current, value];
    handleProfileFieldChange({ [field]: next });
  };

  const addCustomTag = (
    field: 'allergies' | 'conditions' | 'medications',
    rawValue: string,
    clearFn: (v: string) => void
  ) => {
    const cleaned = rawValue.trim();
    if (!cleaned) return;
    const current = targetProfile[field];
    if (!current.some((i) => i.toLowerCase() === cleaned.toLowerCase())) {
      handleProfileFieldChange({ [field]: [...current, cleaned] });
    }
    clearFn('');
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

    const baseTargetHr = editingTargetId === 'subhashree' ? 68 : 74;
    const baseTargetSpo2 = editingTargetId === 'subhashree' ? 97 : 98;
    const baseTargetTemp = editingTargetId === 'subhashree' ? 98.4 : 98.5;

    let step = 0;
    const totalSteps = 20;

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

  const handleGenerateCarePlan = async () => {
    setIsGeneratingPlan(true);
    setPlanPushNotice(null);
    try {
      const plan = await generateCarePlanWithAi({
        name: targetProfile.name,
        age: targetProfile.age,
        language: targetProfile.language,
        allergies: targetProfile.allergies,
        conditions: targetProfile.conditions,
        medications: targetProfile.medications,
        wake_time: targetProfile.wakeTime,
        sleep_time: targetProfile.sleepTime,
      });
      setGeneratedPlan(plan);
    } catch {
      const localPlan = buildOfflineCarePlanFallback(targetProfile);
      setGeneratedPlan(localPlan);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handlePushPlanToKiosk = () => {
    if (!generatedPlan) return;
    applyCarePlanToProfile(editingTargetId, generatedPlan);
    setPlanPushNotice(
      `Pushed ${generatedPlan.daily_alarms.length} daily alarms & nutrition guardrails to the 7-inch Kiosk.`
    );
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
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent-blue)',
              marginBottom: '4px',
            }}
          >
            4-Step Clinical &amp; Webcam Enrollment · Age 50 vs Age 78 Adaptation
          </div>
          <h1 style={{ fontSize: '23px', fontWeight: 800 }}>
            Family Onboarding, Allergies, Live Cam &amp; AI Daily Care JSON
          </h1>
        </div>

        <ProfileRecognitionSwitcher />
      </section>

      {/* Main Two-Column Setup & Sticky 7-Inch 1024x600 Kiosk Preview */}
      <div className="setup-grid">
        {/* LEFT COLUMN: 4-Step Clinical Onboarding Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
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
                  Switch back to a registered parent to preview their calibrated HUD.
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

          {/* STEP 1: Identity, Age 50 vs 78 & OV5647 Webcam Enrollment */}
          <section className="clinical-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCirclePlus size={19} weight="duotone" color="var(--accent-blue)" />
                <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
                  Step 1: Identity, Age UI Tier &amp; Live Camera Enrollment
                </h2>
              </div>
              <span className={`status-pill ${liveTier.tone} tabular-nums`}>
                {targetProfile.age >= 65
                  ? 'Activates Age 78 High-Assist HUD'
                  : 'Activates Age 50 Cockpit HUD'}
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

            {/* Live OV5647 Webcam Photo Capture */}
            <WebcamCaptureBox
              avatarDataUrl={targetProfile.avatarDataUrl}
              elderName={targetProfile.name}
              elderAge={targetProfile.age}
              onCaptureAvatar={(avatarDataUrl) =>
                handleProfileFieldChange({ avatarDataUrl })
              }
            />

            {/* Age Slider + Instant UI Layout Preview Badge + Voice Cadence */}
            <div className="clinical-subtle-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <label htmlFor="elder-age-slider" style={{ fontSize: '13px', fontWeight: 700 }}>
                  Member Age (Morphs 7-Inch Layout Structural Grid &amp; Voice)
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="elder-age-number"
                    aria-label="Member age numeric input"
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
                  Layout Mode:{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {targetProfile.age >= 65 ? '3-Card Senior' : '6-Tile Cockpit'}
                  </strong>
                </div>
                <div>
                  Primary CTA Dock:{' '}
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {liveTier.buttonMinHeightPx}px ({targetProfile.age >= 65 ? 'Center Thumb' : 'Bottom-Right'})
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '10px' }}>
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

          {/* STEP 2: Medical History, Allergies & Daily Sleep/Wake Schedule */}
          <section className="clinical-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FirstAidKit size={19} weight="duotone" color="var(--accent-crimson)" />
                <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
                  Step 2: Allergies, Chronic Conditions &amp; Sleep Watch Routine
                </h2>
              </div>
            </div>

            {/* Allergies Chips + Custom Tag Input */}
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '6px' }}>
                Declared Food &amp; Medication Allergies
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {ALLERGY_SUGGESTIONS.map((item) => {
                  const active = targetProfile.allergies.some(
                    (a) => a.toLowerCase() === item.toLowerCase()
                  );
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleTagInList('allergies', item)}
                      className={active ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '4px 9px',
                        fontSize: '12px',
                        ...(active
                          ? {
                              backgroundColor: 'var(--accent-crimson)',
                              borderColor: 'var(--accent-crimson)',
                            }
                          : {}),
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={customAllergyDraft}
                  onChange={(e) => setCustomAllergyDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTag('allergies', customAllergyDraft, setCustomAllergyDraft);
                    }
                  }}
                  placeholder="Add custom allergy (e.g., Ibuprofen, Prawns)..."
                  className="clinical-input"
                />
                <button
                  type="button"
                  onClick={() =>
                    addCustomTag('allergies', customAllergyDraft, setCustomAllergyDraft)
                  }
                  className="btn-secondary"
                  style={{ flexShrink: 0 }}
                >
                  <Plus size={14} weight="bold" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Chronic Conditions */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '6px' }}>
                Chronic Medical Conditions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {[...CONDITION_SUGGESTIONS, 'None'].map((cond) => {
                  const active =
                    cond === 'None'
                      ? targetProfile.conditions.length === 0
                      : targetProfile.conditions.some(
                          (c) => c.toLowerCase() === cond.toLowerCase()
                        );
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleTagInList('conditions', cond)}
                      className={active ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '4px 9px', fontSize: '12px' }}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={customConditionDraft}
                  onChange={(e) => setCustomConditionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTag(
                        'conditions',
                        customConditionDraft,
                        setCustomConditionDraft
                      );
                    }
                  }}
                  placeholder="Add custom condition (e.g., Hypothyroidism)..."
                  className="clinical-input"
                />
                <button
                  type="button"
                  onClick={() =>
                    addCustomTag(
                      'conditions',
                      customConditionDraft,
                      setCustomConditionDraft
                    )
                  }
                  className="btn-secondary"
                  style={{ flexShrink: 0 }}
                >
                  <Plus size={14} weight="bold" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Medications & Timing List */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '6px' }}>
                <Pill size={15} weight="duotone" color="var(--accent-blue)" />
                <span>Medications &amp; Scheduled Timings</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {targetProfile.medications.map((med) => (
                  <span
                    key={med}
                    className="status-pill blue"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    <span>{med}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleProfileFieldChange({
                          medications: targetProfile.medications.filter((m) => m !== med),
                        })
                      }
                      aria-label={`Remove ${med}`}
                      style={{ background: 'transparent', color: 'inherit', display: 'inline-flex' }}
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={medicationDraft}
                  onChange={(e) => setMedicationDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTag('medications', medicationDraft, setMedicationDraft);
                    }
                  }}
                  placeholder="e.g., Atorvastatin 10mg (09:00 PM)"
                  className="clinical-input"
                />
                <button
                  type="button"
                  onClick={() =>
                    addCustomTag('medications', medicationDraft, setMedicationDraft)
                  }
                  className="btn-secondary"
                  style={{ flexShrink: 0 }}
                >
                  <Plus size={14} weight="bold" />
                  <span>Add Med</span>
                </button>
              </div>
            </div>

            {/* Daily Sleep & Wake Schedule + 24GHz Radar Dead-Man Watch Notice */}
            <div className="clinical-subtle-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <div>
                  <label htmlFor="wake-time" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Approx Wake-Up Time
                  </label>
                  <input
                    id="wake-time"
                    type="time"
                    value={targetProfile.wakeTime}
                    onChange={(e) =>
                      handleProfileFieldChange({ wakeTime: e.target.value })
                    }
                    className="clinical-input tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="sleep-time" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    Approx Bed / Sleep Time
                  </label>
                  <input
                    id="sleep-time"
                    type="time"
                    value={targetProfile.sleepTime}
                    onChange={(e) =>
                      handleProfileFieldChange({ sleepTime: e.target.value })
                    }
                    className="clinical-input tabular-nums"
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--ink-secondary)',
                  lineHeight: 1.45,
                }}
              >
                <MoonStars size={16} weight="duotone" color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>HLK-LD2410B 24GHz Radar</strong> will automatically enforce the
                  15-minute Night Bathroom Absence Dead-Man Watch between{' '}
                  <strong className="tabular-nums" style={{ color: 'var(--ink-primary)' }}>
                    {targetProfile.sleepTime}
                  </strong>{' '}
                  and{' '}
                  <strong className="tabular-nums" style={{ color: 'var(--ink-primary)' }}>
                    {targetProfile.wakeTime}
                  </strong>
                  .
                </span>
              </div>
            </div>
          </section>

          {/* STEP 3: Personal Baseline Calibration (MAX30102 + MLX90614) */}
          <section className="clinical-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={19} weight="duotone" color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
                  Step 3: Personal Vitals Calibration (MAX30102 + MLX90614)
                </h2>
              </div>
            </div>

            <div className="clinical-subtle-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
              <div>
                <label htmlFor="thresh-hr-min" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '3px' }}>
                  HR Min
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
                  HR Max
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
                  SpO₂ Min %
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
                  Temp Max °F
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={handleSaveAndApply}
                className="btn-secondary"
              >
                <CheckCircle size={16} weight="duotone" color="var(--accent-emerald)" />
                <span>Save Profile Calibrations</span>
              </button>

              {savedNotice ? (
                <span className="status-pill emerald">{savedNotice}</span>
              ) : null}
            </div>
          </section>

          {/* STEP 4: Generate AI Daily Care & Alarm JSON Plan */}
          <section className="clinical-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BellRinging size={19} weight="duotone" color="var(--accent-blue)" />
                <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
                  Step 4: Generate AI Daily Care &amp; Alarm JSON Plan
                </h2>
              </div>

              {generatedPlan ? (
                <span className={`status-pill ${generatedPlan.mode === 'nim-live' ? 'emerald' : 'blue'}`}>
                  {generatedPlan.mode === 'nim-live' ? 'NVIDIA NIM Live JSON' : 'Clinical Rule JSON Ready'}
                </span>
              ) : null}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
              Compiles {targetProfile.name}&apos;s age, allergies, medications, and{' '}
              <span className="tabular-nums">{targetProfile.sleepTime}–{targetProfile.wakeTime}</span>{' '}
              sleep routine into machine-readable daily alarms for Raspberry Pi 4 &amp; ESP32-S3.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void handleGenerateCarePlan()}
                disabled={isGeneratingPlan}
                className="btn-primary"
              >
                <Pulse size={16} weight="bold" />
                <span>
                  {isGeneratingPlan
                    ? 'Generating Daily Care JSON...'
                    : 'Generate AI Care & Alarm JSON'}
                </span>
              </button>

              {generatedPlan ? (
                <button
                  type="button"
                  onClick={handlePushPlanToKiosk}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 15px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    backgroundColor: 'var(--accent-emerald)',
                    color: '#FFFFFF',
                    border: '1px solid var(--accent-emerald)',
                  }}
                >
                  <CheckCircle size={16} weight="fill" />
                  <span>Push Plan &amp; Alarms to 7-Inch Kiosk</span>
                </button>
              ) : null}

              <Link to="/sandbox" className="btn-secondary">
                <Heartbeat size={16} weight="duotone" />
                <span>Open Full Kiosk Sandbox</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>

            {planPushNotice ? (
              <span className="status-pill emerald">
                <CheckCircle size={14} weight="fill" />
                <span>{planPushNotice}</span>
              </span>
            ) : null}

            {/* Visual Daily Alarm Timeline + Allergy Guardrails + Collapsible Raw JSON */}
            {generatedPlan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '6px' }}>
                <div className="clinical-subtle-panel" style={{ padding: '11px 14px', fontSize: '12.5px', color: 'var(--ink-primary)' }}>
                  <strong>{generatedPlan.profile_summary}</strong>{' '}
                  <span className="tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                    (Hydration Goal: {generatedPlan.hydration_goal_ml} ml/day · Sleep Radar: {String(generatedPlan.sleep_watch_window.start)}–{String(generatedPlan.sleep_watch_window.end)})
                  </span>
                </div>

                {/* Daily Alarm Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px' }}>
                  {generatedPlan.daily_alarms.map((alarm, index) => (
                    <div
                      key={`${alarm.time}-${index}`}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-hairline)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span className="tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                          <Clock size={13} weight="duotone" />
                          <span>{alarm.time}</span>
                        </span>
                        <span className="status-pill" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {alarm.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                        {alarm.title}
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerCareAlarm(alarm)}
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 8px', alignSelf: 'flex-start' }}
                      >
                        <SpeakerHigh size={12} weight="duotone" />
                        <span>Ring Alarm on Kiosk</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Dietary & Allergy Guardrails */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  <div
                    style={{
                      padding: '11px 13px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--accent-emerald-bg)',
                      border: '1px solid var(--accent-emerald-border)',
                    }}
                  >
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '5px' }}>
                      RECOMMENDED NUTRITION &amp; HYDRATION
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--ink-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {generatedPlan.nutrition_rules.recommended.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div
                    style={{
                      padding: '11px 13px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--accent-crimson-bg)',
                      border: '1px solid var(--accent-crimson-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 800, color: 'var(--accent-crimson)', marginBottom: '5px' }}>
                      <WarningOctagon size={13} weight="fill" />
                      <span>STRICTLY AVOID (ALLERGIES &amp; CONDITIONS)</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--ink-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {generatedPlan.nutrition_rules.strictly_avoid.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Collapsible Machine-Readable Device JSON Drawer */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawJsonDrawer((prev) => !prev)}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '5px 10px' }}
                  >
                    <Code size={14} weight="bold" />
                    <span>View Machine-Readable Device JSON</span>
                    {showRawJsonDrawer ? (
                      <CaretUp size={12} weight="bold" />
                    ) : (
                      <CaretDown size={12} weight="bold" />
                    )}
                  </button>

                  {showRawJsonDrawer ? (
                    <pre
                      style={{
                        marginTop: '8px',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-strong)',
                        fontSize: '11.5px',
                        lineHeight: 1.45,
                        color: 'var(--ink-primary)',
                        overflowX: 'auto',
                        maxHeight: '280px',
                      }}
                    >
                      {JSON.stringify(generatedPlan, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {/* RIGHT COLUMN: Sticky Live 7-Inch 1024x600 Landscape Preview */}
        <div
          className="setup-preview-sticky"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'sticky',
            top: '86px',
            minWidth: 0,
          }}
        >
          <div className="clinical-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                Live 7-Inch 1024×600 Layout Adaptation Preview
              </div>
              <span className="tabular-nums" style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                {activeProfileId === 'guest'
                  ? 'Guest Lock Active'
                  : `${targetProfile.age >= 65 ? 'Age 78 High-Assist' : 'Age 50 Cockpit'} · ${liveTier.buttonMinHeightPx}px CTA · ${liveTier.speechRateLabel} Voice`}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
              Switch between <strong>Rohan (50)</strong> &amp; <strong>Subhashree (78)</strong>{' '}
              to watch the screen structurally morph between the dense 6-tile Cockpit
              and the simplified High-Assist Senior HUD.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'VITALS', label: 'Vitals Grid Comparison' },
                  { id: 'CARE_PLAN', label: 'Care Plan & Alarms' },
                  { id: 'STANDBY', label: 'Standby HUD' },
                  { id: 'SETUP', label: '+ New In-Device Sign-Up' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreenModeManual(item.id)}
                  className={screenMode === item.id ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <KioskDeviceScreen showEscalationStrip={false} defaultSetupMode />
        </div>
      </div>
    </div>
  );
}
