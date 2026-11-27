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
import type { CareAlarmItem, CarePlanResponse } from '../config/api';
import {
  computeAccessibilityTier,
  type AccessibilityTierSpec,
} from '../utils/accessibilityTier';
import {
  audioEngine,
  buildSampleGreeting,
  type PromptKey,
  type PromptLanguage,
} from '../utils/audioEngine';

export type AirQualityLevel = 'GOOD' | 'MODERATE' | 'HAZARDOUS';
export type RadarPresenceState = 'PRESENT_STILL' | 'MOVING' | 'BED_EMPTY_NIGHT';
export type KioskScreenMode =
  | 'STANDBY'
  | 'VITALS'
  | 'CARE_PLAN'
  | 'EMERGENCY'
  | 'HAZARD'
  | 'SETUP';
export type KioskTheme = 'dark' | 'light';
export type EscalationStage = 0 | 1 | 2 | 3 | 4;
export type ProfileId = 'rohan' | 'subhashree' | 'guest';
export type RegisteredProfileId = Exclude<ProfileId, 'guest'>;

export interface ElderBaseline {
  hrMin: number;
  hrMax: number;
  spo2Min: number;
  tempMax: number;
}

export interface ElderProfile {
  id: ProfileId;
  name: string;
  age: number;
  language: PromptLanguage;
  avatarDataUrl?: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  wakeTime: string;
  sleepTime: string;
  hydrationGoalMl: number;
  exercisePlan: string;
  carePlan?: CarePlanResponse | null;
  baseline: ElderBaseline;
  emergencyContactName: string;
  emergencyContactPhone: string;
  telegramHandle: string;
  homeAddress: string;
  isGuest?: boolean;
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
  activeProfileId: ProfileId;
  profiles: Record<ProfileId, ElderProfile>;
  elderProfile: ElderProfile;
  accessibilityTier: AccessibilityTierSpec;
  selectProfile: (id: ProfileId) => void;
  updateElderProfile: (
    patch: Partial<ElderProfile>,
    targetId?: RegisteredProfileId
  ) => void;
  saveProfileRegistration: (
    targetId: RegisteredProfileId,
    profile: ElderProfile
  ) => void;
  applyCarePlanToProfile: (
    targetId: RegisteredProfileId,
    carePlan: CarePlanResponse
  ) => void;
  setLanguage: (lang: PromptLanguage) => void;
  speakSampleVoice: (name: string, lang: PromptLanguage, age: number) => void;
  telemetry: SandboxTelemetry;
  screenMode: KioskScreenMode;
  setScreenModeManual: (mode: KioskScreenMode) => void;
  kioskTheme: KioskTheme;
  setKioskTheme: (theme: KioskTheme) => void;
  toggleKioskTheme: () => void;
  completeOnDeviceEnrollment: (payload: {
    name: string;
    age: number;
    heartRate: number;
    spo2: number;
    bodyTempF: number;
    language?: PromptLanguage;
    guardianName?: string;
    guardianPhone?: string;
    telegramHandle?: string;
    homeAddress?: string;
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    wakeTime?: string;
    sleepTime?: string;
    avatarDataUrl?: string | null;
    carePlan?: CarePlanResponse | null;
  }) => void;
  activeCareAlarm: CareAlarmItem | null;
  triggerCareAlarm: (alarm?: CareAlarmItem) => void;
  dismissCareAlarm: () => void;
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
  applyFlowScenario: (
    scenario:
      | 'night_radar'
      | 'vitals_checkin'
      | 'lan_stream'
      | 'fall_escalation'
      | 'gas_hazard'
      | 'power_cut'
  ) => void;
}

