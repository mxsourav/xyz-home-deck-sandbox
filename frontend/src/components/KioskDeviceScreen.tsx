import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BatteryChargingVertical,
  BatteryHigh,
  BellRinging,
  Camera,
  CheckCircle,
  Clock,
  Fan,
  Heartbeat,
  LockKey,
  PhoneCall,
  Plug,
  Radio,
  ShieldCheck,
  ShieldWarning,
  SpeakerHigh,
  SpeakerSlash,
  Thermometer,
  UserCheck,
  UserSwitch,
  WarningOctagon,
  Wind,
} from '@phosphor-icons/react';
import { KIOSK_COPY } from '../data/kioskCopy';
import {
  useSandbox,
  type EscalationStage,
  type KioskScreenMode,
} from '../context/SandboxContext';
import type { PromptLanguage } from '../utils/audioEngine';
import { PpgWaveformCanvas } from './PpgWaveformCanvas';

interface KioskDeviceScreenProps {
  showEscalationStrip?: boolean;
  compactPreview?: boolean;
}

const ESCALATION_PIPELINE: {
  stage: EscalationStage | 0;
  windowLabel: string;
  title: string;
  detail: string;
}[] = [
  {
    stage: 0,
    windowLabel: 't+0 s',
    title: 'Anomaly Detected',
    detail: 'Radar stillness / pose / thud / vitals breach',
  },
  {
    stage: 1,
    windowLabel: 't+2 s',
    title: 'Verify — 10s Window',
    detail: '12V siren + red countdown + "I\'M OKAY"',
  },
  {
    stage: 2,
    windowLabel: 't+10 s',
    title: 'Auto Call + SMS',
    detail: 'Phone ring + Telegram snapshot & vitals',
  },
  {
    stage: 3,
    windowLabel: 't+20 s',
    title: 'Child Live Check-In',
    detail: 'Audio / video link opens on child phone',
  },
  {
    stage: 4,
    windowLabel: 't+30 s',
    title: 'Ambulance / Police',
    detail: 'Confirmed emergency + exact home address',
  },
];

function getLiveClockDisplay(): { time: string; date: string } {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    date: now.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }),
  };
}

