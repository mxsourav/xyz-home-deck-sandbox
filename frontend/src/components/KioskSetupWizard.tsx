import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Backspace,
  Camera,
  CaretDown,
  Check,
  Code,
  Heartbeat,
  LockKey,
  Moon,
  Plus,
  Sun,
  Thermometer,
  Trash,
  UploadSimple,
  UserCheck,
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
  startEmpty?: boolean;
  initialName?: string;
  initialAge?: number;
  initialLanguage?: PromptLanguage;
  initialGuardianName?: string;
  initialGuardianPhone?: string;
  initialTelegramHandle?: string;
  initialHomeAddress?: string;
  initialAllergies?: string[];
  initialConditions?: string[];
  initialMedications?: string[];
  initialWakeTime?: string;
  initialSleepTime?: string;
  initialAvatarDataUrl?: string | null;
  initialHr?: number;
  initialSpo2?: number;
  initialTempF?: number;
  onLanguageSelected: (lang: PromptLanguage) => void;
  onComplete: (payload: OnDeviceEnrollmentPayload) => void;
  onCancel: () => void;
}

type SetupScreenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type KeyboardTargetField =
  | 'name'
  | 'age'
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
  name: 'Resident Full Name',
  age: 'Age (Years)',
  guardianName: 'Guardian / Child Name',
  guardianPhone: 'Guardian Mobile Phone',
  telegramHandle: 'Telegram Alert Handle',
  homeAddress: 'Home Address / Pin',
  customAllergy: 'Allergy',
  newMed: 'Daily Medication',
};

const QUICK_ALLERGIES = [...ALLERGY_SUGGESTIONS.slice(0, 5), 'None'];
const QUICK_CONDITIONS = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Osteoarthritis', 'None'];

