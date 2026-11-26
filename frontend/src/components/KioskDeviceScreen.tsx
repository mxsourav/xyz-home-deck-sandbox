import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BatteryChargingVertical,
  BellRinging,
  Camera,
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

  const headerHeight = isSeniorHud ? 52 : 40;
  const showSeniorReminderBanner =
    isSeniorHud &&
    screenMode !== 'SETUP' &&
    screenMode !== 'EMERGENCY' &&
    screenMode !== 'HAZARD';
  const bannerHeight = showSeniorReminderBanner ? 32 : 0;
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

  const radarColor =
    telemetry.radarState === 'BED_EMPTY_NIGHT'
      ? '#EF4444'
      : telemetry.radarState === 'MOVING'
        ? '#22C55E'
        : '#38BDF8';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Chamfered Matte-Slate 7-Inch Physical Enclosure Bezel */}
      <div className="kiosk-bezel">
        {/* Top Hardware Sensor Bezel Rim */}
        <div className="kiosk-bezel-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="bezel-sensor-pill">
              <Camera size={12} weight="duotone" />
              <span>OV5647 30 FPS</span>
            </span>

            <span className="bezel-sensor-pill">
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: radarColor,
                  display: 'inline-block',
                }}
              />
              <span>LD2410B Radar</span>
            </span>

            <span className="bezel-sensor-pill">
              <Heartbeat size={12} weight="duotone" />
              <span>MAX30102</span>
            </span>

            <span className="bezel-sensor-pill">
              <Thermometer size={12} weight="duotone" />
              <span>MLX90614</span>
            </span>
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
              <Plug size={12} weight="duotone" />
            ) : (
              <BatteryChargingVertical size={12} weight="duotone" />
            )}
            <span>
              3S2P UPS {telemetry.batteryPercent}% ({batteryVoltage}V)
            </span>
          </span>
        </div>

        {/* Strict 1024:600 7-Inch Landscape Viewport Slot */}
        <div ref={slotRef} className="kiosk-viewport-slot">
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
            {/* === ADAPTIVE HARDWARE TOP BAR (38–40px Age 50 vs 52px Age 78) === */}
            <div
              style={{
                height: `${headerHeight}px`,
                padding: '0 14px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                          width: isSeniorHud ? '34px' : '24px',
                          height: isSeniorHud ? '34px' : '24px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `1.5px solid ${isSeniorHud ? hud.amberText : hud.blueText}`,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: isSeniorHud ? '34px' : '24px',
                          height: isSeniorHud ? '34px' : '24px',
                          borderRadius: '50%',
                          backgroundColor: isSeniorHud ? hud.amberSoft : hud.blueSoft,
                          border: `1.5px solid ${isSeniorHud ? hud.amberBorder : hud.blueBorder}`,
                          color: isSeniorHud ? hud.amberText : hud.blueText,
                          fontSize: isSeniorHud ? '12px' : '10px',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: isSeniorHud ? '13.5px' : '12px',
                          color: hud.inkPrimary,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {elderProfile.name} · Age {elderProfile.age}
                      </span>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: isSeniorHud ? hud.amberSoft : hud.blueSoft,
                          border: `1px solid ${isSeniorHud ? hud.amberBorder : hud.blueBorder}`,
                          color: isSeniorHud ? hud.amberText : hud.blueText,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isSeniorHud ? 'High-Assist Mode' : 'Standard Cockpit'}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 9px',
                      borderRadius: '5px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      backgroundColor: hud.amberSoft,
                      border: `1px solid ${hud.amberBorder}`,
                      color: hud.amberText,
                    }}
                  >
                    <LockKey size={13} weight="duotone" />
                    <span>XYZ HOME DECK · Guest Privacy Lock</span>
                  </span>
                )}
              </div>

              {/* Center Mode Tabs (Compact for Age 50 vs High-Legibility for Age 78) */}
              <div
                role="tablist"
                aria-label="Kiosk HUD Screens"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px',
                  borderRadius: '7px',
                  backgroundColor: hud.subTileBg,
                  border: hud.border,
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
                        gap: '4px',
                        padding: isSeniorHud ? '5px 10px' : '3px 8px',
                        borderRadius: '5px',
                        fontSize: isSeniorHud ? '12px' : '11px',
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
                        <UserPlus size={12} weight="bold" />
                      ) : null}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Cluster: EN|HI|BN + Day/Night + Audio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {audioStatus.state === 'blocked' ? (
                  <button
                    type="button"
                    onClick={() => audioEngine.unlock()}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '5px',
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: hud.amberSoft,
                      color: hud.amberText,
                      border: `1px solid ${hud.amberBorder}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Tap Audio
                  </button>
                ) : audioStatus.state === 'loading' || audioStatus.state === 'speaking' ? (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: hud.emeraldText,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {audioStatus.lang.toUpperCase()} {audioStatus.state === 'loading' ? 'Voice...' : 'Speaking'}
                  </span>
                ) : null}

                {/* Language Switcher EN | HI | BN */}
                <div
                  role="group"
                  aria-label="Kiosk spoken and interface language"
                  style={{
                    display: 'inline-flex',
                    border: hud.border,
                    borderRadius: '5px',
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
                          padding: isSeniorHud ? '4px 8px' : '3px 7px',
                          fontSize: '10.5px',
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
                    padding: isSeniorHud ? '4px 8px' : '3px 7px',
                    borderRadius: '5px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    backgroundColor: hud.controlBg,
                    color: hud.inkPrimary,
                    border: hud.border,
                  }}
                >
                  {isDark ? (
                    <>
                      <Sun size={12} weight="duotone" color="#F59E0B" />
                      <span>Day</span>
                    </>
                  ) : (
                    <>
                      <Moon size={12} weight="duotone" color="#1D4ED8" />
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
                    gap: '3px',
                    padding: isSeniorHud ? '4px 7px' : '3px 6px',
                    borderRadius: '5px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    backgroundColor: hud.controlBg,
                    color: isMuted ? hud.amberText : hud.blueText,
                    border: hud.border,
                  }}
                >
                  {isMuted ? (
                    <SpeakerSlash size={13} weight="duotone" />
                  ) : (
                    <SpeakerHigh size={13} weight="duotone" />
                  )}
                </button>
              </div>
            </div>

            {/* === AGE 78 HIGH-ASSIST TOP NEXT REMINDER BANNER === */}
            {showSeniorReminderBanner ? (
              <div
                style={{
                  height: `${bannerHeight}px`,
                  padding: '0 16px',
                  backgroundColor: hud.blueSoft,
                  borderBottom: `1px solid ${hud.blueBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <BellRinging size={14} weight="fill" color={hud.blueText} />
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: hud.inkPrimary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Next Reminder · {nextScheduledAlarm?.time ?? '08:30'}:{' '}
                    {nextScheduledAlarm?.title ?? 'Drink 1 Glass Water & Take Metformin'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span className="tabular-nums" style={{ fontSize: '11px', fontWeight: 700, color: hud.inkSecondary }}>
                    Voice {accessibilityTier.speechRateLabel} · Sleep Watch {elderProfile.sleepTime}–{elderProfile.wakeTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerCareAlarm(nextScheduledAlarm)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#1D4ED8',
                      color: '#FFFFFF',
                    }}
                  >
                    Test Reminder
                  </button>
                </div>
              </div>
            ) : null}

            {/* === ACTIVE CARE ALARM NOTIFICATION BANNER OVERLAY === */}
            {activeCareAlarm && screenMode !== 'EMERGENCY' && screenMode !== 'HAZARD' ? (
              <div
                style={{
                  position: 'absolute',
                  top: `${headerHeight + bannerHeight + 10}px`,
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
              {/* MODE 0: FIRST-TIME SIGN-UP & SEQUENTIAL SENSOR WIZARD */}
              {screenMode === 'SETUP' ? (
                <KioskSetupWizard
                  kioskTheme={kioskTheme}
                  initialName={isGuest ? 'New Family Member' : elderProfile.name}
                  initialAge={elderProfile.age}
                  initialHr={telemetry.heartRate}
                  initialSpo2={telemetry.spo2}
                  initialTempF={telemetry.bodyTempF}
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

              {/* MODE 2A: AGE 50 STANDBY COCKPIT (< 65) */}
              {!isGuest && !isSeniorHud && screenMode === 'STANDBY' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  {/* Dense Top Multi-Metric Strip */}
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {/* Tile 1: Digital Clock */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '9px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        {clock.date}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '28px',
                          fontWeight: 800,
                          color: hud.inkPrimary,
                        }}
                      >
                        {clock.time}
                      </div>
                      <div style={{ fontSize: '11px', color: hud.emeraldText, fontWeight: 700 }}>
                        {copy.standbyTag} · 1.0× Voice
                      </div>
                    </div>

                    {/* Tile 2: Hydration & Exercise Target */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '9px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                          Daily Activity &amp; Hydration
                        </span>
                        <Drop size={14} weight="duotone" color={hud.blueText} />
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 800, color: hud.inkPrimary }}>
                        {elderProfile.hydrationGoalMl} ml Target
                      </div>
                      <div style={{ fontSize: '11.5px', color: hud.inkSecondary }}>
                        {elderProfile.exercisePlan}
                      </div>
                    </div>

                    {/* Tile 3: Sleep Radar Watch Window */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '9px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                          Sleep Radar Watch (LD2410B)
                        </span>
                        <MoonStars size={14} weight="duotone" color={hud.blueText} />
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '21px', fontWeight: 800, color: hud.blueText }}>
                        {elderProfile.sleepTime} – {elderProfile.wakeTime}
                      </div>
                      <div style={{ fontSize: '11px', color: hud.inkSecondary }}>
                        15-min bed absence watch armed automatically
                      </div>
                    </div>

                    {/* Tile 4: DHT22 Climate */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '9px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        {copy.roomTempLabel}
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 800, color: hud.inkPrimary }}>
                        {telemetry.roomTempC}°C · {telemetry.humidity}% RH
                      </div>
                      <div style={{ fontSize: '11px', color: hud.inkMuted }}>
                        Ambient I²C sensor steady
                      </div>
                    </div>

                    {/* Tile 5: MQ-135 & MQ-2 Gas Telemetry */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '9px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        Air Quality &amp; MQ-2 Gas
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: telemetry.airQuality === 'GOOD' ? hud.emeraldText : hud.amberText,
                        }}
                      >
                        {telemetry.airQuality} · {telemetry.lpgPpm} ppm
                      </div>
                      <div style={{ fontSize: '11px', color: hud.inkMuted }}>
                        Relay CH1 trip threshold: &gt;400 ppm
                      </div>
                    </div>

                    {/* Tile 6: 3S2P UPS Bus Telemetry */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '9px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        3S2P UPS &amp; INA219 Power Bus
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                        }}
                      >
                        {telemetry.batteryPercent}% · {batteryVoltage}V
                      </div>
                      <div style={{ fontSize: '11px', color: hud.inkSecondary }}>
                        {telemetry.acMainsConnected ? 'Wall AC Connected' : 'Discharging on UPS'}
                      </div>
                    </div>
                  </div>

                  {/* Age 50 Bottom-Right Compact Utility Dock (42px buttons) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      paddingTop: '4px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: hud.inkMuted }}>
                      Conditions: {elderProfile.conditions.join(', ') || 'None'} · Allergies:{' '}
                      <strong style={{ color: hud.crimsonText }}>
                        {elderProfile.allergies.join(', ') || 'None'}
                      </strong>
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => triggerCareAlarm()}
                        style={{
                          height: '42px',
                          padding: '0 14px',
                          borderRadius: '7px',
                          backgroundColor: hud.controlBg,
                          color: hud.inkPrimary,
                          border: hud.border,
                          fontSize: '12.5px',
                          fontWeight: 700,
                        }}
                      >
                        Test Alarm
                      </button>

                      <button
                        type="button"
                        onClick={() => setScreenModeManual('CARE_PLAN')}
                        style={{
                          height: '42px',
                          padding: '0 14px',
                          borderRadius: '7px',
                          backgroundColor: hud.blueSoft,
                          color: hud.blueText,
                          border: `1px solid ${hud.blueBorder}`,
                          fontSize: '12.5px',
                          fontWeight: 700,
                        }}
                      >
                        View AI Care Plan
                      </button>

                      <button
                        type="button"
                        onClick={startVitalsCheckIn}
                        style={{
                          height: '42px',
                          padding: '0 16px',
                          borderRadius: '7px',
                          backgroundColor: '#1D4ED8',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Heartbeat size={16} weight="duotone" />
                        <span>{copy.startCheckIn}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* MODE 2B: AGE 78 HIGH-ASSIST SENIOR STANDBY (Simplified + Centered Giant 84px CTA) */}
              {!isGuest && isSeniorHud && screenMode === 'STANDBY' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '18px 24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  {/* Calm Uncluttered Senior Focal Row */}
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
                      gap: '16px',
                    }}
                  >
                    <div
                      style={{
                        padding: '24px 28px',
                        borderRadius: '14px',
                        backgroundColor: hud.tileBg,
                        border: hud.borderHighAssist,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: hud.inkMuted }}>
                        <Clock size={18} weight="duotone" color={hud.blueText} />
                        <span>{clock.date}</span>
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '58px',
                          fontWeight: 800,
                          color: hud.inkPrimary,
                          lineHeight: 1.04,
                        }}
                      >
                        {clock.time}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: hud.emeraldText, marginTop: '4px' }}>
                        {copy.standbyTag} · {elderProfile.name}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '22px 24px',
                        borderRadius: '14px',
                        backgroundColor: hud.tileBg,
                        border: hud.borderHighAssist,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: hud.blueText }}>
                          High-Assist Wellness Summary
                        </div>
                        <div style={{ fontSize: '19px', fontWeight: 800, color: hud.inkPrimary, marginTop: '6px' }}>
                          {elderProfile.exercisePlan}
                        </div>
                      </div>

                      <div className="tabular-nums" style={{ fontSize: '14.5px', fontWeight: 700, color: hud.inkSecondary }}>
                        Hydration Goal: {elderProfile.hydrationGoalMl} ml · Radar Active
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setScreenModeManual('CARE_PLAN')}
                          style={{
                            flex: 1,
                            height: '44px',
                            borderRadius: '8px',
                            backgroundColor: hud.subTileBg,
                            border: hud.borderHighAssist,
                            color: hud.inkPrimary,
                            fontSize: '13.5px',
                            fontWeight: 700,
                          }}
                        >
                          Daily Care Schedule
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dead-Center Ergonomic 84px Giant Single-Tap Button */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={startVitalsCheckIn}
                      style={{
                        width: '78%',
                        height: '84px',
                        borderRadius: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '14px',
                        backgroundColor: '#1D4ED8',
                        color: '#FFFFFF',
                        border: '2px solid #93C5FD',
                        fontSize: '23px',
                        fontWeight: 800,
                      }}
                    >
                      <Heartbeat size={30} weight="fill" />
                      <span>{startDailySeniorLabel}</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* MODE 3A: AGE 50 VITALS COCKPIT (< 65 — Dense 6-Tile Telemetry Grid + Bottom-Right 42px Dock) */}
              {!isGuest && !isSeniorHud && screenMode === 'VITALS' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '12px 16px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  {/* Top Dense 6-Tile Clinical + Environment Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
                      gap: '9px',
                    }}
                  >
                    {/* Tile 1: HR */}
                    <div
                      style={{
                        padding: '10px 13px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        <span>Heart Rate (MAX30102)</span>
                        <span style={{ color: hrOutOfRange ? hud.crimsonText : hud.emeraldText }}>
                          {hrOutOfRange ? 'Alert' : 'Normal'}
                        </span>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 800, color: hrOutOfRange ? hud.crimsonText : hud.emeraldText, lineHeight: 1.1, marginTop: '3px' }}>
                        {telemetry.heartRate} <span style={{ fontSize: '12px', color: hud.inkMuted }}>BPM</span>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                        Range {elderProfile.baseline.hrMin}–{elderProfile.baseline.hrMax} BPM
                      </div>
                    </div>

                    {/* Tile 2: SpO2 */}
                    <div
                      style={{
                        padding: '10px 13px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        <span>Blood Oxygen (SpO₂)</span>
                        <span style={{ color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText }}>
                          {spo2OutOfRange ? 'Low' : 'Normal'}
                        </span>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 800, color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText, lineHeight: 1.1, marginTop: '3px' }}>
                        {telemetry.spo2}<span style={{ fontSize: '13px', color: hud.inkMuted }}> %</span>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                        Safe ≥{elderProfile.baseline.spo2Min}% · Perfusion OK
                      </div>
                    </div>

                    {/* Tile 3: Body Temp */}
                    <div
                      style={{
                        padding: '10px 13px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        <span>Body Temp (MLX90614)</span>
                        <span style={{ color: tempOutOfRange ? hud.crimsonText : hud.emeraldText }}>
                          {tempOutOfRange ? 'Fever' : 'Normal'}
                        </span>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 800, color: tempOutOfRange ? hud.crimsonText : hud.inkPrimary, lineHeight: 1.1, marginTop: '3px' }}>
                        {telemetry.bodyTempF.toFixed(1)}<span style={{ fontSize: '12px', color: hud.inkMuted }}>°F</span>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                        {bodyTempC}°C (Max {elderProfile.baseline.tempMax}°F)
                      </div>
                    </div>

                    {/* Tile 4: Room Climate DHT22 */}
                    <div
                      style={{
                        padding: '10px 13px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        Room Climate (DHT22)
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 800, color: hud.inkPrimary, marginTop: '5px' }}>
                        {telemetry.roomTempC}°C · {telemetry.humidity}% RH
                      </div>
                      <div style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                        Radar: {telemetry.radarState}
                      </div>
                    </div>

                    {/* Tile 5: Air Quality MQ-135 */}
                    <div
                      style={{
                        padding: '10px 13px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        Air Quality (MQ-135 / MQ-2)
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '21px', fontWeight: 800, color: hud.emeraldText, marginTop: '5px' }}>
                        {telemetry.airQuality} · {telemetry.lpgPpm} ppm
                      </div>
                      <div style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                        Relay CH1 Fan: {telemetry.exhaustFanRelay ? 'ON' : 'OFF'}
                      </div>
                    </div>

                    {/* Tile 6: 3S2P UPS Voltage / Current */}
                    <div
                      style={{
                        padding: '10px 13px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: hud.inkMuted }}>
                        3S2P UPS Voltage / Current
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: '21px',
                          fontWeight: 800,
                          color: telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                          marginTop: '5px',
                        }}
                      >
                        {batteryVoltage}V · {telemetry.batteryPercent}%
                      </div>
                      <div style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                        {telemetry.acMainsConnected ? 'AC Mains OK (0.42A draw)' : 'Battery Backup Active'}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Split: Inline 60 FPS ECG Trace (62%) + Bottom-Right Utility Strip (38%) */}
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '62fr 38fr',
                      gap: '10px',
                      alignItems: 'stretch',
                      minHeight: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: hud.inkSecondary }}>
                        <span>MAX30102 Live Optical PPG / ECG Trace (60 FPS)</span>
                        <span className="tabular-nums">
                          {telemetry.heartRate} BPM · {(60 / telemetry.heartRate).toFixed(2)}s cycle
                        </span>
                      </div>
                      <PpgWaveformCanvas
                        heartRate={telemetry.heartRate}
                        spo2={telemetry.spo2}
                        statusTone={vitalsTone}
                        height={145}
                        theme={kioskTheme}
                      />
                    </div>

                    {/* Age 50 Bottom-Right 42px Utility Strip */}
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkMuted }}>
                          STANDARD COCKPIT UTILITY DOCK
                        </span>
                        {lastVitalsLoggedAt ? (
                          <span className="tabular-nums" style={{ fontSize: '10.5px', fontWeight: 700, color: hud.emeraldText }}>
                            Synced {lastVitalsLoggedAt}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ fontSize: '12px', color: hud.inkSecondary }}>
                        Sleep Watch {elderProfile.sleepTime}–{elderProfile.wakeTime} · Hydration{' '}
                        {elderProfile.hydrationGoalMl} ml
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={logVitalsOkay}
                          style={{
                            flex: 1,
                            height: '42px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            backgroundColor: '#15803D',
                            color: '#FFFFFF',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Log Vitals ✓
                        </button>

                        <button
                          type="button"
                          onClick={() => setScreenModeManual('CARE_PLAN')}
                          style={{
                            height: '42px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            backgroundColor: hud.blueSoft,
                            color: hud.blueText,
                            border: `1px solid ${hud.blueBorder}`,
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Care Plan
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerCareAlarm()}
                          style={{
                            height: '42px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            backgroundColor: hud.controlBg,
                            color: hud.inkPrimary,
                            border: hud.border,
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Test Alarm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* MODE 3B: AGE 78 VITALS SENIOR HUD (>= 65 — 3 High-Contrast Cards + Full-Width Waveform + Centered 76px Ergonomic Thumb Bar) */}
              {!isGuest && isSeniorHud && screenMode === 'VITALS' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '12px 18px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  {/* Row 1: Strictly 3 High-Contrast Primary Vital Cards (Zero Clutter) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.borderHighAssist,
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: hud.inkSecondary }}>
                        {copy.heartRateLabel}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '49px',
                          fontWeight: 800,
                          lineHeight: 1.04,
                          marginTop: '4px',
                          color: hrOutOfRange ? hud.crimsonText : hud.emeraldText,
                        }}
                      >
                        {telemetry.heartRate}{' '}
                        <span style={{ fontSize: '16px', fontWeight: 700, color: hud.inkMuted }}>
                          BPM
                        </span>
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: hrOutOfRange ? hud.crimsonText : hud.emeraldText, marginTop: '4px' }}>
                        {hrOutOfRange ? 'CHECK IMMEDIATELY' : 'NORMAL PULSE'}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.borderHighAssist,
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: hud.inkSecondary }}>
                        {copy.spo2Label}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '49px',
                          fontWeight: 800,
                          lineHeight: 1.04,
                          marginTop: '4px',
                          color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText,
                        }}
                      >
                        {telemetry.spo2}
                        <span style={{ fontSize: '18px', fontWeight: 700, color: hud.inkMuted }}>
                          {' '}
                          %
                        </span>
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText, marginTop: '4px' }}>
                        {spo2OutOfRange ? 'LOW OXYGEN' : 'HEALTHY OXYGEN'}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: '12px',
                        backgroundColor: hud.tileBg,
                        border: hud.borderHighAssist,
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: hud.inkSecondary }}>
                        {copy.bodyTempLabel}
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '49px',
                          fontWeight: 800,
                          lineHeight: 1.04,
                          marginTop: '4px',
                          color: tempOutOfRange ? hud.crimsonText : hud.inkPrimary,
                        }}
                      >
                        {telemetry.bodyTempF.toFixed(1)}
                        <span style={{ fontSize: '16px', fontWeight: 700, color: hud.inkMuted }}>
                          °F
                        </span>
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: tempOutOfRange ? hud.crimsonText : hud.emeraldText, marginTop: '4px' }}>
                        {tempOutOfRange ? 'FEVER DETECTED' : `${bodyTempC}°C NORMAL`}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Full-Width 60 FPS Optical PPG Trace */}
                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      backgroundColor: hud.tileBg,
                      border: hud.borderHighAssist,
                    }}
                  >
                    <PpgWaveformCanvas
                      heartRate={telemetry.heartRate}
                      spo2={telemetry.spo2}
                      statusTone={vitalsTone}
                      height={118}
                      theme={kioskTheme}
                    />
                  </div>

                  {/* Row 3: Full-Width Centered Ergonomic Thumb-Reach Action Bar (76px height, 16px gap) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60fr 40fr',
                      gap: '16px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={logVitalsOkay}
                      style={{
                        height: '76px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        backgroundColor: '#15803D',
                        color: '#FFFFFF',
                        border: '2px solid #86EFAC',
                        fontSize: '21px',
                        fontWeight: 800,
                      }}
                    >
                      <CheckCircle size={30} weight="fill" />
                      <span>{copy.imOkLogVitals}</span>
                    </button>

                    <button
                      type="button"
                      onClick={triggerFallScenario}
                      style={{
                        height: '76px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        backgroundColor: isDark ? '#334155' : '#FEF3C7',
                        color: isDark ? '#FDE68A' : '#92400E',
                        border: `2px solid ${hud.amberText}`,
                        fontSize: '18.5px',
                        fontWeight: 800,
                      }}
                    >
                      <PhoneCall size={26} weight="fill" />
                      <span>{callFamilyLabel}</span>
                    </button>
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

        {/* Bottom Bezel Engraved Hardware Spec Label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '10px',
            paddingLeft: '4px',
            paddingRight: '4px',
            fontSize: '10.5px',
            fontWeight: 600,
            color: '#94A3B8',
            letterSpacing: '0.04em',
          }}
        >
          <span>XYZ HOME DECK · RASPBERRY PI 4B + ESP32-S3 TOUCH CONSOLE</span>
          <span className="tabular-nums">1024 × 600 · 7&quot; IPS · 60 FPS</span>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