export function KioskDeviceScreen({
  showEscalationStrip = true,
  compactPreview = false,
}: KioskDeviceScreenProps) {
  const {
    elderProfile,
    accessibilityTier,
    selectProfile,
    setLanguage,
    telemetry,
    screenMode,
    setScreenModeManual,
    countdownSec,
    escalationStage,
    emergencyReason,
    isMuted,
    toggleMute,
    lastVitalsLoggedAt,
    startVitalsCheckIn,
    logVitalsOkay,
    cancelEmergencyOkay,
    sendAlertNow,
    acknowledgeHazard,
  } = useSandbox();

  const [clock, setClock] = useState(() => getLiveClockDisplay());

  useEffect(() => {
    const id = window.setInterval(() => setClock(getLiveClockDisplay()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isGuest = Boolean(elderProfile.isGuest);
  const copy = KIOSK_COPY[elderProfile.language];
  const bodyTempC = ((telemetry.bodyTempF - 32) * (5 / 9)).toFixed(1);
  const batteryVoltage = (11.1 + (telemetry.batteryPercent / 100) * 1.5).toFixed(1);

  const scale = accessibilityTier.scale;
  const highContrastBorder =
    accessibilityTier.tier === 'HIGH_ASSIST'
      ? `${accessibilityTier.borderWidthPx}px solid #0F172A`
      : `${accessibilityTier.borderWidthPx}px solid var(--border-strong)`;

  const vitalNumberPx = Math.round((compactPreview ? 23 : 28) * scale);
  const primaryBtnFontPx = Math.round((compactPreview ? 14 : 15.5) * scale);
  const clockPx = Math.round((compactPreview ? 32 : 40) * Math.min(scale, 1.2));

  const hrOutOfRange =
    telemetry.heartRate < elderProfile.baseline.hrMin ||
    telemetry.heartRate > elderProfile.baseline.hrMax;
  const spo2OutOfRange = telemetry.spo2 < elderProfile.baseline.spo2Min;
  const tempOutOfRange = telemetry.bodyTempF > elderProfile.baseline.tempMax;

  const vitalsTone: 'emerald' | 'amber' | 'crimson' =
    hrOutOfRange || spo2OutOfRange || tempOutOfRange || screenMode === 'EMERGENCY'
      ? 'crimson'
      : telemetry.spo2 <= elderProfile.baseline.spo2Min + 1
        ? 'amber'
        : 'emerald';

  const radarColor =
    telemetry.radarState === 'BED_EMPTY_NIGHT'
      ? '#EF4444'
      : telemetry.radarState === 'MOVING'
        ? '#22C55E'
        : '#60A5FA';

  const screenTabs: { mode: KioskScreenMode; label: string }[] = [
    { mode: 'STANDBY', label: 'Standby' },
    { mode: 'VITALS', label: 'Vitals Check-In' },
    { mode: 'EMERGENCY', label: 'Emergency HUD' },
  ];

  // Radial ring math for 10s countdown
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference * (1 - Math.max(0, Math.min(10, countdownSec)) / 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Matte-Slate Industrial Bezel Housing (7-inch 1024x600 aspect) */}
      <div className="kiosk-bezel">
        {/* Top Physical Hardware Bezel Indicators */}
        <div className="kiosk-bezel-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="bezel-sensor-pill">
              <Camera size={13} weight="duotone" />
              <span>OV5647 · Local 30 FPS</span>
            </span>

            <span className="bezel-sensor-pill">
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: radarColor,
                  display: 'inline-block',
                }}
              />
              <span>LD2410B Radar</span>
            </span>

            {!compactPreview ? (
              <>
                <span className="bezel-sensor-pill">
                  <Heartbeat size={13} weight="duotone" />
                  <span>MAX30102 Pad</span>
                </span>
                <span className="bezel-sensor-pill">
                  <Thermometer size={13} weight="duotone" />
                  <span>MLX90614 Optic</span>
                </span>
              </>
            ) : null}
          </div>

          <span
            className="bezel-sensor-pill tabular-nums"
            style={{
              backgroundColor: telemetry.acMainsConnected
                ? 'rgba(21, 128, 61, 0.25)'
                : 'rgba(180, 83, 9, 0.35)',
              borderColor: telemetry.acMainsConnected
                ? 'rgba(187, 247, 208, 0.35)'
                : 'rgba(253, 230, 138, 0.45)',
            }}
          >
            {telemetry.acMainsConnected ? (
              <Plug size={13} weight="duotone" />
            ) : (
              <BatteryChargingVertical size={13} weight="duotone" />
            )}
            <span>
              3S2P UPS {telemetry.batteryPercent}% ({batteryVoltage}V)
            </span>
          </span>
        </div>

        {/* Crisp Light-Mode 7-Inch Capacitive Touchscreen */}
        <div
          className="kiosk-screen"
          style={compactPreview ? { minHeight: '400px' } : undefined}
        >
          {/* Top Kiosk Control Bar */}
          <div className="kiosk-screen-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  letterSpacing: '0.02em',
                  color: 'var(--ink-primary)',
                }}
              >
                XYZ HOME DECK
              </span>

              {isGuest ? (
                <span
                  className="status-pill amber"
                  style={{ padding: '3px 9px', fontSize: '11.5px' }}
                >
                  <LockKey size={13} weight="duotone" />
                  <span>Guest Privacy Lock</span>
                </span>
              ) : (
                <>
                  <Link
                    to="/setup"
                    className="status-pill blue"
                    style={{ padding: '3px 9px', fontSize: '11.5px' }}
                    title="Edit Elder Profile & Baseline Calibration"
                  >
                    <UserCheck size={13} weight="duotone" />
                    <span>{elderProfile.name}</span>
                  </Link>

                  <span
                    className={`status-pill ${accessibilityTier.tone} tabular-nums`}
                    style={{ padding: '3px 9px', fontSize: '11px' }}
                  >
                    <span>
                      Age {elderProfile.age} · {accessibilityTier.shortLabel} (
                      {accessibilityTier.scaleLabel} Scale ·{' '}
                      {accessibilityTier.speechRateLabel} Voice)
                    </span>
                  </span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Language Switcher EN | HI | BN */}
              <div
                role="group"
                aria-label="Kiosk spoken and interface language"
                style={{
                  display: 'inline-flex',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                }}
              >
                {(['en', 'hi', 'bn'] as PromptLanguage[]).map((lang) => {
                  const active = elderProfile.language === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      style={{
                        border: 'none',
                        padding: '4px 8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: active
                          ? 'var(--accent-blue)'
                          : 'var(--bg-surface)',
                        color: active ? '#FFFFFF' : 'var(--ink-secondary)',
                      }}
                    >
                      {lang.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {/* Audio Mute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className="btn-secondary"
                style={{ padding: '4px 9px', fontSize: '11.5px' }}
                aria-label={isMuted ? 'Unmute audio and speech' : 'Mute audio and speech'}
              >
                {isMuted ? (
                  <SpeakerSlash size={14} weight="duotone" color="var(--accent-amber)" />
                ) : (
                  <SpeakerHigh size={14} weight="duotone" color="var(--accent-blue)" />
                )}
                <span>{isMuted ? 'Muted' : 'Audio On'}</span>
              </button>
            </div>
          </div>

          {/* Screen Mode Quick Tabs (locked down when Guest Privacy Mode is active) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '8px 14px',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderBottom: '1px solid var(--border-hairline)',
              flexWrap: 'wrap',
            }}
          >
            {isGuest ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                <ShieldCheck size={15} weight="duotone" />
                <span>Unregistered Face — Personal Vitals &amp; Contacts Locked</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {screenTabs.map((tab) => {
                  const isActive = screenMode === tab.mode;
                  return (
                    <button
                      key={tab.mode}
                      type="button"
                      onClick={() => setScreenModeManual(tab.mode)}
                      className={isActive ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        ...(isActive && tab.mode === 'EMERGENCY'
                          ? {
                              backgroundColor: 'var(--accent-crimson)',
                              borderColor: 'var(--accent-crimson)',
                            }
                          : {}),
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            <span
              className="tabular-nums"
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: telemetry.acMainsConnected
                  ? 'var(--accent-emerald)'
                  : 'var(--accent-amber)',
              }}
            >
              {telemetry.acMainsConnected ? 'AC Mains OK' : 'Running on 3S2P UPS'}
            </span>
          </div>

          {/* === GUEST PRIVACY SCREEN (Unregistered Visitor) === */}
          {isGuest && screenMode !== 'HAZARD' ? (
            <div className="kiosk-screen-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <span className="status-pill amber">
                  <LockKey size={14} weight="duotone" />
                  <span>{copy.guestLockTag}</span>
                </span>
                <span className="status-pill tabular-nums">
                  <Clock size={14} weight="duotone" />
                  <span>{clock.time}</span>
                </span>
              </div>

              <div
                className="clinical-card"
                style={{
                  padding: '20px',
                  borderColor: 'var(--accent-amber-border)',
                  backgroundColor: 'var(--accent-amber-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: 'var(--accent-amber)',
                    fontWeight: 800,
                    fontSize: '16px',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  <ShieldWarning size={20} weight="duotone" />
                  <span>{copy.guestLockHeadline}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  {copy.guestLockBody}
                </p>
              </div>

              {/* Neutral Room Climate Only (DHT22 & MQ-135) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                <div className="clinical-card" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                    {copy.roomTempLabel}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                    {telemetry.roomTempC}°C · {telemetry.humidity}% RH
                  </div>
                </div>
                <div className="clinical-card" style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                    {copy.airQualityLabel}
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      marginTop: '4px',
                      color: 'var(--accent-emerald)',
                    }}
                  >
                    {telemetry.airQuality}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => selectProfile('subhashree')}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  minHeight: '50px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <UserSwitch size={19} weight="duotone" />
                <span>{copy.guestSwitchFamily}</span>
              </button>
            </div>
          ) : null}

          {/* === SCREEN STATE 1: STANDBY (Registered Elder) === */}
          {!isGuest && screenMode === 'STANDBY' ? (
            <div className="kiosk-screen-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <span className="status-pill emerald">
                  <span className="status-dot" />
                  <span>{copy.standbyTag}</span>
                </span>
                <span className="status-pill">
                  <BatteryHigh size={14} weight="duotone" />
                  <span className="tabular-nums">
                    UPS {telemetry.batteryPercent}%
                  </span>
                </span>
              </div>

              <div
                className="clinical-card"
                style={{
                  padding: `${accessibilityTier.cardPaddingPx + 4}px`,
                  border: highContrastBorder,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: 'var(--ink-muted)',
                    fontSize: `${Math.round(12.5 * Math.min(scale, 1.15))}px`,
                    fontWeight: 600,
                  }}
                >
                  <Clock size={15} weight="duotone" />
                  <span>{clock.date}</span>
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: `${clockPx}px`,
                    fontWeight: 800,
                    color: 'var(--ink-primary)',
                    lineHeight: 1.1,
                  }}
                >
                  {clock.time}
                </div>
              </div>

              {accessibilityTier.simplifiedLayout ? (
                /* 80+ HIGH_ASSIST simplified low-clutter room summary strip */
                <div
                  className="clinical-card"
                  style={{
                    padding: `${accessibilityTier.cardPaddingPx}px`,
                    border: highContrastBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: `${Math.round(14 * scale)}px`,
                      fontWeight: 700,
                      color: 'var(--ink-primary)',
                    }}
                  >
                    Room {telemetry.roomTempC}°C · Air {telemetry.airQuality}
                  </span>
                  <span
                    style={{
                      fontSize: `${Math.round(13.5 * scale)}px`,
                      fontWeight: 700,
                      color: 'var(--accent-blue)',
                    }}
                  >
                    Radar Active
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '10px',
                  }}
                >
                  <div
                    className="clinical-card"
                    style={{
                      padding: `${accessibilityTier.cardPaddingPx}px`,
                      border: highContrastBorder,
                    }}
                  >
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {copy.roomTempLabel}
                    </div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: `${Math.round(16.5 * Math.min(scale, 1.15))}px`,
                        fontWeight: 800,
                        marginTop: '4px',
                      }}
                    >
                      {telemetry.roomTempC}°C · {telemetry.humidity}%
                    </div>
                  </div>

                  <div
                    className="clinical-card"
                    style={{
                      padding: `${accessibilityTier.cardPaddingPx}px`,
                      border: highContrastBorder,
                    }}
                  >
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {copy.airQualityLabel}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px',
                        fontSize: `${Math.round(15 * Math.min(scale, 1.15))}px`,
                        fontWeight: 800,
                        color:
                          telemetry.airQuality === 'GOOD'
                            ? 'var(--accent-emerald)'
                            : telemetry.airQuality === 'MODERATE'
                              ? 'var(--accent-amber)'
                              : 'var(--accent-crimson)',
                      }}
                    >
                      <Wind size={16} weight="duotone" />
                      <span>{telemetry.airQuality}</span>
                    </div>
                  </div>

                  <div
                    className="clinical-card"
                    style={{
                      padding: `${accessibilityTier.cardPaddingPx}px`,
                      border: highContrastBorder,
                    }}
                  >
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {copy.radarLabel}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px',
                        fontSize: `${Math.round(13.5 * Math.min(scale, 1.15))}px`,
                        fontWeight: 700,
                        color: 'var(--accent-blue)',
                      }}
                    >
                      <Radio size={15} weight="duotone" />
                      <span>
                        {telemetry.radarState === 'PRESENT_STILL'
                          ? 'Present (Still)'
                          : telemetry.radarState === 'MOVING'
                            ? 'Active Motion'
                            : 'Bed Empty'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={startVitalsCheckIn}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  minHeight: `${accessibilityTier.buttonMinHeightPx}px`,
                  padding: '12px 18px',
                  fontSize: `${primaryBtnFontPx}px`,
                  fontWeight: 800,
                  borderRadius: 'var(--radius-md)',
                  border:
                    accessibilityTier.tier === 'HIGH_ASSIST'
                      ? '2px solid #0F172A'
                      : '1px solid var(--accent-blue)',
                }}
              >
                <Heartbeat size={Math.round(20 * Math.min(scale, 1.2))} weight="duotone" />
                <span>{copy.startCheckIn}</span>
              </button>
            </div>
          ) : null}

          {/* === SCREEN STATE 2: DAILY VITALS CHECK-IN (Registered Elder) === */}
          {!isGuest && screenMode === 'VITALS' ? (
            <div className="kiosk-screen-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <span className={`status-pill ${vitalsTone}`}>
                  <span className="status-dot" />
                  <span>{copy.vitalsTag}</span>
                </span>
                {lastVitalsLoggedAt && !accessibilityTier.simplifiedLayout ? (
                  <span className="status-pill emerald tabular-nums">
                    <CheckCircle size={14} weight="duotone" />
                    <span>
                      {copy.vitalsLoggedBanner} {lastVitalsLoggedAt}
                    </span>
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                <div
                  className="clinical-card"
                  style={{
                    padding: `${accessibilityTier.cardPaddingPx}px`,
                    border: highContrastBorder,
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)' }}>
                    {copy.heartRateLabel}
                  </div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: `${vitalNumberPx}px`,
                      fontWeight: 800,
                      color: hrOutOfRange
                        ? 'var(--accent-crimson)'
                        : 'var(--accent-emerald)',
                      lineHeight: 1.12,
                      marginTop: '4px',
                    }}
                  >
                    {telemetry.heartRate}{' '}
                    <span style={{ fontSize: '12.5px', fontWeight: 700 }}>BPM</span>
                  </div>
                  {!accessibilityTier.simplifiedLayout ? (
                    <div
                      className="tabular-nums"
                      style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '3px' }}
                    >
                      Baseline: {elderProfile.baseline.hrMin}–
                      {elderProfile.baseline.hrMax} BPM
                    </div>
                  ) : null}
                </div>

                <div
                  className="clinical-card"
                  style={{
                    padding: `${accessibilityTier.cardPaddingPx}px`,
                    border: highContrastBorder,
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)' }}>
                    {copy.spo2Label}
                  </div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: `${vitalNumberPx}px`,
                      fontWeight: 800,
                      color: spo2OutOfRange
                        ? 'var(--accent-crimson)'
                        : 'var(--accent-emerald)',
                      lineHeight: 1.12,
                      marginTop: '4px',
                    }}
                  >
                    {telemetry.spo2}
                    <span style={{ fontSize: '14px', fontWeight: 700 }}> %</span>
                  </div>
                  {!accessibilityTier.simplifiedLayout ? (
                    <div
                      className="tabular-nums"
                      style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '3px' }}
                    >
                      Min: ≥{elderProfile.baseline.spo2Min}%
                    </div>
                  ) : null}
                </div>

                <div
                  className="clinical-card"
                  style={{
                    padding: `${accessibilityTier.cardPaddingPx}px`,
                    border: highContrastBorder,
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)' }}>
                    {copy.bodyTempLabel}
                  </div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: `${vitalNumberPx}px`,
                      fontWeight: 800,
                      color: tempOutOfRange
                        ? 'var(--accent-crimson)'
                        : 'var(--ink-primary)',
                      lineHeight: 1.12,
                      marginTop: '4px',
                    }}
                  >
                    {telemetry.bodyTempF.toFixed(1)}
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>°F</span>
                  </div>
                  {!accessibilityTier.simplifiedLayout ? (
                    <div
                      className="tabular-nums"
                      style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '3px' }}
                    >
                      {bodyTempC}°C (Max {elderProfile.baseline.tempMax}°F)
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 60 FPS Live PPG / ECG Canvas */}
              <div
                className="clinical-card"
                style={{ padding: '10px 12px', border: highContrastBorder }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--ink-secondary)',
                  }}
                >
                  <span>MAX30102 Live Optical PPG / ECG Trace (60 FPS)</span>
                  <span className="tabular-nums">
                    {telemetry.heartRate} BPM · {(60 / telemetry.heartRate).toFixed(2)}s cycle
                  </span>
                </div>
                <PpgWaveformCanvas
                  heartRate={telemetry.heartRate}
                  spo2={telemetry.spo2}
                  statusTone={vitalsTone}
                  height={compactPreview ? 76 : 92}
                />
              </div>

              <button
                type="button"
                onClick={logVitalsOkay}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: `${accessibilityTier.buttonMinHeightPx}px`,
                  padding: '12px 18px',
                  fontSize: `${primaryBtnFontPx}px`,
                  fontWeight: 800,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-emerald)',
                  color: '#FFFFFF',
                  border:
                    accessibilityTier.tier === 'HIGH_ASSIST'
                      ? '2px solid #0F172A'
                      : '1px solid var(--accent-emerald)',
                }}
              >
                <CheckCircle size={Math.round(20 * Math.min(scale, 1.2))} weight="duotone" />
                <span>{copy.imOkLogVitals}</span>
              </button>
            </div>
          ) : null}

          {/* === SCREEN STATE 3: EMERGENCY 10s COUNTDOWN (Registered Elder) === */}
          {!isGuest && screenMode === 'EMERGENCY' ? (
            <div
              className="kiosk-screen-body"
              style={{
                backgroundColor: 'var(--accent-crimson-bg)',
                border: '2px solid var(--accent-crimson)',
                margin: '10px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span className="status-pill crimson">
                  <BellRinging size={14} weight="duotone" />
                  <span>{copy.emergencyTag}</span>
                </span>
                <span className="status-pill">
                  Trigger: {emergencyReason ?? 'Anomaly Detected'}
                </span>
              </div>

              <div
                className="clinical-card"
                style={{
                  padding: '18px 20px',
                  borderColor: 'var(--accent-crimson-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '22px',
                  flexWrap: 'wrap',
                }}
              >
                {escalationStage <= 1 ? (
                  <>
                    <svg
                      width="106"
                      height="106"
                      viewBox="0 0 100 100"
                      aria-label={`Emergency countdown ${countdownSec} seconds`}
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        fill="none"
                        stroke="#FEE2E2"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        fill="none"
                        stroke="#B91C1C"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        transform="rotate(-90 50 50)"
                      />
                      <text
                        x="50"
                        y="56"
                        textAnchor="middle"
                        fill="#B91C1C"
                        fontSize="26"
                        fontWeight="800"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {countdownSec}s
                      </text>
                    </svg>

                    <div style={{ maxWidth: '300px' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: `${Math.round(17 * Math.min(scale, 1.15))}px`,
                          fontWeight: 800,
                          color: 'var(--accent-crimson)',
                        }}
                      >
                        12V Piezo Siren Active
                      </div>
                      <p
                        style={{
                          fontSize: `${Math.round(13.5 * Math.min(scale, 1.15))}px`,
                          color: 'var(--ink-secondary)',
                          marginTop: '4px',
                        }}
                      >
                        {copy.countdownHint}
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '6px 10px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '18px',
                        fontWeight: 800,
                        color: 'var(--accent-crimson)',
                      }}
                    >
                      <PhoneCall size={22} weight="duotone" />
                      <span>{copy.escalationSentHeadline}</span>
                    </div>
                    <p
                      className="tabular-nums"
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--ink-secondary)',
                        marginTop: '6px',
                      }}
                    >
                      Contact: {elderProfile.emergencyContactName} (
                      {elderProfile.emergencyContactPhone}) · Vitals:{' '}
                      {telemetry.heartRate} BPM / {telemetry.spo2}% SpO₂ /{' '}
                      {telemetry.bodyTempF.toFixed(1)}°F
                    </p>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={cancelEmergencyOkay}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: `${accessibilityTier.buttonMinHeightPx}px`,
                    padding: '12px 16px',
                    fontSize: `${primaryBtnFontPx}px`,
                    fontWeight: 800,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-emerald)',
                    color: '#FFFFFF',
                    border:
                      accessibilityTier.tier === 'HIGH_ASSIST'
                        ? '2px solid #0F172A'
                        : '1px solid var(--accent-emerald)',
                  }}
                >
                  <CheckCircle size={22} weight="duotone" />
                  <span>{copy.imOkayCancel}</span>
                </button>

                <button
                  type="button"
                  onClick={sendAlertNow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    minHeight: `${accessibilityTier.buttonMinHeightPx}px`,
                    padding: '12px 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--accent-crimson)',
                    color: '#FFFFFF',
                    border: '1px solid var(--accent-crimson)',
                  }}
                >
                  <WarningOctagon size={18} weight="duotone" />
                  <span>{copy.sendAlertNow}</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* === SCREEN STATE 4: GAS / SMOKE HAZARD === */}
          {screenMode === 'HAZARD' ? (
            <div
              className="kiosk-screen-body"
              style={{
                backgroundColor: 'var(--accent-amber-bg)',
                border: '2px solid var(--accent-amber)',
                margin: '10px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span className="status-pill crimson">
                  <ShieldWarning size={14} weight="duotone" />
                  <span>{copy.hazardTag}</span>
                </span>
                <span className="status-pill emerald">
                  <Fan size={14} weight="duotone" />
                  <span>{copy.relayOnText}</span>
                </span>
              </div>

              <div
                className="clinical-card"
                style={{
                  padding: '22px',
                  borderColor: 'var(--accent-amber-border)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  MQ-2 Combustible Gas / Smoke Concentration
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '44px',
                    fontWeight: 800,
                    color: 'var(--accent-crimson)',
                    lineHeight: 1.1,
                  }}
                >
                  {telemetry.lpgPpm}{' '}
                  <span style={{ fontSize: '18px', fontWeight: 700 }}>ppm</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  Threshold exceeded (&gt;400 ppm). Optocoupled 5V relay closed
                  exhaust fan circuit and notified family phone.
                </p>
              </div>

              <button
                type="button"
                onClick={acknowledgeHazard}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  minHeight: `${accessibilityTier.buttonMinHeightPx}px`,
                  padding: '12px 18px',
                  fontSize: `${primaryBtnFontPx}px`,
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <CheckCircle size={20} weight="duotone" />
                <span>{copy.acknowledgeHazard}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Live t+0s -> t+40s Autonomous Escalation Strip */}
      {showEscalationStrip ? (
        <div className="clinical-card" style={{ padding: '16px 18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
              Autonomous Escalation Pipeline (t+0 s → t+40 s)
            </span>
            <span
              className={`status-pill ${screenMode === 'EMERGENCY' ? 'crimson' : 'emerald'}`}
              style={{ fontSize: '11.5px', padding: '3px 9px' }}
            >
              {screenMode === 'EMERGENCY'
                ? `Active: Stage ${escalationStage}`
                : 'Idle — Watching Sensors'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
              gap: '8px',
            }}
          >
            {ESCALATION_PIPELINE.map((item) => {
              const isEmergencyActive = screenMode === 'EMERGENCY';
              const isCurrent = isEmergencyActive && escalationStage === item.stage;
              const isPassed = isEmergencyActive && escalationStage > item.stage;

              return (
                <div
                  key={item.windowLabel}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: isCurrent
                      ? '1.5px solid var(--accent-crimson)'
                      : isPassed
                        ? '1px solid var(--accent-amber-border)'
                        : '1px solid var(--border-hairline)',
                    backgroundColor: isCurrent
                      ? 'var(--accent-crimson-bg)'
                      : isPassed
                        ? 'var(--accent-amber-bg)'
                        : 'var(--bg-surface-subtle)',
                  }}
                >
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isCurrent
                        ? 'var(--accent-crimson)'
                        : isPassed
                          ? 'var(--accent-amber)'
                          : 'var(--ink-muted)',
                    }}
                  >
                    {item.windowLabel}
                  </div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: 'var(--ink-primary)',
                      marginTop: '2px',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--ink-secondary)',
                      marginTop: '2px',
                      lineHeight: 1.35,
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
