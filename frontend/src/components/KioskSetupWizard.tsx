import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Backspace,
  BellRinging,
  Camera,
  CaretDown,
  CheckCircle,
  Clock,
  Code,
  Drop,
  Heartbeat,
  LockKey,
  Moon,
  MoonStars,
  PhoneCall,
  Plus,
  ShieldCheck,
  Sun,
  Thermometer,
  Trash,
  UploadSimple,
  UserCheck,
  WarningOctagon,
  Waves,
  Wind,
} from '@phosphor-icons/react';
import {
  generateCarePlanWithAi,
  type CarePlanResponse,
} from '../config/api';
import type { KioskTheme } from '../context/SandboxContext';
import { computeAccessibilityTier } from '../utils/accessibilityTier';
import { audioEngine, type PromptLanguage } from '../utils/audioEngine';
import {
  ALLERGY_SUGGESTIONS,
  buildOfflineCarePlanFallback,
} from '../utils/carePlanFallback';
import { PpgWaveformCanvas } from './PpgWaveformCanvas';
import { buildSamplePortraitDataUrl } from './WebcamCaptureBox';

export interface OnDeviceEnrollmentPayload {
  name: string;
  age: number;
  heartRate: number;
  spo2: number;
  bodyTempF: number;
  language: PromptLanguage;
  guardianName: string;
  guardianPhone: string;
  telegramHandle: string;
  homeAddress: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  wakeTime: string;
  sleepTime: string;
  avatarDataUrl: string | null;
  carePlan: CarePlanResponse;
}

interface KioskSetupWizardProps {
  kioskTheme: KioskTheme;
  onToggleTheme: () => void;
  initialName: string;
  initialAge: number;
  initialLanguage: PromptLanguage;
  initialGuardianName: string;
  initialGuardianPhone: string;
  initialTelegramHandle: string;
  initialHomeAddress: string;
  initialAllergies: string[];
  initialConditions: string[];
  initialMedications: string[];
  initialWakeTime: string;
  initialSleepTime: string;
  initialAvatarDataUrl: string | null;
  initialHr: number;
  initialSpo2: number;
  initialTempF: number;
  onLanguageSelected: (lang: PromptLanguage) => void;
  onComplete: (payload: OnDeviceEnrollmentPayload) => void;
  onCancel: () => void;
}

type SetupScreenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type KeyboardTargetField =
  | 'name'
  | 'guardianName'
  | 'guardianPhone'
  | 'telegramHandle'
  | 'homeAddress'
  | 'customAllergy'
  | 'newMed';
type CalibrationStep = 'pulse_spo2' | 'temp' | 'radar';
type CapturePhase = 'waiting' | 'sampling' | 'captured';

const KEY_ROW_NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '@', '.'];
const KEY_ROW_TOP = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const KEY_ROW_MID = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '/'];
const KEY_ROW_BOT = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ','];

const KEYBOARD_FIELD_LABELS: Record<KeyboardTargetField, string> = {
  name: 'Full Name',
  guardianName: 'Guardian / Child Name',
  guardianPhone: 'Guardian Phone Number',
  telegramHandle: 'Telegram Alert Handle',
  homeAddress: 'Home Address / Pin',
  customAllergy: 'Custom Allergy',
  newMed: 'Daily Medication',
};

const QUICK_ALLERGIES = [...ALLERGY_SUGGESTIONS.slice(0, 5), 'None'];
const QUICK_CONDITIONS = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Osteoarthritis', 'None'];

