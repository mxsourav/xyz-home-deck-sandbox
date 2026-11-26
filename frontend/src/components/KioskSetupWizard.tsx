import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Backspace,
  CheckCircle,
  Heartbeat,
  Thermometer,
  UserPlus,
  Waves,
  Wind,
} from '@phosphor-icons/react';
import { computeAccessibilityTier } from '../utils/accessibilityTier';
import type { KioskTheme } from '../context/SandboxContext';
import { PpgWaveformCanvas } from './PpgWaveformCanvas';

type WizardStep = 'name' | 'hr' | 'spo2' | 'temp';
type CapturePhase = 'waiting' | 'sampling' | 'captured';

interface KioskSetupWizardProps {
  kioskTheme: KioskTheme;
  initialName: string;
  initialAge: number;
  initialHr: number;
  initialSpo2: number;
  initialTempF: number;
  onComplete: (payload: {
    name: string;
    age: number;
    heartRate: number;
    spo2: number;
    bodyTempF: number;
  }) => void;
  onCancel: () => void;
}

interface SensorStepMeta {
  id: Exclude<WizardStep, 'name'>;
  stepNumber: number;
  title: string;
  sensorName: string;
  waitingTitle: string;
  waitingDetail: string;
  unit: string;
  defaultSample: string;
  min: number;
  max: number;
  allowDecimal: boolean;
  nextLabel: string;
}

const SENSOR_STEPS: Record<Exclude<WizardStep, 'name'>, SensorStepMeta> = {
  hr: {
    id: 'hr',
    stepNumber: 2,
    title: 'Heart Rate Baseline Capture',
    sensorName: 'MAX30102 Optical Pulse Sensor',
    waitingTitle: 'Waiting for finger contact on MAX30102 pad...',
    waitingDetail:
      'Place elder fingertip calmly against the front-bezel optical window so red & IR LEDs lock onto resting pulse.',
    unit: 'BPM',
    defaultSample: '74',
    min: 40,
    max: 160,
    allowDecimal: false,
    nextLabel: 'Next: SpO₂ Oxygen Sensor',
  },
  spo2: {
    id: 'spo2',
    stepNumber: 3,
    title: 'Blood Oxygen (SpO₂) Capture',
    sensorName: 'MAX30102 Dual-Wavelength SpO₂',
    waitingTitle: 'Waiting for steady SpO₂ perfusion reading...',
    waitingDetail:
      'Keep fingertip still on the optical pad for 3 seconds to measure 660nm/880nm arterial oxygen saturation.',
    unit: '%',
    defaultSample: '98',
    min: 80,
    max: 100,
    allowDecimal: false,
    nextLabel: 'Next: IR Forehead Temp',
  },
  temp: {
    id: 'temp',
    stepNumber: 4,
    title: 'Contactless Body Temp Capture',
    sensorName: 'MLX90614 TO-39 Infrared Optic',
    waitingTitle: 'Waiting for forehead alignment on MLX90614 lens...',
    waitingDetail:
      'Hold forehead 5–10 cm facing the bezel IR thermopile window — zero physical skin contact needed.',
    unit: '°F',
    defaultSample: '98.4',
    min: 94.0,
    max: 104.0,
    allowDecimal: true,
    nextLabel: 'Save & Calibrate Profile',
  },
};