function shiftTime24(hhmm: string, deltaMinutes: number): string {
  const base = hhmm || '06:30';
  const [hStr, mStr] = base.split(':');
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
  if (!hhmm) return 'Not set';
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
  startEmpty = true,
  initialName = '',
  initialAge,
  initialLanguage = 'en',
  initialGuardianName = '',
  initialGuardianPhone = '',
  initialTelegramHandle = '',
  initialHomeAddress = '',
  initialAllergies = [],
  initialConditions = [],
  initialMedications = [],
  initialWakeTime = '',
  initialSleepTime = '',
  initialAvatarDataUrl = null,
  initialHr = 72,
  initialSpo2 = 98,
  initialTempF = 98.4,
  onLanguageSelected,
  onComplete,
  onCancel,
}: KioskSetupWizardProps) {
  const isDark = kioskTheme === 'dark';

  const [screen, setScreen] = useState<SetupScreenIndex>(0);
  const [language, setLanguage] = useState<PromptLanguage>(initialLanguage);
  const [languagePickedExplicitly, setLanguagePickedExplicitly] = useState<boolean>(false);

  // Clean empty-by-default onboarding form state (never pre-filled on setup)
  const [nameValue, setNameValue] = useState<string>(startEmpty ? '' : initialName);
  const [ageDraft, setAgeDraft] = useState<string>(
    startEmpty || !initialAge ? '' : String(initialAge)
  );

  const [guardianName, setGuardianName] = useState<string>(
    startEmpty ? '' : initialGuardianName
  );
  const [guardianPhone, setGuardianPhone] = useState<string>(
    startEmpty ? '' : initialGuardianPhone
  );
  const [telegramHandle, setTelegramHandle] = useState<string>(
    startEmpty ? '' : initialTelegramHandle
  );
  const [homeAddress, setHomeAddress] = useState<string>(
    startEmpty ? '' : initialHomeAddress
  );

  const [allergies, setAllergies] = useState<string[]>(startEmpty ? [] : initialAllergies);
  const [customAllergyInput, setCustomAllergyInput] = useState<string>('');
  const [showCustomAllergyBox, setShowCustomAllergyBox] = useState<boolean>(false);
  const [conditions, setConditions] = useState<string[]>(
    startEmpty ? [] : initialConditions
  );
  const [medications, setMedications] = useState<string[]>(
    startEmpty ? [] : initialMedications
  );
  const [newMedInput, setNewMedInput] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>(startEmpty ? '' : initialWakeTime);
  const [sleepTime, setSleepTime] = useState<string>(startEmpty ? '' : initialSleepTime);

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(
    startEmpty ? null : initialAvatarDataUrl
  );
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  // Calibration fields start blank so operator types manual values 1 by 1
  const [calibStep, setCalibStep] = useState<CalibrationStep>('pulse_spo2');
  const [calibPhase, setCalibPhase] = useState<CapturePhase>('waiting');
  const [samplingPct, setSamplingPct] = useState<number>(0);
  const [draftHr, setDraftHr] = useState<string>('');
  const [draftSpo2, setDraftSpo2] = useState<string>('');
  const [draftTempF, setDraftTempF] = useState<string>('');
  const [draftBreathing, setDraftBreathing] = useState<string>('');
  const [lockedHr, setLockedHr] = useState<number | null>(null);
  const [lockedSpo2, setLockedSpo2] = useState<number | null>(null);
  const [lockedTempF, setLockedTempF] = useState<number | null>(null);
  const [lockedBreathing, setLockedBreathing] = useState<number | null>(null);
  const [calibError, setCalibError] = useState<string | null>(null);
  const samplingTimerRef = useRef<number | null>(null);

  const [generatedPlan, setGeneratedPlan] = useState<CarePlanResponse | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [showJsonDrawer, setShowJsonDrawer] = useState<boolean>(false);

  // Hidable virtual touch keyboard (stays closed unless an input is tapped)
  const [activeKeyboardField, setActiveKeyboardField] =
    useState<KeyboardTargetField | null>(null);
  const [isShiftOn, setIsShiftOn] = useState<boolean>(false);

  const inputRefs = useRef<Partial<Record<KeyboardTargetField, HTMLInputElement | null>>>({});

  const parsedAge = Number(ageDraft);
  const hasValidAge = Number.isFinite(parsedAge) && parsedAge >= 18 && parsedAge <= 115;
  const effectiveAge = hasValidAge ? Math.round(parsedAge) : 65;
  const tier = computeAccessibilityTier(effectiveAge);

  const c = isDark
    ? {
        bg: '#0B1120',
        surface: '#111827',
        subtle: '#1E293B',
        border: '#334155',
        borderFocus: '#38BDF8',
        ink: '#F8FAFC',
        inkSecondary: '#CBD5E1',
        inkMuted: '#94A3B8',
        primary: '#2563EB',
        primaryText: '#FFFFFF',
        positive: '#22C55E',
        danger: '#F87171',
        kbBg: '#0F172A',
        keyBg: '#1E293B',
        keyBorder: '#334155',
      }
    : {
        bg: '#FFFFFF',
        surface: '#F8FAFC',
        subtle: '#F1F5F9',
        border: '#CBD5E1',
        borderFocus: '#1D4ED8',
        ink: '#0F172A',
        inkSecondary: '#475569',
        inkMuted: '#64748B',
        primary: '#1D4ED8',
        primaryText: '#FFFFFF',
        positive: '#15803D',
        danger: '#B91C1C',
        kbBg: '#F1F5F9',
        keyBg: '#FFFFFF',
        keyBorder: '#CBD5E1',
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

  const getFieldValue = (field: KeyboardTargetField): string => {
    switch (field) {
      case 'name':
        return nameValue;
      case 'age':
        return ageDraft;
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
      case 'age':
        setAgeDraft(next.replace(/[^0-9]/g, '').slice(0, 3));
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
    setLanguagePickedExplicitly(true);
    onLanguageSelected(lang);
    audioEngine.unlock();
    audioEngine.playConfirmChime();
    audioEngine.speakPrompt('standby_mode', lang, tier.speechRate);
  };

  const toggleAllergyChip = (chip: string) => {
    if (chip === 'None') {
      setAllergies(['None']);
      return;
    }
    setAllergies((prev) => {
      const base = prev.filter((item) => item !== 'None');
      return base.includes(chip) ? base.filter((x) => x !== chip) : [...base, chip];
    });
  };

  const toggleConditionChip = (chip: string) => {
    if (chip === 'None') {
      setConditions(['None']);
      return;
    }
    setConditions((prev) => {
      const base = prev.filter((item) => item !== 'None');
      return base.includes(chip) ? base.filter((x) => x !== chip) : [...base, chip];
    });
  };

  // Camera Handlers
  const handleStartWebcam = async () => {
    setCameraNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraNotice('Browser webcam access unavailable. Upload a portrait photo or generate a sample.');
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
      setCameraNotice('Camera access blocked or unavailable. Use Upload Photo or Sample Portrait.');
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

  // Sequential Calibration Handlers
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
    const hrVal = Number(draftHr || initialHr);
    const spVal = Number(draftSpo2 || initialSpo2);
    const tfVal = Number(draftTempF || initialTempF);
    const brVal = Number(draftBreathing || 16);

    if (calibStep === 'pulse_spo2') {
      if (!draftHr.trim() || !draftSpo2.trim()) {
        setCalibError('Type resting Heart Rate & SpO₂ values to lock calibration.');
        return;
      }
      if (!Number.isFinite(hrVal) || hrVal < 40 || hrVal > 160) {
        setCalibError('Heart Rate must be 40–160 BPM.');
        return;
      }
      if (!Number.isFinite(spVal) || spVal < 80 || spVal > 100) {
        setCalibError('SpO₂ must be 80–100%.');
        return;
      }
    } else if (calibStep === 'temp') {
      if (!draftTempF.trim()) {
        setCalibError('Type forehead IR temperature (°F) to lock reading.');
        return;
      }
      if (!Number.isFinite(tfVal) || tfVal < 94.0 || tfVal > 104.0) {
        setCalibError('Body Temp must be 94.0–104.0°F.');
        return;
      }
    } else {
      if (!draftBreathing.trim()) {
        setCalibError('Type radar breathing rate (br/min) to lock reading.');
        return;
      }
      if (!Number.isFinite(brVal) || brVal < 8 || brVal > 36) {
        setCalibError('Breathing rate must be 8–36 br/min.');
        return;
      }
    }

    if (samplingTimerRef.current !== null) {
      window.clearInterval(samplingTimerRef.current);
    }
    setCalibPhase('sampling');
    setSamplingPct(18);

    let tick = 18;
    samplingTimerRef.current = window.setInterval(() => {
      tick += 22;
      if (tick >= 100) {
        if (samplingTimerRef.current !== null) {
          window.clearInterval(samplingTimerRef.current);
          samplingTimerRef.current = null;
        }
        setSamplingPct(100);
        setCalibPhase('captured');
        if (calibStep === 'pulse_spo2') {
          setLockedHr(Math.round(hrVal));
          setLockedSpo2(Math.round(spVal));
        } else if (calibStep === 'temp') {
          setLockedTempF(Number(tfVal.toFixed(1)));
        } else {
          setLockedBreathing(Math.round(brVal));
        }
        audioEngine.playConfirmChime();
      } else {
        setSamplingPct(tick);
      }
    }, 140);
  };

  // Care Plan Generation
  const prepareCarePlan = async () => {
    const cleanName = nameValue.trim() || 'Resident';
    const finalWake = wakeTime || '06:30';
    const finalSleep = sleepTime || '21:30';
    const cleanAllergies = allergies.filter((a) => a !== 'None');
    const cleanConditions = conditions.filter((cond) => cond !== 'None');

    const seedProfile = {
      name: cleanName,
      age: effectiveAge,
      allergies: cleanAllergies,
      conditions: cleanConditions,
      medications,
      wakeTime: finalWake,
      sleepTime: finalSleep,
    };
    const instantFallback = buildOfflineCarePlanFallback(seedProfile);
    setGeneratedPlan(instantFallback);
    setIsGeneratingPlan(true);
    try {
      const aiPlan = await generateCarePlanWithAi({
        name: cleanName,
        age: effectiveAge,
        language,
        allergies: cleanAllergies,
        conditions: cleanConditions,
        medications,
        wake_time: finalWake,
        sleep_time: finalSleep,
      });
      setGeneratedPlan(aiPlan);
    } catch {
      setGeneratedPlan(instantFallback);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const loadDemoProfile = () => {
    setLanguage('bn');
    setLanguagePickedExplicitly(true);
    onLanguageSelected?.('bn');
    setNameValue('Subhashree Devi');
    setAgeDraft('78');
    setGuardianName('Sourav Biswas');
    setGuardianPhone('+91 98300 41280');
    setTelegramHandle('@sourav_family_alert');
    setHomeAddress('42/B Shyambazar Street, Kolkata 700004');
    setAllergies(['Peanuts']);
    setConditions(['Hypertension']);
    setMedications(['Metformin 500mg · 08:30 AM']);
    setWakeTime('05:45');
    setSleepTime('21:30');
    setLockedHr(72);
    setLockedSpo2(98);
    setLockedTempF(98.6);
    setLockedBreathing(16);
    audioEngine.playConfirmChime();
    goToScreen(2);
  };

  const handleFinishSetup = () => {
    const finalWake = wakeTime || '06:30';
    const finalSleep = sleepTime || '21:30';
    const cleanAllergies = allergies.filter((a) => a !== 'None');
    const cleanConditions = conditions.filter((cond) => cond !== 'None');
    const finalPlan =
      generatedPlan ??
      buildOfflineCarePlanFallback({
        name: nameValue.trim() || 'Resident',
        age: effectiveAge,
        allergies: cleanAllergies,
        conditions: cleanConditions,
        medications,
        wakeTime: finalWake,
        sleepTime: finalSleep,
      });

    onComplete({
      name: nameValue.trim() || 'Resident',
      age: effectiveAge,
      heartRate: lockedHr ?? (Number(draftHr) || initialHr),
      spo2: lockedSpo2 ?? (Number(draftSpo2) || initialSpo2),
      bodyTempF: lockedTempF ?? (Number(draftTempF) || initialTempF),
      language,
      guardianName: guardianName.trim() || 'Primary Guardian',
      guardianPhone: guardianPhone.trim() || 'Not specified',
      telegramHandle: telegramHandle.trim() || 'Not configured',
      homeAddress: homeAddress.trim() || 'Home Location Saved',
      allergies: cleanAllergies,
      conditions: cleanConditions,
      medications,
      wakeTime: finalWake,
      sleepTime: finalSleep,
      avatarDataUrl,
      carePlan: finalPlan,
    });
  };

  const renderBottomNav = (opts: {
    backTo?: SetupScreenIndex;
    backAction?: () => void;
    nextLabel: string;
    nextDisabled?: boolean;
    onNext: () => void;
    nextGreen?: boolean;
  }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        paddingTop: '12px',
        borderTop: `1px solid ${c.border}`,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (opts.backAction) opts.backAction();
          else if (opts.backTo !== undefined) goToScreen(opts.backTo);
        }}
        style={{
          height: '48px',
          padding: '0 20px',
          borderRadius: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          color: c.ink,
          border: `1px solid ${c.border}`,
          fontSize: '15.5px',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={17} weight="bold" />
        <span>Back</span>
      </button>

      <button
        type="button"
        disabled={opts.nextDisabled}
        onClick={opts.onNext}
        style={{
          height: '48px',
          padding: '0 24px',
          borderRadius: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: opts.nextDisabled
            ? c.subtle
            : opts.nextGreen
              ? '#15803D'
              : c.primary,
          color: opts.nextDisabled ? c.inkMuted : '#FFFFFF',
          border: 'none',
          fontSize: '15.5px',
          fontWeight: 700,
        }}
      >
        <span>{opts.nextLabel}</span>
        <ArrowRight size={17} weight="bold" />
      </button>
    </div>
  );

  const greetingHeading = !languagePickedExplicitly
    ? 'Hello · স্বাগতম · नमस्ते'
    : language === 'bn'
      ? 'নমস্কার · স্বাগতম'
      : language === 'hi'
        ? 'नमस्ते · आपका स्वागत है'
        : 'Hello · Welcome';

  const calibStepNumber =
    calibStep === 'pulse_spo2' ? 1 : calibStep === 'temp' ? 2 : 3;

  const isNextCalibLocked =
    calibStep === 'pulse_spo2'
      ? lockedHr !== null
      : calibStep === 'temp'
        ? lockedTempF !== null
        : lockedBreathing !== null;

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
        backgroundColor: c.bg,
        color: c.ink,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* === MINIMAL HEADER BAR (Clean Title, No Step Pills, No Hardware Strip) === */}
      <div
        style={{
          height: '48px',
          padding: '0 24px',
          backgroundColor: c.bg,
          borderBottom: `1px solid ${c.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 800,
              color: c.ink,
              letterSpacing: '-0.01em',
            }}
          >
            XYZ Home Deck
          </span>
          {screen > 0 ? (
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: c.inkMuted }}>
              Step {screen} of 7
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {screen === 0 ? (
            <div
              role="group"
              aria-label="Greeting language"
              style={{
                display: 'inline-flex',
                border: `1px solid ${c.border}`,
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              {(['en', 'hi', 'bn'] as PromptLanguage[]).map((lang) => {
                const active = languagePickedExplicitly && language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handlePickLanguage(lang)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      backgroundColor: active ? c.primary : c.surface,
                      color: active ? '#FFFFFF' : c.inkSecondary,
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'transparent',
                color: c.inkMuted,
                border: `1px solid ${c.border}`,
              }}
            >
              Exit Setup
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: c.surface,
              color: c.ink,
              border: `1px solid ${c.border}`,
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

      {/* === SCREEN 0: AUTHENTIC OUT-OF-BOX FIRST-BOOT GREETING SCREEN === */}
      {screen === 0 ? (
        <div
          style={{
            flex: 1,
            padding: '24px 36px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div />

          {/* Clean Vertically Centered First-Boot Greeting + Round Start Arrow Button */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '42px',
                fontWeight: 800,
                color: c.ink,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              {greetingHeading}
            </h1>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 500,
                color: c.inkSecondary,
                marginTop: '2px',
              }}
            >
              XYZ Home Deck · Autonomous Elderly Care Hub
            </div>

            <p
              style={{
                fontSize: '15px',
                color: c.inkMuted,
                maxWidth: '580px',
                lineHeight: 1.5,
              }}
            >
              24/7 contactless vitals, breathing radar, and instant family escalation.
            </p>

            <div
              style={{
                marginTop: '18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => goToScreen(1)}
                aria-label="Start setup"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: c.primary,
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(29, 78, 216, 0.25)',
                }}
              >
                <ArrowRight size={28} weight="bold" />
              </button>
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: c.inkSecondary,
                }}
              >
                Start Setup
              </span>
            </div>
          </div>

          {/* Minimal Bottom-Right Quick Demo Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={loadDemoProfile}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px 4px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: c.inkMuted,
              }}
            >
              Load Demo Profile →
            </button>
          </div>
        </div>
      ) : (
        /* === SCREENS 1–7: CALM EDITORIAL CAREGIVER ONBOARDING FLOW === */
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: activeKeyboardField ? 'auto' : 'hidden',
            padding: '20px 30px',
            paddingBottom: activeKeyboardField ? '224px' : '20px',
          }}
        >
          <div
            style={{
              minHeight: '512px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
          {/* SCREEN 1: CHOOSE PREFERRED LANGUAGE */}
          {screen === 1 ? (
            <>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
                  Choose spoken &amp; screen language
                </h2>
                <p style={{ fontSize: '15px', color: c.inkMuted, marginTop: '4px' }}>
                  Select the language your parent is most comfortable hearing and reading.
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '16px',
                  alignItems: 'center',
                }}
              >
                {(
                  [
                    {
                      code: 'en',
                      title: 'English',
                      sub: 'Voice alerts and legible HUD prompts in Indian English.',
                    },
                    {
                      code: 'hi',
                      title: 'हिन्दी (Hindi)',
                      sub: 'आवाज़ और स्क्रीन निर्देश सहज हिन्दी में।',
                    },
                    {
                      code: 'bn',
                      title: 'বাংলা (Bengali)',
                      sub: 'বাংলায় ভয়েস নির্দেশনা এবং বড় অক্ষরের স্ক্রিন।',
                    },
                  ] as { code: PromptLanguage; title: string; sub: string }[]
                ).map((item) => {
                  const selected = language === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handlePickLanguage(item.code)}
                      style={{
                        height: '168px',
                        padding: '22px',
                        borderRadius: '10px',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: selected ? c.subtle : c.surface,
                        border: selected
                          ? `2px solid ${c.borderFocus}`
                          : `1px solid ${c.border}`,
                        color: c.ink,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: c.primary }}>
                          {item.code.toUpperCase()}-IN
                        </span>
                        {selected ? <Check size={18} weight="bold" color={c.primary} /> : null}
                      </div>

                      <div style={{ fontSize: '23px', fontWeight: 700 }}>{item.title}</div>
                      <div style={{ fontSize: '14px', color: c.inkMuted, lineHeight: 1.4 }}>{item.sub}</div>
                    </button>
                  );
                })}
              </div>

              {renderBottomNav({
                backTo: 0,
                nextLabel: 'Next: Parent Identity',
                onNext: () => goToScreen(2),
              })}
            </>
          ) : null}

          {/* SCREEN 2: RESIDENT NAME & AGE (EMPTY BY DEFAULT, HIDABLE TOUCH KEYBOARD) */}
          {screen === 2 ? (
            <>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
                  Who is this hub monitoring?
                </h2>
                <p style={{ fontSize: '15px', color: c.inkMuted, marginTop: '4px' }}>
                  Enter your parent&apos;s name and age so voice speed and button legibility adjust automatically.
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '56fr 44fr',
                  gap: '24px',
                  minHeight: 0,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '18px' }}>
                  <div data-setup-input="true">
                    <label
                      htmlFor="setup-resident-name"
                      style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: c.inkSecondary, marginBottom: '6px' }}
                    >
                      Full Name
                    </label>
                    <input
                      id="setup-resident-name"
                      ref={(el) => {
                        inputRefs.current.name = el;
                      }}
                      type="text"
                      value={nameValue}
                      onFocus={() => setActiveKeyboardField('name')}
                      onClick={() => openKeyboardFor('name')}
                      onChange={(e) => setNameValue(e.target.value.slice(0, 42))}
                      placeholder="Enter parent's full name"
                      style={{
                        width: '100%',
                        height: '52px',
                        padding: '0 14px',
                        fontSize: '17px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        backgroundColor: c.surface,
                        color: c.ink,
                        border: `1.5px solid ${
                          activeKeyboardField === 'name' ? c.borderFocus : c.border
                        }`,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label
                        htmlFor="setup-resident-age"
                        style={{ fontSize: '14px', fontWeight: 600, color: c.inkSecondary }}
                      >
                        Age (Years)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setAgeDraft('50')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            backgroundColor: ageDraft === '50' ? c.primary : c.surface,
                            color: ageDraft === '50' ? '#FFFFFF' : c.inkSecondary,
                            border: `1px solid ${c.border}`,
                          }}
                        >
                          50
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgeDraft('78')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            backgroundColor: ageDraft === '78' ? c.primary : c.surface,
                            color: ageDraft === '78' ? '#FFFFFF' : c.inkSecondary,
                            border: `1px solid ${c.border}`,
                          }}
                        >
                          78
                        </button>
                      </div>
                    </div>

                    <div data-setup-input="true" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setAgeDraft((prev) => String(Math.max(18, (Number(prev) || 65) - 1)))
                        }
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '8px',
                          backgroundColor: c.surface,
                          color: c.ink,
                          border: `1px solid ${c.border}`,
                          fontSize: '20px',
                          fontWeight: 600,
                        }}
                      >
                        −
                      </button>

                      <input
                        id="setup-resident-age"
                        ref={(el) => {
                          inputRefs.current.age = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        value={ageDraft}
                        onFocus={() => setActiveKeyboardField('age')}
                        onClick={() => openKeyboardFor('age')}
                        onChange={(e) => setAgeDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                        placeholder="e.g. 50 or 78"
                        className="tabular-nums"
                        style={{
                          flex: 1,
                          height: '52px',
                          padding: '0 14px',
                          fontSize: '18px',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '8px',
                          backgroundColor: c.surface,
                          color: c.ink,
                          border: `1.5px solid ${
                            activeKeyboardField === 'age' ? c.borderFocus : c.border
                          }`,
                          outline: 'none',
                        }}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setAgeDraft((prev) => String(Math.min(110, (Number(prev) || 64) + 1)))
                        }
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '8px',
                          backgroundColor: c.surface,
                          color: c.ink,
                          border: `1px solid ${c.border}`,
                          fontSize: '20px',
                          fontWeight: 600,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clean Editorial Comparison Box (Zero Pill Badges) */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '10px',
                    backgroundColor: c.surface,
                    border: `1px solid ${c.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '14px',
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: c.ink }}>
                    Interface adaptation by age
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: hasValidAge && effectiveAge < 65 ? c.bg : 'transparent',
                      border:
                        hasValidAge && effectiveAge < 65
                          ? `1.5px solid ${c.borderFocus}`
                          : `1px solid ${c.border}`,
                    }}
                  >
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: c.ink }}>
                      Under 65 · Standard Cockpit
                    </div>
                    <div style={{ fontSize: '13px', color: c.inkMuted, marginTop: '2px' }}>
                      Compact 6-tile dashboard and 1.0× voice cadence.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: hasValidAge && effectiveAge >= 65 ? c.bg : 'transparent',
                      border:
                        hasValidAge && effectiveAge >= 65
                          ? `1.5px solid ${c.borderFocus}`
                          : `1px solid ${c.border}`,
                    }}
                  >
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: c.ink }}>
                      65 and above · High-Assist HUD
                    </div>
                    <div style={{ fontSize: '13px', color: c.inkMuted, marginTop: '2px' }}>
                      Large 58px clock, 3-tile vitals focus, and 0.78× calm speech rate.
                    </div>
                  </div>
                </div>
              </div>

              {renderBottomNav({
                backTo: 1,
                nextLabel: 'Next: Emergency Contact',
                nextDisabled: !nameValue.trim() || !hasValidAge,
                onNext: () => goToScreen(3),
              })}
            </>
          ) : null}

          {/* SCREEN 3: GUARDIAN EMERGENCY CONTACT & HOME ADDRESS (EMPTY BY DEFAULT) */}
          {screen === 3 ? (
            <>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
                  Emergency contact &amp; home address
                </h2>
                <p style={{ fontSize: '15px', color: c.inkMuted, marginTop: '4px' }}>
                  Notified automatically by phone call, SMS, and Telegram if an alert goes unanswered.
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div data-setup-input="true">
                    <label
                      htmlFor="setup-guardian-name"
                      style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: c.inkSecondary, marginBottom: '5px' }}
                    >
                      Guardian / Child Name
                    </label>
                    <input
                      id="setup-guardian-name"
                      ref={(el) => {
                        inputRefs.current.guardianName = el;
                      }}
                      type="text"
                      value={guardianName}
                      onFocus={() => setActiveKeyboardField('guardianName')}
                      onClick={() => openKeyboardFor('guardianName')}
                      onChange={(e) => setGuardianName(e.target.value.slice(0, 42))}
                      placeholder="Full name of caregiver"
                      style={{
                        width: '100%',
                        height: '50px',
                        padding: '0 14px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        backgroundColor: c.surface,
                        color: c.ink,
                        border: `1.5px solid ${
                          activeKeyboardField === 'guardianName' ? c.borderFocus : c.border
                        }`,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div data-setup-input="true">
                    <label
                      htmlFor="setup-guardian-phone"
                      style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: c.inkSecondary, marginBottom: '5px' }}
                    >
                      Mobile Phone
                    </label>
                    <input
                      id="setup-guardian-phone"
                      ref={(el) => {
                        inputRefs.current.guardianPhone = el;
                      }}
                      type="text"
                      value={guardianPhone}
                      onFocus={() => setActiveKeyboardField('guardianPhone')}
                      onClick={() => openKeyboardFor('guardianPhone')}
                      onChange={(e) => setGuardianPhone(e.target.value.slice(0, 24))}
                      placeholder="+91 phone number"
                      style={{
                        width: '100%',
                        height: '50px',
                        padding: '0 14px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        backgroundColor: c.surface,
                        color: c.ink,
                        border: `1.5px solid ${
                          activeKeyboardField === 'guardianPhone' ? c.borderFocus : c.border
                        }`,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '16px' }}>
                  <div data-setup-input="true">
                    <label
                      htmlFor="setup-telegram-handle"
                      style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: c.inkSecondary, marginBottom: '5px' }}
                    >
                      Telegram Handle (Optional)
                    </label>
                    <input
                      id="setup-telegram-handle"
                      ref={(el) => {
                        inputRefs.current.telegramHandle = el;
                      }}
                      type="text"
                      value={telegramHandle}
                      onFocus={() => setActiveKeyboardField('telegramHandle')}
                      onClick={() => openKeyboardFor('telegramHandle')}
                      onChange={(e) => setTelegramHandle(e.target.value.slice(0, 32))}
                      placeholder="@username"
                      style={{
                        width: '100%',
                        height: '50px',
                        padding: '0 14px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        backgroundColor: c.surface,
                        color: c.ink,
                        border: `1.5px solid ${
                          activeKeyboardField === 'telegramHandle' ? c.borderFocus : c.border
                        }`,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div data-setup-input="true">
                    <label
                      htmlFor="setup-home-address"
                      style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: c.inkSecondary, marginBottom: '5px' }}
                    >
                      Home Address (Dispatched on Emergency Escalation)
                    </label>
                    <input
                      id="setup-home-address"
                      ref={(el) => {
                        inputRefs.current.homeAddress = el;
                      }}
                      type="text"
                      value={homeAddress}
                      onFocus={() => setActiveKeyboardField('homeAddress')}
                      onClick={() => openKeyboardFor('homeAddress')}
                      onChange={(e) => setHomeAddress(e.target.value.slice(0, 80))}
                      placeholder="Street address, landmark, postal code"
                      style={{
                        width: '100%',
                        height: '50px',
                        padding: '0 14px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        backgroundColor: c.surface,
                        color: c.ink,
                        border: `1.5px solid ${
                          activeKeyboardField === 'homeAddress' ? c.borderFocus : c.border
                        }`,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {renderBottomNav({
                backTo: 2,
                nextLabel: 'Next: Health & Sleep',
                onNext: () => goToScreen(4),
              })}
            </>
          ) : null}

          {/* SCREEN 4: ALLERGIES, CONDITIONS, MEDICATIONS & SLEEP ROUTINE */}
          {screen === 4 ? (
            <>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
                  Allergies, conditions &amp; sleep schedule
                </h2>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '55fr 45fr',
                  gap: '20px',
                  minHeight: 0,
                }}
              >
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: c.inkSecondary, marginBottom: '6px' }}>
                      Food or Medication Allergies
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {QUICK_ALLERGIES.map((chip) => {
                        const active = allergies.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleAllergyChip(chip)}
                            style={{
                              height: '38px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              fontSize: '13.5px',
                              fontWeight: 600,
                              backgroundColor: active ? c.primary : c.surface,
                              color: active ? '#FFFFFF' : c.ink,
                              border: `1px solid ${active ? c.primary : c.border}`,
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
                          height: '38px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          backgroundColor: c.bg,
                          color: c.primary,
                          border: `1px solid ${c.border}`,
                        }}
                      >
                        + Other
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
                          placeholder="Type allergy name"
                          style={{
                            flex: 1,
                            height: '38px',
                            padding: '0 10px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            backgroundColor: c.surface,
                            color: c.ink,
                            border: `1.5px solid ${c.borderFocus}`,
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCommitInlineEntry}
                          style={{
                            height: '38px',
                            padding: '0 14px',
                            borderRadius: '6px',
                            backgroundColor: c.primary,
                            color: '#FFFFFF',
                            fontWeight: 600,
                          }}
                        >
                          Add
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: c.inkSecondary, marginBottom: '6px' }}>
                      Chronic Conditions
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {QUICK_CONDITIONS.map((chip) => {
                        const active = conditions.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleConditionChip(chip)}
                            style={{
                              height: '38px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              fontSize: '13.5px',
                              fontWeight: 600,
                              backgroundColor: active ? c.primary : c.surface,
                              color: active ? '#FFFFFF' : c.ink,
                              border: `1px solid ${active ? c.primary : c.border}`,
                            }}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: c.inkSecondary, marginBottom: '5px' }}>
                      Daily Medications
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {medications.map((med) => (
                        <span
                          key={med}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            height: '34px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            backgroundColor: c.surface,
                            border: `1px solid ${c.border}`,
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <span>{med}</span>
                          <button
                            type="button"
                            onClick={() => setMedications((prev) => prev.filter((item) => item !== med))}
                            aria-label={`Remove ${med}`}
                            style={{ color: c.danger, background: 'transparent', padding: 0 }}
                          >
                            <Trash size={13} weight="bold" />
                          </button>
                        </span>
                      ))}
                      <div data-setup-input="true" style={{ display: 'inline-flex', gap: '6px', flex: 1, minWidth: '180px' }}>
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
                          placeholder="Add medication & time"
                          style={{
                            flex: 1,
                            height: '38px',
                            padding: '0 10px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            backgroundColor: c.surface,
                            color: c.ink,
                            border: `1px solid ${c.border}`,
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
                              height: '38px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              backgroundColor: c.primary,
                              color: '#FFFFFF',
                            }}
                          >
                            <Plus size={15} weight="bold" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Wake & Sleep Routine */}
                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: '10px',
                    backgroundColor: c.surface,
                    border: `1px solid ${c.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: c.inkSecondary, marginBottom: '6px' }}>
                      Wake-Up Time
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setWakeTime((t) => shiftTime24(t || '06:30', -15))}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          backgroundColor: c.bg,
                          color: c.ink,
                          border: `1px solid ${c.border}`,
                          fontSize: '20px',
                        }}
                      >
                        −
                      </button>
                      <span className="tabular-nums" style={{ fontSize: '24px', fontWeight: 700, color: wakeTime ? c.ink : c.inkMuted }}>
                        {format12Hour(wakeTime)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setWakeTime((t) => shiftTime24(t || '06:15', 15))}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          backgroundColor: c.bg,
                          color: c.ink,
                          border: `1px solid ${c.border}`,
                          fontSize: '20px',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: c.inkSecondary, marginBottom: '6px' }}>
                      Sleep / Bed Time
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setSleepTime((t) => shiftTime24(t || '21:30', -15))}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          backgroundColor: c.bg,
                          color: c.ink,
                          border: `1px solid ${c.border}`,
                          fontSize: '20px',
                        }}
                      >
                        −
                      </button>
                      <span className="tabular-nums" style={{ fontSize: '24px', fontWeight: 700, color: sleepTime ? c.primary : c.inkMuted }}>
                        {format12Hour(sleepTime)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSleepTime((t) => shiftTime24(t || '21:15', 15))}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          backgroundColor: c.bg,
                          color: c.ink,
                          border: `1px solid ${c.border}`,
                          fontSize: '20px',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: c.inkMuted, lineHeight: 1.45 }}>
                    Between sleep and wake hours, 24GHz radar monitors night breathing and alerts if a bathroom absence lasts over 15 minutes.
                  </p>
                </div>
              </div>

              {renderBottomNav({
                backTo: 3,
                nextLabel: 'Next: Face Recognition',
                onNext: () => goToScreen(5),
              })}
            </>
          ) : null}

          {/* SCREEN 5: FACE RECOGNITION ENROLLMENT (CLEAN HAIRLINE DESIGN) */}
          {screen === 5 ? (
            <>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
                  Enroll resident portrait for face recognition
                </h2>
                <p style={{ fontSize: '15px', color: c.inkMuted, marginTop: '4px' }}>
                  Stored solely on device storage so visitors never see personal medical vitals.
                </p>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '52fr 48fr',
                  gap: '20px',
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '10px',
                    backgroundColor: c.surface,
                    border: `1px solid ${c.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '180px',
                      height: '180px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: `2px solid ${cameraActive ? c.positive : c.border}`,
                      backgroundColor: c.bg,
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
                        alt={nameValue || 'Portrait'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Camera size={44} weight="duotone" color={c.inkMuted} />
                    )}
                  </div>

                  {cameraNotice ? (
                    <div style={{ fontSize: '12.5px', color: c.danger, textAlign: 'center' }}>
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
                          height: '48px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          backgroundColor: '#15803D',
                          color: '#FFFFFF',
                          fontSize: '14.5px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '7px',
                        }}
                      >
                        <Camera size={18} weight="fill" />
                        <span>Capture Photo</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartWebcam}
                        style={{
                          flex: 1,
                          height: '48px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          backgroundColor: c.primary,
                          color: '#FFFFFF',
                          fontSize: '14.5px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '7px',
                        }}
                      >
                        <Camera size={18} weight="duotone" />
                        <span>Open Webcam</span>
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
                        height: '48px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        backgroundColor: c.bg,
                        color: c.ink,
                        border: `1px solid ${c.border}`,
                        fontSize: '13.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <UploadSimple size={16} weight="bold" />
                      <span>Upload</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopWebcamStream();
                        setAvatarDataUrl(buildSamplePortraitDataUrl(nameValue || 'Resident', effectiveAge));
                        audioEngine.playConfirmChime();
                      }}
                      style={{
                        height: '48px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        backgroundColor: c.bg,
                        color: c.ink,
                        border: `1px solid ${c.border}`,
                        fontSize: '13.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <UserCheck size={16} weight="duotone" />
                      <span>Sample Portrait</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    padding: '22px',
                    borderRadius: '10px',
                    backgroundColor: c.surface,
                    border: `1px solid ${c.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: c.positive }}>
                    <LockKey size={18} weight="duotone" />
                    <span>Local Hardware Recognition Only — No Cloud Sync</span>
                  </div>

                  <div style={{ fontSize: '18px', fontWeight: 700, color: c.ink }}>
                    {nameValue || 'New Resident'} · {hasValidAge ? `${effectiveAge} yrs` : 'Age pending'}
                  </div>

                  <p style={{ fontSize: '14.5px', color: c.inkSecondary, lineHeight: 1.55 }}>
                    Facial embeddings stay encrypted on internal flash memory. Unrecognized faces keep medical history hidden under Guest Lock.
                  </p>
                </div>
              </div>

              {renderBottomNav({
                backTo: 4,
                nextLabel: 'Next: Sensor Calibration',
                onNext: () => {
                  switchCalibrationSubStep('pulse_spo2');
                  goToScreen(6);
                },
              })}
            </>
          ) : null}

          {/* SCREEN 6: 1-BY-1 SENSOR CALIBRATION (PULSE/SPO2 -> TEMP -> RADAR, EMPTY INPUTS BY DEFAULT) */}
          {screen === 6 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '23px', fontWeight: 700 }}>
                    Sensor calibration ({calibStepNumber} of 3):{' '}
                    {calibStep === 'pulse_spo2'
                      ? 'MAX30102 Pulse & SpO₂'
                      : calibStep === 'temp'
                        ? 'MLX90614 Body Temperature'
                        : '24GHz Radar Breathing'}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {(
                    [
                      { id: 'pulse_spo2', label: '1. Pulse & SpO₂', done: lockedHr !== null },
                      { id: 'temp', label: '2. Body Temp', done: lockedTempF !== null },
                      { id: 'radar', label: '3. Breathing', done: lockedBreathing !== null },
                    ] as { id: CalibrationStep; label: string; done: boolean }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => switchCalibrationSubStep(item.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        backgroundColor: calibStep === item.id ? c.primary : c.surface,
                        color: calibStep === item.id ? '#FFFFFF' : item.done ? c.positive : c.inkSecondary,
                        border: `1px solid ${calibStep === item.id ? c.primary : c.border}`,
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
                  gap: '16px',
                  minHeight: 0,
                }}
              >
                {/* Left Live State */}
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '10px',
                    backgroundColor: c.surface,
                    border: `1px solid ${c.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {calibStep === 'pulse_spo2' ? (
                      <Heartbeat size={28} weight="duotone" color={calibPhase === 'captured' ? c.positive : c.primary} />
                    ) : calibStep === 'temp' ? (
                      <Thermometer size={28} weight="duotone" color={calibPhase === 'captured' ? c.positive : c.primary} />
                    ) : (
                      <Wind size={28} weight="duotone" color={calibPhase === 'captured' ? c.positive : c.primary} />
                    )}
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 700 }}>
                        {calibPhase === 'captured'
                          ? 'Baseline Locked ✓'
                          : calibPhase === 'sampling'
                            ? `Acquiring baseline (${samplingPct}%)...`
                            : calibStep === 'pulse_spo2'
                              ? 'Place finger on optical pad...'
                              : calibStep === 'temp'
                                ? 'Hold forehead 5–10 cm from IR sensor...'
                                : 'Sit calmly 3 seconds for breathing lock...'}
                      </div>
                      <div style={{ fontSize: '13.5px', color: c.inkMuted }}>
                        Sets personal alert bounds so resting variations never trigger false alarms.
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: c.bg,
                      border: `1px solid ${c.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    {calibStep === 'pulse_spo2' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'baseline' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: c.inkMuted }}>Heart Rate</div>
                            <div className="tabular-nums" style={{ fontSize: '40px', fontWeight: 800, color: lockedHr !== null ? c.positive : c.ink }}>
                              {lockedHr ?? (calibPhase === 'sampling' ? draftHr || '--' : '--')}{' '}
                              <span style={{ fontSize: '15px', color: c.inkMuted }}>BPM</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: c.inkMuted }}>Oxygen Saturation</div>
                            <div className="tabular-nums" style={{ fontSize: '40px', fontWeight: 800, color: lockedSpo2 !== null ? c.positive : c.ink }}>
                              {lockedSpo2 ?? (calibPhase === 'sampling' ? draftSpo2 || '--' : '--')}{' '}
                              <span style={{ fontSize: '15px', color: c.inkMuted }}>%</span>
                            </div>
                          </div>
                        </div>
                        <PpgWaveformCanvas
                          heartRate={calibPhase === 'waiting' ? 62 : Number(draftHr) || 72}
                          spo2={calibPhase === 'waiting' ? 84 : Number(draftSpo2) || 98}
                          statusTone={calibPhase === 'captured' ? 'emerald' : 'amber'}
                          height={84}
                          theme={kioskTheme}
                        />
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: c.inkMuted }}>
                          {calibStep === 'temp' ? 'Body Temperature' : 'Respiration Rate'}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '48px', fontWeight: 800, color: calibPhase === 'captured' ? c.positive : c.ink }}>
                          {calibStep === 'temp'
                            ? lockedTempF?.toFixed(1) ?? (calibPhase === 'sampling' ? draftTempF || '--' : '--')
                            : lockedBreathing ?? (calibPhase === 'sampling' ? draftBreathing || '--' : '--')}{' '}
                          <span style={{ fontSize: '18px', color: c.inkMuted }}>
                            {calibStep === 'temp' ? '°F' : 'br/min'}
                          </span>
                        </div>
                        <div style={{ height: '10px', borderRadius: '999px', backgroundColor: c.subtle, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${calibPhase === 'waiting' ? 4 : samplingPct}%`,
                              height: '100%',
                              backgroundColor: calibPhase === 'captured' ? c.positive : c.primary,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom-Right Manual Input Box */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      backgroundColor: c.surface,
                      border: `1px solid ${c.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: c.ink }}>
                      Manual Sensor Value (Demo)
                    </div>
                    <div style={{ fontSize: '13px', color: c.inkMuted }}>
                      Type a reading on your keyboard to simulate physical hardware lock.
                    </div>

                    {calibStep === 'pulse_spo2' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.inkSecondary, marginBottom: '3px' }}>
                            BPM (40–160)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draftHr}
                            onChange={(e) => {
                              setCalibError(null);
                              setDraftHr(e.target.value.replace(/[^0-9]/g, '').slice(0, 3));
                            }}
                            placeholder="74"
                            className="tabular-nums"
                            style={{
                              width: '100%',
                              height: '46px',
                              padding: '0 10px',
                              fontSize: '18px',
                              fontWeight: 700,
                              borderRadius: '7px',
                              backgroundColor: c.bg,
                              color: c.ink,
                              border: `1.5px solid ${c.border}`,
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.inkSecondary, marginBottom: '3px' }}>
                            SpO₂ % (80–100)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draftSpo2}
                            onChange={(e) => {
                              setCalibError(null);
                              setDraftSpo2(e.target.value.replace(/[^0-9]/g, '').slice(0, 3));
                            }}
                            placeholder="98"
                            className="tabular-nums"
                            style={{
                              width: '100%',
                              height: '46px',
                              padding: '0 10px',
                              fontSize: '18px',
                              fontWeight: 700,
                              borderRadius: '7px',
                              backgroundColor: c.bg,
                              color: c.ink,
                              border: `1.5px solid ${c.border}`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: c.inkSecondary, marginBottom: '3px' }}>
                          {calibStep === 'temp' ? 'Temperature (°F, 94.0–104.0)' : 'Breathing Rate (br/min, 8–36)'}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={calibStep === 'temp' ? draftTempF : draftBreathing}
                          onChange={(e) => {
                            setCalibError(null);
                            if (calibStep === 'temp') setDraftTempF(e.target.value.slice(0, 5));
                            else setDraftBreathing(e.target.value.replace(/[^0-9]/g, '').slice(0, 2));
                          }}
                          placeholder={calibStep === 'temp' ? '98.4' : '16'}
                          className="tabular-nums"
                          style={{
                            width: '100%',
                            height: '46px',
                            padding: '0 12px',
                            fontSize: '18px',
                            fontWeight: 700,
                            borderRadius: '7px',
                            backgroundColor: c.bg,
                            color: c.ink,
                            border: `1.5px solid ${c.border}`,
                          }}
                        />
                      </div>
                    )}

                    {calibError ? (
                      <div style={{ fontSize: '12px', fontWeight: 600, color: c.danger }}>
                        {calibError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleTakeSensorReading}
                      disabled={calibPhase === 'sampling'}
                      style={{
                        width: '100%',
                        height: '46px',
                        borderRadius: '8px',
                        backgroundColor: '#15803D',
                        color: '#FFFFFF',
                        fontSize: '14.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                      }}
                    >
                      <Waves size={17} weight="duotone" />
                      <span>
                        {calibPhase === 'sampling' ? `Sampling (${samplingPct}%)...` : 'Capture Reading'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {renderBottomNav({
                backAction: () => {
                  if (calibStep === 'radar') switchCalibrationSubStep('temp');
                  else if (calibStep === 'temp') switchCalibrationSubStep('pulse_spo2');
                  else goToScreen(5);
                },
                nextLabel:
                  calibStep === 'pulse_spo2'
                    ? 'Next: Body Temp (2/3)'
                    : calibStep === 'temp'
                      ? 'Next: Breathing Lock (3/3)'
                      : 'Generate AI Care Plan',
                nextDisabled: !isNextCalibLocked,
                onNext: () => {
                  if (calibStep === 'pulse_spo2') switchCalibrationSubStep('temp');
                  else if (calibStep === 'temp') switchCalibrationSubStep('radar');
                  else goToScreen(7);
                },
              })}
            </>
          ) : null}

          {/* SCREEN 7: AI DAILY CARE & ALARM PLAN + LAUNCH LIVE HUD */}
          {screen === 7 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '23px', fontWeight: 700 }}>
                    Personalized daily care schedule
                  </h2>
                  <p style={{ fontSize: '14px', color: c.inkMuted, marginTop: '2px' }}>
                    {generatedPlan?.profile_summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowJsonDrawer((prev) => !prev)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: c.surface,
                    color: c.ink,
                    border: `1px solid ${c.border}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                  }}
                >
                  <Code size={15} weight="bold" />
                  <span>{showJsonDrawer ? 'Hide JSON' : isGeneratingPlan ? 'Syncing AI JSON...' : 'View JSON'}</span>
                </button>
              </div>

              {showJsonDrawer && generatedPlan ? (
                <pre
                  style={{
                    flex: 1,
                    margin: 0,
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: '#0F172A',
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
                    gap: '16px',
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      backgroundColor: c.surface,
                      border: `1px solid ${c.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 700 }}>
                      <span>Daily Voice Alarms ({generatedPlan?.daily_alarms.length ?? 0})</span>
                      <span className="tabular-nums" style={{ color: c.primary }}>
                        {generatedPlan?.hydration_goal_ml ?? 2000} ml Water Goal
                      </span>
                    </div>

                    {(generatedPlan?.daily_alarms ?? []).slice(0, 4).map((alarm, idx) => (
                      <div
                        key={`${alarm.time}-${idx}`}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '7px',
                          backgroundColor: c.bg,
                          border: `1px solid ${c.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <span className="tabular-nums" style={{ fontSize: '14.5px', fontWeight: 700, color: c.primary }}>
                          {alarm.time}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>{alarm.title}</div>
                          <div style={{ fontSize: '12px', color: c.inkMuted }}>
                            {alarm.category} · {tier.speechRateLabel} Voice
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        flex: 1,
                        padding: '14px 16px',
                        borderRadius: '10px',
                        backgroundColor: c.surface,
                        border: `1px solid ${c.border}`,
                      }}
                    >
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: c.danger, marginBottom: '6px' }}>
                        Allergy &amp; Nutrition Guardrails
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13.5px', color: c.inkSecondary, lineHeight: 1.5 }}>
                        {(generatedPlan?.nutrition_rules.strictly_avoid ?? []).map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>

                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        backgroundColor: c.surface,
                        border: `1px solid ${c.border}`,
                        fontSize: '13.5px',
                        color: c.inkSecondary,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: c.ink, marginBottom: '3px' }}>
                        Baseline &amp; Escalation Target
                      </div>
                      <div className="tabular-nums">
                        {lockedHr ?? initialHr} BPM · {lockedSpo2 ?? initialSpo2}% SpO₂ · {(lockedTempF ?? initialTempF).toFixed(1)}°F · Watch {format12Hour(sleepTime || '21:30')}–{format12Hour(wakeTime || '06:30')}
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
          </div>
        </div>
      )}

      {/* === HIDABLE / COLLAPSIBLE ON-SCREEN TOUCH KEYBOARD (~205px, CLOSED UNTIL INPUT TAPPED) === */}
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
            backgroundColor: c.kbBg,
            borderTop: `1.5px solid ${c.borderFocus}`,
            boxShadow: '0 -10px 28px rgba(15, 23, 42, 0.18)',
            padding: '7px 14px 8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: c.ink }}>
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
                  padding: '0 11px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: c.keyBg,
                  color: c.inkSecondary,
                  border: `1px solid ${c.keyBorder}`,
                }}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleCommitInlineEntry}
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                }}
              >
                Done
              </button>

              <button
                type="button"
                onClick={() => setActiveKeyboardField(null)}
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  backgroundColor: c.primary,
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
                  fontWeight: 600,
                  backgroundColor: c.keyBg,
                  color: c.ink,
                  border: `1px solid ${c.keyBorder}`,
                }}
              >
                {k}
              </button>
            ))}
          </div>

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
                  fontWeight: 600,
                  backgroundColor: c.keyBg,
                  color: c.ink,
                  border: `1px solid ${c.keyBorder}`,
                }}
              >
                {isShiftOn ? k : k.toLowerCase()}
              </button>
            ))}
          </div>

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
                  fontWeight: 600,
                  backgroundColor: c.keyBg,
                  color: c.ink,
                  border: `1px solid ${c.keyBorder}`,
                }}
              >
                {isShiftOn && /[A-Z]/.test(k) ? k : k.toLowerCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
            <button
              type="button"
              onClick={() => setIsShiftOn((s) => !s)}
              style={{
                minWidth: '72px',
                height: '36px',
                borderRadius: '5px',
                fontSize: '12.5px',
                fontWeight: 700,
                backgroundColor: isShiftOn ? c.primary : c.keyBg,
                color: isShiftOn ? '#FFFFFF' : c.ink,
                border: `1px solid ${c.keyBorder}`,
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
                  fontWeight: 600,
                  backgroundColor: c.keyBg,
                  color: c.ink,
                  border: `1px solid ${c.keyBorder}`,
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
                fontWeight: 600,
                backgroundColor: c.keyBg,
                color: c.inkSecondary,
                border: `1px solid ${c.keyBorder}`,
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
                fontWeight: 700,
                backgroundColor: c.keyBg,
                color: c.ink,
                border: `1px solid ${c.keyBorder}`,
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