function shiftTime24(hhmm: string, deltaMinutes: number): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const total =
    (((Number.isFinite(h) ? h : 6) * 60 + (Number.isFinite(m) ? m : 0) + deltaMinutes) %
      1440 +
      1440) %
    1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function format12Hour(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function KioskSetupWizard({
  kioskTheme,
  onToggleTheme,
  initialName,
  initialAge,
  initialLanguage,
  initialGuardianName,
  initialGuardianPhone,
  initialTelegramHandle,
  initialHomeAddress,
  initialAllergies,
  initialConditions,
  initialMedications,
  initialWakeTime,
  initialSleepTime,
  initialAvatarDataUrl,
  initialHr,
  initialSpo2,
  initialTempF,
  onLanguageSelected,
  onComplete,
  onCancel,
}: KioskSetupWizardProps) {
  const isDark = kioskTheme === 'dark';

  const [screen, setScreen] = useState<SetupScreenIndex>(0);
  const [language, setLanguage] = useState<PromptLanguage>(initialLanguage);

  // Screen 2: Name & Age
  const [nameValue, setNameValue] = useState<string>(initialName);
  const [ageValue, setAgeValue] = useState<number>(initialAge);

  // Screen 3: Guardian & Address
  const [guardianName, setGuardianName] = useState<string>(initialGuardianName);
  const [guardianPhone, setGuardianPhone] = useState<string>(initialGuardianPhone);
  const [telegramHandle, setTelegramHandle] = useState<string>(initialTelegramHandle);
  const [homeAddress, setHomeAddress] = useState<string>(initialHomeAddress);

  // Screen 4: Allergies, Conditions, Medications & Sleep/Wake
  const [allergies, setAllergies] = useState<string[]>(initialAllergies);
  const [customAllergyInput, setCustomAllergyInput] = useState<string>('');
  const [showCustomAllergyBox, setShowCustomAllergyBox] = useState<boolean>(false);
  const [conditions, setConditions] = useState<string[]>(initialConditions);
  const [medications, setMedications] = useState<string[]>(initialMedications);
  const [newMedInput, setNewMedInput] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>(initialWakeTime || '06:00');
  const [sleepTime, setSleepTime] = useState<string>(initialSleepTime || '21:30');

  // Screen 5: Face Recognition (OV5647 Webcam + Local Storage)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(initialAvatarDataUrl);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  // Screen 6: Sequential 1-by-1 Sensor Calibration (1/3 Pulse & SpO2 -> 2/3 Temp -> 3/3 Radar)
  const [calibStep, setCalibStep] = useState<CalibrationStep>('pulse_spo2');
  const [calibPhase, setCalibPhase] = useState<CapturePhase>('waiting');
  const [samplingPct, setSamplingPct] = useState<number>(0);
  const [draftHr, setDraftHr] = useState<string>(String(initialHr));
  const [draftSpo2, setDraftSpo2] = useState<string>(String(initialSpo2));
  const [draftTempF, setDraftTempF] = useState<string>(initialTempF.toFixed(1));
  const [draftBreathing, setDraftBreathing] = useState<string>('16');
  const [lockedHr, setLockedHr] = useState<number | null>(null);
  const [lockedSpo2, setLockedSpo2] = useState<number | null>(null);
  const [lockedTempF, setLockedTempF] = useState<number | null>(null);
  const [lockedBreathing, setLockedBreathing] = useState<number | null>(null);
  const [calibError, setCalibError] = useState<string | null>(null);
  const samplingTimerRef = useRef<number | null>(null);

  // Screen 7: AI Daily Care Plan & JSON Drawer
  const [generatedPlan, setGeneratedPlan] = useState<CarePlanResponse | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [showJsonDrawer, setShowJsonDrawer] = useState<boolean>(false);

  // Hidable / Collapsible Touch Keyboard
  const [activeKeyboardField, setActiveKeyboardField] =
    useState<KeyboardTargetField | null>(null);
  const [isShiftOn, setIsShiftOn] = useState<boolean>(false);

  const inputRefs = useRef<Partial<Record<KeyboardTargetField, HTMLInputElement | null>>>({});

  const tier = computeAccessibilityTier(ageValue);

  const colors = isDark
    ? {
        bg: '#0B1120',
        topBarBg: '#0F172A',
        panelBg: '#131C31',
        subPanelBg: '#0F172A',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        borderStrong: '2px solid rgba(148, 163, 184, 0.42)',
        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textMuted: '#94A3B8',
        inputBg: '#09101E',
        keyBg: '#1E293B',
        keyBorder: '1px solid rgba(148, 163, 184, 0.28)',
        keyboardTrayBg: '#0D1526',
        blue: '#38BDF8',
        blueSoft: 'rgba(56, 189, 248, 0.14)',
        blueBorder: 'rgba(56, 189, 248, 0.42)',
        emerald: '#22C55E',
        emeraldSoft: 'rgba(34, 197, 94, 0.15)',
        emeraldBorder: 'rgba(34, 197, 94, 0.42)',
        amber: '#F59E0B',
        amberSoft: 'rgba(245, 158, 11, 0.16)',
        crimson: '#EF4444',
        crimsonSoft: 'rgba(239, 68, 68, 0.15)',
      }
    : {
        bg: '#F8FAFC',
        topBarBg: '#FFFFFF',
        panelBg: '#FFFFFF',
        subPanelBg: '#F1F5F9',
        border: '1px solid #CBD5E1',
        borderStrong: '2px solid #94A3B8',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#64748B',
        inputBg: '#F8FAFC',
        keyBg: '#FFFFFF',
        keyBorder: '1px solid #CBD5E1',
        keyboardTrayBg: '#E2E8F0',
        blue: '#1D4ED8',
        blueSoft: '#EFF6FF',
        blueBorder: '#93C5FD',
        emerald: '#15803D',
        emeraldSoft: '#F0FDF4',
        emeraldBorder: '#86EFAC',
        amber: '#B45309',
        amberSoft: '#FFFBEB',
        crimson: '#B91C1C',
        crimsonSoft: '#FEF2F2',
      };

  const stopWebcamStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (samplingTimerRef.current !== null) {
        window.clearInterval(samplingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Dismiss virtual keyboard and stop webcam cleanly when switching onboarding screens
  const goToScreen = (next: SetupScreenIndex) => {
    setActiveKeyboardField(null);
    if (screen === 5 && next !== 5) {
      stopWebcamStream();
    }
    if (next === 7) {
      void prepareCarePlan();
    }
    setScreen(next);
  };

  // Virtual keyboard read/write bindings per focused field
  const getFieldValue = (field: KeyboardTargetField): string => {
    switch (field) {
      case 'name':
        return nameValue;
      case 'guardianName':
        return guardianName;
      case 'guardianPhone':
        return guardianPhone;
      case 'telegramHandle':
        return telegramHandle;
      case 'homeAddress':
        return homeAddress;
      case 'customAllergy':
        return customAllergyInput;
      case 'newMed':
        return newMedInput;
    }
  };

  const setFieldValue = (field: KeyboardTargetField, next: string) => {
    switch (field) {
      case 'name':
        setNameValue(next.slice(0, 42));
        break;
      case 'guardianName':
        setGuardianName(next.slice(0, 42));
        break;
      case 'guardianPhone':
        setGuardianPhone(next.slice(0, 24));
        break;
      case 'telegramHandle':
        setTelegramHandle(next.slice(0, 32));
        break;
      case 'homeAddress':
        setHomeAddress(next.slice(0, 80));
        break;
      case 'customAllergy':
        setCustomAllergyInput(next.slice(0, 30));
        break;
      case 'newMed':
        setNewMedInput(next.slice(0, 44));
        break;
    }
  };

  const openKeyboardFor = (field: KeyboardTargetField) => {
    setActiveKeyboardField(field);
    window.requestAnimationFrame(() => {
      inputRefs.current[field]?.focus();
    });
  };

  const handleVirtualKey = (keyChar: string) => {
    if (!activeKeyboardField) return;
    const current = getFieldValue(activeKeyboardField);
    const shouldUpper =
      isShiftOn ||
      (activeKeyboardField !== 'telegramHandle' &&
        (current.length === 0 || current.endsWith(' ')));
    const charToInsert = /[A-Z]/.test(keyChar)
      ? shouldUpper
        ? keyChar.toUpperCase()
        : keyChar.toLowerCase()
      : keyChar;
    if (isShiftOn) setIsShiftOn(false);
    setFieldValue(activeKeyboardField, `${current}${charToInsert}`);
    inputRefs.current[activeKeyboardField]?.focus();
  };

  const handleVirtualBackspace = () => {
    if (!activeKeyboardField) return;
    const current = getFieldValue(activeKeyboardField);
    setFieldValue(activeKeyboardField, current.slice(0, -1));
    inputRefs.current[activeKeyboardField]?.focus();
  };

  const handleCommitInlineEntry = () => {
    if (activeKeyboardField === 'customAllergy') {
      const cleaned = customAllergyInput.trim();
      if (cleaned && !allergies.includes(cleaned)) {
        setAllergies((prev) => [...prev.filter((x) => x !== 'None'), cleaned]);
      }
      setCustomAllergyInput('');
      setShowCustomAllergyBox(false);
    } else if (activeKeyboardField === 'newMed') {
      const cleaned = newMedInput.trim();
      if (cleaned && !medications.includes(cleaned)) {
        setMedications((prev) => [...prev, cleaned]);
      }
      setNewMedInput('');
    }
    setActiveKeyboardField(null);
  };

  const handlePickLanguage = (lang: PromptLanguage) => {
    setLanguage(lang);
    onLanguageSelected(lang);
    audioEngine.unlock();
    audioEngine.playConfirmChime();
    audioEngine.speakPrompt('standby_mode', lang, tier.speechRate);
  };

  const toggleAllergyChip = (chip: string) => {
    if (chip === 'None') {
      setAllergies([]);
      return;
    }
    setAllergies((prev) => {
      const base = prev.filter((item) => item !== 'None');
      return base.includes(chip) ? base.filter((x) => x !== chip) : [...base, chip];
    });
  };

  const toggleConditionChip = (chip: string) => {
    if (chip === 'None') {
      setConditions([]);
      return;
    }
    setConditions((prev) => {
      const base = prev.filter((item) => item !== 'None');
      return base.includes(chip) ? base.filter((x) => x !== chip) : [...base, chip];
    });
  };

  // Screen 5 Webcam Handlers
  const handleStartWebcam = async () => {
    setCameraNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraNotice('Live camera API unavailable here — use Upload Photo or Use Sample Portrait.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 320 },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraNotice('No webcam permission or camera detected — use Upload Photo or Use Sample Portrait.');
      stopWebcamStream();
    }
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256
    );
    setAvatarDataUrl(canvas.toDataURL('image/jpeg', 0.9));
    stopWebcamStream();
    audioEngine.playConfirmChime();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      if (!raw) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          256,
          256
        );
        setAvatarDataUrl(canvas.toDataURL('image/jpeg', 0.9));
        stopWebcamStream();
        audioEngine.playConfirmChime();
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  };

  // Screen 6 Sequential Sensor Calibration Handlers
  const switchCalibrationSubStep = (nextSub: CalibrationStep) => {
    if (samplingTimerRef.current !== null) {
      window.clearInterval(samplingTimerRef.current);
      samplingTimerRef.current = null;
    }
    setCalibStep(nextSub);
    setCalibPhase('waiting');
    setSamplingPct(0);
    setCalibError(null);
  };

  const handleTakeSensorReading = () => {
    setCalibError(null);
    if (calibStep === 'pulse_spo2') {
      const hr = Number(draftHr);
      const sp = Number(draftSpo2);
      if (!Number.isFinite(hr) || hr < 40 || hr > 160) {
        setCalibError('Heart Rate must be 40–160 BPM');
        return;
      }
      if (!Number.isFinite(sp) || sp < 80 || sp > 100) {
        setCalibError('SpO₂ must be 80–100%');
        return;
      }
    } else if (calibStep === 'temp') {
      const tf = Number(draftTempF);
      if (!Number.isFinite(tf) || tf < 94.0 || tf > 104.0) {
        setCalibError('Body Temp must be 94.0–104.0°F');
        return;
      }
    } else {
      const br = Number(draftBreathing);
      if (!Number.isFinite(br) || br < 8 || br > 36) {
        setCalibError('Breathing rate must be 8–36 br/min');
        return;
      }
    }

    if (samplingTimerRef.current !== null) {
      window.clearInterval(samplingTimerRef.current);
    }
    setCalibPhase('sampling');
    setSamplingPct(16);

    let tick = 16;
    samplingTimerRef.current = window.setInterval(() => {
      tick += 21;
      if (tick >= 100) {
        if (samplingTimerRef.current !== null) {
          window.clearInterval(samplingTimerRef.current);
          samplingTimerRef.current = null;
        }
        setSamplingPct(100);
        setCalibPhase('captured');
        if (calibStep === 'pulse_spo2') {
          setLockedHr(Math.round(Number(draftHr)));
          setLockedSpo2(Math.round(Number(draftSpo2)));
        } else if (calibStep === 'temp') {
          setLockedTempF(Number(Number(draftTempF).toFixed(1)));
        } else {
          setLockedBreathing(Math.round(Number(draftBreathing)));
        }
        audioEngine.playConfirmChime();
      } else {
        setSamplingPct(tick);
      }
    }, 150);
  };

  // Screen 7 Care Plan Builder (Instant local seed + live FastAPI NIM enhancement)
  const prepareCarePlan = async () => {
    const cleanName = nameValue.trim() || 'Family Member';
    const seedProfile = {
      name: cleanName,
      age: ageValue,
      allergies: allergies.filter((a) => a !== 'None'),
      conditions: conditions.filter((c) => c !== 'None'),
      medications,
      wakeTime,
      sleepTime,
    };
    const instantFallback = buildOfflineCarePlanFallback(seedProfile);
    setGeneratedPlan((prev) => prev ?? instantFallback);
    setIsGeneratingPlan(true);
    try {
      const aiPlan = await generateCarePlanWithAi({
        name: cleanName,
        age: ageValue,
        language,
        allergies: seedProfile.allergies,
        conditions: seedProfile.conditions,
        medications,
        wake_time: wakeTime,
        sleep_time: sleepTime,
      });
      setGeneratedPlan(aiPlan);
    } catch {
      setGeneratedPlan(instantFallback);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleFinishSetup = () => {
    const finalPlan =
      generatedPlan ??
      buildOfflineCarePlanFallback({
        name: nameValue.trim() || 'Family Member',
        age: ageValue,
        allergies,
        conditions,
        medications,
        wakeTime,
        sleepTime,
      });

    onComplete({
      name: nameValue.trim() || 'Family Member',
      age: ageValue,
      heartRate: lockedHr ?? (Number(draftHr) || initialHr),
      spo2: lockedSpo2 ?? (Number(draftSpo2) || initialSpo2),
      bodyTempF: lockedTempF ?? (Number(draftTempF) || initialTempF),
      language,
      guardianName: guardianName.trim() || 'Family Guardian',
      guardianPhone: guardianPhone.trim() || '+91 98300 41280',
      telegramHandle: telegramHandle.trim() || '@family_home_alert',
      homeAddress: homeAddress.trim() || 'Pre-Configured Home Pin',
      allergies: allergies.filter((a) => a !== 'None'),
      conditions: conditions.filter((c) => c !== 'None'),
      medications,
      wakeTime,
      sleepTime,
      avatarDataUrl,
      carePlan: finalPlan,
    });
  };

  const renderBottomNav = (opts: {
    backTo?: SetupScreenIndex;
    nextLabel?: string;
    nextDisabled?: boolean;
    onNext?: () => void;
    nextGreen?: boolean;
  }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        flexShrink: 0,
        paddingTop: '4px',
      }}
    >
      {opts.backTo !== undefined ? (
        <button
          type="button"
          onClick={() => goToScreen(opts.backTo!)}
          style={{
            height: '56px',
            padding: '0 24px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: colors.subPanelBg,
            color: colors.textPrimary,
            border: colors.border,
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={20} weight="bold" />
          <span>Back</span>
        </button>
      ) : (
        <div />
      )}

      {opts.nextLabel && opts.onNext ? (
        <button
          type="button"
          disabled={opts.nextDisabled}
          onClick={opts.onNext}
          style={{
            height: '56px',
            padding: '0 28px',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            backgroundColor: opts.nextDisabled
              ? colors.subPanelBg
              : opts.nextGreen
                ? '#15803D'
                : '#1D4ED8',
            color: opts.nextDisabled ? colors.textMuted : '#FFFFFF',
            border: opts.nextDisabled ? colors.border : 'none',
            fontSize: '18px',
            fontWeight: 800,
          }}
        >
          <span>{opts.nextLabel}</span>
          <ArrowRight size={20} weight="bold" />
        </button>
      ) : null}
    </div>
  );

  const calibrationStepNum =
    calibStep === 'pulse_spo2' ? 1 : calibStep === 'temp' ? 2 : 3;

  return (
    <div
      onMouseDown={(e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest('[data-setup-input="true"]') || target.closest('[data-virtual-kb="true"]')) {
          return;
        }
        setActiveKeyboardField(null);
      }}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* === CLEAN SETUP HEADER BAR (Zero Dashboard Tabs, Zero Sensor Hardware Strip) === */}
      <div
        style={{
          height: '44px',
          padding: '0 18px',
          backgroundColor: colors.topBarBg,
          borderBottom: colors.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13.5px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: colors.blue,
            }}
          >
            XYZ HOME DECK · FIRST-TIME DEVICE SETUP
          </span>
          <span
            className="tabular-nums"
            style={{
              padding: '3px 9px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: colors.subPanelBg,
              color: colors.textSecondary,
              border: colors.border,
            }}
          >
            {screen === 0 ? 'Welcome' : `Step ${screen} of 7`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '3px 9px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: colors.blueSoft,
              color: colors.blue,
              border: `1px solid ${colors.blueBorder}`,
            }}
          >
            {language.toUpperCase()}
          </span>

          <button
            type="button"
            onClick={onToggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: colors.subPanelBg,
              color: colors.textPrimary,
              border: colors.border,
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
        </div>
      </div>

      {/* === STEP BODY VIEWPORT === */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          overflowY: activeKeyboardField ? 'auto' : 'hidden',
          paddingBottom: activeKeyboardField ? '218px' : '18px',
        }}
      >
        {/* SCREEN 0: OUT-OF-BOX WELCOME ("Meet Your XYZ Home Deck") */}
        {screen === 0 ? (
          <>
            <div style={{ textAlign: 'center', paddingTop: '6px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: colors.emeraldSoft,
                  border: `1px solid ${colors.emeraldBorder}`,
                  color: colors.emerald,
                  fontSize: '12.5px',
                  fontWeight: 800,
                  marginBottom: '10px',
                }}
              >
                <ShieldCheck size={16} weight="duotone" />
                <span>MEET YOUR XYZ HOME DECK · ZERO CLOUD PRIVACY LOCK</span>
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: colors.textPrimary,
                  lineHeight: 1.15,
                }}
              >
                Autonomous Elderly Care &amp; Vitals Guardian
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  color: colors.textSecondary,
                  maxWidth: '820px',
                  margin: '10px auto 0',
                  lineHeight: 1.5,
                }}
              >
                Watches vitals, breathing, and room safety 24/7 — with zero cloud cameras
                and automatic emergency escalation when someone cannot call for help.
              </p>
            </div>

            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '16px',
                alignItems: 'stretch',
                minHeight: 0,
              }}
            >
              <div
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <Heartbeat size={26} weight="duotone" color={colors.emerald} />
                  <h3 style={{ fontSize: '17.5px', fontWeight: 800, color: colors.textPrimary }}>
                    30-Second Daily Vitals
                  </h3>
                </div>
                <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: 1.45 }}>
                  Contactless pulse, SpO₂, and temperature check-ins in English, Hindi, or Bengali.
                </p>
                <span style={{ fontSize: '13px', fontWeight: 700, color: colors.emerald }}>
                  MAX30102 + MLX90614
                </span>
              </div>

              <div
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <MoonStars size={26} weight="duotone" color={colors.blue} />
                  <h3 style={{ fontSize: '17.5px', fontWeight: 800, color: colors.textPrimary }}>
                    24/7 Silent Radar &amp; Gas Watch
                  </h3>
                </div>
                <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: 1.45 }}>
                  Detects night breathing stillness, falls, and LPG leaks even during power cuts.
                </p>
                <span style={{ fontSize: '13px', fontWeight: 700, color: colors.blue }}>
                  24GHz mmWave + 3S2P UPS
                </span>
              </div>

              <div
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <BellRinging size={26} weight="duotone" color={colors.amber} />
                  <h3 style={{ fontSize: '17.5px', fontWeight: 800, color: colors.textPrimary }}>
                    3-Stage Family Escalation
                  </h3>
                </div>
                <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: 1.45 }}>
                  Sounds a local alarm first, then calls &amp; messages family automatically if unanswered.
                </p>
                <span style={{ fontSize: '13px', fontWeight: 700, color: colors.amber }}>
                  10s Cancel Window Always Safe
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: colors.textSecondary,
                  border: colors.border,
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                Load Existing Demo Profile
              </button>

              <button
                type="button"
                onClick={() => goToScreen(1)}
                style={{
                  height: '58px',
                  padding: '0 32px',
                  borderRadius: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#1D4ED8',
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontWeight: 800,
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={22} weight="bold" />
              </button>
            </div>
          </>
        ) : null}

        {/* SCREEN 1: CHOOSE PREFERRED LANGUAGE (EN / HI / BN) */}
        {screen === 1 ? (
          <>
            <div style={{ textAlign: 'center', paddingTop: '10px' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '24px',
                  fontWeight: 800,
                  color: colors.textPrimary,
                }}
              >
                Choose Your Language / अपनी भाषा चुनें / আপনার ভাষা নির্বাচন করুন
              </h2>
              <p style={{ fontSize: '16px', color: colors.textSecondary, marginTop: '6px' }}>
                Tap a card to hear a calm voice greeting and switch all setup prompts immediately.
              </p>
            </div>

            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '18px',
                alignItems: 'center',
              }}
            >
              {(
                [
                  {
                    code: 'en',
                    title: 'English (en-IN)',
                    sub: 'Voice prompts & large readable HUD in English',
                    tag: 'Indian English Voice',
                  },
                  {
                    code: 'hi',
                    title: 'हिन्दी (Hindi)',
                    sub: 'आवाज़ और स्क्रीन निर्देश हिन्दी में',
                    tag: 'Swara Neural Hindi',
                  },
                  {
                    code: 'bn',
                    title: 'বাংলা (Bengali)',
                    sub: 'বাংলায় ভয়েস নির্দেশনা ও সহজ স্ক্রিন',
                    tag: 'Tanishaa Neural Bengali',
                  },
                ] as { code: PromptLanguage; title: string; sub: string; tag: string }[]
              ).map((item) => {
                const selected = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handlePickLanguage(item.code)}
                    style={{
                      height: '165px',
                      padding: '20px',
                      borderRadius: '14px',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: selected ? colors.blueSoft : colors.panelBg,
                      border: selected ? `2.5px solid ${colors.blue}` : colors.borderStrong,
                      color: colors.textPrimary,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor: selected ? '#1D4ED8' : colors.subPanelBg,
                          color: selected ? '#FFFFFF' : colors.textSecondary,
                        }}
                      >
                        {item.tag}
                      </span>
                      {selected ? (
                        <CheckCircle size={24} weight="fill" color={colors.blue} />
                      ) : null}
                    </div>

                    <div style={{ fontSize: '23px', fontWeight: 800, color: colors.textPrimary }}>
                      {item.title}
                    </div>

                    <div style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.35 }}>
                      {item.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {renderBottomNav({
              backTo: 0,
              nextLabel: 'Next: Name & Age',
              onNext: () => goToScreen(2),
            })}
          </>
        ) : null}

        {/* SCREEN 2: NAME & AGE (WITH HIDABLE KEYBOARD & LIVE UI ADAPTATION PREVIEW) */}
        {screen === 2 ? (
          <>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>
                Who Will Use This XYZ Home Deck?
              </h2>
              <p style={{ fontSize: '15.5px', color: colors.textSecondary, marginTop: '3px' }}>
                Tap Name to open the on-screen touch keyboard, or type directly using a physical keyboard.
              </p>
            </div>

            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '55fr 45fr',
                gap: '18px',
                minHeight: 0,
              }}
            >
              {/* Left Form */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div data-setup-input="true">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label
                      htmlFor="wizard-name-input"
                      style={{ fontSize: '15px', fontWeight: 800, color: colors.textSecondary }}
                    >
                      Full Name
                    </label>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: colors.blue }}>
                      {activeKeyboardField === 'name' ? 'Keyboard Open' : 'Tap field for keyboard'}
                    </span>
                  </div>
                  <input
                    id="wizard-name-input"
                    ref={(el) => {
                      inputRefs.current.name = el;
                    }}
                    type="text"
                    value={nameValue}
                    onFocus={() => setActiveKeyboardField('name')}
                    onClick={() => openKeyboardFor('name')}
                    onChange={(e) => setNameValue(e.target.value.slice(0, 42))}
                    placeholder="Enter elder's full name..."
                    style={{
                      width: '100%',
                      height: '58px',
                      padding: '0 14px',
                      fontSize: '20px',
                      fontWeight: 800,
                      borderRadius: '9px',
                      backgroundColor: colors.inputBg,
                      color: colors.textPrimary,
                      border: `2px solid ${
                        activeKeyboardField === 'name' ? colors.blue : colors.textMuted
                      }`,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: colors.textSecondary }}>
                      Age (Auto-Calibrates Screen &amp; Voice Speed)
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setAgeValue(50)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 800,
                          backgroundColor: ageValue < 65 ? '#1D4ED8' : colors.subPanelBg,
                          color: ageValue < 65 ? '#FFFFFF' : colors.textPrimary,
                          border: colors.border,
                        }}
                      >
                        50 yrs
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgeValue(78)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 800,
                          backgroundColor: ageValue >= 65 ? '#B45309' : colors.subPanelBg,
                          color: ageValue >= 65 ? '#FFFFFF' : colors.textPrimary,
                          border: colors.border,
                        }}
                      >
                        78 yrs
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setAgeValue((a) => Math.max(40, a - 1))}
                      style={{
                        width: '58px',
                        height: '58px',
                        borderRadius: '10px',
                        fontSize: '26px',
                        fontWeight: 800,
                        backgroundColor: colors.subPanelBg,
                        color: colors.textPrimary,
                        border: colors.borderStrong,
                      }}
                    >
                      −
                    </button>

                    <div
                      className="tabular-nums"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '36px',
                        fontWeight: 800,
                        color: colors.textPrimary,
                      }}
                    >
                      {ageValue} <span style={{ fontSize: '18px', color: colors.textMuted }}>yrs</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAgeValue((a) => Math.min(100, a + 1))}
                      style={{
                        width: '58px',
                        height: '58px',
                        borderRadius: '10px',
                        fontSize: '26px',
                        fontWeight: 800,
                        backgroundColor: colors.subPanelBg,
                        color: colors.textPrimary,
                        border: colors.borderStrong,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Live Adaptation Card */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.blue }}>
                  Automatic Age-Adaptive Layout Preview
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: ageValue < 65 ? colors.blueSoft : colors.subPanelBg,
                    border: ageValue < 65 ? `2px solid ${colors.blue}` : colors.border,
                    opacity: ageValue < 65 ? 1 : 0.65,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 800, color: colors.textPrimary }}>
                    Age &lt; 65 · Standard Multi-Metric Cockpit
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                    1.0× voice cadence, compact 6-tile telemetry dashboard, and bottom-right utility buttons.
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: ageValue >= 65 ? colors.amberSoft : colors.subPanelBg,
                    border: ageValue >= 65 ? `2px solid ${colors.amber}` : colors.border,
                    opacity: ageValue >= 65 ? 1 : 0.65,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 800, color: colors.textPrimary }}>
                    Age ≥ 65 · High-Assist Senior HUD
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                    0.78× calm voice cadence, large 58px clock &amp; 3-card vitals, and giant centered touch dock.
                  </div>
                </div>
              </div>
            </div>

            {renderBottomNav({
              backTo: 1,
              nextLabel: 'Next: Emergency Contact',
              nextDisabled: !nameValue.trim(),
              onNext: () => goToScreen(3),
            })}
          </>
        ) : null}

        {/* SCREEN 3: GUARDIAN EMERGENCY CONTACT & HOME ADDRESS */}
        {screen === 3 ? (
          <>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>
                Guardian Emergency Contact &amp; Home Pin
              </h2>
              <p style={{ fontSize: '15.5px', color: colors.textSecondary, marginTop: '3px' }}>
                Reached automatically via call, SMS, and Telegram snapshot if a 10-second alarm goes unanswered.
              </p>
            </div>

            <div
              style={{
                flex: 1,
                padding: '18px 20px',
                borderRadius: '12px',
                backgroundColor: colors.panelBg,
                border: colors.border,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div data-setup-input="true">
                <label
                  htmlFor="wizard-guardian-name"
                  style={{ display: 'block', fontSize: '14.5px', fontWeight: 800, color: colors.textSecondary, marginBottom: '5px' }}
                >
                  Guardian / Child Name
                </label>
                <input
                  id="wizard-guardian-name"
                  ref={(el) => {
                    inputRefs.current.guardianName = el;
                  }}
                  type="text"
                  value={guardianName}
                  onFocus={() => setActiveKeyboardField('guardianName')}
                  onClick={() => openKeyboardFor('guardianName')}
                  onChange={(e) => setGuardianName(e.target.value.slice(0, 42))}
                  placeholder="e.g. Sourav Biswas"
                  style={{
                    width: '100%',
                    height: '56px',
                    padding: '0 14px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    backgroundColor: colors.inputBg,
                    color: colors.textPrimary,
                    border: `2px solid ${
                      activeKeyboardField === 'guardianName' ? colors.blue : colors.textMuted
                    }`,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div data-setup-input="true">
                  <label
                    htmlFor="wizard-guardian-phone"
                    style={{ display: 'block', fontSize: '14.5px', fontWeight: 800, color: colors.textSecondary, marginBottom: '5px' }}
                  >
                    Guardian Mobile Phone
                  </label>
                  <input
                    id="wizard-guardian-phone"
                    ref={(el) => {
                      inputRefs.current.guardianPhone = el;
                    }}
                    type="text"
                    value={guardianPhone}
                    onFocus={() => setActiveKeyboardField('guardianPhone')}
                    onClick={() => openKeyboardFor('guardianPhone')}
                    onChange={(e) => setGuardianPhone(e.target.value.slice(0, 24))}
                    placeholder="+91 98300 41280"
                    style={{
                      width: '100%',
                      height: '56px',
                      padding: '0 14px',
                      fontSize: '18px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      backgroundColor: colors.inputBg,
                      color: colors.textPrimary,
                      border: `2px solid ${
                        activeKeyboardField === 'guardianPhone' ? colors.blue : colors.textMuted
                      }`,
                      outline: 'none',
                    }}
                  />
                </div>

                <div data-setup-input="true">
                  <label
                    htmlFor="wizard-telegram-handle"
                    style={{ display: 'block', fontSize: '14.5px', fontWeight: 800, color: colors.textSecondary, marginBottom: '5px' }}
                  >
                    Telegram Alert Handle
                  </label>
                  <input
                    id="wizard-telegram-handle"
                    ref={(el) => {
                      inputRefs.current.telegramHandle = el;
                    }}
                    type="text"
                    value={telegramHandle}
                    onFocus={() => setActiveKeyboardField('telegramHandle')}
                    onClick={() => openKeyboardFor('telegramHandle')}
                    onChange={(e) => setTelegramHandle(e.target.value.slice(0, 32))}
                    placeholder="@sourav_family_alert"
                    style={{
                      width: '100%',
                      height: '56px',
                      padding: '0 14px',
                      fontSize: '18px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      backgroundColor: colors.inputBg,
                      color: colors.textPrimary,
                      border: `2px solid ${
                        activeKeyboardField === 'telegramHandle' ? colors.blue : colors.textMuted
                      }`,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div data-setup-input="true">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', gap: '8px' }}>
                  <label
                    htmlFor="wizard-home-address"
                    style={{ fontSize: '14.5px', fontWeight: 800, color: colors.textSecondary }}
                  >
                    Home Address / Map Pin
                  </label>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: colors.emerald }}>
                    Shared with ambulance/police only during verified Stage 4 emergency
                  </span>
                </div>
                <input
                  id="wizard-home-address"
                  ref={(el) => {
                    inputRefs.current.homeAddress = el;
                  }}
                  type="text"
                  value={homeAddress}
                  onFocus={() => setActiveKeyboardField('homeAddress')}
                  onClick={() => openKeyboardFor('homeAddress')}
                  onChange={(e) => setHomeAddress(e.target.value.slice(0, 80))}
                  placeholder="42/B Shyambazar Street, Kolkata 700004"
                  style={{
                    width: '100%',
                    height: '56px',
                    padding: '0 14px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    backgroundColor: colors.inputBg,
                    color: colors.textPrimary,
                    border: `2px solid ${
                      activeKeyboardField === 'homeAddress' ? colors.blue : colors.textMuted
                    }`,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {renderBottomNav({
              backTo: 2,
              nextLabel: 'Next: Health & Sleep Routine',
              onNext: () => goToScreen(4),
            })}
          </>
        ) : null}

        {/* SCREEN 4: ALLERGIES, HEALTH CONDITIONS, MEDICATIONS & SLEEP/WAKE ROUTINE */}
        {screen === 4 ? (
          <>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>
                Allergies, Health Conditions &amp; Sleep Watch Hours
              </h2>
            </div>

            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '54fr 46fr',
                gap: '14px',
                minHeight: 0,
              }}
            >
              {/* Left Column: Health & Allergies */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: colors.crimson, marginBottom: '6px' }}>
                    Food / Drug Allergies (Tap Chips)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {QUICK_ALLERGIES.map((chip) => {
                      const active =
                        chip === 'None' ? allergies.length === 0 : allergies.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleAllergyChip(chip)}
                          style={{
                            minHeight: '42px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 700,
                            backgroundColor: active
                              ? chip === 'None'
                                ? colors.emeraldSoft
                                : colors.crimsonSoft
                              : colors.subPanelBg,
                            color: active
                              ? chip === 'None'
                                ? colors.emerald
                                : colors.crimson
                              : colors.textPrimary,
                            border: active
                              ? `2px solid ${chip === 'None' ? colors.emerald : colors.crimson}`
                              : colors.border,
                          }}
                        >
                          {chip}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomAllergyBox(true);
                        openKeyboardFor('customAllergy');
                      }}
                      style={{
                        minHeight: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 700,
                        backgroundColor: colors.blueSoft,
                        color: colors.blue,
                        border: `1px solid ${colors.blueBorder}`,
                      }}
                    >
                      + Custom
                    </button>
                  </div>

                  {showCustomAllergyBox ? (
                    <div data-setup-input="true" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <input
                        ref={(el) => {
                          inputRefs.current.customAllergy = el;
                        }}
                        type="text"
                        value={customAllergyInput}
                        onFocus={() => setActiveKeyboardField('customAllergy')}
                        onChange={(e) => setCustomAllergyInput(e.target.value.slice(0, 30))}
                        placeholder="Type custom allergy..."
                        style={{
                          flex: 1,
                          height: '40px',
                          padding: '0 10px',
                          fontSize: '15px',
                          borderRadius: '7px',
                          backgroundColor: colors.inputBg,
                          color: colors.textPrimary,
                          border: `2px solid ${colors.blue}`,
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCommitInlineEntry}
                        style={{
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '7px',
                          backgroundColor: '#1D4ED8',
                          color: '#FFFFFF',
                          fontWeight: 700,
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ) : null}
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: colors.textSecondary, marginBottom: '6px' }}>
                    Medical Conditions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {QUICK_CONDITIONS.map((chip) => {
                      const active =
                        chip === 'None'
                          ? conditions.length === 0
                          : conditions.some((c) => c.toLowerCase().includes(chip.toLowerCase()));
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleConditionChip(chip)}
                          style={{
                            minHeight: '42px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 700,
                            backgroundColor: active ? colors.blueSoft : colors.subPanelBg,
                            color: active ? colors.blue : colors.textPrimary,
                            border: active ? `2px solid ${colors.blue}` : colors.border,
                          }}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: colors.textSecondary, marginBottom: '5px' }}>
                    Daily Medications
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {medications.map((med) => (
                      <span
                        key={med}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '7px',
                          backgroundColor: colors.subPanelBg,
                          border: colors.border,
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        <span>{med}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setMedications((prev) => prev.filter((item) => item !== med))
                          }
                          aria-label={`Remove ${med}`}
                          style={{ color: colors.crimson, background: 'transparent', padding: 0 }}
                        >
                          <Trash size={13} weight="bold" />
                        </button>
                      </span>
                    ))}
                    <div data-setup-input="true" style={{ display: 'inline-flex', gap: '4px', flex: 1, minWidth: '170px' }}>
                      <input
                        ref={(el) => {
                          inputRefs.current.newMed = el;
                        }}
                        type="text"
                        value={newMedInput}
                        onFocus={() => setActiveKeyboardField('newMed')}
                        onClick={() => openKeyboardFor('newMed')}
                        onChange={(e) => setNewMedInput(e.target.value.slice(0, 44))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newMedInput.trim()) {
                            handleCommitInlineEntry();
                          }
                        }}
                        placeholder="+ Add medication..."
                        style={{
                          flex: 1,
                          height: '40px',
                          padding: '0 10px',
                          fontSize: '14px',
                          borderRadius: '7px',
                          backgroundColor: colors.inputBg,
                          color: colors.textPrimary,
                          border: colors.border,
                        }}
                      />
                      {newMedInput.trim() ? (
                        <button
                          type="button"
                          onClick={() => {
                            const cleaned = newMedInput.trim();
                            if (cleaned && !medications.includes(cleaned)) {
                              setMedications((prev) => [...prev, cleaned]);
                            }
                            setNewMedInput('');
                            setActiveKeyboardField(null);
                          }}
                          style={{
                            height: '40px',
                            padding: '0 10px',
                            borderRadius: '7px',
                            backgroundColor: '#1D4ED8',
                            color: '#FFFFFF',
                            fontWeight: 700,
                          }}
                        >
                          <Plus size={15} weight="bold" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Sleep & Wake Schedule */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: colors.textSecondary, marginBottom: '6px' }}>
                    Wake-Up Time
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setWakeTime((t) => shiftTime24(t, -15))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '9px',
                        fontSize: '22px',
                        fontWeight: 800,
                        backgroundColor: colors.subPanelBg,
                        color: colors.textPrimary,
                        border: colors.borderStrong,
                      }}
                    >
                      −
                    </button>
                    <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: colors.textPrimary }}>
                      {format12Hour(wakeTime)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setWakeTime((t) => shiftTime24(t, 15))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '9px',
                        fontSize: '22px',
                        fontWeight: 800,
                        backgroundColor: colors.subPanelBg,
                        color: colors.textPrimary,
                        border: colors.borderStrong,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: colors.textSecondary, marginBottom: '6px' }}>
                    Sleep / Bed Time
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSleepTime((t) => shiftTime24(t, -15))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '9px',
                        fontSize: '22px',
                        fontWeight: 800,
                        backgroundColor: colors.subPanelBg,
                        color: colors.textPrimary,
                        border: colors.borderStrong,
                      }}
                    >
                      −
                    </button>
                    <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 800, color: colors.blue }}>
                      {format12Hour(sleepTime)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSleepTime((t) => shiftTime24(t, 15))}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '9px',
                        fontSize: '22px',
                        fontWeight: 800,
                        backgroundColor: colors.subPanelBg,
                        color: colors.textPrimary,
                        border: colors.borderStrong,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '9px',
                    backgroundColor: colors.blueSoft,
                    border: `1px solid ${colors.blueBorder}`,
                    fontSize: '14px',
                    color: colors.textPrimary,
                    lineHeight: 1.4,
                  }}
                >
                  24GHz Radar automatically arms the <strong>15-minute Night Bathroom Absence Watch</strong> between{' '}
                  <strong>{format12Hour(sleepTime)}</strong> and <strong>{format12Hour(wakeTime)}</strong>.
                </div>
              </div>
            </div>

            {renderBottomNav({
              backTo: 3,
              nextLabel: 'Next: Face Recognition',
              onNext: () => goToScreen(5),
            })}
          </>
        ) : null}

        {/* SCREEN 5: LIVE FACE RECOGNITION ENROLLMENT (OV5647 CAMERA) */}
        {screen === 5 ? (
          <>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>
                Live Face Recognition Enrollment (OV5647)
              </h2>
              <p style={{ fontSize: '15.5px', color: colors.textSecondary, marginTop: '3px' }}>
                Enables hands-free morning greeting &amp; switches between {nameValue || 'Elder'} and Guest Privacy Lock automatically.
              </p>
            </div>

            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '52fr 48fr',
                gap: '18px',
                minHeight: 0,
              }}
            >
              {/* Left Live Camera Circle */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '182px',
                    height: '182px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `3px solid ${cameraActive ? colors.emerald : colors.blue}`,
                    backgroundColor: colors.subPanelBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : avatarDataUrl ? (
                    <img
                      src={avatarDataUrl}
                      alt={nameValue}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: colors.textMuted }}>
                      <Camera size={46} weight="duotone" color={colors.blue} />
                      <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '6px' }}>
                        OV5647 Ready
                      </div>
                    </div>
                  )}
                </div>

                {cameraNotice ? (
                  <div style={{ fontSize: '12.5px', color: colors.amber, textAlign: 'center', fontWeight: 600 }}>
                    {cameraNotice}
                  </div>
                ) : null}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', width: '100%' }}>
                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={handleCaptureCameraFrame}
                      style={{
                        flex: 1,
                        height: '54px',
                        padding: '0 16px',
                        borderRadius: '9px',
                        backgroundColor: '#15803D',
                        color: '#FFFFFF',
                        fontSize: '16px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <Camera size={20} weight="fill" />
                      <span>Capture Face Photo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartWebcam}
                      style={{
                        flex: 1,
                        height: '54px',
                        padding: '0 16px',
                        borderRadius: '9px',
                        backgroundColor: '#1D4ED8',
                        color: '#FFFFFF',
                        fontSize: '16px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <Camera size={20} weight="duotone" />
                      <span>Open Webcam / Capture</span>
                    </button>
                  )}

                  <input
                    ref={fileUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    style={{
                      height: '54px',
                      padding: '0 14px',
                      borderRadius: '9px',
                      backgroundColor: colors.subPanelBg,
                      color: colors.textPrimary,
                      border: colors.border,
                      fontSize: '14px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <UploadSimple size={17} weight="bold" />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopWebcamStream();
                      setAvatarDataUrl(buildSamplePortraitDataUrl(nameValue || 'Elder', ageValue));
                      audioEngine.playConfirmChime();
                    }}
                    style={{
                      height: '54px',
                      padding: '0 14px',
                      borderRadius: '9px',
                      backgroundColor: colors.subPanelBg,
                      color: colors.textPrimary,
                      border: colors.border,
                      fontSize: '14px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <UserCheck size={17} weight="duotone" />
                    <span>Use Sample Portrait</span>
                  </button>
                </div>
              </div>

              {/* Right Privacy & Captured Portrait Card */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    backgroundColor: colors.emeraldSoft,
                    border: `1px solid ${colors.emeraldBorder}`,
                    color: colors.emerald,
                    fontSize: '14px',
                    fontWeight: 800,
                    alignSelf: 'flex-start',
                  }}
                >
                  <LockKey size={17} weight="fill" />
                  <span>100% On-Device Local Recognition — Zero Cloud Storage</span>
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {avatarDataUrl ? (
                    <img
                      src={avatarDataUrl}
                      alt="Captured face preview"
                      style={{
                        width: '94px',
                        height: '94px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `3px solid ${colors.emerald}`,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '94px',
                        height: '94px',
                        borderRadius: '50%',
                        backgroundColor: colors.subPanelBg,
                        border: colors.borderStrong,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: colors.textMuted,
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      No Photo Yet
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: colors.textPrimary }}>
                      {nameValue || 'Family Member'} · Age {ageValue}
                    </div>
                    <p style={{ fontSize: '15px', color: colors.textSecondary, marginTop: '4px', lineHeight: 1.45 }}>
                      {avatarDataUrl
                        ? 'Face embedding stays stored strictly inside the Raspberry Pi local enclave. Visitors trigger Guest Privacy Lock automatically.'
                        : 'Capture a webcam photo, upload an image, or tap Use Sample Portrait to test local face recognition.'}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '9px',
                    backgroundColor: colors.subPanelBg,
                    border: colors.border,
                    fontSize: '14px',
                    color: colors.textSecondary,
                  }}
                >
                  Next step measures resting baseline thresholds one sensor at a time so alerts never fire falsely for your normal resting heart rate.
                </div>
              </div>
            </div>

            {renderBottomNav({
              backTo: 4,
              nextLabel: 'Next: Baseline Calibration',
              onNext: () => {
                switchCalibrationSubStep('pulse_spo2');
                goToScreen(6);
              },
            })}
          </>
        ) : null}

        {/* SCREEN 6: SEQUENTIAL 1-BY-1 SENSOR CALIBRATION (PULSE & SPO2 -> TEMP -> RADAR) */}
        {screen === 6 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '23px', fontWeight: 800 }}>
                  Baseline Sensor Calibration ({calibrationStepNum} of 3):{' '}
                  {calibStep === 'pulse_spo2'
                    ? 'MAX30102 Pulse & SpO₂'
                    : calibStep === 'temp'
                      ? 'MLX90614 IR Body Temp'
                      : 'HLK-LD2410B Radar Breathing'}
                </h2>
              </div>

              {/* Quick Sub-Step Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(
                  [
                    { id: 'pulse_spo2', label: '1/3 Pulse & SpO₂', done: lockedHr !== null },
                    { id: 'temp', label: '2/3 IR Temp', done: lockedTempF !== null },
                    { id: 'radar', label: '3/3 Radar Breath', done: lockedBreathing !== null },
                  ] as { id: CalibrationStep; label: string; done: boolean }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchCalibrationSubStep(item.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '7px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      backgroundColor:
                        calibStep === item.id
                          ? '#1D4ED8'
                          : item.done
                            ? colors.emeraldSoft
                            : colors.subPanelBg,
                      color:
                        calibStep === item.id
                          ? '#FFFFFF'
                          : item.done
                            ? colors.emerald
                            : colors.textSecondary,
                      border: colors.border,
                    }}
                  >
                    {item.done ? '✓ ' : ''}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '62fr 38fr',
                gap: '14px',
                minHeight: 0,
              }}
            >
              {/* Left Sensor Prompt + Live Stream Display */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: '12px',
                  backgroundColor: colors.panelBg,
                  border: colors.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '12px',
                        backgroundColor:
                          calibPhase === 'captured' ? colors.emeraldSoft : colors.blueSoft,
                        color: calibPhase === 'captured' ? colors.emerald : colors.blue,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {calibStep === 'pulse_spo2' ? (
                        <Heartbeat size={30} weight="duotone" />
                      ) : calibStep === 'temp' ? (
                        <Thermometer size={30} weight="duotone" />
                      ) : (
                        <Wind size={30} weight="duotone" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: colors.textPrimary }}>
                        {calibPhase === 'captured'
                          ? 'Baseline Locked Successfully ✓'
                          : calibPhase === 'sampling'
                            ? `Acquiring steady packets (${samplingPct}%)...`
                            : calibStep === 'pulse_spo2'
                              ? 'Place finger on bezel pad...'
                              : calibStep === 'temp'
                                ? 'Hold forehead 5–10 cm from IR optic...'
                                : 'Sit still 3 seconds for radar breathing lock...'}
                      </div>
                      <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '2px' }}>
                        {calibStep === 'pulse_spo2'
                          ? '660nm/880nm red+IR LEDs measure resting HR and arterial SpO₂'
                          : calibStep === 'temp'
                            ? 'Medical thermopile locks contactless skin temperature'
                            : '24GHz mmWave FMCW tracks sub-millimeter chest respiration'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Large Hero Calibration Value Display */}
                <div
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: colors.subPanelBg,
                    border: colors.border,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  {calibStep === 'pulse_spo2' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: colors.textMuted }}>RESTING PULSE</div>
                          <div className="tabular-nums" style={{ fontSize: '42px', fontWeight: 800, color: lockedHr !== null ? colors.emerald : colors.textPrimary }}>
                            {lockedHr ?? (calibPhase === 'sampling' ? draftHr : '--')} <span style={{ fontSize: '16px' }}>BPM</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: colors.textMuted }}>ARTERIAL SpO₂</div>
                          <div className="tabular-nums" style={{ fontSize: '42px', fontWeight: 800, color: lockedSpo2 !== null ? colors.emerald : colors.textPrimary }}>
                            {lockedSpo2 ?? (calibPhase === 'sampling' ? draftSpo2 : '--')} <span style={{ fontSize: '18px' }}>%</span>
                          </div>
                        </div>
                      </div>
                      <PpgWaveformCanvas
                        heartRate={calibPhase === 'waiting' ? 60 : Number(draftHr) || 74}
                        spo2={calibPhase === 'waiting' ? 82 : Number(draftSpo2) || 98}
                        statusTone={calibPhase === 'captured' ? 'emerald' : 'amber'}
                        height={82}
                        theme={kioskTheme}
                      />
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: colors.textMuted }}>
                          {calibStep === 'temp' ? 'FOREHEAD IR TEMPERATURE' : '24GHZ RADAR BREATHING RATE'}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '52px', fontWeight: 800, color: calibPhase === 'captured' ? colors.emerald : colors.textPrimary }}>
                          {calibStep === 'temp'
                            ? lockedTempF?.toFixed(1) ?? (calibPhase === 'sampling' ? draftTempF : '--.-')
                            : lockedBreathing ?? (calibPhase === 'sampling' ? draftBreathing : '--')}{' '}
                          <span style={{ fontSize: '20px', color: colors.textMuted }}>
                            {calibStep === 'temp' ? '°F' : 'br/min'}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: '14px', borderRadius: '999px', backgroundColor: colors.keyBg, border: colors.border, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${calibPhase === 'waiting' ? 8 : samplingPct}%`,
                            height: '100%',
                            backgroundColor: calibPhase === 'captured' ? colors.emerald : colors.blue,
                            transition: 'width 140ms linear',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Bottom-Right "Manual Sensor Value (Demo)" Anchor Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: colors.subPanelBg,
                    border: `1.5px dashed ${colors.blue}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: colors.blue }}>
                      Manual Sensor Value (Demo)
                    </div>
                    <div style={{ fontSize: '13.5px', color: colors.textSecondary, marginTop: '2px' }}>
                      Type physical reading or use steppers below, then take reading:
                    </div>
                  </div>

                  {calibStep === 'pulse_spo2' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>HR (BPM)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draftHr}
                          onChange={(e) => {
                            setCalibError(null);
                            setDraftHr(e.target.value.slice(0, 3));
                          }}
                          className="tabular-nums"
                          style={{
                            width: '100%',
                            height: '46px',
                            padding: '0 10px',
                            fontSize: '20px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            backgroundColor: colors.panelBg,
                            color: colors.textPrimary,
                            border: colors.border,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: colors.textMuted }}>SpO₂ (%)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draftSpo2}
                          onChange={(e) => {
                            setCalibError(null);
                            setDraftSpo2(e.target.value.slice(0, 3));
                          }}
                          className="tabular-nums"
                          style={{
                            width: '100%',
                            height: '46px',
                            padding: '0 10px',
                            fontSize: '20px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            backgroundColor: colors.panelBg,
                            color: colors.textPrimary,
                            border: colors.border,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (calibStep === 'temp') {
                            setDraftTempF((v) => Math.max(94, Number(v) - 0.2).toFixed(1));
                          } else {
                            setDraftBreathing((v) => String(Math.max(8, Number(v) - 1)));
                          }
                        }}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          fontSize: '20px',
                          fontWeight: 800,
                          backgroundColor: colors.keyBg,
                          color: colors.textPrimary,
                          border: colors.keyBorder,
                        }}
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={calibStep === 'temp' ? draftTempF : draftBreathing}
                        onChange={(e) => {
                          setCalibError(null);
                          if (calibStep === 'temp') setDraftTempF(e.target.value.slice(0, 5));
                          else setDraftBreathing(e.target.value.slice(0, 3));
                        }}
                        className="tabular-nums"
                        style={{
                          flex: 1,
                          height: '48px',
                          padding: '0 10px',
                          textAlign: 'center',
                          fontSize: '22px',
                          fontWeight: 800,
                          borderRadius: '8px',
                          backgroundColor: colors.panelBg,
                          color: colors.textPrimary,
                          border: colors.border,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (calibStep === 'temp') {
                            setDraftTempF((v) => Math.min(104, Number(v) + 0.2).toFixed(1));
                          } else {
                            setDraftBreathing((v) => String(Math.min(36, Number(v) + 1)));
                          }
                        }}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          fontSize: '20px',
                          fontWeight: 800,
                          backgroundColor: colors.keyBg,
                          color: colors.textPrimary,
                          border: colors.keyBorder,
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {calibError ? (
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: colors.crimson }}>
                      {calibError}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleTakeSensorReading}
                    disabled={calibPhase === 'sampling'}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: '#15803D',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                    }}
                  >
                    <Waves size={18} weight="duotone" />
                    <span>
                      {calibPhase === 'sampling'
                        ? `Sampling (${samplingPct}%)...`
                        : 'Capture Sensor Reading'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {renderBottomNav({
              backTo: undefined,
              nextLabel:
                calibStep === 'pulse_spo2'
                  ? 'Next: 2/3 IR Body Temp'
                  : calibStep === 'temp'
                    ? 'Next: 3/3 Radar Breathing'
                    : 'Next: Generate AI Care Plan',
              onNext: () => {
                if (calibStep === 'pulse_spo2') {
                  if (lockedHr === null) setLockedHr(Math.round(Number(draftHr) || initialHr));
                  if (lockedSpo2 === null) setLockedSpo2(Math.round(Number(draftSpo2) || initialSpo2));
                  switchCalibrationSubStep('temp');
                } else if (calibStep === 'temp') {
                  if (lockedTempF === null) setLockedTempF(Number(Number(draftTempF).toFixed(1)) || initialTempF);
                  switchCalibrationSubStep('radar');
                } else {
                  if (lockedBreathing === null) setLockedBreathing(Math.round(Number(draftBreathing) || 16));
                  goToScreen(7);
                }
              },
            })}
          </>
        ) : null}

        {/* SCREEN 7: AI DAILY CARE & ALARM PLAN + LAUNCH LIVE HUD */}
        {screen === 7 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '23px', fontWeight: 800 }}>
                  Personalized AI Daily Care &amp; Alarm Schedule
                </h2>
                <p style={{ fontSize: '14.5px', color: colors.textSecondary, marginTop: '2px' }}>
                  {generatedPlan?.profile_summary}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: colors.emeraldSoft,
                    color: colors.emerald,
                    border: `1px solid ${colors.emeraldBorder}`,
                  }}
                >
                  {isGeneratingPlan
                    ? 'Syncing AI Plan...'
                    : generatedPlan?.mode === 'nim-live'
                      ? 'NVIDIA NIM Live'
                      : 'Instant Care Plan Ready'}
                </span>

                <button
                  type="button"
                  onClick={() => setShowJsonDrawer((prev) => !prev)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    backgroundColor: colors.subPanelBg,
                    color: colors.textPrimary,
                    border: colors.border,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Code size={15} weight="bold" />
                  <span>{showJsonDrawer ? 'Hide AI JSON' : 'View AI JSON'}</span>
                </button>
              </div>
            </div>

            {showJsonDrawer && generatedPlan ? (
              <pre
                style={{
                  flex: 1,
                  margin: 0,
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: isDark ? '#070B14' : '#0F172A',
                  color: '#E2E8F0',
                  fontSize: '12.5px',
                  lineHeight: 1.45,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(generatedPlan, null, 2)}
              </pre>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '56fr 44fr',
                  gap: '14px',
                  minHeight: 0,
                }}
              >
                {/* Scheduled Alarms */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: colors.panelBg,
                    border: colors.border,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 800, color: colors.textPrimary }}>
                      Daily Voice Alarms ({generatedPlan?.daily_alarms.length ?? 0})
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: colors.blue }}>
                      <Drop size={14} weight="duotone" style={{ verticalAlign: 'middle' }} />{' '}
                      {generatedPlan?.hydration_goal_ml ?? 2000} ml Water Goal
                    </span>
                  </div>

                  {(generatedPlan?.daily_alarms ?? []).slice(0, 4).map((alarm, idx) => (
                    <div
                      key={`${alarm.time}-${idx}`}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        backgroundColor: colors.subPanelBg,
                        border: colors.border,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: colors.blue, flexShrink: 0 }}>
                        {alarm.time}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14.5px', fontWeight: 700, color: colors.textPrimary }}>
                          {alarm.title}
                        </div>
                        <div style={{ fontSize: '12px', color: colors.textMuted }}>
                          {alarm.category} · {tier.speechRateLabel} Voice
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Allergy Guardrails & Hardware Readiness */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
                  <div
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: '12px',
                      backgroundColor: colors.crimsonSoft,
                      border: `1px solid ${colors.crimson}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 800, color: colors.crimson, marginBottom: '6px' }}>
                      <WarningOctagon size={16} weight="fill" />
                      <span>STRICT ALLERGY &amp; FOOD RULES</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '14px', color: colors.textPrimary, lineHeight: 1.45 }}>
                      {(generatedPlan?.nutrition_rules.strictly_avoid ?? []).map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </div>

                  <div
                    style={{
                      padding: '13px 16px',
                      borderRadius: '12px',
                      backgroundColor: colors.panelBg,
                      border: colors.border,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 800, color: colors.emerald }}>
                      <Clock size={15} weight="duotone" />
                      <span>Calibration Summary Locked</span>
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary }}>
                      {lockedHr ?? initialHr} BPM · {lockedSpo2 ?? initialSpo2}% SpO₂ · {(lockedTempF ?? initialTempF).toFixed(1)}°F · Watch {format12Hour(sleepTime)}–{format12Hour(wakeTime)}
                    </div>
                    <div style={{ fontSize: '12.5px', color: colors.textSecondary }}>
                      <PhoneCall size={13} weight="duotone" style={{ verticalAlign: 'middle' }} /> Guardian:{' '}
                      {guardianName} ({guardianPhone})
                    </div>
                  </div>
                </div>
              </div>
            )}

            {renderBottomNav({
              backTo: 6,
              nextLabel: 'Finish & Open Guardian HUD',
              nextGreen: true,
              onNext: handleFinishSetup,
            })}
          </>
        ) : null}

        {/* Extra clean Back button for Screen 6 sub-step navigation */}
        {screen === 6 ? (
          <div style={{ position: 'absolute', left: '22px', bottom: activeKeyboardField ? '223px' : '18px' }}>
            <button
              type="button"
              onClick={() => {
                if (calibStep === 'radar') switchCalibrationSubStep('temp');
                else if (calibStep === 'temp') switchCalibrationSubStep('pulse_spo2');
                else goToScreen(5);
              }}
              style={{
                height: '56px',
                padding: '0 24px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: colors.subPanelBg,
                color: colors.textPrimary,
                border: colors.border,
                fontSize: '18px',
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={20} weight="bold" />
              <span>Back</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* === HIDABLE / COLLAPSIBLE ON-SCREEN TOUCH KEYBOARD (~205px HEIGHT, ONLY WHEN INPUT FOCUSED) === */}
      {activeKeyboardField ? (
        <div
          data-virtual-kb="true"
          aria-label="Collapsible on-screen touch keyboard"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '205px',
            zIndex: 30,
            backgroundColor: colors.keyboardTrayBg,
            borderTop: `2px solid ${colors.blue}`,
            boxShadow: '0 -12px 30px rgba(15, 23, 42, 0.25)',
            padding: '7px 14px 8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top Bar of Keyboard: Field Label + Clear + Done + Prominent ⌄ Hide Keyboard */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: colors.textPrimary }}>
              Editing: {KEYBOARD_FIELD_LABELS[activeKeyboardField]}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setFieldValue(activeKeyboardField, '');
                  inputRefs.current[activeKeyboardField]?.focus();
                }}
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
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
                onClick={handleCommitInlineEntry}
                style={{
                  height: '30px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                }}
              >
                Done ✓
              </button>

              <button
                type="button"
                onClick={() => setActiveKeyboardField(null)}
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  backgroundColor: '#1D4ED8',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CaretDown size={14} weight="bold" />
                <span>Hide Keyboard</span>
              </button>
            </div>
          </div>

          {/* Row 1: Numbers & Handle Symbols */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
            {KEY_ROW_NUMS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleVirtualKey(k)}
                style={{
                  flex: 1,
                  height: '33px',
                  borderRadius: '5px',
                  fontSize: '14px',
                  fontWeight: 700,
                  backgroundColor: colors.keyBg,
                  color: colors.textPrimary,
                  border: colors.keyBorder,
                }}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Row 2: Q–P */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
            {KEY_ROW_TOP.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleVirtualKey(k)}
                style={{
                  flex: 1,
                  height: '34px',
                  borderRadius: '5px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  backgroundColor: colors.keyBg,
                  color: colors.textPrimary,
                  border: colors.keyBorder,
                }}
              >
                {isShiftOn ? k : k.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Row 3: A–L + / */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', padding: '0 16px' }}>
            {KEY_ROW_MID.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleVirtualKey(k)}
                style={{
                  flex: 1,
                  height: '34px',
                  borderRadius: '5px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  backgroundColor: colors.keyBg,
                  color: colors.textPrimary,
                  border: colors.keyBorder,
                }}
              >
                {isShiftOn && /[A-Z]/.test(k) ? k : k.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Row 4: Shift + Z–M + Space + Backspace */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
            <button
              type="button"
              onClick={() => setIsShiftOn((s) => !s)}
              style={{
                minWidth: '72px',
                height: '36px',
                borderRadius: '5px',
                fontSize: '12.5px',
                fontWeight: 800,
                backgroundColor: isShiftOn ? '#1D4ED8' : colors.keyBg,
                color: isShiftOn ? '#FFFFFF' : colors.textPrimary,
                border: colors.keyBorder,
              }}
            >
              ⇧ Shift
            </button>

            {KEY_ROW_BOT.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleVirtualKey(k)}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '5px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  backgroundColor: colors.keyBg,
                  color: colors.textPrimary,
                  border: colors.keyBorder,
                }}
              >
                {isShiftOn && /[A-Z]/.test(k) ? k : k.toLowerCase()}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleVirtualKey(' ')}
              style={{
                flex: 2.2,
                height: '36px',
                borderRadius: '5px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: colors.keyBg,
                color: colors.textSecondary,
                border: colors.keyBorder,
              }}
            >
              Space
            </button>

            <button
              type="button"
              onClick={handleVirtualBackspace}
              style={{
                minWidth: '78px',
                height: '36px',
                borderRadius: '5px',
                fontSize: '13px',
                fontWeight: 800,
                backgroundColor: colors.keyBg,
                color: colors.textPrimary,
                border: colors.keyBorder,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Backspace size={15} weight="bold" />
              <span>Del</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
