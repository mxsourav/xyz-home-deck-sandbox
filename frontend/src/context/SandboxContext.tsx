import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  audioEngine,
  type PromptKey,
  type PromptLanguage,
} from '../utils/audioEngine';

export type AirQualityLevel = 'GOOD' | 'MODERATE' | 'HAZARDOUS';
export type RadarPresenceState = 'PRESENT_STILL' | 'MOVING' | 'BED_EMPTY_NIGHT';
export type KioskScreenMode = 'STANDBY' | 'VITALS' | 'EMERGENCY' | 'HAZARD';
export type EscalationStage = 0 | 1 | 2 | 3 | 4;

export interface ElderBaseline {
  hrMin: number;
  hrMax: number;
  spo2Min: number;
  tempMax: number;
}

export interface ElderProfile {
  name: string;
  age: number;
  language: PromptLanguage;
  baseline: ElderBaseline;
  emergencyContactName: string;
  emergencyContactPhone: string;
  frailtyMode: 'standard' | 'adaptive-large';
}

export interface SandboxTelemetry {
  heartRate: number;
  spo2: number;
  bodyTempF: number;
  roomTempC: number;
  humidity: number;
  lpgPpm: number;
  exhaustFanRelay: boolean;
  airQuality: AirQualityLevel;
  radarState: RadarPresenceState;
  acMainsConnected: boolean;
  batteryPercent: number;
}

export interface SandboxEvent {
  id: string;
  timestamp: string;
  category: 'normal' | 'warning' | 'emergency' | 'relay' | 'power';
  message: string;
}

interface SandboxContextValue {
  elderProfile: ElderProfile;
  updateElderProfile: (patch: Partial<ElderProfile>) => void;
  setLanguage: (lang: PromptLanguage) => void;
  telemetry: SandboxTelemetry;
  screenMode: KioskScreenMode;
  setScreenModeManual: (mode: KioskScreenMode) => void;
  countdownSec: number;
  escalationStage: EscalationStage;
  emergencyReason: string | null;
  isMuted: boolean;
  toggleMute: () => void;
  lastVitalsLoggedAt: string | null;
  eventLog: SandboxEvent[];
  updateHeartRate: (bpm: number) => void;
  updateSpo2: (pct: number) => void;
  updateBodyTempF: (tempF: number) => void;
  updateLpgPpm: (ppm: number) => void;
  updateRadarState: (state: RadarPresenceState) => void;
  toggleAcMains: () => void;
  startVitalsCheckIn: () => void;
  logVitalsOkay: () => void;
  cancelEmergencyOkay: () => void;
  sendAlertNow: () => void;
  acknowledgeHazard: () => void;
  triggerFallScenario: () => void;
  triggerBedAbsenceScenario: () => void;
  triggerGasLeakScenario: () => void;
  resetHealthyBaseline: () => void;
}

const DEFAULT_ELDER_PROFILE: ElderProfile = {
  name: 'Subhashree Devi',
  age: 74,
  language: 'en',
  baseline: {
    hrMin: 55,
    hrMax: 105,
    spo2Min: 93,
    tempMax: 99.8,
  },
  emergencyContactName: 'Sourav (Son)',
  emergencyContactPhone: '+91 98300 XXXXX',
  frailtyMode: 'adaptive-large',
};

const HEALTHY_TELEMETRY: SandboxTelemetry = {
  heartRate: 72,
  spo2: 98,
  bodyTempF: 98.6,
  roomTempC: 24,
  humidity: 62,
  lpgPpm: 45,
  exhaustFanRelay: false,
  airQuality: 'GOOD',
  radarState: 'PRESENT_STILL',
  acMainsConnected: true,
  batteryPercent: 96,
};

function formatTimeNow(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function makeEvent(
  category: SandboxEvent['category'],
  message: string
): SandboxEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: formatTimeNow(),
    category,
    message,
  };
}

type BreachCode = 'SPO2_LOW' | 'HR_HIGH' | 'HR_LOW' | 'TEMP_HIGH';