const ROHAN_DEFAULT_CARE_PLAN: CarePlanResponse = {
  mode: 'local-fallback',
  model: 'meta/llama-3.1-8b-instruct',
  latency_ms: 2,
  profile_summary:
    'Rohan Sen (Age 50) configured for Standard Multi-Metric Cockpit (1.0x voice) with 24GHz mmWave night watch armed 23:00-06:30.',
  ui_mode: 'STANDARD_50',
  hydration_goal_ml: 2500,
  sleep_watch_window: {
    start: '23:00',
    end: '06:30',
    absence_timeout_min: 15,
  },
  daily_alarms: [
    {
      time: '06:45',
      category: 'VITALS',
      title: 'Morning Baseline Vitals Check-In',
      spoken_prompt:
        'Good morning Rohan. Place your finger on the pulse pad for your quick baseline check.',
    },
    {
      time: '07:00',
      category: 'EXERCISE',
      title: '30-min brisk walk + stretching (07:00 AM)',
      spoken_prompt:
        'Rohan, your 30-minute morning brisk walk and stretching block starts now.',
    },
    {
      time: '08:30',
      category: 'MEDICATION',
      title: 'Telmisartan 20mg + 300 ml Water',
      spoken_prompt:
        'Medication reminder: Take Telmisartan 20mg with a full glass of water.',
    },
    {
      time: '11:00',
      category: 'HYDRATION',
      title: 'Mid-Morning Hydration Reminder (300 ml)',
      spoken_prompt: 'Hydration alert: Drink 300 ml of water to stay on track for 2500 ml today.',
    },
    {
      time: '16:30',
      category: 'HYDRATION',
      title: 'Afternoon Hydration & Posture Stretch',
      spoken_prompt: 'Time for a 5-minute desk stretch and a glass of water.',
    },
  ],
  nutrition_rules: {
    recommended: [
      '2500 ml hydration evenly spaced across 06:30–23:00',
      'Low-sodium DASH meals rich in potassium greens, oats, and berries',
      'Lean legumes, grilled poultry, and olive oil',
    ],
    strictly_avoid: [
      'STRICTLY AVOID Shellfish (severe allergy)',
      'STRICTLY AVOID Penicillin-class antibiotics (drug allergy)',
      'High-sodium pickles, cured meats, and processed salty snacks',
    ],
  },
};

const SUBHASHREE_DEFAULT_CARE_PLAN: CarePlanResponse = {
  mode: 'local-fallback',
  model: 'meta/llama-3.1-8b-instruct',
  latency_ms: 2,
  profile_summary:
    'Subhashree Devi (Age 78) configured for High-Assist Ergonomic HUD (0.78x voice) with 24GHz mmWave night watch armed 21:30-05:45.',
  ui_mode: 'HIGH_ASSIST_78',
  hydration_goal_ml: 1800,
  sleep_watch_window: {
    start: '21:30',
    end: '05:45',
    absence_timeout_min: 15,
  },
  daily_alarms: [
    {
      time: '06:00',
      category: 'VITALS',
      title: 'Morning Pulse, SpO₂ & Temp Check-In',
      spoken_prompt:
        'সুপ্রভাত সুভশ্রী দেবী। অনুগ্রহ করে সকালের স্বাস্থ্য পরীক্ষা সম্পন্ন করুন।',
    },
    {
      time: '07:15',
      category: 'EXERCISE',
      title: '15-min seated chair yoga & gentle joint mobility',
      spoken_prompt:
        'সকাল ৭টা ১৫ মিনিট। চেয়ারে বসে হালকা যোগব্যায়াম ও হাঁটুর ব্যায়ামের সময় হয়েছে।',
    },
    {
      time: '08:30',
      category: 'MEDICATION',
      title: 'Drink 1 Glass Water & Take Metformin 500mg',
      spoken_prompt:
        'সকাল ৮টা ৩০ মিনিট। এক গ্লাস জল পান করুন এবং মেটফরমিন ৫০০ মিলিগ্রাম ওষুধ খান।',
    },
    {
      time: '13:30',
      category: 'MEAL',
      title: 'Lunch + Vitamin D3 Supplement',
      spoken_prompt:
        'দুপুরের খাবার এবং ভিটামিন ডি-৩ ট্যাবলেট খাওয়ার সময় হয়েছে।',
    },
    {
      time: '20:30',
      category: 'MEDICATION',
      title: 'Night Dose: Metformin 500mg + Warm Water',
      spoken_prompt:
        'রাত ৮টা ৩০ মিনিট। রাতের মেটফরমিন ওষুধ এবং হালকা গরম জল পান করুন।',
    },
  ],
  nutrition_rules: {
    recommended: [
      '1800 ml gentle hydration spaced cleanly before 20:00',
      'Low-GI millets, steamed vegetables, moong dal, and warm turmeric milk',
      'Calcium and Vitamin D3 support for osteoarthritis joint health',
    ],
    strictly_avoid: [
      'STRICTLY AVOID Peanuts (anaphylactic risk)',
      'STRICTLY AVOID Sulfa Drugs (drug allergy alert pinned for paramedics)',
      'Dust-mite exposure in damp bedding; refined sugar or sweets',
    ],
  },
};

