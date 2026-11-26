import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BatteryChargingVertical,
  BellRinging,
  CheckCircle,
  Clock,
  Drop,
  Fan,
  Heartbeat,
  LockKey,
  Moon,
  MoonStars,
  PhoneCall,
  Plug,
  ShieldWarning,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  Thermometer,
  UserPlus,
  UserSwitch,
  WarningOctagon,
} from '@phosphor-icons/react';
import { KIOSK_COPY } from '../data/kioskCopy';
import {
  useSandbox,
  type EscalationStage,
  type KioskScreenMode,
} from '../context/SandboxContext';
import {
  audioEngine,
  type AudioPlaybackStatus,
  type PromptLanguage,
} from '../utils/audioEngine';
import { KioskSetupWizard } from './KioskSetupWizard';
import { PpgWaveformCanvas } from './PpgWaveformCanvas';

interface KioskDeviceScreenProps {
  showEscalationStrip?: boolean;
  defaultSetupMode?: boolean;
}

const LOGICAL_WIDTH = 1024;
const LOGICAL_HEIGHT = 600;

const ESCALATION_PIPELINE: {
  stage: EscalationStage | 0;
  windowLabel: string;
  stageTag: string;
  title: string;
  detail: string;
}[] = [
  {
    stage: 0,
    windowLabel: 't+0 s',
    stageTag: 'Stage 0',
    title: 'Anomaly Detected',
    detail: 'Radar stillness / pose / thud / vitals breach',
  },
  {
    stage: 1,
    windowLabel: 't+2 s',
    stageTag: 'Stage 1',
    title: 'Verify — 10s Window',
    detail: '12V siren + red countdown + "I\'M OKAY"',
  },
  {
    stage: 2,
    windowLabel: 't+10 s',
    stageTag: 'Stage 2',
    title: 'Auto Call + SMS',
    detail: 'Phone ring + Telegram snapshot & vitals',
  },
  {
    stage: 3,
    windowLabel: 't+20 s',
    stageTag: 'Stage 3',
    title: 'Child Live Check-In',
    detail: 'Audio / video link opens on child phone',
  },
  {
    stage: 4,
    windowLabel: 't+30 s',
    stageTag: 'Stage 4',
    title: 'Ambulance / Police',
    detail: 'Confirmed emergency + exact home address',
  },
];

function getLiveClockDisplay(): {
  time: string;
  timeShort: string;
  seconds: string;
  date: string;
} {
  const now = new Date();
  const shortParts = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const secs = String(now.getSeconds()).padStart(2, '0');
  return {
    time: now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    timeShort: shortParts,
    seconds: secs,
    date: now.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }),
  };
}

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'ED'
  );
}