function evaluateVitalsBreach(
  t: Pick<SandboxTelemetry, 'heartRate' | 'spo2' | 'bodyTempF'>,
  baseline: ElderBaseline
): { code: BreachCode; reason: string } | null {
  if (t.spo2 < baseline.spo2Min) {
    return {
      code: 'SPO2_LOW',
      reason: `Abnormal SpO₂: ${t.spo2}% (Below ${baseline.spo2Min}% baseline)`,
    };
  }
  if (t.heartRate > baseline.hrMax) {
    return {
      code: 'HR_HIGH',
      reason: `Elevated Heart Rate: ${t.heartRate} BPM (Above ${baseline.hrMax} BPM baseline)`,
    };
  }
  if (t.heartRate < baseline.hrMin) {
    return {
      code: 'HR_LOW',
      reason: `Low Heart Rate: ${t.heartRate} BPM (Below ${baseline.hrMin} BPM baseline)`,
    };
  }
  if (t.bodyTempF > baseline.tempMax) {
    return {
      code: 'TEMP_HIGH',
      reason: `Fever Spike: ${t.bodyTempF.toFixed(1)}°F (Above ${baseline.tempMax}°F baseline)`,
    };
  }
  return null;
}

const SandboxContext = createContext<SandboxContextValue | null>(null);

