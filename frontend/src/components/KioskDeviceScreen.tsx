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
import {
  KIOSK_COPY,
  getLocalizedClockDisplay,
  localizeDigits,
  localizeEmergencyReason,
  localizeKnownText,
  localizeTimeRange,
} from '../data/kioskCopy';
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
import { AppleSetupWizard } from './AppleSetupWizard';
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

  const [clock, setClock] = useState(() => getLocalizedClockDisplay('en'));
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
    setClock(getLocalizedClockDisplay(elderProfile.language));
    const id = window.setInterval(
      () => setClock(getLocalizedClockDisplay(elderProfile.language)),
      1000
    );
    return () => window.clearInterval(id);
  }, [elderProfile.language]);

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

  const lang = elderProfile.language;
  const copy = KIOSK_COPY[lang];
  const localizedDisplayName = localizeKnownText(elderProfile.name, lang);
  const localizedGuardianName = localizeKnownText(elderProfile.emergencyContactName, lang);
  const localizedExercise = localizeKnownText(elderProfile.exercisePlan, lang);
  const bodyTempC = ((telemetry.bodyTempF - 32) * (5 / 9)).toFixed(1);
  const batteryVoltage = (11.1 + (telemetry.batteryPercent / 100) * 1.5).toFixed(1);

  const callFamilyLabel = copy.callFamilyLabel;
  const startDailySeniorLabel = copy.startDailySeniorLabel;

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
        screenBg: '#0C0C0E',
        topBarBg: '#161618',
        tileBg: '#1C1C1E',
        subTileBg: '#2C2C2E',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderHighAssist: '2px solid rgba(255, 255, 255, 0.16)',
        inkPrimary: '#EBEBF5',
        inkSecondary: '#8E8E93',
        inkMuted: '#6C6C70',
        emeraldText: '#30D158',
        emeraldSoft: 'rgba(48, 209, 88, 0.14)',
        emeraldBorder: 'rgba(48, 209, 88, 0.35)',
        amberText: '#FFD60A',
        amberSoft: 'rgba(255, 214, 10, 0.12)',
        amberBorder: 'rgba(255, 214, 10, 0.32)',
        crimsonText: '#FF453A',
        crimsonSoft: 'rgba(255, 69, 58, 0.13)',
        crimsonBorder: 'rgba(255, 69, 58, 0.38)',
        blueText: '#0A84FF',
        blueSoft: 'rgba(10, 132, 255, 0.13)',
        blueBorder: 'rgba(10, 132, 255, 0.35)',
        controlBg: '#2C2C2E',
      }
    : {
        screenBg: '#F5F5F7',
        topBarBg: '#FFFFFF',
        tileBg: '#FFFFFF',
        subTileBg: '#F0F0F2',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderHighAssist: '2px solid rgba(0, 0, 0, 0.14)',
        inkPrimary: '#1D1D1F',
        inkSecondary: '#6E6E73',
        inkMuted: '#86868B',
        emeraldText: '#34C759',
        emeraldSoft: 'rgba(52, 199, 89, 0.12)',
        emeraldBorder: 'rgba(52, 199, 89, 0.3)',
        amberText: '#C93400',
        amberSoft: 'rgba(255, 159, 10, 0.12)',
        amberBorder: 'rgba(255, 159, 10, 0.35)',
        crimsonText: '#D70015',
        crimsonSoft: 'rgba(255, 59, 48, 0.08)',
        crimsonBorder: 'rgba(255, 59, 48, 0.28)',
        blueText: '#0071E3',
        blueSoft: 'rgba(0, 113, 227, 0.07)',
        blueBorder: 'rgba(0, 113, 227, 0.28)',
        controlBg: '#F0F0F2',
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

  const airQualityColor =
    telemetry.airQuality === 'HAZARDOUS' || telemetry.lpgPpm > 400
      ? hud.crimsonText
      : telemetry.airQuality === 'MODERATE' || telemetry.lpgPpm > 180
        ? hud.amberText
        : hud.emeraldText;

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
    { mode: 'STANDBY', label: copy.tabs.STANDBY },
    { mode: 'VITALS', label: copy.tabs.VITALS },
    { mode: 'CARE_PLAN', label: copy.tabs.CARE_PLAN },
    { mode: 'EMERGENCY', label: copy.tabs.EMERGENCY },
    { mode: 'SETUP', label: copy.tabs.SETUP },
  ];

  // Radial ring math for 10s countdown
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference * (1 - Math.max(0, Math.min(10, countdownSec)) / 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
      {/* Embedded 7-Inch 1024x600 IPS Display Module (26px gradient matte-black bezel + 4 blue PCB mounting ears) */}
      <div className="kiosk-lcd-mount">
        <div className="kiosk-bezel">
          <span className="kiosk-bezel-ear tl" />
          <span className="kiosk-bezel-ear tr" />
          <span className="kiosk-bezel-ear bl" />
          <span className="kiosk-bezel-ear br" />

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
                        {localizedDisplayName} · {localizeDigits(elderProfile.age, lang)}{copy.ageSuffix}
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: isSeniorHud ? hud.amberText : hud.blueText,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        · {isSeniorHud ? copy.tierHighAssist : copy.tierCockpit}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: hud.amberText,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <LockKey size={14} weight="duotone" />
                    <span>{copy.guestPrivacyLockTitle}</span>
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
                    tab.mode === 'EMERGENCY' ? '#D70015' : '#0071E3';
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
                    {copy.tapAudioBtn}
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
                  {(['en', 'hi', 'bn'] as PromptLanguage[]).map((langOpt) => {
                    const active = elderProfile.language === langOpt;
                    return (
                      <button
                        key={langOpt}
                        type="button"
                        onClick={() => setLanguage(langOpt)}
                        style={{
                          padding: '5px 8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          backgroundColor: active ? '#0071E3' : hud.controlBg,
                          color: active ? '#FFFFFF' : hud.inkSecondary,
                        }}
                      >
                        {langOpt.toUpperCase()}
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
                      <Sun size={14} weight="regular" color={hud.inkPrimary} />
                      <span>{copy.dayLabel}</span>
                    </>
                  ) : (
                    <>
                      <Moon size={14} weight="regular" color={hud.inkPrimary} />
                      <span>{copy.nightLabel}</span>
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
                    {copy.nextReminderLabel} · {localizeDigits(nextScheduledAlarm?.time ?? '08:30', lang)}:{' '}
                    {nextScheduledAlarm
                      ? localizeKnownText(nextScheduledAlarm.title, lang)
                      : copy.defaultReminderTitle}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkSecondary }}>
                    {copy.voiceWord} {localizeDigits(accessibilityTier.speechRateLabel, lang)} · {copy.sleepWatchLabel} {localizeTimeRange(elderProfile.sleepTime, elderProfile.wakeTime, lang)}
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
                      backgroundColor: '#0071E3',
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copy.testReminderBtn}
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
                      backgroundColor: '#0071E3',
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
                      {copy.scheduledCareAlarmLabel} · {localizeDigits(activeCareAlarm.time, lang)} ({copy.alarmCategories[activeCareAlarm.category] ?? activeCareAlarm.category})
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: hud.inkPrimary }}>
                      {localizeKnownText(activeCareAlarm.title, lang)}
                    </div>
                    <div style={{ fontSize: '12px', color: hud.inkSecondary }}>
                      {localizeKnownText(activeCareAlarm.spoken_prompt, lang)}
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
                    backgroundColor: '#34C759',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {copy.doneCheckLabel}
                </button>
              </div>
            ) : null}

            {/* === MAIN LOGICAL BODY VIEWPORT === */}
            <div style={{ height: `${bodyHeight}px`, overflow: 'hidden' }}>
              {/* MODE 0: OUT-OF-BOX WELCOME & 8-SCREEN ONBOARDING WIZARD */}
              {screenMode === 'SETUP' ? (
                <AppleSetupWizard onCancel={() => setScreenModeManual('STANDBY')} />
              ) : null}

              {/* MODE 1: GUEST PRIVACY LOCK */}
              {screenMode !== 'SETUP' && isGuest && screenMode !== 'HAZARD' ? (
                <div
                  style={{
                    height: '100%',
                    padding: '14px 16px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.28fr) minmax(0, 1fr)',
                    gap: '14px',
                  }}
                >
                  {/* Left: Privacy Vault Explanation, Security Rows & Profile Actions */}
                  <div
                    style={{
                      padding: '18px 20px',
                      borderRadius: '8px',
                      backgroundColor: hud.tileBg,
                      border: `1.5px solid ${hud.amberBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          color: hud.amberText,
                        }}
                      >
                        <LockKey size={15} weight="duotone" />
                        <span>{copy.guestLockTag}</span>
                      </span>
                      <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: hud.inkSecondary }}>
                        {clock.date} · {clock.time}
                      </span>
                    </div>

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          fontSize: '21px',
                          fontWeight: 800,
                          color: hud.inkPrimary,
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        <ShieldWarning size={24} weight="duotone" color={hud.amberText} />
                        <span>{copy.guestLockHeadline}</span>
                      </div>
                      <p style={{ fontSize: '13.5px', color: hud.inkSecondary, marginTop: '6px', lineHeight: 1.5 }}>
                        {copy.guestLockBody}
                      </p>
                    </div>

                    {/* Structured Privacy & Edge Status Table */}
                    <div
                      style={{
                        borderRadius: '6px',
                        border: hud.border,
                        backgroundColor: hud.subTileBg,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: hud.border, fontSize: '12.5px' }}>
                        <span style={{ color: hud.inkMuted, fontWeight: 600 }}>{copy.vaultRowLabel}</span>
                        <span style={{ color: hud.amberText, fontWeight: 800 }}>{copy.vaultRowValue}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: hud.border, fontSize: '12.5px' }}>
                        <span style={{ color: hud.inkMuted, fontWeight: 600 }}>{copy.cameraRowLabel}</span>
                        <span style={{ color: hud.emeraldText, fontWeight: 800 }}>{copy.cameraRowValue}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: '12.5px' }}>
                        <span style={{ color: hud.inkMuted, fontWeight: 600 }}>{copy.watchRowLabel}</span>
                        <span style={{ color: hud.blueText, fontWeight: 800 }}>{copy.watchRowValue}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => selectProfile('subhashree')}
                        style={{
                          height: '48px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          backgroundColor: '#0071E3',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          fontWeight: 800,
                        }}
                      >
                        <UserSwitch size={19} weight="duotone" />
                        <span>{copy.guestSwitchFamily}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScreenModeManual('SETUP')}
                        style={{
                          height: '48px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '7px',
                          backgroundColor: hud.controlBg,
                          border: hud.border,
                          color: hud.inkPrimary,
                          fontSize: '13.5px',
                          fontWeight: 700,
                        }}
                      >
                        <UserPlus size={17} weight="bold" />
                        <span>{copy.deviceSetupBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: 3 Purposeful Ambient & Safety Telemetry Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
                    {/* Card 1: Room Climate (DHT22) */}
                    <div
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: hud.inkSecondary }}>
                          {copy.roomTempLabel}
                        </span>
                        <Thermometer size={16} weight="duotone" color={hud.amberText} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ padding: '7px 10px', borderRadius: '6px', backgroundColor: hud.subTileBg }}>
                          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.05, color: hud.inkPrimary }}>
                            {localizeDigits(telemetry.roomTempC, lang)}{copy.tempCUnit}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: hud.inkMuted }}>{copy.ambientTempSub}</div>
                        </div>
                        <div style={{ padding: '7px 10px', borderRadius: '6px', backgroundColor: hud.subTileBg }}>
                          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.05, color: hud.blueText }}>
                            {localizeDigits(telemetry.humidity, lang)}%
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: hud.inkMuted }}>{copy.relHumiditySub}</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Air Quality & Combustible Gas (MQ-2 / MQ-135) */}
                    <div
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border:
                          telemetry.lpgPpm > 400 || telemetry.airQuality === 'HAZARDOUS'
                            ? `1.5px solid ${hud.crimsonBorder}`
                            : hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: hud.inkSecondary }}>
                          {copy.airQualityLabel}
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '12.5px', fontWeight: 800, color: airQualityColor }}>
                          {localizeDigits(telemetry.lpgPpm, lang)} {copy.ppmUnit}
                        </span>
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.05, color: airQualityColor }}>
                        {copy.airQualityLevels[telemetry.airQuality]}
                      </div>
                      <div>
                        {renderProgressTrack(gasSafetyPct, airQualityColor, 7)}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: hud.inkMuted, marginTop: '4px' }}>
                          <span>{copy.safeLess180}</span>
                          <span style={{ color: telemetry.exhaustFanRelay ? hud.crimsonText : hud.inkSecondary, fontWeight: 700 }}>
                            {copy.relayCh1Prefix} {telemetry.exhaustFanRelay ? copy.relayExhaustOn : copy.relayReady400}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: 24GHz Radar Presence & 3S2P UPS Power */}
                    <div
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: hud.tileBg,
                        border: hud.border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: hud.inkSecondary }}>
                          {copy.radarUpsBusTitle}
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                          }}
                        >
                          {telemetry.acMainsConnected ? copy.acMainsOk : copy.upsBatteryActive}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: hud.inkPrimary }}>
                          {telemetry.radarState === 'MOVING'
                            ? copy.radarMoving
                            : telemetry.radarState === 'PRESENT_STILL'
                              ? copy.radarPresentStill
                              : copy.radarEmpty}
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '22px',
                            fontWeight: 800,
                            color: telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                          }}
                        >
                          {localizeDigits(telemetry.batteryPercent, lang)}% · {localizeDigits(batteryVoltage, lang)}{copy.voltUnit}
                        </span>
                      </div>
                      {renderProgressTrack(
                        telemetry.batteryPercent,
                        telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                        7
                      )}
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
                      gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 1fr)',
                      gap: '10px',
                    }}
                  >
                    {/* Left 2x3 vitals tile grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
                        gap: '10px',
                        minWidth: 0,
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
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hud.inkSecondary }}>
                          {clock.date}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: hud.emeraldText }}>
                          {localizeDigits(accessibilityTier.speechRateLabel, lang)} {copy.voiceActiveSuffix}
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
                          paddingTop: '6px',
                          borderTop: hud.border,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: hud.emeraldText,
                        }}
                      >
                        {copy.standbyTag} · {copy.allSystemsNominal}
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
                          {copy.hydrationExerciseTitle}
                        </span>
                        <Drop size={16} weight="duotone" color={hud.blueText} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                        <span className="tabular-nums" style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.05, color: hud.inkPrimary }}>
                          {localizeDigits(hydrationGoalMl.toLocaleString('en-IN'), lang)} <span style={{ fontSize: '14px', color: hud.inkMuted }}>{copy.mlUnit}</span>
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 700, color: hud.blueText }}>
                          {localizeDigits(hydrationConsumedMl.toLocaleString('en-IN'), lang)} / {localizeDigits(hydrationGoalMl.toLocaleString('en-IN'), lang)} {copy.mlUnit}
                        </span>
                      </div>

                      {renderProgressTrack(hydrationPct, hud.blueText, 8)}

                      <div
                        style={{
                          paddingTop: '6px',
                          borderTop: hud.border,
                          color: hud.blueText,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {localizedExercise}
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
                          {copy.sleepRadarWatchTitle}
                        </span>
                        <MoonStars size={16} weight="duotone" color={hud.blueText} />
                      </div>

                      <div className="tabular-nums" style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.05, color: hud.blueText }}>
                        {localizeTimeRange(elderProfile.sleepTime, elderProfile.wakeTime, lang)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 800, color: hud.inkPrimary }}>
                          {copy.respirationPrefix} {localizeDigits(breathingRate, lang)} {copy.brPerMinUnit}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: hud.emeraldText }}>
                          {copy.watchArmed15m}
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
                          {copy.roomTempLabel}
                        </span>
                        <Thermometer size={16} weight="duotone" color={hud.amberText} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ padding: '7px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div className="tabular-nums" style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.05, color: hud.inkPrimary }}>
                            {localizeDigits(telemetry.roomTempC, lang)}{copy.tempCUnit}
                          </div>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: hud.inkMuted }}>{copy.tempWord}</div>
                        </div>
                        <div style={{ padding: '7px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div className="tabular-nums" style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.05, color: hud.blueText }}>
                            {localizeDigits(telemetry.humidity, lang)}%
                          </div>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: hud.inkMuted }}>{copy.relHumiditySub}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          paddingTop: '6px',
                          borderTop: hud.border,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: hud.emeraldText,
                        }}
                      >
                        {copy.comfortableBandActive}
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
                          {copy.airQualityMq2Title}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: airQualityColor }}>
                          {copy.airQualityLevels[telemetry.airQuality]}
                        </span>
                      </div>

                      <div className="tabular-nums" style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.05, color: airQualityColor }}>
                        {localizeDigits(telemetry.lpgPpm, lang)} <span style={{ fontSize: '15px', color: hud.inkMuted }}>{copy.ppmUnit}</span>
                      </div>

                      <div>
                        {renderProgressTrack(
                          gasSafetyPct,
                          airQualityColor,
                          8
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 600, color: hud.inkMuted, marginTop: '4px' }}>
                          <span>{copy.zeroPpmSafe}</span>
                          <span style={{ color: hud.inkSecondary, fontWeight: 700 }}>
                            {copy.relayCh1Prefix} {telemetry.exhaustFanRelay ? copy.relayExhaustOn : copy.relayReadyShort}
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
                          {copy.upsPowerInaTitle}
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
                        {localizeDigits(telemetry.batteryPercent, lang)}% · {localizeDigits(batteryVoltage, lang)}{copy.voltUnit}
                      </div>

                      <div>
                        {renderProgressTrack(
                          telemetry.batteryPercent,
                          telemetry.acMainsConnected ? hud.emeraldText : hud.amberText,
                          8
                        )}
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkSecondary, marginTop: '4px' }}>
                          {telemetry.acMainsConnected ? copy.adapterOnline : copy.runningOnUps}
                        </div>
                      </div>
                    </div>
                    </div>

                    {/* Right column: VL53L5CX 8×8 Privacy Silhouette + Live Camera Thumbnail */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: '10px',
                          backgroundColor: hud.tileBg,
                          border: hud.border,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          minWidth: 0,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: hud.inkSecondary }}>
                            {copy.tofSilhouetteTitle}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color:
                                telemetry.tofPostureState === 'FLOOR_SILHOUETTE'
                                  ? hud.crimsonText
                                  : hud.emeraldText,
                            }}
                          >
                            {copy.tofPostureLabels[telemetry.tofPostureState]}
                          </span>
                        </div>
                        <div
                          style={{
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                            gap: '2px',
                            minWidth: 0,
                          }}
                          aria-label="VL53L5CX live 8x8 depth silhouette"
                        >
                          {telemetry.tofZoneDistancesCm.map((cm, idx) => {
                            const depth = Math.max(0, Math.min(1, 1 - (cm - 30) / 370));
                            const shade = Math.round(30 + depth * 165);
                            return (
                              <span
                                key={idx}
                                style={{
                                  aspectRatio: '1',
                                  borderRadius: '1px',
                                  backgroundColor: `rgb(${shade}, ${shade + 4}, ${shade + 10})`,
                                }}
                              />
                            );
                          })}
                        </div>
                        <div style={{ fontSize: '10.5px', fontWeight: 600, color: hud.inkMuted }}>
                          {copy.tofFooterNote}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: hud.inkSecondary,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {elderProfile.conditions[0]
                          ? localizeKnownText(elderProfile.conditions[0], lang)
                          : copy.activeMonitoring}
                      </span>
                      <span style={{ color: hud.inkMuted }} aria-hidden="true">|</span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: hud.crimsonText,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {copy.avoidPrefix}{' '}
                        {elderProfile.allergies.length > 0
                          ? elderProfile.allergies.map((a) => localizeKnownText(a, lang)).join(', ')
                          : copy.noneWord}
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
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {copy.testAlarmBtn}
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
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {copy.carePlanBtn}
                      </button>

                      <button
                        type="button"
                        onClick={startVitalsCheckIn}
                        style={{
                          height: '44px',
                          padding: '0 18px',
                          borderRadius: '8px',
                          backgroundColor: '#0071E3',
                          color: '#FFFFFF',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Heartbeat size={17} weight="duotone" />
                        <span>{copy.startVitalsCheckInBtn}</span>
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
                            fontSize: '12.5px',
                            fontWeight: 800,
                            color:
                              telemetry.radarState === 'BED_EMPTY_NIGHT' ||
                              telemetry.tofPostureState === 'FLOOR_SILHOUETTE'
                                ? hud.crimsonText
                                : hud.emeraldText,
                          }}
                        >
                          {telemetry.radarState === 'BED_EMPTY_NIGHT'
                            ? copy.radarBedEmptyAlert
                            : telemetry.tofPostureState === 'FLOOR_SILHOUETTE'
                              ? copy.tofFloorAlert
                              : copy.radarSafeActive}
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
                          {copy.standbyTag} · {localizedDisplayName}
                        </div>
                      </div>

                      {/* Quick 3-Vital Summary Strip */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                        <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkMuted }}>{copy.heartRateLabel}</div>
                          <div className="tabular-nums" style={{ fontSize: '19px', fontWeight: 800, color: hrOutOfRange ? hud.crimsonText : hud.emeraldText }}>
                            {localizeDigits(telemetry.heartRate, lang)} {copy.bpmUnit}
                          </div>
                        </div>
                        <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkMuted }}>{copy.spo2Label}</div>
                          <div className="tabular-nums" style={{ fontSize: '19px', fontWeight: 800, color: spo2OutOfRange ? hud.crimsonText : hud.emeraldText }}>
                            {localizeDigits(telemetry.spo2, lang)}% SpO₂
                          </div>
                        </div>
                        <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: hud.subTileBg }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: hud.inkMuted }}>{copy.bodyTempLabel}</div>
                          <div className="tabular-nums" style={{ fontSize: '19px', fontWeight: 800, color: tempOutOfRange ? hud.crimsonText : hud.inkPrimary }}>
                            {localizeDigits(telemetry.bodyTempF.toFixed(1), lang)}{copy.tempFUnit}
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
                        <span style={{ fontSize: '13px', fontWeight: 800, color: hud.blueText }}>
                          {copy.highAssistWellnessTitle}
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted }}>
                          {localizeDigits(accessibilityTier.speechRateLabel, lang)} {copy.voiceWord}
                        </span>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: '9px', backgroundColor: hud.subTileBg }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: hud.inkMuted, marginBottom: '3px' }}>
                          {copy.todaysExerciseTitle}
                        </div>
                        <div style={{ fontSize: '21px', fontWeight: 800, lineHeight: 1.22, color: hud.inkPrimary }}>
                          {localizedExercise}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 700, color: hud.inkSecondary, marginBottom: '5px' }}>
                          <span>{copy.hydrationProgressTitle}</span>
                          <span className="tabular-nums" style={{ color: hud.blueText }}>
                            {localizeDigits(hydrationConsumedMl.toLocaleString('en-IN'), lang)} / {localizeDigits(hydrationGoalMl.toLocaleString('en-IN'), lang)} {copy.mlUnit} · {copy.dailyGoalSuffix}
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
                        {copy.dailyCareScheduleBtn}
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
                        backgroundColor: '#0071E3',
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
                          {hrOutOfRange ? copy.alertWord : copy.normalPulse}
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
                        {localizeDigits(telemetry.heartRate, lang)}{' '}
                        <span style={{ fontSize: '16px', fontWeight: 700, color: hud.inkMuted }}>{copy.bpmUnit}</span>
                      </div>
                      {renderProgressTrack(hrPct, hrOutOfRange ? hud.crimsonText : hud.emeraldText, 7)}
                      <div className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 600, color: hud.inkMuted }}>
                        {copy.safeRangePrefix} {localizeDigits(elderProfile.baseline.hrMin, lang)}–{localizeDigits(elderProfile.baseline.hrMax, lang)} {copy.bpmUnit}
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
                          {spo2OutOfRange ? copy.lowOxygen : copy.healthyO2}
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
                        {localizeDigits(telemetry.spo2, lang)}
                        <span style={{ fontSize: '18px', fontWeight: 700, color: hud.inkMuted }}> %</span>
                      </div>
                      {renderProgressTrack(spo2Pct, spo2OutOfRange ? hud.crimsonText : hud.emeraldText, 7)}
                      <div className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 600, color: hud.inkMuted }}>
                        {copy.targetMinPrefix}{localizeDigits(elderProfile.baseline.spo2Min, lang)}% · {copy.perfusionSteady}
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
                          {tempOutOfRange ? copy.feverWord : `${localizeDigits(bodyTempC, lang)}${copy.tempCUnit} ${copy.normalWord}`}
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
                        {localizeDigits(telemetry.bodyTempF.toFixed(1), lang)}
                        <span style={{ fontSize: '16px', fontWeight: 700, color: hud.inkMuted }}>{copy.tempFUnit}</span>
                      </div>
                      {renderProgressTrack(tempPct, tempOutOfRange ? hud.crimsonText : hud.blueText, 7)}
                      <div className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 600, color: hud.inkMuted }}>
                        {copy.maxSafePrefix}{localizeDigits(elderProfile.baseline.tempMax, lang)}{copy.tempFUnit} ({copy.contactlessIrNote})
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
                        <span style={{ color: hud.inkMuted }}>{copy.dht22AmbientShort}</span>
                        <span className="tabular-nums">{localizeDigits(telemetry.roomTempC, lang)}{copy.tempCUnit} · {localizeDigits(telemetry.humidity, lang)}% {copy.rhLabel}</span>
                      </div>
                      <div style={{ padding: '6px 12px', borderRadius: '7px', backgroundColor: hud.tileBg, border: hud.border, display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: hud.inkMuted }}>{copy.mqGasShort}</span>
                        <span className="tabular-nums" style={{ color: telemetry.lpgPpm > 400 ? hud.crimsonText : hud.emeraldText }}>{copy.airQualityLevels[telemetry.airQuality]} · {localizeDigits(telemetry.lpgPpm, lang)} {copy.ppmUnit}</span>
                      </div>
                      <div style={{ padding: '6px 12px', borderRadius: '7px', backgroundColor: hud.tileBg, border: hud.border, display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: hud.inkMuted }}>{copy.inaPowerShort}</span>
                        <span className="tabular-nums" style={{ color: telemetry.acMainsConnected ? hud.emeraldText : hud.amberText }}>{localizeDigits(telemetry.batteryPercent, lang)}% ({localizeDigits(batteryVoltage, lang)}{copy.voltUnit})</span>
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
                        <span>{copy.ppgTraceTitle}</span>
                        <span className="tabular-nums">
                          {localizeDigits(telemetry.heartRate, lang)} {copy.bpmUnit} · {localizeDigits((60 / telemetry.heartRate).toFixed(2), lang)}{copy.cycleSuffix}
                        </span>
                      </div>
                      <PpgWaveformCanvas
                        heartRate={telemetry.heartRate}
                        spo2={telemetry.spo2}
                        statusTone={vitalsTone}
                        height={isSeniorHud ? 225 : 205}
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
                          padding: '0 14px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          backgroundColor: '#34C759',
                          color: '#FFFFFF',
                          border: '2px solid #86EFAC',
                          fontSize: isSeniorHud ? '21px' : '19px',
                          fontWeight: 800,
                        }}
                      >
                        <CheckCircle size={28} weight="fill" style={{ flexShrink: 0 }} />
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
                            {copy.carePlanBtn}
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
                            {lastVitalsLoggedAt ? `${copy.loggedPrefix} ${localizeDigits(lastVitalsLoggedAt, lang)}` : copy.testAlarmBtn}
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
                      justifyContent: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: hud.inkPrimary }}>
                        {copy.dailyScheduleTitle}
                      </span>
                      <span className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 700, color: hud.blueText }}>
                        {lang === 'bn'
                          ? `${localizeDigits(elderProfile.carePlan?.daily_alarms.length ?? 0, lang)}${copy.alarmsActiveSuffix}`
                          : `${localizeDigits(elderProfile.carePlan?.daily_alarms.length ?? 0, lang)} ${copy.alarmsActiveSuffix}`}
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '7px', overflowY: 'auto' }}>
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
                              {localizeDigits(alarm.time, lang)}
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
                                {localizeKnownText(alarm.title, lang)}
                              </div>
                              <div style={{ fontSize: '10.5px', color: hud.inkMuted }}>
                                {copy.alarmCategories[alarm.category] ?? alarm.category}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => triggerCareAlarm(alarm)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#0071E3',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {copy.ringBtn}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 800, color: hud.crimsonText, marginBottom: '5px' }}>
                        <WarningOctagon size={14} weight="fill" />
                        <span>{copy.allergyGuardrailsTitle}</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: hud.inkPrimary, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(elderProfile.carePlan?.nutrition_rules.strictly_avoid ?? []).map((rule) => (
                          <li key={rule}>{localizeKnownText(rule, lang)}</li>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: hud.emeraldText }}>
                          {copy.hydrationSleepWatchTitle}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 700, color: hud.inkPrimary }}>
                          {copy.goalPrefix} {localizeDigits(elderProfile.hydrationGoalMl, lang)} {copy.mlUnit}{copy.perDayUnit} · {copy.sleepWatchLabel}: {localizeTimeRange(elderProfile.sleepTime, elderProfile.wakeTime, lang)}
                        </div>
                        <div
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            backgroundColor: hud.subTileBg,
                            border: hud.border,
                            fontSize: '12px',
                            color: hud.inkSecondary,
                            lineHeight: 1.4,
                          }}
                        >
                          <strong style={{ color: hud.inkPrimary }}>{copy.dailyMobilityLabel}</strong> {localizedExercise}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: hud.inkMuted,
                          }}
                        >
                          <span>{copy.primaryGuardianLabel}</span>
                          <span style={{ color: hud.inkPrimary }}>
                            {localizedGuardianName} ({elderProfile.telegramHandle})
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={startVitalsCheckIn}
                        style={{
                          height: isSeniorHud ? '54px' : '42px',
                          width: '100%',
                          borderRadius: '8px',
                          backgroundColor: '#34C759',
                          color: '#FFFFFF',
                          fontSize: '13.5px',
                          fontWeight: 800,
                        }}
                      >
                        {copy.goToVitalsBtn}
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
                        fontSize: '12.5px',
                        fontWeight: 800,
                        color: hud.crimsonText,
                      }}
                    >
                      <BellRinging size={15} weight="fill" />
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
                          stroke={isDark ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255, 59, 48, 0.15)'}
                          strokeWidth="9"
                        />
                        <circle
                          cx="55"
                          cy="55"
                          r={ringRadius}
                          fill="none"
                          stroke={isDark ? '#FF453A' : '#D70015'}
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
                          {localizeDigits(countdownSec, lang)}{copy.secondsUnit}
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
                        {localizeEmergencyReason(emergencyReason, lang)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: hud.inkMuted, marginTop: '3px' }}>
                        {copy.allergyPinPrefix}{' '}
                        {elderProfile.allergies.length > 0
                          ? elderProfile.allergies.map((a) => localizeKnownText(a, lang)).join(', ')
                          : copy.noneWord}
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
                        {localizeDigits(telemetry.heartRate, lang)} {copy.bpmUnit} · {localizeDigits(telemetry.spo2, lang)}% SpO₂
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
                        backgroundColor: '#34C759',
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
                        backgroundColor: '#D70015',
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
                        fontSize: '12.5px',
                        fontWeight: 800,
                        color: hud.crimsonText,
                      }}
                    >
                      <ShieldWarning size={15} weight="fill" />
                      <span>{copy.hazardTag}</span>
                    </span>

                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: hud.amberText }}>
                        {copy.mq2CombustibleTitle}
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
                        {localizeDigits(telemetry.lpgPpm, lang)}{' '}
                        <span style={{ fontSize: '20px', fontWeight: 700 }}>{copy.ppmUnit}</span>
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        color: hud.emeraldText,
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
                        {copy.ventilationInterlockTitle}
                      </h3>
                      <p style={{ fontSize: '14px', color: hud.inkSecondary, lineHeight: 1.55 }}>
                        {copy.ventilationInterlockBody(localizedGuardianName)}
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
                        backgroundColor: '#0071E3',
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