const INITIAL_PROFILES: Record<ProfileId, ElderProfile> = {
  rohan: {
    id: 'rohan',
    name: 'Rohan Sen',
    age: 50,
    language: 'en',
    avatarDataUrl: null,
    allergies: ['Shellfish', 'Penicillin'],
    conditions: ['Borderline Hypertension'],
    medications: ['Telmisartan 20mg (08:30 AM)'],
    wakeTime: '06:30',
    sleepTime: '23:00',
    hydrationGoalMl: 2500,
    exercisePlan: '30-min brisk walk + stretching (07:00 AM)',
    carePlan: ROHAN_DEFAULT_CARE_PLAN,
    baseline: {
      hrMin: 58,
      hrMax: 115,
      spo2Min: 95,
      tempMax: 99.8,
    },
    emergencyContactName: 'Ananya Sen (Spouse)',
    emergencyContactPhone: '+91 98301 55120',
    telegramHandle: '@ananya_home_alert',
    homeAddress: '14/A Ballygunge Gardens, Kolkata 700019',
    isGuest: false,
  },
  subhashree: {
    id: 'subhashree',
    name: 'Subhashree Devi',
    age: 78,
    language: 'bn',
    avatarDataUrl: null,
    allergies: ['Peanuts', 'Dust Mites', 'Sulfa Drugs'],
    conditions: ['Type 2 Diabetes', 'Osteoarthritis', 'Mild Cataract'],
    medications: [
      'Metformin 500mg (08:30 AM & 08:30 PM)',
      'Vitamin D3 (01:30 PM)',
    ],
    wakeTime: '05:45',
    sleepTime: '21:30',
    hydrationGoalMl: 1800,
    exercisePlan: '15-min seated chair yoga & gentle joint mobility (07:15 AM)',
    carePlan: SUBHASHREE_DEFAULT_CARE_PLAN,
    baseline: {
      hrMin: 52,
      hrMax: 98,
      spo2Min: 93,
      tempMax: 99.5,
    },
    emergencyContactName: 'Sourav (Son)',
    emergencyContactPhone: '+91 98300 41280',
    telegramHandle: '@sourav_family_alert',
    homeAddress: '42/B Shyambazar Street, Kolkata 700004',
    isGuest: false,
  },
  guest: {
    id: 'guest',
    name: 'Unregistered Visitor',
    age: 60,
    language: 'en',
    avatarDataUrl: null,
    allergies: [],
    conditions: [],
    medications: [],
    wakeTime: '06:30',
    sleepTime: '22:30',
    hydrationGoalMl: 2000,
    exercisePlan: 'Locked',
    carePlan: null,
    baseline: {
      hrMin: 55,
      hrMax: 105,
      spo2Min: 93,
      tempMax: 99.8,
    },
    emergencyContactName: 'Locked (Private)',
    emergencyContactPhone: 'Locked',
    telegramHandle: 'Locked',
    homeAddress: 'Locked',
    isGuest: true,
  },
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
  const [profiles, setProfiles] =
    useState<Record<ProfileId, ElderProfile>>(INITIAL_PROFILES);
  const [activeProfileId, setActiveProfileId] =
    useState<ProfileId>('subhashree');
  const [telemetry, setTelemetry] = useState<SandboxTelemetry>(HEALTHY_TELEMETRY);
  const [screenMode, setScreenMode] = useState<KioskScreenMode>('STANDBY');
  const [kioskTheme, setKioskTheme] = useState<KioskTheme>('light');
  const [activeCareAlarm, setActiveCareAlarm] =
    useState<CareAlarmItem | null>(null);
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
      'Profile recognized: Subhashree Devi (Age 78 · High-Assist Senior HUD 1.35× · Bengali voice).'
    ),
  ]);

  const elderProfile = profiles[activeProfileId];
  const accessibilityTier = useMemo(
    () => computeAccessibilityTier(elderProfile.age),
    [elderProfile.age]
  );

  // Pre-warm HI/BN neural audio phrases silently in the background when a regional profile is active
  useEffect(() => {
    audioEngine.preloadLanguage(elderProfile.language, accessibilityTier.speechRate);
  }, [elderProfile.language, accessibilityTier.speechRate]);

  const appendEvent = useCallback(
    (category: SandboxEvent['category'], message: string) => {
      setEventLog((prev) => [makeEvent(category, message), ...prev].slice(0, 40));
    },
    []
  );

  const speak = useCallback(
    (
      key: PromptKey,
      langOverride?: PromptLanguage,
      rateOverride?: number,
      customText?: string
    ) => {
      audioEngine.unlock();
      audioEngine.speakPrompt(
        key,
        langOverride ?? elderProfile.language,
        rateOverride ?? accessibilityTier.speechRate,
        customText
      );
    },
    [elderProfile.language, accessibilityTier.speechRate]
  );

  const speakSampleVoice = useCallback(
    (name: string, lang: PromptLanguage, age: number) => {
      audioEngine.unlock();
      const tier = computeAccessibilityTier(age);
      const greeting = buildSampleGreeting(name, lang);
      audioEngine.speakPrompt('profile_saved', lang, tier.speechRate, greeting);
    },
    []
  );

  const prevBreachCodeRef = useRef<BreachCode | null>(null);

  const triggerEmergencyState = useCallback(
    (reason: string, logText?: string) => {
      setActiveCareAlarm(null);
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

  // Automatic Stage 3 -> Stage 4 escalation progression after Stage 2
  useEffect(() => {
    if (screenMode !== 'EMERGENCY') return;
    if (escalationStage === 2) {
      const t = window.setTimeout(() => {
        setEscalationStage(3);
        appendEvent(
          'emergency',
          'Stage 3 (t+20s): Live 2-way audio/video check-in link opened on child phone.'
        );
      }, 5000);
      return () => window.clearTimeout(t);
    }
    if (escalationStage === 3) {
      const t = window.setTimeout(() => {
        setEscalationStage(4);
        appendEvent(
          'emergency',
          `Stage 4 (t+30s): Confirmed Emergency — Ambulance/Police notified with address "${elderProfile.homeAddress}".`
        );
      }, 5000);
      return () => window.clearTimeout(t);
    }
  }, [screenMode, escalationStage, appendEvent, elderProfile.homeAddress]);

  // Realistic 3S2P Li-ion battery drain when AC mains is cut
  useEffect(() => {
    if (telemetry.acMainsConnected) return;
    const interval = window.setInterval(() => {
      setTelemetry((prev) => {
        if (!prev.acMainsConnected && prev.batteryPercent > 12) {
          return { ...prev, batteryPercent: prev.batteryPercent - 1 };
        }
        return prev;
      });
    }, 2400);
    return () => window.clearInterval(interval);
  }, [telemetry.acMainsConnected]);

  // Gentle recovery charging when AC mains is connected
  useEffect(() => {
    if (!telemetry.acMainsConnected || telemetry.batteryPercent >= 96) return;
    const interval = window.setInterval(() => {
      setTelemetry((prev) => {
        if (prev.acMainsConnected && prev.batteryPercent < 96) {
          return { ...prev, batteryPercent: prev.batteryPercent + 1 };
        }
        return prev;
      });
    }, 2400);
    return () => window.clearInterval(interval);
  }, [telemetry.acMainsConnected, telemetry.batteryPercent]);

  const selectProfile = useCallback(
    (id: ProfileId) => {
      audioEngine.unlock();
      audioEngine.stopSiren();
      prevBreachCodeRef.current = null;
      setActiveProfileId(id);
      setActiveCareAlarm(null);
      setEscalationStage(0);
      setCountdownSec(10);
      setEmergencyReason(null);

      if (id === 'guest') {
        setScreenMode((prev) => (prev === 'HAZARD' ? 'HAZARD' : 'STANDBY'));
        audioEngine.playWarningPing();
        appendEvent(
          'warning',
          'Unregistered visitor detected — Neutral Guest Privacy Screen active (vitals, allergies & care schedule locked).'
        );
        return;
      }

      const target = profiles[id];
      const tier = computeAccessibilityTier(target.age);
      setScreenMode((prev) => (prev === 'HAZARD' ? 'HAZARD' : 'STANDBY'));
      audioEngine.preloadLanguage(target.language, tier.speechRate);
      audioEngine.playConfirmChime();
      appendEvent(
        'normal',
        `Recognized ${target.name} (Age ${target.age} · ${tier.shortLabel} · ${target.language.toUpperCase()}).`
      );
    },
    [profiles, appendEvent]
  );

  const updateElderProfile = useCallback(
    (patch: Partial<ElderProfile>, targetId?: RegisteredProfileId) => {
      const resolvedId: RegisteredProfileId =
        targetId ?? (activeProfileId === 'guest' ? 'subhashree' : activeProfileId);
      setProfiles((prev) => {
        const current = prev[resolvedId];
        return {
          ...prev,
          [resolvedId]: {
            ...current,
            ...patch,
            id: resolvedId,
            isGuest: false,
            baseline: patch.baseline
              ? { ...current.baseline, ...patch.baseline }
              : current.baseline,
          },
        };
      });
    },
    [activeProfileId]
  );

  const saveProfileRegistration = useCallback(
    (targetId: RegisteredProfileId, updated: ElderProfile) => {
      audioEngine.unlock();
      prevBreachCodeRef.current = null;
      const tier = computeAccessibilityTier(updated.age);
      const cleanProfile: ElderProfile = {
        ...updated,
        id: targetId,
        isGuest: false,
      };
      setProfiles((prev) => ({
        ...prev,
        [targetId]: cleanProfile,
      }));
      setActiveProfileId(targetId);
      audioEngine.playConfirmChime();
      appendEvent(
        'normal',
        `Saved & calibrated ${cleanProfile.name} (Age ${cleanProfile.age} · ${tier.shortLabel} · Sleep Watch ${cleanProfile.sleepTime}–${cleanProfile.wakeTime}).`
      );
      audioEngine.speakPrompt(
        'profile_saved',
        cleanProfile.language,
        tier.speechRate
      );
    },
    [appendEvent]
  );

  const applyCarePlanToProfile = useCallback(
    (targetId: RegisteredProfileId, carePlan: CarePlanResponse) => {
      audioEngine.unlock();
      const target = profiles[targetId];
      const tier = computeAccessibilityTier(target.age);
      setProfiles((prev) => ({
        ...prev,
        [targetId]: {
          ...prev[targetId],
          hydrationGoalMl: carePlan.hydration_goal_ml,
          carePlan,
        },
      }));
      setActiveProfileId(targetId);
      setScreenMode('CARE_PLAN');
      audioEngine.playConfirmChime();
      appendEvent(
        'normal',
        `Pushed AI Care & Alarm JSON (${carePlan.daily_alarms.length} alarms, ${carePlan.mode}) to 7-inch Kiosk for ${target.name}.`
      );
      if (carePlan.daily_alarms[0]) {
        audioEngine.speakPrompt(
          'profile_saved',
          target.language,
          tier.speechRate,
          carePlan.daily_alarms[0].spoken_prompt
        );
      }
    },
    [profiles, appendEvent]
  );

  const setLanguage = useCallback(
    (lang: PromptLanguage) => {
      const tier = computeAccessibilityTier(elderProfile.age);

      if (activeProfileId === 'guest') {
        setProfiles((prev) => ({
          ...prev,
          guest: { ...prev.guest, language: lang },
        }));
      } else {
        setProfiles((prev) => ({
          ...prev,
          [activeProfileId]: { ...prev[activeProfileId], language: lang },
        }));
      }
      const label = lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Bengali';
      appendEvent('normal', `Device voice & UI language switched to ${label}.`);
      audioEngine.unlock();
      audioEngine.preloadLanguage(lang, tier.speechRate);
      audioEngine.playConfirmChime();
      audioEngine.speakPrompt('standby_mode', lang, tier.speechRate);
    },
    [activeProfileId, elderProfile.age, appendEvent]
  );

  const toggleKioskTheme = useCallback(() => {
    setKioskTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const triggerCareAlarm = useCallback(
    (alarm?: CareAlarmItem) => {
      if (elderProfile.isGuest) return;
      const targetAlarm =
        alarm ??
        elderProfile.carePlan?.daily_alarms[0] ?? {
          time: '08:30',
          category: 'MEDICATION',
          title: 'Daily Hydration & Medicine Reminder',
          spoken_prompt: `Reminder for ${elderProfile.name}: Drink a glass of water and review your morning care schedule.`,
        };
      audioEngine.unlock();
      audioEngine.playWarningPing();
      setActiveCareAlarm(targetAlarm);
      appendEvent(
        'warning',
        `Care Alarm (${targetAlarm.time} · ${targetAlarm.category}): ${targetAlarm.title}`
      );
      audioEngine.speakPrompt(
        'standby_mode',
        elderProfile.language,
        accessibilityTier.speechRate,
        targetAlarm.spoken_prompt
      );
    },
    [elderProfile, accessibilityTier.speechRate, appendEvent]
  );

  const dismissCareAlarm = useCallback(() => {
    if (activeCareAlarm) {
      appendEvent(
        'normal',
        `Acknowledged Care Alarm: ${activeCareAlarm.title}.`
      );
    }
    setActiveCareAlarm(null);
    audioEngine.playConfirmChime();
  }, [activeCareAlarm, appendEvent]);

  const completeOnDeviceEnrollment = useCallback(
    ({
      name,
      age,
      heartRate,
      spo2,
      bodyTempF,
      language,
      guardianName,
      guardianPhone,
      telegramHandle,
      homeAddress,
      allergies,
      conditions,
      medications,
      wakeTime,
      sleepTime,
      avatarDataUrl,
      carePlan,
    }: {
      name: string;
      age: number;
      heartRate: number;
      spo2: number;
      bodyTempF: number;
      language?: PromptLanguage;
      guardianName?: string;
      guardianPhone?: string;
      telegramHandle?: string;
      homeAddress?: string;
      allergies?: string[];
      conditions?: string[];
      medications?: string[];
      wakeTime?: string;
      sleepTime?: string;
      avatarDataUrl?: string | null;
      carePlan?: CarePlanResponse | null;
    }) => {
      audioEngine.unlock();
      const targetId: RegisteredProfileId =
        activeProfileId === 'guest' ? 'subhashree' : activeProfileId;
      const baseProfile = profiles[targetId];
      const cleanName = name.trim() || baseProfile.name;
      const safeAge = Math.max(40, Math.min(105, Math.round(age)));
      const tier = computeAccessibilityTier(safeAge);

      const calibrated: ElderProfile = {
        ...baseProfile,
        id: targetId,
        name: cleanName,
        age: safeAge,
        language: language ?? baseProfile.language,
        emergencyContactName:
          guardianName?.trim() || baseProfile.emergencyContactName,
        emergencyContactPhone:
          guardianPhone?.trim() || baseProfile.emergencyContactPhone,
        telegramHandle:
          telegramHandle?.trim() || baseProfile.telegramHandle,
        homeAddress: homeAddress?.trim() || baseProfile.homeAddress,
        allergies: allergies ?? baseProfile.allergies,
        conditions: conditions ?? baseProfile.conditions,
        medications: medications ?? baseProfile.medications,
        wakeTime: wakeTime ?? baseProfile.wakeTime,
        sleepTime: sleepTime ?? baseProfile.sleepTime,
        avatarDataUrl:
          avatarDataUrl !== undefined ? avatarDataUrl : baseProfile.avatarDataUrl,
        hydrationGoalMl:
          carePlan?.hydration_goal_ml ?? (safeAge >= 65 ? 1800 : 2500),
        exercisePlan:
          carePlan?.daily_alarms.find((a) => a.category === 'EXERCISE')?.title ??
          baseProfile.exercisePlan,
        carePlan: carePlan !== undefined ? carePlan : baseProfile.carePlan,
        baseline: {
          hrMin: Math.max(42, Math.round(heartRate - 16)),
          hrMax: Math.min(130, Math.round(heartRate + 28)),
          spo2Min: Math.max(88, Math.min(95, Math.round(spo2 - 4))),
          tempMax: Number(Math.max(99.2, bodyTempF + 1.2).toFixed(1)),
        },
        isGuest: false,
      };

      setProfiles((prev) => ({
        ...prev,
        [targetId]: calibrated,
      }));
      setActiveProfileId(targetId);
      setTelemetry((prev) => ({
        ...prev,
        heartRate: Math.round(heartRate),
        spo2: Math.round(spo2),
        bodyTempF: Number(bodyTempF.toFixed(1)),
      }));
      setEscalationStage(0);
      setEmergencyReason(null);
      setScreenMode('STANDBY');
      audioEngine.playConfirmChime();
      appendEvent(
        'normal',
        `On-device enrollment completed for ${calibrated.name} (Age ${calibrated.age}) — Resting vitals locked at ${Math.round(heartRate)} BPM, ${Math.round(spo2)}% SpO₂, ${bodyTempF.toFixed(1)}°F.`
      );
      audioEngine.speakPrompt('profile_saved', calibrated.language, tier.speechRate);
    },
    [activeProfileId, profiles, appendEvent]
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
      if (elderProfile.isGuest && (mode === 'VITALS' || mode === 'CARE_PLAN')) {
        audioEngine.playWarningPing();
        appendEvent(
          'warning',
          'Guest Privacy Lock: Personal vitals and care schedules are hidden for unregistered visitors.'
        );
        return;
      }
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
      if (mode === 'SETUP') {
        appendEvent('normal', 'Opened on-device first sign-up & sensor calibration wizard.');
        return;
      }
      if (mode === 'CARE_PLAN') {
        appendEvent('normal', `Viewing AI daily alarms & allergy guardrails for ${elderProfile.name}.`);
        return;
      }
      if (mode === 'VITALS') {
        speak('checkin_started');
      } else {
        speak('standby_mode');
      }
    },
    [elderProfile.isGuest, elderProfile.name, appendEvent, speak, triggerEmergencyState]
  );

  const applyTelemetryUpdate = useCallback(
    (nextTelemetry: SandboxTelemetry) => {
      setTelemetry(nextTelemetry);
      if (elderProfile.isGuest) {
        return;
      }
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
    [elderProfile.isGuest, elderProfile.baseline, screenMode, triggerEmergencyState]
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
      if (state === 'BED_EMPTY_NIGHT' && !elderProfile.isGuest) {
        triggerEmergencyState(
          'HLK-LD2410B Night Bed Absence (>15m)',
          `LD2410B Radar: Bed empty >15 min during Sleep Watch (${elderProfile.sleepTime}–${elderProfile.wakeTime}).`
        );
      } else {
        appendEvent('normal', `HLK-LD2410B state changed to ${state}.`);
      }
    },
    [elderProfile.isGuest, elderProfile.sleepTime, elderProfile.wakeTime, appendEvent, triggerEmergencyState]
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
    if (elderProfile.isGuest) return;
    audioEngine.unlock();
    setActiveCareAlarm(null);
    setScreenMode('VITALS');
    setEscalationStage(0);
    setEmergencyReason(null);
    audioEngine.playConfirmChime();
    appendEvent(
      'normal',
      `Daily vitals check-in started for ${elderProfile.name}.`
    );
    speak('checkin_started');
  }, [elderProfile.isGuest, elderProfile.name, appendEvent, speak]);

  const logVitalsOkay = useCallback(() => {
    if (elderProfile.isGuest) return;
    audioEngine.unlock();
    const loggedAt = formatTimeNow();
    setLastVitalsLoggedAt(loggedAt);
    audioEngine.playConfirmChime();
    appendEvent(
      'normal',
      `Vitals logged (${elderProfile.name}) at ${loggedAt} — HR ${telemetry.heartRate} BPM, SpO₂ ${telemetry.spo2}%, Temp ${telemetry.bodyTempF.toFixed(1)}°F.`
    );
    speak('vitals_logged');
  }, [
    elderProfile.isGuest,
    elderProfile.name,
    telemetry.heartRate,
    telemetry.spo2,
    telemetry.bodyTempF,
    appendEvent,
    speak,
  ]);

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
    setKioskTheme('dark');
    setTelemetry((prev) => ({ ...prev, radarState: 'BED_EMPTY_NIGHT' }));
    triggerEmergencyState(
      `Night Bed Absence >15m (Sleep Watch ${elderProfile.sleepTime}–${elderProfile.wakeTime})`,
      `Scenario: Night bed absence >15 minutes detected during ${elderProfile.sleepTime}–${elderProfile.wakeTime} watch.`
    );
  }, [elderProfile.sleepTime, elderProfile.wakeTime, triggerEmergencyState]);

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
    setActiveCareAlarm(null);
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

  const applyFlowScenario = useCallback(
    (
      scenario:
        | 'night_radar'
        | 'vitals_checkin'
        | 'lan_stream'
        | 'fall_escalation'
        | 'gas_hazard'
        | 'power_cut'
    ) => {
      audioEngine.unlock();
      audioEngine.stopSiren();
      prevBreachCodeRef.current = null;
      setActiveCareAlarm(null);
      setEscalationStage(0);
      setCountdownSec(10);
      setEmergencyReason(null);

      if (scenario === 'night_radar') {
        setTelemetry(HEALTHY_TELEMETRY);
        setScreenMode('STANDBY');
        appendEvent(
          'normal',
          'Flow scenario: Idle / Night Radar Watch (healthy 45 ppm, AC mains OK).'
        );
        return;
      }

      if (scenario === 'lan_stream') {
        setTelemetry(HEALTHY_TELEMETRY);
        setScreenMode('STANDBY');
        appendEvent(
          'normal',
          'Flow scenario: Local Cat6 Gigabit LAN MJPEG preview active (30 FPS).'
        );
        return;
      }

      if (scenario === 'vitals_checkin') {
        setTelemetry(HEALTHY_TELEMETRY);
        setScreenMode('VITALS');
        appendEvent(
          'normal',
          `Flow scenario: Daily Vitals Check-In (${elderProfile.name}).`
        );
        speak('checkin_started');
        return;
      }

      if (scenario === 'power_cut') {
        setTelemetry({
          ...HEALTHY_TELEMETRY,
          acMainsConnected: false,
          batteryPercent: 95,
        });
        setScreenMode('STANDBY');
        audioEngine.playWarningPing();
        appendEvent(
          'power',
          'Flow scenario: Wall AC mains disconnected — 3S2P Li-Ion UPS failover active.'
        );
        speak('power_cut');
        return;
      }

      if (scenario === 'gas_hazard') {
        setTelemetry({
          ...HEALTHY_TELEMETRY,
          lpgPpm: 650,
          exhaustFanRelay: true,
          airQuality: 'HAZARDOUS',
        });
        setScreenMode('HAZARD');
        appendEvent(
          'relay',
          'Flow scenario: MQ-2 Gas Leak (650 ppm) — Relay CH1 Exhaust Fan AUTO-ON.'
        );
        speak('gas_hazard');
        return;
      }

      // fall_escalation
      setTelemetry(HEALTHY_TELEMETRY);
      triggerEmergencyState(
        'Fall Detected: OV5647 AI Pose + KY-037 Acoustic Thud Spike',
        'Flow scenario: Fall detected (AI pose + KY-037 thud spike) — 10s countdown started.'
      );
    },
    [elderProfile.name, appendEvent, speak, triggerEmergencyState]
  );

  const value = useMemo<SandboxContextValue>(
    () => ({
      activeProfileId,
      profiles,
      elderProfile,
      accessibilityTier,
      selectProfile,
      updateElderProfile,
      saveProfileRegistration,
      applyCarePlanToProfile,
      setLanguage,
      speakSampleVoice,
      telemetry,
      screenMode,
      setScreenModeManual,
      kioskTheme,
      setKioskTheme,
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
      applyFlowScenario,
    }),
    [
      activeProfileId,
      profiles,
      elderProfile,
      accessibilityTier,
      selectProfile,
      updateElderProfile,
      saveProfileRegistration,
      applyCarePlanToProfile,
      setLanguage,
      speakSampleVoice,
      telemetry,
      screenMode,
      setScreenModeManual,
      kioskTheme,
      setKioskTheme,
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
      applyFlowScenario,
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