export function SandboxProvider({ children }: { children: ReactNode }) {
  const [elderProfile, setElderProfile] = useState<ElderProfile>(DEFAULT_ELDER_PROFILE);
  const [telemetry, setTelemetry] = useState<SandboxTelemetry>(HEALTHY_TELEMETRY);
  const [screenMode, setScreenMode] = useState<KioskScreenMode>('STANDBY');
  const [countdownSec, setCountdownSec] = useState<number>(10);
  const [escalationStage, setEscalationStage] = useState<EscalationStage>(0);
  const [emergencyReason, setEmergencyReason] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lastVitalsLoggedAt, setLastVitalsLoggedAt] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<SandboxEvent[]>(() => [
    makeEvent(
      'normal',
      'System armed — RPi 4 Interface + ESP32-S3 Reflex link active.'
    ),
    makeEvent(
      'normal',
      'Profile loaded: Subhashree Devi (Age 74 · Baseline 55–105 BPM / ≥93% SpO₂).'
    ),
  ]);

  const appendEvent = useCallback(
    (category: SandboxEvent['category'], message: string) => {
      setEventLog((prev) => [makeEvent(category, message), ...prev].slice(0, 40));
    },
    []
  );

  const speak = useCallback(
    (key: PromptKey, langOverride?: PromptLanguage) => {
      audioEngine.unlock();
      audioEngine.speakPrompt(key, langOverride ?? elderProfile.language);
    },
    [elderProfile.language]
  );

  // Track previous breach category so dragging a slider or cancelling via "I'M OKAY" does not stutter/re-trigger
  const prevBreachCodeRef = useRef<BreachCode | null>(null);

  const triggerEmergencyState = useCallback(
    (reason: string, logText?: string) => {
      setEmergencyReason(reason);
      setCountdownSec(10);
      setEscalationStage(1);
      setScreenMode('EMERGENCY');
      appendEvent('emergency', logText ?? `Emergency triggered: ${reason}`);
      speak('emergency_active');
    },
    [appendEvent, speak]
  );

  // 10-second countdown timer while in EMERGENCY stage 1
  useEffect(() => {
    if (screenMode !== 'EMERGENCY' || escalationStage !== 1) return;

    const timer = window.setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setEscalationStage(2);
          appendEvent(
            'emergency',
            'Stage 2 (t+10s): No response — Auto phone call + SMS + Telegram sent with snapshot.'
          );
          speak('alert_sent');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screenMode, escalationStage, appendEvent, speak]);

  // Autonomous progression through Stages 2 -> 3 -> 4 if uncancelled
  useEffect(() => {
    if (screenMode !== 'EMERGENCY') return;
    if (escalationStage === 2) {
      const t3 = window.setTimeout(() => {
        setEscalationStage(3);
        appendEvent(
          'emergency',
          'Stage 3 (t+20s): Live two-way audio/video link opened on child phone.'
        );
      }, 4500);
      return () => window.clearTimeout(t3);
    }
    if (escalationStage === 3) {
      const t4 = window.setTimeout(() => {
        setEscalationStage(4);
        appendEvent(
          'emergency',
          'Stage 4 (t+30s): Confirmed emergency — Ambulance / police dispatched with home address.'
        );
      }, 4500);
      return () => window.clearTimeout(t4);
    }
    return undefined;
  }, [screenMode, escalationStage, appendEvent]);

  // Smooth 3S2P Li-Ion UPS discharge / recharge simulation
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTelemetry((prev) => {
        if (!prev.acMainsConnected) {
          if (prev.batteryPercent <= 12) return prev;
          return { ...prev, batteryPercent: prev.batteryPercent - 1 };
        }
        if (prev.batteryPercent < 98) {
          return { ...prev, batteryPercent: prev.batteryPercent + 1 };
        }
        return prev;
      });
    }, 2400);
    return () => window.clearInterval(interval);
  }, []);

  const updateElderProfile = useCallback((patch: Partial<ElderProfile>) => {
    setElderProfile((prev) => ({
      ...prev,
      ...patch,
      baseline: patch.baseline ? { ...prev.baseline, ...patch.baseline } : prev.baseline,
    }));
  }, []);

  const setLanguage = useCallback(
    (lang: PromptLanguage) => {
      setElderProfile((prev) => ({ ...prev, language: lang }));
      const label = lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Bengali';
      appendEvent('normal', `Device voice & UI language switched to ${label}.`);
      audioEngine.unlock();
      audioEngine.playConfirmChime();
    },
    [appendEvent]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, []);

  const setScreenModeManual = useCallback(
    (mode: KioskScreenMode) => {
      audioEngine.unlock();
      if (mode === 'EMERGENCY') {
        triggerEmergencyState(
          'Manual Emergency HUD Preview',
          'Emergency HUD opened manually by presenter.'
        );
        return;
      }
      if (mode === 'HAZARD') {
        setScreenMode('HAZARD');
        setEscalationStage(0);
        appendEvent('warning', 'Gas hazard view opened manually.');
        return;
      }
      setEscalationStage(0);
      setEmergencyReason(null);
      setScreenMode(mode);
      if (mode === 'VITALS') {
        speak('checkin_started');
      } else {
        speak('standby_mode');
      }
    },
    [appendEvent, speak, triggerEmergencyState]
  );

  const applyTelemetryUpdate = useCallback(
    (nextTelemetry: SandboxTelemetry) => {
      setTelemetry(nextTelemetry);
      const breach = evaluateVitalsBreach(nextTelemetry, elderProfile.baseline);
      if (breach) {
        if (breach.code !== prevBreachCodeRef.current) {
          prevBreachCodeRef.current = breach.code;
          triggerEmergencyState(breach.reason, `Threshold breach — ${breach.reason}`);
        } else if (screenMode === 'EMERGENCY') {
          setEmergencyReason(breach.reason);
        }
      } else {
        prevBreachCodeRef.current = null;
      }
    },
    [elderProfile.baseline, screenMode, triggerEmergencyState]
  );

  const updateHeartRate = useCallback(
    (bpm: number) => {
      const clamped = Math.max(40, Math.min(160, Math.round(bpm)));
      applyTelemetryUpdate({ ...telemetry, heartRate: clamped });
    },
    [telemetry, applyTelemetryUpdate]
  );

  const updateSpo2 = useCallback(
    (pct: number) => {
      const clamped = Math.max(80, Math.min(100, Math.round(pct)));
      applyTelemetryUpdate({ ...telemetry, spo2: clamped });
    },
    [telemetry, applyTelemetryUpdate]
  );

  const updateBodyTempF = useCallback(
    (tempF: number) => {
      const clamped = Math.max(95, Math.min(104, Number(tempF.toFixed(1))));
      applyTelemetryUpdate({ ...telemetry, bodyTempF: clamped });
    },
    [telemetry, applyTelemetryUpdate]
  );

  const updateLpgPpm = useCallback(
    (ppm: number) => {
      const clamped = Math.max(0, Math.min(1000, Math.round(ppm)));
      const wasHazard = telemetry.lpgPpm > 400;
      const isHazard = clamped > 400;
      const airQuality: AirQualityLevel = isHazard
        ? 'HAZARDOUS'
        : clamped > 180
          ? 'MODERATE'
          : 'GOOD';

      setTelemetry((prev) => ({
        ...prev,
        lpgPpm: clamped,
        exhaustFanRelay: isHazard,
        airQuality,
      }));

      if (!wasHazard && isHazard) {
        if (screenMode !== 'EMERGENCY') {
          setScreenMode('HAZARD');
        }
        appendEvent(
          'relay',
          `MQ-2 reached ${clamped} ppm (>400 ppm) — Relay CH1 Exhaust Fan AUTO-ON.`
        );
        speak('gas_hazard');
      } else if (wasHazard && !isHazard) {
        appendEvent(
          'relay',
          `MQ-2 cleared to ${clamped} ppm — Relay CH1 Exhaust Fan OFF.`
        );
      }
    },
    [telemetry.lpgPpm, screenMode, appendEvent, speak]
  );

  const updateRadarState = useCallback(
    (state: RadarPresenceState) => {
      setTelemetry((prev) => ({ ...prev, radarState: state }));
      if (state === 'BED_EMPTY_NIGHT') {
        triggerEmergencyState(
          'HLK-LD2410B Night Bed Absence (>15m)',
          'LD2410B Radar: Bed empty >15 min at night — intervention triggered.'
        );
      } else {
        appendEvent('normal', `HLK-LD2410B state changed to ${state}.`);
      }
    },
    [appendEvent, triggerEmergencyState]
  );

  const toggleAcMains = useCallback(() => {
    audioEngine.unlock();
    const nextConnected = !telemetry.acMainsConnected;
    setTelemetry((prev) => ({ ...prev, acMainsConnected: nextConnected }));
    if (!nextConnected) {
      appendEvent(
        'power',
        `Wall AC power disconnected — seamless failover to 3S2P UPS (${telemetry.batteryPercent}%).`
      );
      audioEngine.playWarningPing();
      speak('power_cut');
    } else {
      appendEvent('power', 'Wall AC mains restored — BMS charging 3S2P pack.');
      audioEngine.playConfirmChime();
      speak('power_restored');
    }
  }, [telemetry.acMainsConnected, telemetry.batteryPercent, appendEvent, speak]);

  const startVitalsCheckIn = useCallback(() => {
    audioEngine.unlock();
    setScreenMode('VITALS');
    setEscalationStage(0);
    setEmergencyReason(null);
    audioEngine.playConfirmChime();
    appendEvent('normal', 'Daily vitals check-in started on 7-inch kiosk.');
    speak('checkin_started');
  }, [appendEvent, speak]);

  const logVitalsOkay = useCallback(() => {
    audioEngine.unlock();
    const loggedAt = formatTimeNow();
    setLastVitalsLoggedAt(loggedAt);
    audioEngine.playConfirmChime();
    appendEvent(
      'normal',
      `Vitals logged at ${loggedAt} — HR ${telemetry.heartRate} BPM, SpO₂ ${telemetry.spo2}%, Temp ${telemetry.bodyTempF.toFixed(1)}°F.`
    );
    speak('vitals_logged');
  }, [telemetry.heartRate, telemetry.spo2, telemetry.bodyTempF, appendEvent, speak]);

  const cancelEmergencyOkay = useCallback(() => {
    audioEngine.unlock();
    audioEngine.stopSiren();
    setEscalationStage(0);
    setEmergencyReason(null);
    setCountdownSec(10);
    setScreenMode(telemetry.lpgPpm > 400 ? 'HAZARD' : 'STANDBY');
    audioEngine.playConfirmChime();
    appendEvent(
      'warning',
      'Emergency cancelled via "I\'M OKAY" tap — logged as false alarm.'
    );
    speak('im_okay');
  }, [telemetry.lpgPpm, appendEvent, speak]);

  const sendAlertNow = useCallback(() => {
    audioEngine.unlock();
    setCountdownSec(0);
    setEscalationStage(2);
    appendEvent(
      'emergency',
      'Manual "SEND ALERT NOW" pressed — Stage 2 auto call + SMS + snapshot initiated.'
    );
    speak('alert_sent');
  }, [appendEvent, speak]);

  const acknowledgeHazard = useCallback(() => {
    audioEngine.unlock();
    audioEngine.stopSiren();
    setTelemetry((prev) => ({
      ...prev,
      lpgPpm: 80,
      exhaustFanRelay: false,
      airQuality: 'GOOD',
    }));
    setScreenMode('STANDBY');
    audioEngine.playConfirmChime();
    appendEvent(
      'relay',
      'Gas hazard acknowledged — ventilation verified and Relay CH1 reset.'
    );
    speak('gas_acknowledged');
  }, [appendEvent, speak]);

  const triggerFallScenario = useCallback(() => {
    audioEngine.unlock();
    setTelemetry((prev) => ({ ...prev, radarState: 'PRESENT_STILL' }));
    triggerEmergencyState(
      'Fall Detected: OV5647 AI Pose + KY-037 Acoustic Thud Spike',
      'Scenario: Fall detected (AI pose + KY-037 thud spike) — 10s countdown started.'
    );
  }, [triggerEmergencyState]);

  const triggerBedAbsenceScenario = useCallback(() => {
    audioEngine.unlock();
    setTelemetry((prev) => ({ ...prev, radarState: 'BED_EMPTY_NIGHT' }));
    triggerEmergencyState(
      'Night Bed Absence >15m (HLK-LD2410B Radar)',
      'Scenario: Night bed absence >15 minutes detected by 24GHz mmWave radar.'
    );
  }, [triggerEmergencyState]);

  const triggerGasLeakScenario = useCallback(() => {
    audioEngine.unlock();
    setTelemetry((prev) => ({
      ...prev,
      lpgPpm: 650,
      exhaustFanRelay: true,
      airQuality: 'HAZARDOUS',
    }));
    setEscalationStage(0);
    setEmergencyReason(null);
    setScreenMode('HAZARD');
    appendEvent(
      'relay',
      'Scenario: MQ-2 Gas Leak (650 ppm) — Relay CH1 Exhaust Fan AUTO-ON.'
    );
    speak('gas_hazard');
  }, [appendEvent, speak]);

  const resetHealthyBaseline = useCallback(() => {
    audioEngine.unlock();
    audioEngine.stopSiren();
    prevBreachCodeRef.current = null;
    setTelemetry(HEALTHY_TELEMETRY);
    setEscalationStage(0);
    setCountdownSec(10);
    setEmergencyReason(null);
    setScreenMode('STANDBY');
    audioEngine.playConfirmChime();
    appendEvent(
      'normal',
      'Reset all sensors to healthy baseline (72 BPM, 98% SpO₂, 98.6°F, 45 ppm).'
    );
    speak('reset_baseline');
  }, [appendEvent, speak]);

  const value = useMemo<SandboxContextValue>(
    () => ({
      elderProfile,
      updateElderProfile,
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
      eventLog,
      updateHeartRate,
      updateSpo2,
      updateBodyTempF,
      updateLpgPpm,
      updateRadarState,
      toggleAcMains,
      startVitalsCheckIn,
      logVitalsOkay,
      cancelEmergencyOkay,
      sendAlertNow,
      acknowledgeHazard,
      triggerFallScenario,
      triggerBedAbsenceScenario,
      triggerGasLeakScenario,
      resetHealthyBaseline,
    }),
    [
      elderProfile,
      updateElderProfile,
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
      eventLog,
      updateHeartRate,
      updateSpo2,
      updateBodyTempF,
      updateLpgPpm,
      updateRadarState,
      toggleAcMains,
      startVitalsCheckIn,
      logVitalsOkay,
      cancelEmergencyOkay,
      sendAlertNow,
      acknowledgeHazard,
      triggerFallScenario,
      triggerBedAbsenceScenario,
      triggerGasLeakScenario,
      resetHealthyBaseline,
    ]
  );

  return (
    <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>
  );
}

export function useSandbox(): SandboxContextValue {
  const ctx = useContext(SandboxContext);
  if (!ctx) {
    throw new Error('useSandbox must be used inside a SandboxProvider');
  }
  return ctx;
}