export function KioskDeviceScreen({
  showEscalationStrip = true,
  defaultSetupMode = false,
}: KioskDeviceScreenProps) {
  const {
    elderProfile,
    accessibilityTier,
    selectProfile,
    setLanguage,
    telemetry,
    screenMode,
    setScreenModeManual,
    kioskTheme,
    toggleKioskTheme,
    completeOnDeviceEnrollment,
    activeCareAlarm,
    triggerCareAlarm,
    dismissCareAlarm,
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
    triggerFallScenario,
  } = useSandbox();

  const [clock, setClock] = useState(() => getLiveClockDisplay());
  const [audioStatus, setAudioStatus] = useState<AudioPlaybackStatus>(() =>
    audioEngine.getAudioStatus()
  );

  const slotRef = useRef<HTMLDivElement | null>(null);
  const [viewportScale, setViewportScale] = useState<number>(0.85);
  const [slotHeight, setSlotHeight] = useState<number>(0);
  const didApplyInitialSetup = useRef(false);

  useEffect(() => {
    if (defaultSetupMode && !didApplyInitialSetup.current) {
      didApplyInitialSetup.current = true;
      setScreenModeManual('SETUP');
    }
  }, [defaultSetupMode, setScreenModeManual]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(getLiveClockDisplay()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return audioEngine.subscribeAudioStatus(setAudioStatus);
  }, []);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth;
      if (width > 0) {
        setViewportScale(Math.min(1, width / LOGICAL_WIDTH));
        setSlotHeight(Math.round(width / (LOGICAL_WIDTH / LOGICAL_HEIGHT)));
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isDark = kioskTheme === 'dark';
  const isGuest = Boolean(elderProfile.isGuest);
  // Structural switch: Age >= 65 activates High-Assist Ergonomic Senior HUD vs Age < 65 Compact Cockpit
  const isSeniorHud = !isGuest && elderProfile.age >= 65;

  const copy = KIOSK_COPY[elderProfile.language];
  const bodyTempC = ((telemetry.bodyTempF - 32) * (5 / 9)).toFixed(1);
  const batteryVoltage = (11.1 + (telemetry.batteryPercent / 100) * 1.5).toFixed(1);

  const callFamilyLabel =
    elderProfile.language === 'bn'
      ? 'পরিবারকে কল করুন'
      : elderProfile.language === 'hi'
        ? 'परिवार को कॉल करें'
        : 'CALL FAMILY / HELP';

  const startDailySeniorLabel =
    elderProfile.language === 'bn'
      ? 'দৈনিক পরীক্ষা শুরু করুন'
      : elderProfile.language === 'hi'
        ? 'दैनिक जांच शुरू करें'
        : 'START DAILY CHECK-IN';

  const showDashboardChrome = screenMode !== 'SETUP';
  const headerHeight = showDashboardChrome ? 44 : 0;
  const showSeniorReminderBanner =
    showDashboardChrome &&
    isSeniorHud &&
    screenMode !== 'EMERGENCY' &&
    screenMode !== 'HAZARD';
  const bannerHeight = showSeniorReminderBanner ? 40 : 0;
  const bodyHeight = LOGICAL_HEIGHT - headerHeight - bannerHeight;

  const nextScheduledAlarm =
    elderProfile.carePlan?.daily_alarms.find(
      (a) => a.category === 'MEDICATION' || a.category === 'HYDRATION'
    ) ?? elderProfile.carePlan?.daily_alarms[0];

  const hud = isDark
    ? {
        screenBg: '#0B1120',
        topBarBg: '#0F172A',
        tileBg: '#131C31',
        subTileBg: '#0F172A',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderHighAssist: '2px solid rgba(148, 163, 184, 0.36)',
        inkPrimary: '#F8FAFC',
        inkSecondary: '#CBD5E1',
        inkMuted: '#94A3B8',
        emeraldText: '#22C55E',
        emeraldSoft: 'rgba(34, 197, 94, 0.15)',
        emeraldBorder: 'rgba(34, 197, 94, 0.38)',
        amberText: '#F59E0B',
        amberSoft: 'rgba(245, 158, 11, 0.15)',
        amberBorder: 'rgba(245, 158, 11, 0.42)',
        crimsonText: '#EF4444',
        crimsonSoft: 'rgba(239, 68, 68, 0.15)',
        crimsonBorder: 'rgba(239, 68, 68, 0.44)',
        blueText: '#38BDF8',
        blueSoft: 'rgba(56, 189, 248, 0.14)',
        blueBorder: 'rgba(56, 189, 248, 0.35)',
        controlBg: '#1E293B',
      }
    : {
        screenBg: '#F8FAFC',
        topBarBg: '#FFFFFF',
        tileBg: '#FFFFFF',
        subTileBg: '#F1F5F9',
        border: '1px solid #CBD5E1',
        borderHighAssist: '2px solid #94A3B8',
        inkPrimary: '#0F172A',
        inkSecondary: '#475569',
        inkMuted: '#64748B',
        emeraldText: '#15803D',
        emeraldSoft: '#F0FDF4',
        emeraldBorder: '#BBF7D0',
        amberText: '#B45309',
        amberSoft: '#FFFBEB',
        amberBorder: '#FDE68A',
        crimsonText: '#B91C1C',
        crimsonSoft: '#FEF2F2',
        crimsonBorder: '#FECACA',
        blueText: '#1D4ED8',
        blueSoft: '#EFF6FF',
        blueBorder: '#BFDBFE',
        controlBg: '#F1F5F9',
      };

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

  const hydrationGoalMl = elderProfile.hydrationGoalMl || 2000;
  const hydrationConsumedMl = isSeniorHud
    ? Math.round(hydrationGoalMl * 0.58)
    : Math.round(hydrationGoalMl * 0.5);
  const hydrationPct = Math.min(100, Math.round((hydrationConsumedMl / hydrationGoalMl) * 100));
  const gasSafetyPct = Math.min(100, Math.max(6, Math.round((telemetry.lpgPpm / 400) * 100)));
  const hrPct = Math.min(100, Math.max(10, Math.round(((telemetry.heartRate - 40) / 100) * 100)));
  const spo2Pct = Math.min(100, Math.max(12, Math.round(((telemetry.spo2 - 80) / 20) * 100)));
  const tempPct = Math.min(100, Math.max(10, Math.round(((telemetry.bodyTempF - 95) / 9) * 100)));
  const breathingRate =
    telemetry.radarState === 'BED_EMPTY_NIGHT'
      ? 0
      : telemetry.radarState === 'MOVING'
        ? 20
        : 16;

  const renderProgressTrack = (pct: number, fillColor: string, trackHeight = 8) => (
    <div
      style={{
        width: '100%',
        height: `${trackHeight}px`,
        borderRadius: '999px',
        backgroundColor: isDark ? 'rgba(148, 163, 184, 0.16)' : '#E2E8F0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: '100%',
          borderRadius: '999px',
          backgroundColor: fillColor,
        }}
      />
    </div>
  );

  const screenTabs: { mode: KioskScreenMode; label: string }[] = [
    { mode: 'STANDBY', label: 'Standby' },
    { mode: 'VITALS', label: 'Vitals' },
    { mode: 'CARE_PLAN', label: 'Care Plan' },
    { mode: 'EMERGENCY', label: 'Emergency' },
    { mode: 'SETUP', label: 'Sign Up' },
  ];

  // Radial ring math for 10s countdown
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference * (1 - Math.max(0, Math.min(10, countdownSec)) / 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
      {/* Waveshare-Style 7-Inch Embedded IPS Display Module (Equal 12px 4-Side Matte-Black Bezel + 4 PCB Ears) */}
      <div className="kiosk-lcd-mount">
        <div className="kiosk-bezel">
          <span className="kiosk-pcb-ear tl" aria-hidden="true" />
          <span className="kiosk-pcb-ear tr" aria-hidden="true" />
          <span className="kiosk-pcb-ear bl" aria-hidden="true" />
          <span className="kiosk-pcb-ear br" aria-hidden="true" />

          {/* Strict 1024:600 Widescreen (1.707 : 1) Active LCD Viewport */}
          <div
            ref={slotRef}
            className="kiosk-viewport-slot"
            style={slotHeight > 0 ? { height: `${slotHeight}px` } : undefined}
          >
            <div
              className="kiosk-logical-canvas"
              style={{
                width: `${LOGICAL_WIDTH}px`,
                height: `${LOGICAL_HEIGHT}px`,
                transform: `scale(${viewportScale})`,
                transformOrigin: 'top left',
                backgroundColor: hud.screenBg,
                color: hud.inkPrimary,
                position: 'relative',
              }}
            >
              {/* === TOP CONTROL BAR (Hidden During Out-of-Box & Sign-Up Onboarding) === */}
              {showDashboardChrome ? (
              <div
              style={{
                height: `${headerHeight}px`,
                padding: '0 12px',
                backgroundColor: hud.topBarBg,
                borderBottom: hud.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              {/* Brand + Avatar Thumbnail + Active Mode Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flexShrink: 1 }}>
                {!isGuest ? (
                  <Link
                    to="/setup"
                    title="Open camera enrollment & AI care planner"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      minWidth: 0,
                    }}
                  >
                    {elderProfile.avatarDataUrl ? (
                      <img
                        src={elderProfile.avatarDataUrl}
                        alt={elderProfile.name}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `1.5px solid ${isSeniorHud ? hud.amberText : hud.blueText}`,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isSeniorHud ? hud.amberSoft : hud.blueSoft,
                          border: `1.5px solid ${isSeniorHud ? hud.amberBorder : hud.blueBorder}`,
                          color: isSeniorHud ? hud.amberText : hud.blueText,
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(elderProfile.name)}
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: '13px',
                          color: hud.inkPrimary,
                          whiteSpace: 'nowrap',
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {elderProfile.name} · {elderProfile.age}y
                      </span>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: isSeniorHud ? hud.amberSoft : hud.blueSoft,
                          border: `1px solid ${isSeniorHud ? hud.amberBorder : hud.blueBorder}`,
                          color: isSeniorHud ? hud.amberText : hud.blueText,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {isSeniorHud ? 'High-Assist' : 'Cockpit'}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 9px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: hud.amberSoft,
                      border: `1px solid ${hud.amberBorder}`,
                      color: hud.amberText,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <LockKey size={13} weight="duotone" />
                    <span>Guest Privacy Lock</span>
                  </span>
                )}
              </div>

              {/* Center Mode Tabs (13px Bold · 6px 11px Touch Targets) */}
              <div
                role="tablist"
                aria-label="Kiosk HUD Screens"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px',
                  borderRadius: '8px',
                  backgroundColor: hud.subTileBg,
                  border: hud.border,
                  flexShrink: 0,
                }}
              >
                {screenTabs.map((tab) => {
                  const isActive = screenMode === tab.mode;
                  const activeColor =
                    tab.mode === 'EMERGENCY' ? '#B91C1C' : '#1D4ED8';
                  const disabled =
                    isGuest && (tab.mode === 'VITALS' || tab.mode === 'CARE_PLAN');
                  return (
                    <button
                      key={tab.mode}
                      type="button"
                      disabled={disabled}
                      onClick={() => setScreenModeManual(tab.mode)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 11px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: isActive ? activeColor : 'transparent',
                        color: isActive
                          ? '#FFFFFF'
                          : disabled
                            ? hud.inkMuted
                            : hud.inkSecondary,
                        opacity: disabled ? 0.45 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.mode === 'SETUP' ? (
                        <UserPlus size={13} weight="bold" />
                      ) : null}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Cluster: 13px Bold EN|HI|BN + Day/Night + Audio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {audioStatus.state === 'blocked' ? (
                  <button
                    type="button"
                    onClick={() => audioEngine.unlock()}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: hud.amberSoft,
                      color: hud.amberText,
                      border: `1px solid ${hud.amberBorder}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Tap Audio
                  </button>
                ) : null}

                {/* Language Switcher EN | HI | BN */}
                <div
                  role="group"
                  aria-label="Kiosk spoken and interface language"
                  style={{
                    display: 'inline-flex',
                    border: hud.border,
                    borderRadius: '6px',
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
                          padding: '5px 8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          backgroundColor: active ? '#1D4ED8' : hud.controlBg,
                          color: active ? '#FFFFFF' : hud.inkSecondary,
                        }}
                      >
                        {lang.toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                {/* Day Light / Night Dark Screen Toggle */}
                <button
                  type="button"
                  onClick={toggleKioskTheme}
                  aria-label={isDark ? 'Switch screen to Day Light HUD' : 'Switch screen to Night Dark HUD'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 9px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: hud.controlBg,
                    color: hud.inkPrimary,
                    border: hud.border,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isDark ? (
                    <>
                      <Sun size={14} weight="duotone" color="#F59E0B" />
                      <span>Day</span>
                    </>
                  ) : (
                    <>
                      <Moon size={14} weight="duotone" color="#1D4ED8" />
                      <span>Night</span>
                    </>
                  )}
                </button>

                {/* Mute / Unmute */}
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 7px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: hud.controlBg,
                    color: isMuted ? hud.amberText : hud.blueText,
                    border: hud.border,
                  }}
                >
                  {isMuted ? (
                    <SpeakerSlash size={15} weight="duotone" />
                  ) : (
                    <SpeakerHigh size={15} weight="duotone" />
                  )}
                </button>
              </div>
            </div>
            ) : null}

            {/* === AGE 78 HIGH-ASSIST TOP REMINDER BANNER (40px High-Contrast Strip) === */}
            {showSeniorReminderBanner ? (
              <div
                style={{
                  height: `${bannerHeight}px`,
                  padding: '0 14px',
                  backgroundColor: hud.blueSoft,
                  borderBottom: `1px solid ${hud.blueBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <BellRinging size={16} weight="fill" color={hud.blueText} style={{ flexShrink: 0 }} />
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: hud.inkPrimary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Next Reminder · {nextScheduledAlarm?.time ?? '08:30 AM'}:{' '}
                    {nextScheduledAlarm?.title ?? 'Drink 1 Glass Water & Take Metformin 500mg'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkSecondary }}>
                    Voice {accessibilityTier.speechRateLabel} · Sleep Watch {elderProfile.sleepTime}–{elderProfile.wakeTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerCareAlarm(nextScheduledAlarm)}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 800,
                      backgroundColor: '#1D4ED8',
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Test Reminder
                  </button>
                </div>
              </div>
            ) : null}

            {/* === ACTIVE CARE ALARM NOTIFICATION BANNER OVERLAY === */}
            {showDashboardChrome && activeCareAlarm && screenMode !== 'EMERGENCY' && screenMode !== 'HAZARD' ? (
              <div
                style={{
                  position: 'absolute',
                  top: `${headerHeight + bannerHeight + 8}px`,
                  left: '18px',
                  right: '18px',
                  zIndex: 20,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? '#172554' : '#EFF6FF',
                  border: `2px solid ${hud.blueText}`,
                  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.28)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: '#1D4ED8',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BellRinging size={20} weight="fill" />
                  </div>
                  <div>
                    <div className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 800, color: hud.blueText }}>
                      SCHEDULED CARE ALARM · {activeCareAlarm.time} ({activeCareAlarm.category})
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: hud.inkPrimary }}>
                      {activeCareAlarm.title}
                    </div>
                    <div style={{ fontSize: '12px', color: hud.inkSecondary }}>
                      {activeCareAlarm.spoken_prompt}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissCareAlarm}
                  style={{
                    height: isSeniorHud ? '48px' : '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    backgroundColor: '#15803D',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Done ✓
                </button>
              </div>
            ) : null}

            {/* === MAIN LOGICAL BODY VIEWPORT === */}
            <div style={{ height: `${bodyHeight}px`, overflow: 'hidden' }}>
              {/* MODE 0: OUT-OF-BOX WELCOME & 8-SCREEN ONBOARDING WIZARD */}
              {screenMode === 'SETUP' ? (
                <KioskSetupWizard
                  kioskTheme={kioskTheme}
                  onToggleTheme={toggleKioskTheme}
                  initialName={isGuest ? 'Subhashree Devi' : elderProfile.name}
                  initialAge={isGuest ? 78 : elderProfile.age}
                  initialLanguage={elderProfile.language}
                  initialGuardianName={isGuest ? 'Sourav Biswas' : elderProfile.emergencyContactName}
                  initialGuardianPhone={isGuest ? '+91 98300 41280' : elderProfile.emergencyContactPhone}
                  initialTelegramHandle={isGuest ? '@sourav_family_alert' : elderProfile.telegramHandle}
                  initialHomeAddress={isGuest ? '42/B Shyambazar Street, Kolkata 700004' : elderProfile.homeAddress}
                  initialAllergies={isGuest ? ['Peanuts'] : elderProfile.allergies}
                  initialConditions={isGuest ? ['Hypertension'] : elderProfile.conditions}
                  initialMedications={isGuest ? ['Metformin 500mg · 08:30 AM'] : elderProfile.medications}
                  initialWakeTime={elderProfile.wakeTime}
                  initialSleepTime={elderProfile.sleepTime}
                  initialAvatarDataUrl={elderProfile.avatarDataUrl ?? null}
                  initialHr={telemetry.heartRate}
                  initialSpo2={telemetry.spo2}
                  initialTempF={telemetry.bodyTempF}
                  onLanguageSelected={setLanguage}
                  onComplete={completeOnDeviceEnrollment}
                  onCancel={() => setScreenModeManual('STANDBY')}
                />
              ) : null}

              {/* MODE 1: GUEST PRIVACY LOCK */}
              {screenMode !== 'SETUP' && isGuest && screenMode !== 'HAZARD' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '18px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '22px',
                      borderRadius: '12px',
                      backgroundColor: hud.tileBg,
                      border: `1px solid ${hud.amberBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '5px',
                          backgroundColor: hud.amberSoft,
                          color: hud.amberText,
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        <LockKey size={14} weight="duotone" />
                        <span>{copy.guestLockTag}</span>
                      </span>
                      <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: hud.inkMuted }}>
                        {clock.time}
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '21px',
                          fontWeight: 800,
                          color: hud.amberText,
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        <ShieldWarning size={24} weight="duotone" />
                        <span>{copy.guestLockHeadline}</span>
                      </div>
                      <p style={{ fontSize: '14px', color: hud.inkSecondary, marginTop: '8px', lineHeight: 1.55 }}>
                        {copy.guestLockBody}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => selectProfile('subhashree')}
                      style={{
                        height: '52px',
                        borderRadius: '9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        backgroundColor: '#1D4ED8',
                        color: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: 800,
                      }}
                    >
                      <UserSwitch size={20} weight="duotone" />
                      <span>{copy.guestSwitchFamily}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        flex: 1,
                        padding: '18px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                        {copy.roomTempLabel}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: '30px', fontWeight: 800, color: hud.inkPrimary, marginTop: '6px' }}
                      >
                        {telemetry.roomTempC}°C · {telemetry.humidity}% RH
                      </div>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        padding: '18px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                        {copy.airQualityLabel}
                      </div>
                      <div style={{ fontSize: '30px', fontWeight: 800, color: hud.emeraldText, marginTop: '6px' }}>
                        {telemetry.airQuality}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* MODE 2A: AGE 50 STANDBY COCKPIT (< 65 — Rich 6-Tile Telemetry Grid) */}
              {!isGuest && !isSeniorHud && screenMode === 'STANDBY' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  {/* Tight Data-Rich 6-Tile Grid (Zero Blank White Boxes) */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {/* Tile 1: Clock & Status Tile */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '5px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: hud.subTileBg,
                            color: hud.inkSecondary,
                          }}
                        >
                          {clock.date}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: hud.emeraldText }}>
                          1.0× Voice · Active
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span
                          className="tabular-nums"
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '42px',
                            fontWeight: 800,
                            lineHeight: 1.02,
                            color: hud.inkPrimary,
                          }}
                        >
                          {clock.timeShort}
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: hud.inkMuted }}>
                          :{clock.seconds}
                        </span>
                      </div>

                      <div
                        style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          backgroundColor: hud.emeraldSoft,
                          border: `1px solid ${hud.emeraldBorder}`,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: hud.emeraldText,
                        }}
                      >
                        {copy.standbyTag} · All Systems Nominal
                      </div>
                    </div>

                    {/* Tile 2: Hydration & Exercise Tile */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                          Hydration &amp; Exercise
                        </span>
                        <Drop size={16} weight="duotone" color={hud.blueText} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                        <span className="tabular-nums" style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.05, color: hud.inkPrimary }}>
                          {hydrationGoalMl.toLocaleString()} <span style={{ fontSize: '14px', color: hud.inkMuted }}>ml</span>
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 700, color: hud.blueText }}>
                          {hydrationConsumedMl.toLocaleString()} / {hydrationGoalMl.toLocaleString()} ml
                        </span>
                      </div>

                      {renderProgressTrack(hydrationPct, hud.blueText, 8)}

                      <div
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: hud.blueSoft,
                          color: hud.blueText,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {elderProfile.exercisePlan}
                      </div>
                    </div>

                    {/* Tile 3: Sleep Radar Watch (LD2410B) Tile */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                          Sleep Radar Watch (LD2410B)
                        </span>
                        <MoonStars size={16} weight="duotone" color={hud.blueText} />
                      </div>

                      <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.05, color: hud.blueText }}>
                        {elderProfile.sleepTime} – {elderProfile.wakeTime}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 800, color: hud.inkPrimary }}>
                          Respiration: {breathingRate} br/min
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '5px',
                            backgroundColor: hud.emeraldSoft,
                            color: hud.emeraldText,
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          15m Absence Watch Armed
                        </span>
                      </div>
                    </div>

                    {/* Tile 4: Room Climate (DHT22) Tile */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                          {copy.roomTempLabel} (DHT22)
                        </span>
                        <Thermometer size={16} weight="duotone" color={hud.amberText} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ padding: '7px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div className="tabular-nums" style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.05, color: hud.inkPrimary }}>
                            {telemetry.roomTempC}°C
                          </div>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: hud.inkMuted }}>Temperature</div>
                        </div>
                        <div style={{ padding: '7px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div className="tabular-nums" style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.05, color: hud.blueText }}>
                            {telemetry.humidity}%
                          </div>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: hud.inkMuted }}>Rel. Humidity</div>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          backgroundColor: hud.emeraldSoft,
                          color: hud.emeraldText,
                          fontSize: '11.5px',
                          fontWeight: 700,
                        }}
                      >
                        Comfortable Ambient Band · I²C Active
                      </div>
                    </div>

                    {/* Tile 5: Air Quality & LPG (MQ-2 / MQ-135) Tile */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                          Air Quality &amp; LPG (MQ-2)
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: telemetry.lpgPpm > 400 ? hud.crimsonSoft : hud.emeraldSoft,
                            color: telemetry.lpgPpm > 400 ? hud.crimsonText : hud.emeraldText,
                          }}
                        >
                          {telemetry.airQuality}
                        </span>
                      </div>

                      <div className="tabular-nums" style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.05, color: telemetry.lpgPpm > 400 ? hud.crimsonText : hud.emeraldText }}>
                        {telemetry.lpgPpm} <span style={{ fontSize: '15px', color: hud.inkMuted }}>ppm</span>
                      </div>

                      <div>
                        {renderProgressTrack(
                          gasSafetyPct,
                          telemetry.lpgPpm > 400 ? hud.crimsonText : hud.emeraldText,
                          8
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 600, color: hud.inkMuted, marginTop: '4px' }}>
                          <span>0 ppm safe</span>
                          <span style={{ color: hud.inkSecondary, fontWeight: 700 }}>
                            Relay CH1: {telemetry.exhaustFanRelay ? 'EXHAUST ON' : 'Ready (400 ppm)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tile 6: 3S2P UPS & Power (INA219) Tile */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                          3S2P UPS &amp; Power (INA219)
                        </span>
                        {telemetry.acMainsConnected ? (
                          <Plug size={16} weight="duotone" color={hud.emeraldText} />
                        ) : (
                          <BatteryChargingVertical size={16} weight="duotone" color={hud.amberText} />
                        )}
                      </div>

                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: '34px',
                          fontWeight: 800,
                          lineHeight: 1.05,
                          color: telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                        }}
                      >
                        {telemetry.batteryPercent}% · {batteryVoltage}V
                      </div>

                      <div>
                        {renderProgressTrack(
                          telemetry.batteryPercent,
                          telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                          8
                        )}
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkSecondary, marginTop: '4px' }}>
                          {telemetry.acMainsConnected ? '12.6V Adapter Online' : 'Running on 3S2P Li-Ion UPS'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Strip (46px height, balanced condition/allergy pills + 44px CTA buttons) */}
                  <div
                    style={{
                      height: '46px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: hud.subTileBg,
                          border: hud.border,
                          fontSize: '12px',
                          fontWeight: 700,
                          color: hud.inkSecondary,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {elderProfile.conditions[0] || 'Active Monitoring'}
                      </span>
                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: hud.crimsonSoft,
                          border: `1px solid ${hud.crimsonBorder}`,
                          fontSize: '12px',
                          fontWeight: 700,
                          color: hud.crimsonText,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Avoid: {elderProfile.allergies.join(', ') || 'None'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => triggerCareAlarm()}
                        style={{
                          height: '44px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          backgroundColor: hud.controlBg,
                          color: hud.inkPrimary,
                          border: hud.border,
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        Test Alarm
                      </button>

                      <button
                        type="button"
                        onClick={() => setScreenModeManual('CARE_PLAN')}
                        style={{
                          height: '44px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          backgroundColor: hud.blueSoft,
                          color: hud.blueText,
                          border: `1px solid ${hud.blueBorder}`,
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        Care Plan
                      </button>

                      <button
                        type="button"
                        onClick={startVitalsCheckIn}
                        style={{
                          height: '44px',
                          padding: '0 18px',
                          borderRadius: '8px',
                          backgroundColor: '#1D4ED8',
                          color: '#FFFFFF',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                        }}
                      >
                        <Heartbeat size={17} weight="duotone" />
                        <span>Start Vitals Check-In</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* MODE 2B: AGE 78 HIGH-ASSIST SENIOR STANDBY (Full-Bleed 52/48 Split + 68px 65/35 Action Dock) */}
              {!isGuest && isSeniorHud && screenMode === 'STANDBY' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  {/* Main 2-Column Split (52% Left / 48% Right, filling height cleanly) */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'grid',
                      gridTemplateColumns: '52fr 48fr',
                      gap: '12px',
                    }}
                  >
                    {/* Left Card: 58px Clock + Radar Status + 3-Vital Summary Strip */}
                    <div
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.borderHighAssist,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '15.5px', fontWeight: 700, color: hud.inkSecondary }}>
                          <Clock size={18} weight="duotone" color={hud.blueText} />
                          <span>{clock.date}</span>
                        </div>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor:
                              telemetry.radarState === 'BED_EMPTY_NIGHT'
                                ? hud.crimsonSoft
                                : hud.emeraldSoft,
                            border: `1px solid ${
                              telemetry.radarState === 'BED_EMPTY_NIGHT'
                                ? hud.crimsonBorder
                                : hud.emeraldBorder
                            }`,
                            fontSize: '12px',
                            fontWeight: 800,
                            color:
                              telemetry.radarState === 'BED_EMPTY_NIGHT'
                                ? hud.crimsonText
                                : hud.emeraldText,
                          }}
                        >
                          {telemetry.radarState === 'BED_EMPTY_NIGHT'
                            ? 'Radar: Bed Empty Alert'
                            : 'Radar: Safe & Active'}
                        </span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '58px',
                              fontWeight: 800,
                              color: hud.inkPrimary,
                              lineHeight: 1.02,
                            }}
                          >
                            {clock.timeShort}
                          </span>
                          <span className="tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: hud.inkMuted }}>
                            :{clock.seconds}
                          </span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: hud.emeraldText, marginTop: '4px' }}>
                          {copy.standbyTag} · {elderProfile.name}
                        </div>
                      </div>

                      {/* Quick 3-Vital Summary Strip */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                        <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>PULSE</div>
                          <div className="tabular-nums" style={{ fontSize: '19px', fontWeight: 800, color: hrOutOfRange ? hud.crimsonText : hud.emeraldText }}>
                            {telemetry.heartRate} BPM
                          </div>
                        </div>
                        <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>OXYGEN</div>
                          <div className="tabular-nums" style={{ fontSize: '19px', fontWeight: 800, color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText }}>
                            {telemetry.spo2}% SpO₂
                          </div>
                        </div>
                        <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>BODY TEMP</div>
                          <div className="tabular-nums" style={{ fontSize: '19px', fontWeight: 800, color: tempOutOfRange ? hud.crimsonText : hud.inkPrimary }}>
                            {telemetry.bodyTempF.toFixed(1)}°F
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: 22px Wellness & Hydration Progress Bar + 48px Care Schedule */}
                    <div
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.borderHighAssist,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: hud.blueText }}>
                          High-Assist Wellness &amp; Medication
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                          {accessibilityTier.speechRateLabel} Voice
                        </span>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: '9px', backgroundColor: hud.subTileBg }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkMuted, marginBottom: '3px' }}>
                          TODAY&apos;S EXERCISE
                        </div>
                        <div style={{ fontSize: '21px', fontWeight: 800, lineHeight: 1.22, color: hud.inkPrimary }}>
                          {elderProfile.exercisePlan}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 700, color: hud.inkSecondary, marginBottom: '5px' }}>
                          <span>Hydration Progress Bar</span>
                          <span className="tabular-nums" style={{ color: hud.blueText }}>
                            {hydrationConsumedMl.toLocaleString()} / {hydrationGoalMl.toLocaleString()} ml Daily Goal
                          </span>
                        </div>
                        {renderProgressTrack(hydrationPct, hud.blueText, 10)}
                      </div>

                      <button
                        type="button"
                        onClick={() => setScreenModeManual('CARE_PLAN')}
                        style={{
                          width: '100%',
                          height: '48px',
                          borderRadius: '9px',
                          backgroundColor: hud.blueSoft,
                          border: `2px solid ${hud.blueBorder}`,
                          color: hud.blueText,
                          fontSize: '15.5px',
                          fontWeight: 800,
                        }}
                      >
                        Daily Care Schedule
                      </button>
                    </div>
                  </div>

                  {/* Bottom Primary Action Dock (68px height: 65% Vitals CTA + 35% Call Family CTA) */}
                  <div style={{ height: '68px', display: 'flex', gap: '12px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={startVitalsCheckIn}
                      style={{
                        flex: '0 0 65%',
                        height: '68px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        backgroundColor: '#1D4ED8',
                        color: '#FFFFFF',
                        border: '2px solid #93C5FD',
                        fontSize: '20px',
                        fontWeight: 800,
                      }}
                    >
                      <Heartbeat size={28} weight="fill" />
                      <span>{startDailySeniorLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={triggerFallScenario}
                      style={{
                        flex: 1,
                        height: '68px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        backgroundColor: isDark ? '#334155' : '#FEF3C7',
                        color: isDark ? '#FDE68A' : '#92400E',
                        border: `2px solid ${hud.amberText}`,
                        fontSize: '19px',
                        fontWeight: 800,
                      }}
                    >
                      <PhoneCall size={26} weight="fill" />
                      <span>{callFamilyLabel}</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* MODE 3A & 3B: VITALS CHECK-IN MODE (50–56px Bold Digits + Status Bars + Stretched Bottom Row) */}
              {!isGuest && screenMode === 'VITALS' ? (
                <div
                  style={{
                    height: '100%',
                    padding: isSeniorHud ? '12px 14px' : '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  {/* Top Row: 3 Bold Metric Cards (48-56px Digits + Status Range Bars) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '12px',
                      flexShrink: 0,
                    }}
                  >
                    {/* Heart Rate Card */}
                    <div
                      style={{
                        padding: isSeniorHud ? '14px 16px' : '12px 14px',
                        borderRadius: '11px',
                        backgroundColor: hud.tileBg,
                        border: isSeniorHud ? hud.borderHighAssist : hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: isSeniorHud ? '14px' : '12.5px', fontWeight: 700, color: hud.inkSecondary }}>
                          {copy.heartRateLabel}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: hrOutOfRange ? hud.crimsonText : hud.emeraldText }}>
                          {hrOutOfRange ? 'ALERT' : 'NORMAL PULSE'}
                        </span>
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: isSeniorHud ? '54px' : '50px',
                          fontWeight: 800,
                          lineHeight: 1.0,
                          color: hrOutOfRange ? hud.crimsonText : hud.emeraldText,
                        }}
                      >
                        {telemetry.heartRate}{' '}
                        <span style={{ fontSize: '16px', fontWeight: 700, color: hud.inkMuted }}>BPM</span>
                      </div>
                      {renderProgressTrack(hrPct, hrOutOfRange ? hud.crimsonText : hud.emeraldText, 7)}
                      <div className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 600, color: hud.inkMuted }}>
                        Safe Range {elderProfile.baseline.hrMin}–{elderProfile.baseline.hrMax} BPM
                      </div>
                    </div>

                    {/* SpO2 Card */}
                    <div
                      style={{
                        padding: isSeniorHud ? '14px 16px' : '12px 14px',
                        borderRadius: '11px',
                        backgroundColor: hud.tileBg,
                        border: isSeniorHud ? hud.borderHighAssist : hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: isSeniorHud ? '14px' : '12.5px', fontWeight: 700, color: hud.inkSecondary }}>
                          {copy.spo2Label}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText }}>
                          {spo2OutOfRange ? 'LOW OXYGEN' : 'HEALTHY O₂'}
                        </span>
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: isSeniorHud ? '54px' : '50px',
                          fontWeight: 800,
                          lineHeight: 1.0,
                          color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText,
                        }}
                      >
                        {telemetry.spo2}
                        <span style={{ fontSize: '18px', fontWeight: 700, color: hud.inkMuted }}> %</span>
                      </div>
                      {renderProgressTrack(spo2Pct, spo2OutOfRange ? hud.crimsonText : hud.emeraldText, 7)}
                      <div className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 600, color: hud.inkMuted }}>
                        Target ≥{elderProfile.baseline.spo2Min}% · Perfusion Steady
                      </div>
                    </div>

                    {/* Body Temp Card */}
                    <div
                      style={{
                        padding: isSeniorHud ? '14px 16px' : '12px 14px',
                        borderRadius: '11px',
                        backgroundColor: hud.tileBg,
                        border: isSeniorHud ? hud.borderHighAssist : hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: isSeniorHud ? '14px' : '12.5px', fontWeight: 700, color: hud.inkSecondary }}>
                          {copy.bodyTempLabel}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: tempOutOfRange ? hud.crimsonText : hud.emeraldText }}>
                          {tempOutOfRange ? 'FEVER' : `${bodyTempC}°C NORMAL`}
                        </span>
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: isSeniorHud ? '54px' : '50px',
                          fontWeight: 800,
                          lineHeight: 1.0,
                          color: tempOutOfRange ? hud.crimsonText : hud.inkPrimary,
                        }}
                      >
                        {telemetry.bodyTempF.toFixed(1)}
                        <span style={{ fontSize: '16px', fontWeight: 700, color: hud.inkMuted }}>°F</span>
                      </div>
                      {renderProgressTrack(tempPct, tempOutOfRange ? hud.crimsonText : hud.blueText, 7)}
                      <div className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 600, color: hud.inkMuted }}>
                        Max Safe ≤{elderProfile.baseline.tempMax}°F (Contactless IR)
                      </div>
                    </div>
                  </div>

                  {/* Age 50 Compact Ambient Strip */}
                  {!isSeniorHud ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '10px',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ padding: '6px 12px', borderRadius: '7px', backgroundColor: hud.tileBg, border: hud.border, display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: hud.inkMuted }}>DHT22 Ambient</span>
                        <span className="tabular-nums">{telemetry.roomTempC}°C · {telemetry.humidity}% RH</span>
                      </div>
                      <div style={{ padding: '6px 12px', borderRadius: '7px', backgroundColor: hud.tileBg, border: hud.border, display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: hud.inkMuted }}>MQ-2 / MQ-135 Gas</span>
                        <span className="tabular-nums" style={{ color: telemetry.lpgPpm > 400 ? hud.crimsonText : hud.emeraldText }}>{telemetry.airQuality} · {telemetry.lpgPpm} ppm</span>
                      </div>
                      <div style={{ padding: '6px 12px', borderRadius: '7px', backgroundColor: hud.tileBg, border: hud.border, display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: hud.inkMuted }}>INA219 Power</span>
                        <span className="tabular-nums" style={{ color: telemetry.acMainsConnected ? hud.emeraldText : hud.amberText }}>{telemetry.batteryPercent}% ({batteryVoltage}V)</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Bottom Split Row: Full-Height 60 FPS PPG/ECG Waveform + Giant I'M OK CTA */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'grid',
                      gridTemplateColumns: '60fr 40fr',
                      gap: '12px',
                      alignItems: 'stretch',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '11px',
                        backgroundColor: hud.tileBg,
                        border: isSeniorHud ? hud.borderHighAssist : hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: hud.inkSecondary }}>
                        <span>MAX30102 Live Optical PPG / ECG Trace (60 FPS)</span>
                        <span className="tabular-nums">
                          {telemetry.heartRate} BPM · {(60 / telemetry.heartRate).toFixed(2)}s cycle
                        </span>
                      </div>
                      <PpgWaveformCanvas
                        heartRate={telemetry.heartRate}
                        spo2={telemetry.spo2}
                        statusTone={vitalsTone}
                        height={isSeniorHud ? 195 : 168}
                        theme={kioskTheme}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={logVitalsOkay}
                        style={{
                          flex: 1,
                          width: '100%',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          backgroundColor: '#15803D',
                          color: '#FFFFFF',
                          border: '2px solid #86EFAC',
                          fontSize: isSeniorHud ? '22px' : '19px',
                          fontWeight: 800,
                        }}
                      >
                        <CheckCircle size={28} weight="fill" />
                        <span>{copy.imOkLogVitals}</span>
                      </button>

                      {isSeniorHud ? (
                        <button
                          type="button"
                          onClick={triggerFallScenario}
                          style={{
                            height: '62px',
                            width: '100%',
                            borderRadius: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            backgroundColor: isDark ? '#334155' : '#FEF3C7',
                            color: isDark ? '#FDE68A' : '#92400E',
                            border: `2px solid ${hud.amberText}`,
                            fontSize: '18px',
                            fontWeight: 800,
                          }}
                        >
                          <PhoneCall size={24} weight="fill" />
                          <span>{callFamilyLabel}</span>
                        </button>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', height: '48px' }}>
                          <button
                            type="button"
                            onClick={() => setScreenModeManual('CARE_PLAN')}
                            style={{
                              height: '48px',
                              borderRadius: '8px',
                              backgroundColor: hud.blueSoft,
                              color: hud.blueText,
                              border: `1px solid ${hud.blueBorder}`,
                              fontSize: '13.5px',
                              fontWeight: 700,
                            }}
                          >
                            Care Plan
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerCareAlarm()}
                            style={{
                              height: '48px',
                              borderRadius: '8px',
                              backgroundColor: hud.controlBg,
                              color: hud.inkPrimary,
                              border: hud.border,
                              fontSize: '13.5px',
                              fontWeight: 700,
                            }}
                          >
                            {lastVitalsLoggedAt ? `Logged ${lastVitalsLoggedAt}` : 'Test Alarm'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* MODE 4: AI DAILY CARE PLAN & ALLERGY GUARDRAILS */}
              {!isGuest && screenMode === 'CARE_PLAN' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '14px 18px',
                    display: 'grid',
                    gridTemplateColumns: '58fr 42fr',
                    gap: '14px',
                  }}
                >
                  {/* Left: Scheduled Alarms List */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      backgroundColor: hud.tileBg,
                      border: hud.border,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: hud.inkPrimary }}>
                        Daily AI Care &amp; Medication Schedule
                      </span>
                      <span className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 700, color: hud.blueText }}>
                        {elderProfile.carePlan?.daily_alarms.length ?? 0} Alarms Active
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', overflowY: 'auto' }}>
                      {(elderProfile.carePlan?.daily_alarms ?? []).map((alarm, idx) => (
                        <div
                          key={`${alarm.time}-${idx}`}
                          style={{
                            padding: '8px 11px',
                            borderRadius: '8px',
                            backgroundColor: hud.subTileBg,
                            border: hud.border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: isSeniorHud ? '15px' : '13px',
                                fontWeight: 800,
                                color: hud.blueText,
                                flexShrink: 0,
                              }}
                            >
                              {alarm.time}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: isSeniorHud ? '14px' : '12.5px',
                                  fontWeight: 700,
                                  color: hud.inkPrimary,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {alarm.title}
                              </div>
                              <div style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                                {alarm.category}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => triggerCareAlarm(alarm)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#1D4ED8',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            Ring
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Strictly Avoid Allergies + Hydration + Night Sleep Watch */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        padding: '13px 15px',
                        borderRadius: '10px',
                        backgroundColor: hud.crimsonSoft,
                        border: `1px solid ${hud.crimsonBorder}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: hud.crimsonText, marginBottom: '5px' }}>
                        <WarningOctagon size={14} weight="fill" />
                        <span>ALLERGY &amp; DIET GUARDRAILS</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: hud.inkPrimary, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(elderProfile.carePlan?.nutrition_rules.strictly_avoid ?? []).map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        padding: '13px 15px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 800, color: hud.emeraldText, marginBottom: '4px' }}>
                          HYDRATION &amp; SLEEP RADAR WATCH
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: hud.inkPrimary }}>
                          Goal: {elderProfile.hydrationGoalMl} ml/day · Watch: {elderProfile.sleepTime}–{elderProfile.wakeTime}
                        </div>
                        <p style={{ fontSize: '12px', color: hud.inkSecondary, marginTop: '4px' }}>
                          {elderProfile.exercisePlan}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={startVitalsCheckIn}
                        style={{
                          height: isSeniorHud ? '54px' : '42px',
                          width: '100%',
                          borderRadius: '8px',
                          backgroundColor: '#15803D',
                          color: '#FFFFFF',
                          fontSize: '13.5px',
                          fontWeight: 800,
                        }}
                      >
                        Go to Vitals Check-In
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* MODE 5: EMERGENCY 10s COUNTDOWN (Landscape Split 42% Ring / 58% Controls) */}
              {!isGuest && screenMode === 'EMERGENCY' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '42fr 58fr',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      backgroundColor: hud.tileBg,
                      border: `1px solid ${hud.crimsonBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: hud.crimsonSoft,
                        color: hud.crimsonText,
                        border: `1px solid ${hud.crimsonBorder}`,
                      }}
                    >
                      <BellRinging size={14} weight="fill" />
                      <span>{copy.emergencyTag}</span>
                    </span>

                    {escalationStage <= 1 ? (
                      <svg
                        width="160"
                        height="160"
                        viewBox="0 0 110 110"
                        aria-label={`Emergency countdown ${countdownSec} seconds`}
                      >
                        <circle
                          cx="55"
                          cy="55"
                          r={ringRadius}
                          fill="none"
                          stroke={isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'}
                          strokeWidth="9"
                        />
                        <circle
                          cx="55"
                          cy="55"
                          r={ringRadius}
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                          transform="rotate(-90 55 55)"
                        />
                        <text
                          x="55"
                          y="63"
                          textAnchor="middle"
                          fill={hud.crimsonText}
                          fontSize="31"
                          fontWeight="800"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {countdownSec}s
                        </text>
                      </svg>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <PhoneCall size={44} weight="duotone" color={hud.crimsonText} />
                        <div style={{ fontSize: '18px', fontWeight: 800, color: hud.crimsonText }}>
                          {copy.escalationSentHeadline}
                        </div>
                      </div>
                    )}

                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: hud.inkPrimary }}>
                        {emergencyReason ?? 'Anomaly Detected'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: hud.inkMuted, marginTop: '3px' }}>
                        Allergy pin: {elderProfile.allergies.join(', ') || 'None'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: hud.inkSecondary }}>
                        {copy.countdownHint}
                      </span>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                        {telemetry.heartRate} BPM · {telemetry.spo2}% SpO₂
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={cancelEmergencyOkay}
                      style={{
                        flex: 1,
                        width: '100%',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        backgroundColor: '#15803D',
                        color: '#FFFFFF',
                        fontSize: isSeniorHud ? '24px' : '19px',
                        fontWeight: 800,
                      }}
                    >
                      <CheckCircle size={30} weight="fill" />
                      <span>{copy.imOkayCancel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={sendAlertNow}
                      style={{
                        height: '62px',
                        width: '100%',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        backgroundColor: '#B91C1C',
                        color: '#FFFFFF',
                        fontSize: '15.5px',
                        fontWeight: 800,
                      }}
                    >
                      <WarningOctagon size={20} weight="fill" />
                      <span>{copy.sendAlertNow}</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* MODE 6: GAS / SMOKE HAZARD */}
              {screenMode === 'HAZARD' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '18px 20px',
                    display: 'grid',
                    gridTemplateColumns: '46fr 54fr',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '22px',
                      borderRadius: '12px',
                      backgroundColor: hud.tileBg,
                      border: `1px solid ${hud.amberBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        backgroundColor: hud.crimsonSoft,
                        color: hud.crimsonText,
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <ShieldWarning size={14} weight="fill" />
                      <span>{copy.hazardTag}</span>
                    </span>

                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: hud.amberText }}>
                        MQ-2 Combustible Gas / Smoke
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '56px',
                          fontWeight: 800,
                          color: hud.crimsonText,
                          lineHeight: 1.05,
                          marginTop: '6px',
                        }}
                      >
                        {telemetry.lpgPpm}{' '}
                        <span style={{ fontSize: '20px', fontWeight: 700 }}>ppm</span>
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        backgroundColor: hud.emeraldSoft,
                        color: hud.emeraldText,
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <Fan size={15} weight="duotone" />
                      <span>{copy.relayOnText}</span>
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: '22px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '10px',
                      }}
                    >
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: hud.inkPrimary }}>
                        Autonomous Ventilation Interlock Active
                      </h3>
                      <p style={{ fontSize: '14px', color: hud.inkSecondary, lineHeight: 1.55 }}>
                        Threshold exceeded (&gt;400 ppm). Optocoupled 5V relay closed the
                        exhaust fan circuit immediately, sounded local warning siren, and
                        dispatched a family alert to {elderProfile.emergencyContactName}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={acknowledgeHazard}
                      style={{
                        height: '72px',
                        width: '100%',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        backgroundColor: '#1D4ED8',
                        color: '#FFFFFF',
                        fontSize: '17px',
                        fontWeight: 800,
                      }}
                    >
                      <CheckCircle size={22} weight="fill" />
                      <span>{copy.acknowledgeHazard}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Live t+0s -> t+40s Autonomous Escalation Strip (Refined 1px Borders + Top Accent Bars) */}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))',
              gap: '10px',
            }}
          >
            {ESCALATION_PIPELINE.map((item) => {
              const isEmergencyActive = screenMode === 'EMERGENCY';
              const isCurrent = isEmergencyActive && escalationStage === item.stage;
              const isPassed = isEmergencyActive && escalationStage > item.stage;

              const topBarColor = isCurrent
                ? 'var(--accent-crimson)'
                : isPassed
                  ? 'var(--accent-amber)'
                  : '#CBD5E1';

              return (
                <div
                  key={item.windowLabel}
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    border: isCurrent
                      ? '1px solid var(--accent-crimson-border)'
                      : isPassed
                        ? '1px solid var(--accent-amber-border)'
                        : '1px solid var(--border-hairline)',
                    backgroundColor: isCurrent
                      ? 'var(--accent-crimson-bg)'
                      : isPassed
                        ? 'var(--accent-amber-bg)'
                        : '#FFFFFF',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: '3px', backgroundColor: topBarColor }} />
                  <div style={{ padding: '10px 11px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '4px',
                      }}
                    >
                      <span
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
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          color: isCurrent
                            ? 'var(--accent-crimson)'
                            : isPassed
                              ? 'var(--accent-amber)'
                              : 'var(--ink-muted)',
                        }}
                      >
                        {item.stageTag}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--ink-primary)',
                        marginTop: '4px',
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--ink-secondary)',
                        marginTop: '3px',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.detail}
                    </div>
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