const KEYBOARD_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export function KioskSetupWizard({
  kioskTheme,
  initialName,
  initialAge,
  initialHr,
  initialSpo2,
  initialTempF,
  onComplete,
  onCancel,
}: KioskSetupWizardProps) {
  const isDark = kioskTheme === 'dark';

  const [step, setStep] = useState<WizardStep>('name');
  const [nameValue, setNameValue] = useState<string>(initialName);
  const [ageValue, setAgeValue] = useState<number>(initialAge);
  const [isShiftOn, setIsShiftOn] = useState<boolean>(false);

  const [capturedHr, setCapturedHr] = useState<number | null>(null);
  const [capturedSpo2, setCapturedSpo2] = useState<number | null>(null);
  const [capturedTempF, setCapturedTempF] = useState<number | null>(null);

  const [capturePhase, setCapturePhase] = useState<CapturePhase>('waiting');
  const [samplingPct, setSamplingPct] = useState<number>(0);
  const [cornerDraft, setCornerDraft] = useState<string>(String(initialHr));
  const [cornerError, setCornerError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const sensorInputRef = useRef<HTMLInputElement | null>(null);
  const samplingTimerRef = useRef<number | null>(null);

  const tier = computeAccessibilityTier(ageValue);

  const colors = isDark
    ? {
        panelBg: '#131C31',
        subPanelBg: '#0F172A',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        keyBg: '#1E293B',
        keyBorder: '1px solid rgba(148, 163, 184, 0.26)',
        keyText: '#F8FAFC',
        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textMuted: '#94A3B8',
        inputBg: '#0B1120',
        simDockBg: '#11192C',
        accentBlue: '#38BDF8',
        accentGreen: '#22C55E',
        accentAmber: '#F59E0B',
      }
    : {
        panelBg: '#FFFFFF',
        subPanelBg: '#F1F5F9',
        border: '1px solid #CBD5E1',
        keyBg: '#FFFFFF',
        keyBorder: '1px solid #CBD5E1',
        keyText: '#0F172A',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#64748B',
        inputBg: '#F8FAFC',
        simDockBg: '#F8FAFC',
        accentBlue: '#1D4ED8',
        accentGreen: '#15803D',
        accentAmber: '#B45309',
      };

  // Clear sampling interval on unmount
  useEffect(() => {
    return () => {
      if (samplingTimerRef.current !== null) {
        window.clearInterval(samplingTimerRef.current);
      }
    };
  }, []);

  // Auto-focus active field when changing steps so physical keyboard works immediately
  useEffect(() => {
    if (step === 'name') {
      nameInputRef.current?.focus();
    } else {
      sensorInputRef.current?.focus();
    }
  }, [step]);

  const beginSensorStep = (nextStep: Exclude<WizardStep, 'name'>) => {
    if (samplingTimerRef.current !== null) {
      window.clearInterval(samplingTimerRef.current);
      samplingTimerRef.current = null;
    }
    setCapturePhase('waiting');
    setSamplingPct(0);
    setCornerError(null);
    if (nextStep === 'hr') {
      setCornerDraft(String(capturedHr ?? initialHr));
    } else if (nextStep === 'spo2') {
      setCornerDraft(String(capturedSpo2 ?? initialSpo2));
    } else {
      setCornerDraft(
        String(capturedTempF !== null ? capturedTempF : initialTempF.toFixed(1))
      );
    }
    setStep(nextStep);
  };

  const handleTouchKey = (char: string) => {
    nameInputRef.current?.focus();
    setNameValue((prev) => {
      const shouldUpper =
        isShiftOn || prev.length === 0 || prev.endsWith(' ');
      const outputChar = shouldUpper ? char.toUpperCase() : char.toLowerCase();
      if (isShiftOn) setIsShiftOn(false);
      return `${prev}${outputChar}`.slice(0, 40);
    });
  };

  const handleTouchBackspace = () => {
    nameInputRef.current?.focus();
    setNameValue((prev) => prev.slice(0, -1));
  };

  const handleCornerKeypad = (key: string) => {
    sensorInputRef.current?.focus();
    setCornerError(null);
    if (key === '⌫') {
      setCornerDraft((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      const meta = step !== 'name' ? SENSOR_STEPS[step] : null;
      if (!meta?.allowDecimal || cornerDraft.includes('.')) return;
      setCornerDraft((prev) => (prev ? `${prev}.` : '0.'));
      return;
    }
    setCornerDraft((prev) => `${prev}${key}`.slice(0, 6));
  };

  const handleInjectAndCapture = () => {
    if (step === 'name') return;
    const meta = SENSOR_STEPS[step];
    const parsed = Number(cornerDraft);

    if (!Number.isFinite(parsed) || parsed < meta.min || parsed > meta.max) {
      setCornerError(`Enter ${meta.min}–${meta.max} ${meta.unit}`);
      return;
    }

    setCornerError(null);
    if (samplingTimerRef.current !== null) {
      window.clearInterval(samplingTimerRef.current);
    }

    setCapturePhase('sampling');
    setSamplingPct(12);

    let pct = 12;
    samplingTimerRef.current = window.setInterval(() => {
      pct += 22;
      if (pct >= 100) {
        if (samplingTimerRef.current !== null) {
          window.clearInterval(samplingTimerRef.current);
          samplingTimerRef.current = null;
        }
        setSamplingPct(100);
        setCapturePhase('captured');
        if (step === 'hr') setCapturedHr(Math.round(parsed));
        if (step === 'spo2') setCapturedSpo2(Math.round(parsed));
        if (step === 'temp') setCapturedTempF(Number(parsed.toFixed(1)));
      } else {
        setSamplingPct(pct);
      }
    }, 180);
  };

  const handleAdvanceSensorStep = () => {
    if (step === 'hr') {
      beginSensorStep('spo2');
      return;
    }
    if (step === 'spo2') {
      beginSensorStep('temp');
      return;
    }
    if (step === 'temp') {
      onComplete({
        name: nameValue.trim() || initialName,
        age: ageValue,
        heartRate: capturedHr ?? initialHr,
        spo2: capturedSpo2 ?? initialSpo2,
        bodyTempF: capturedTempF ?? initialTempF,
      });
    }
  };

  const stepsOrder: { id: WizardStep; label: string }[] = [
    { id: 'name', label: '1. Elder Name' },
    { id: 'hr', label: '2. Pulse (MAX30102)' },
    { id: 'spo2', label: '3. SpO₂ (MAX30102)' },
    { id: 'temp', label: '4. Temp (MLX90614)' },
  ];

  const activeStepIndex = stepsOrder.findIndex((s) => s.id === step);

  return (
    <div
      style={{
        height: '100%',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Top 4-Step Progress Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '8px',
          backgroundColor: colors.panelBg,
          border: colors.border,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPlus size={15} weight="duotone" color={colors.accentBlue} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            First-Time Elder Sign-Up
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {stepsOrder.map((s, idx) => {
            const isCurrent = s.id === step;
            const isDone = idx < activeStepIndex;
            return (
              <span
                key={s.id}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: isCurrent
                    ? isDark
                      ? 'rgba(56, 189, 248, 0.16)'
                      : '#EFF6FF'
                    : isDone
                      ? isDark
                        ? 'rgba(34, 197, 94, 0.16)'
                        : '#F0FDF4'
                      : 'transparent',
                  color: isCurrent
                    ? colors.accentBlue
                    : isDone
                      ? colors.accentGreen
                      : colors.textMuted,
                  border: isCurrent
                    ? `1px solid ${colors.accentBlue}`
                    : isDone
                      ? `1px solid ${colors.accentGreen}`
                      : '1px solid transparent',
                }}
              >
                {s.label}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCancel}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '5px',
            backgroundColor: colors.subPanelBg,
            color: colors.textSecondary,
            border: colors.border,
          }}
        >
          Exit Sign-Up
        </button>
      </div>

      {/* === STEP 1: NAME INPUT + ON-SCREEN QWERTY KEYBOARD === */}
      {step === 'name' ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
            minHeight: 0,
          }}
        >
          {/* Upper Identity Input Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: colors.panelBg,
                border: colors.border,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <label
                  htmlFor="kiosk-signup-name"
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Elder Full Name (Physical or Touch Keyboard)
                </label>
                <span style={{ fontSize: '11px', color: colors.accentBlue, fontWeight: 600 }}>
                  USB / Touch Ready
                </span>
              </div>

              <input
                ref={nameInputRef}
                id="kiosk-signup-name"
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value.slice(0, 40))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameValue.trim()) {
                    beginSensorStep('hr');
                  }
                }}
                placeholder="Type elder name here..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '20px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  borderRadius: '8px',
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: `1.5px solid ${colors.accentBlue}`,
                  outline: 'none',
                }}
              />
            </div>

            {/* Age & Accessibility Calibration Selector */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: colors.panelBg,
                border: colors.border,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Elder Age
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: colors.accentGreen,
                  }}
                >
                  {tier.shortLabel} ({tier.scaleLabel})
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setAgeValue((a) => Math.max(45, a - 1))}
                  style={{
                    width: '44px',
                    height: '40px',
                    borderRadius: '7px',
                    fontSize: '18px',
                    fontWeight: 800,
                    backgroundColor: colors.keyBg,
                    color: colors.textPrimary,
                    border: colors.keyBorder,
                  }}
                >
                  −
                </button>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    color: colors.textPrimary,
                  }}
                >
                  {ageValue} yrs
                </div>
                <button
                  type="button"
                  onClick={() => setAgeValue((a) => Math.min(100, a + 1))}
                  style={{
                    width: '44px',
                    height: '40px',
                    borderRadius: '7px',
                    fontSize: '18px',
                    fontWeight: 800,
                    backgroundColor: colors.keyBg,
                    color: colors.textPrimary,
                    border: colors.keyBorder,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Lower On-Screen 7-Inch Capacitive QWERTY Keyboard */}
          <div
            aria-label="On-screen 7-inch touch QWERTY keyboard"
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: colors.subPanelBg,
              border: colors.border,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <div
                key={rowIdx}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {rowIdx === 2 ? (
                  <button
                    type="button"
                    onClick={() => setIsShiftOn((s) => !s)}
                    style={{
                      minWidth: '72px',
                      height: '42px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: isShiftOn
                        ? colors.accentBlue
                        : colors.keyBg,
                      color: isShiftOn ? '#FFFFFF' : colors.keyText,
                      border: colors.keyBorder,
                    }}
                  >
                    ⇧ Shift
                  </button>
                ) : null}

                {row.map((letter) => {
                  const displayChar =
                    isShiftOn || nameValue.length === 0 || nameValue.endsWith(' ')
                      ? letter
                      : letter.toLowerCase();
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleTouchKey(letter)}
                      style={{
                        flex: '0 0 68px',
                        height: '42px',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: 700,
                        backgroundColor: colors.keyBg,
                        color: colors.keyText,
                        border: colors.keyBorder,
                      }}
                    >
                      {displayChar}
                    </button>
                  );
                })}

                {rowIdx === 2 ? (
                  <button
                    type="button"
                    onClick={handleTouchBackspace}
                    aria-label="Backspace"
                    style={{
                      minWidth: '84px',
                      height: '42px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      backgroundColor: colors.keyBg,
                      color: colors.keyText,
                      border: colors.keyBorder,
                    }}
                  >
                    <Backspace size={16} weight="bold" />
                    <span>Del</span>
                  </button>
                ) : null}
              </div>
            ))}

            {/* Bottom Keyboard Action Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  nameInputRef.current?.focus();
                  setNameValue('');
                }}
                style={{
                  minWidth: '92px',
                  height: '44px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  backgroundColor: colors.keyBg,
                  color: colors.textSecondary,
                  border: colors.keyBorder,
                }}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  nameInputRef.current?.focus();
                  setNameValue((prev) => `${prev} `.slice(0, 40));
                }}
                style={{
                  flex: 1,
                  maxWidth: '390px',
                  height: '44px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: colors.keyBg,
                  color: colors.textSecondary,
                  border: colors.keyBorder,
                }}
              >
                Space Bar
              </button>

              <button
                type="button"
                onClick={() => beginSensorStep('hr')}
                disabled={!nameValue.trim()}
                style={{
                  minWidth: '245px',
                  height: '44px',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  backgroundColor: nameValue.trim() ? '#1D4ED8' : colors.keyBg,
                  color: nameValue.trim() ? '#FFFFFF' : colors.textMuted,
                  border: nameValue.trim() ? '1px solid #1D4ED8' : colors.keyBorder,
                }}
              >
                <span>Next: Measure Pulse (1 of 3)</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* === STEPS 2–4: SEQUENTIAL SENSOR ACQUISITION + BOTTOM-RIGHT VALUE INJECTOR === */}
      {step !== 'name' ? (
        (() => {
          const meta = SENSOR_STEPS[step];
          const activeCapturedValue =
            step === 'hr'
              ? capturedHr
              : step === 'spo2'
                ? capturedSpo2
                : capturedTempF;

          const displayValue =
            activeCapturedValue !== null
              ? step === 'temp'
                ? activeCapturedValue.toFixed(1)
                : String(activeCapturedValue)
              : capturePhase === 'sampling'
                ? cornerDraft
                : '--';

          return (
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.85fr) minmax(265px, 1fr)',
                gap: '12px',
                minHeight: 0,
              }}
            >
              {/* LEFT: Authentic Real-Device Waiting / Sampling / Captured UI */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: '10px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: colors.accentBlue,
                      }}
                    >
                      {meta.sensorName}
                    </div>
                    <h3
                      style={{
                        fontSize: '19px',
                        fontWeight: 800,
                        color: colors.textPrimary,
                        marginTop: '2px',
                      }}
                    >
                      {meta.title} — {nameValue || initialName}
                    </h3>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      backgroundColor:
                        capturePhase === 'captured'
                          ? isDark
                            ? 'rgba(34, 197, 94, 0.16)'
                            : '#F0FDF4'
                          : isDark
                            ? 'rgba(245, 158, 11, 0.16)'
                            : '#FFFBEB',
                      color:
                        capturePhase === 'captured'
                          ? colors.accentGreen
                          : colors.accentAmber,
                      border:
                        capturePhase === 'captured'
                          ? `1px solid ${colors.accentGreen}`
                          : `1px solid ${colors.accentAmber}`,
                    }}
                  >
                    {capturePhase === 'waiting'
                      ? 'WAITING FOR SUBJECT SENSOR'
                      : capturePhase === 'sampling'
                        ? `SAMPLING STREAM (${samplingPct}%)`
                        : 'READING LOCKED ✓'}
                  </span>
                </div>

                {/* Live Sensor Visual State */}
                <div
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRadius: '8px',
                    backgroundColor: colors.subPanelBg,
                    border: colors.border,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '10px',
                          backgroundColor:
                            capturePhase === 'captured'
                              ? isDark
                                ? 'rgba(34, 197, 94, 0.15)'
                                : '#DCFCE7'
                              : isDark
                                ? 'rgba(56, 189, 248, 0.15)'
                                : '#DBEAFE',
                          color:
                            capturePhase === 'captured'
                              ? colors.accentGreen
                              : colors.accentBlue,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {step === 'hr' ? (
                          <Heartbeat size={26} weight="duotone" />
                        ) : step === 'spo2' ? (
                          <Wind size={26} weight="duotone" />
                        ) : (
                          <Thermometer size={26} weight="duotone" />
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: colors.textPrimary,
                          }}
                        >
                          {capturePhase === 'waiting'
                            ? meta.waitingTitle
                            : capturePhase === 'sampling'
                              ? 'Reading I²C sensor packets & averaging baseline...'
                              : `${meta.sensorName} baseline verified`}
                        </div>
                        <p
                          style={{
                            fontSize: '12px',
                            color: colors.textSecondary,
                            marginTop: '3px',
                          }}
                        >
                          {meta.waitingDetail}
                        </p>
                      </div>
                    </div>

                    {/* Large Numeric Display */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '42px',
                          fontWeight: 800,
                          lineHeight: 1,
                          color:
                            capturePhase === 'captured'
                              ? colors.accentGreen
                              : colors.textPrimary,
                        }}
                      >
                        {displayValue}
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            marginLeft: '4px',
                            color: colors.textMuted,
                          }}
                        >
                          {meta.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Waveform or Thermal Acquisition Progress */}
                  {step === 'temp' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11.5px',
                          color: colors.textMuted,
                        }}
                      >
                        <span>Infrared Emissivity Lock (ε = 0.98 Skin Target)</span>
                        <span className="tabular-nums">
                          {capturePhase === 'waiting'
                            ? '0% — Awaiting forehead align'
                            : capturePhase === 'sampling'
                              ? `${samplingPct}% sampling...`
                              : '100% — Locked'}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '12px',
                          borderRadius: '999px',
                          backgroundColor: colors.keyBg,
                          overflow: 'hidden',
                          border: colors.border,
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${
                              capturePhase === 'waiting' ? 6 : samplingPct
                            }%`,
                            backgroundColor:
                              capturePhase === 'captured'
                                ? colors.accentGreen
                                : colors.accentBlue,
                            transition: 'width 160ms linear',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <PpgWaveformCanvas
                        heartRate={
                          capturePhase === 'waiting'
                            ? 60
                            : Number(cornerDraft) || initialHr
                        }
                        spo2={
                          capturePhase === 'waiting'
                            ? 75
                            : step === 'spo2'
                              ? Number(cornerDraft) || initialSpo2
                              : 98
                        }
                        statusTone={
                          capturePhase === 'captured' ? 'emerald' : 'amber'
                        }
                        height={88}
                        theme={kioskTheme}
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Step Navigation Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 'hr') setStep('name');
                      else if (step === 'spo2') beginSensorStep('hr');
                      else beginSensorStep('spo2');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '44px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: colors.subPanelBg,
                      color: colors.textPrimary,
                      border: colors.border,
                    }}
                  >
                    <ArrowLeft size={15} weight="bold" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAdvanceSensorStep}
                    disabled={capturePhase !== 'captured'}
                    style={{
                      flex: 1,
                      height: '44px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: 800,
                      backgroundColor:
                        capturePhase === 'captured'
                          ? step === 'temp'
                            ? '#15803D'
                            : '#1D4ED8'
                          : colors.subPanelBg,
                      color:
                        capturePhase === 'captured' ? '#FFFFFF' : colors.textMuted,
                      border:
                        capturePhase === 'captured' ? 'none' : colors.border,
                    }}
                  >
                    {step === 'temp' ? (
                      <CheckCircle size={18} weight="fill" />
                    ) : (
                      <Waves size={17} weight="duotone" />
                    )}
                    <span>
                      {capturePhase === 'captured'
                        ? meta.nextLabel
                        : `Capture ${meta.unit} via bottom-right panel to continue`}
                    </span>
                  </button>
                </div>
              </div>

              {/* BOTTOM-RIGHT CORNER SENSOR VALUE INJECTOR (For Physical-Sensorless Demo Typing) */}
              <div
                style={{
                  padding: '12px 13px',
                  borderRadius: '10px',
                  backgroundColor: colors.simDockBg,
                  border: `1px dashed ${colors.accentBlue}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: colors.accentBlue,
                    }}
                  >
                    Corner Sensor Value Input
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: colors.textSecondary,
                      marginTop: '2px',
                    }}
                  >
                    Type value ({meta.min}–{meta.max} {meta.unit}) via keypad or laptop keyboard:
                  </div>
                </div>

                {/* Typed Input Box */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    ref={sensorInputRef}
                    type="text"
                    inputMode="decimal"
                    value={cornerDraft}
                    onChange={(e) => {
                      setCornerError(null);
                      setCornerDraft(e.target.value.slice(0, 6));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleInjectAndCapture();
                      }
                    }}
                    aria-label={`Enter simulated ${meta.sensorName} value in ${meta.unit}`}
                    className="tabular-nums"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      fontSize: '20px',
                      fontWeight: 800,
                      borderRadius: '7px',
                      backgroundColor: colors.panelBg,
                      color: colors.textPrimary,
                      border: colors.border,
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: colors.textMuted,
                      minWidth: '34px',
                    }}
                  >
                    {meta.unit}
                  </span>
                </div>

                {cornerError ? (
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444' }}>
                    {cornerError}
                  </div>
                ) : null}

                {/* Compact Touch Numpad */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '5px',
                  }}
                >
                  {NUMPAD_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCornerKeypad(key)}
                      style={{
                        height: '38px',
                        borderRadius: '6px',
                        fontSize: '14.5px',
                        fontWeight: 700,
                        backgroundColor: colors.keyBg,
                        color: colors.keyText,
                        border: colors.keyBorder,
                      }}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {/* Inject & Capture Button */}
                <button
                  type="button"
                  onClick={handleInjectAndCapture}
                  disabled={capturePhase === 'sampling'}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: 800,
                    backgroundColor: '#15803D',
                    color: '#FFFFFF',
                  }}
                >
                  {capturePhase === 'sampling'
                    ? 'Capturing Sensor...'
                    : `Take ${meta.unit} Reading`}
                </button>
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
