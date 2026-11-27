import type { AirQualityLevel, TofPostureState } from '../context/SandboxContext';
import type { PromptLanguage } from '../utils/audioEngine';

export interface KioskLocalizedCopy {
  tabs: {
    STANDBY: string;
    VITALS: string;
    CARE_PLAN: string;
    EMERGENCY: string;
    SETUP: string;
  };
  ageSuffix: string;
  tierHighAssist: string;
  tierCockpit: string;
  guestPrivacyLockTitle: string;
  tapAudioBtn: string;
  dayLabel: string;
  nightLabel: string;
  voiceWord: string;
  voiceActiveSuffix: string;
  nextReminderLabel: string;
  sleepWatchLabel: string;
  testReminderBtn: string;
  scheduledCareAlarmLabel: string;
  doneCheckLabel: string;
  defaultReminderTitle: string;
  defaultReminderPrompt: (name: string) => string;

  standbyTag: string;
  vitalsTag: string;
  emergencyTag: string;
  hazardTag: string;
  startCheckIn: string;
  imOkLogVitals: string;
  imOkayCancel: string;
  sendAlertNow: string;
  acknowledgeHazard: string;
  roomTempLabel: string;
  airQualityLabel: string;
  radarLabel: string;
  heartRateLabel: string;
  spo2Label: string;
  bodyTempLabel: string;
  relayOnText: string;
  countdownHint: string;
  escalationSentHeadline: string;
  vitalsLoggedBanner: string;
  guestLockTag: string;
  guestLockHeadline: string;
  guestLockBody: string;
  guestSwitchFamily: string;

  vaultRowLabel: string;
  vaultRowValue: string;
  cameraRowLabel: string;
  cameraRowValue: string;
  watchRowLabel: string;
  watchRowValue: string;
  deviceSetupBtn: string;
  ambientTempSub: string;
  relHumiditySub: string;
  safeLess180: string;
  relayCh1Prefix: string;
  relayExhaustOn: string;
  relayReady400: string;
  radarUpsBusTitle: string;
  acMainsOk: string;
  upsBatteryActive: string;
  radarMoving: string;
  radarPresentStill: string;
  radarEmpty: string;

  allSystemsNominal: string;
  hydrationExerciseTitle: string;
  sleepRadarWatchTitle: string;
  respirationPrefix: string;
  brPerMinUnit: string;
  watchArmed15m: string;
  tempWord: string;
  comfortableBandActive: string;
  airQualityMq2Title: string;
  zeroPpmSafe: string;
  relayReadyShort: string;
  upsPowerInaTitle: string;
  adapterOnline: string;
  runningOnUps: string;
  tofSilhouetteTitle: string;
  tofPostureLabels: Record<TofPostureState, string>;
  tofFooterNote: string;
  activeMonitoring: string;
  avoidPrefix: string;
  noneWord: string;
  testAlarmBtn: string;
  carePlanBtn: string;
  startVitalsCheckInBtn: string;

  radarBedEmptyAlert: string;
  tofFloorAlert: string;
  radarSafeActive: string;
  highAssistWellnessTitle: string;
  todaysExerciseTitle: string;
  hydrationProgressTitle: string;
  dailyGoalSuffix: string;
  dailyCareScheduleBtn: string;
  startDailySeniorLabel: string;
  callFamilyLabel: string;

  alertWord: string;
  normalPulse: string;
  lowOxygen: string;
  healthyO2: string;
  feverWord: string;
  normalWord: string;
  safeRangePrefix: string;
  targetMinPrefix: string;
  perfusionSteady: string;
  maxSafePrefix: string;
  contactlessIrNote: string;
  dht22AmbientShort: string;
  mqGasShort: string;
  inaPowerShort: string;
  rhLabel: string;
  ppgTraceTitle: string;
  cycleSuffix: string;
  loggedPrefix: string;

  dailyScheduleTitle: string;
  alarmsActiveSuffix: string;
  ringBtn: string;
  allergyGuardrailsTitle: string;
  hydrationSleepWatchTitle: string;
  goalPrefix: string;
  perDayUnit: string;
  dailyMobilityLabel: string;
  primaryGuardianLabel: string;
  goToVitalsBtn: string;

  secondsUnit: string;
  anomalyDetectedFallback: string;
  allergyPinPrefix: string;
  mq2CombustibleTitle: string;
  ventilationInterlockTitle: string;
  ventilationInterlockBody: (guardian: string) => string;

  bpmUnit: string;
  mlUnit: string;
  ppmUnit: string;
  voltUnit: string;
  tempFUnit: string;
  tempCUnit: string;
  airQualityLevels: Record<AirQualityLevel, string>;
  alarmCategories: Record<string, string>;
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Formats ASCII digits into Bengali numerals when Bengali UI is selected;
 * keeps Latin digits for English and standard Indian Hindi medical readability.
 */
export function localizeDigits(
  value: string | number,
  lang: PromptLanguage
): string {
  const str = String(value);
  if (lang !== 'bn') return str;
  return str.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** Converts HH:MM (24h) into localized display time (12h AM/PM or 24h numerals). */
export function localizeTimeRange(
  sleepHHMM: string,
  wakeHHMM: string,
  lang: PromptLanguage
): string {
  const s = localizeDigits(sleepHHMM, lang);
  const w = localizeDigits(wakeHHMM, lang);
  return `${s}–${w}`;
}

/** Formats HH:MM 12-hour clock with localized AM/PM period label. */
export function formatLocalized12Hour(
  hhmm: string,
  lang: PromptLanguage,
  notSetLabel: string
): string {
  if (!hhmm) return notSetLabel;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const base = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const period =
    lang === 'bn'
      ? h >= 12
        ? 'অপরাহ্ণ'
        : 'পূর্বাহ্ণ'
      : lang === 'hi'
        ? h >= 12
          ? 'दोपहर/शाम'
          : 'सुबह'
        : h >= 12
          ? 'PM'
          : 'AM';
  return `${localizeDigits(base, lang)} ${period}`;
}

/** Formats real-time clock, seconds, and weekday/month date for the HUD language. */
export function getLocalizedClockDisplay(lang: PromptLanguage): {
  time: string;
  timeShort: string;
  seconds: string;
  date: string;
} {
  const now = new Date();
  const h = now.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rawShort = `${String(h12).padStart(2, '0')}:${mm}`;

  const periodLabel =
    lang === 'bn'
      ? h >= 5 && h < 12
        ? 'সকাল'
        : h >= 12 && h < 17
          ? 'দুপুর'
          : h >= 17 && h < 20
            ? 'সন্ধ্যা'
            : 'রাত'
      : lang === 'hi'
        ? h >= 5 && h < 12
          ? 'सुबह'
          : h >= 12 && h < 17
            ? 'दोपहर'
            : h >= 17 && h < 20
              ? 'शाम'
              : 'रात'
        : h >= 12
          ? 'PM'
          : 'AM';

  const dateLocale =
    lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
  const dateStr = now.toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const timeShort = `${localizeDigits(rawShort, lang)} ${periodLabel}`;
  const seconds = localizeDigits(ss, lang);
  const time = `${localizeDigits(rawShort, lang)}:${seconds} ${periodLabel}`;

  return {
    time,
    timeShort,
    seconds,
    date: dateStr,
  };
}

export const KIOSK_COPY: Record<PromptLanguage, KioskLocalizedCopy> = {
  en: {
    tabs: {
      STANDBY: 'Standby',
      VITALS: 'Vitals',
      CARE_PLAN: 'Care Plan',
      EMERGENCY: 'Emergency',
      SETUP: 'Sign Up',
    },
    ageSuffix: 'y',
    tierHighAssist: 'High-Assist',
    tierCockpit: 'Cockpit',
    guestPrivacyLockTitle: 'Guest Privacy Lock',
    tapAudioBtn: 'Tap Audio',
    dayLabel: 'Day',
    nightLabel: 'Night',
    voiceWord: 'Voice',
    voiceActiveSuffix: 'Voice · Active',
    nextReminderLabel: 'Next Reminder',
    sleepWatchLabel: 'Sleep Watch',
    testReminderBtn: 'Test Reminder',
    scheduledCareAlarmLabel: 'SCHEDULED CARE ALARM',
    doneCheckLabel: 'Done ✓',
    defaultReminderTitle: 'Daily Hydration & Medicine Reminder',
    defaultReminderPrompt: (name) =>
      `Reminder for ${name}: Drink a glass of water and review your morning care schedule.`,

    standbyTag: 'STANDBY MONITORING',
    vitalsTag: 'DAILY VITALS CHECK-IN',
    emergencyTag: 'EMERGENCY COUNTDOWN',
    hazardTag: 'GAS / SMOKE HAZARD',
    startCheckIn: 'START VITALS CHECK-IN',
    imOkLogVitals: "I'M OK — LOG VITALS",
    imOkayCancel: "I'M OKAY (CANCEL ALERT)",
    sendAlertNow: 'SEND ALERT NOW',
    acknowledgeHazard: 'ACKNOWLEDGE & RESET',
    roomTempLabel: 'Room Climate (DHT22)',
    airQualityLabel: 'Air Quality (MQ-135)',
    radarLabel: '24GHz Radar (LD2410B)',
    heartRateLabel: 'Heart Rate',
    spo2Label: 'Blood Oxygen (SpO₂)',
    bodyTempLabel: 'Body Temp (IR)',
    relayOnText: 'Relay CH1: Exhaust Fan AUTO-ON',
    countdownHint: 'Tap green button if you are safe — logged as false alarm',
    escalationSentHeadline: 'Autonomous Alert Dispatched to Family',
    vitalsLoggedBanner: 'Vitals synced to child dashboard at',
    guestLockTag: 'GUEST PRIVACY LOCK',
    guestLockHeadline: 'Unregistered Visitor Detected — Private Health Profile Locked',
    guestLockBody:
      'Personal vitals, calibrated baselines, and family contact details stay strictly hidden for unrecognized faces.',
    guestSwitchFamily: 'Switch to Registered Family Member',

    vaultRowLabel: 'Family Vitals & Rx Vault',
    vaultRowValue: 'Locked (Face ID Required)',
    cameraRowLabel: 'OV5647 Optical Pipeline',
    cameraRowValue: 'Edge Only · Zero Cloud',
    watchRowLabel: 'Ambient Safety Watch',
    watchRowValue: 'MQ-2 Gas · Radar · UPS Active',
    deviceSetupBtn: 'Device Setup',
    ambientTempSub: 'Ambient Temp',
    relHumiditySub: 'Rel. Humidity',
    safeLess180: 'Safe <180 ppm',
    relayCh1Prefix: 'Relay CH1:',
    relayExhaustOn: 'EXHAUST ON',
    relayReady400: 'Ready (>400 ppm)',
    radarUpsBusTitle: '24GHz Radar & 3S2P UPS Bus',
    acMainsOk: 'AC Mains OK',
    upsBatteryActive: 'UPS Battery',
    radarMoving: 'Active Movement',
    radarPresentStill: 'Occupied (Still)',
    radarEmpty: 'Room Empty',

    allSystemsNominal: 'All Systems Nominal',
    hydrationExerciseTitle: 'Hydration & Exercise',
    sleepRadarWatchTitle: 'Sleep Radar Watch (LD2410B)',
    respirationPrefix: 'Respiration:',
    brPerMinUnit: 'br/min',
    watchArmed15m: '15m Watch Armed',
    tempWord: 'Temperature',
    comfortableBandActive: 'Comfortable Ambient Band · I²C Active',
    airQualityMq2Title: 'Air Quality & LPG (MQ-2)',
    zeroPpmSafe: '0 ppm safe',
    relayReadyShort: 'Ready (400 ppm)',
    upsPowerInaTitle: '3S2P UPS & Power (INA219)',
    adapterOnline: '12.6V Adapter Online',
    runningOnUps: 'Running on 3S2P Li-Ion UPS',
    tofSilhouetteTitle: 'VL53L5CX 8×8 Silhouette',
    tofPostureLabels: {
      FLOOR_SILHOUETTE: 'FALL · FLOOR',
      BED_EDGE_DROP: 'BED EDGE',
      IN_BED: 'IN BED',
      UPRIGHT: 'UPRIGHT',
    },
    tofFooterNote: 'Camera-free night depth · I2C 0x52 · darker = closer',
    activeMonitoring: 'Active Monitoring',
    avoidPrefix: 'Avoid:',
    noneWord: 'None',
    testAlarmBtn: 'Test Alarm',
    carePlanBtn: 'Care Plan',
    startVitalsCheckInBtn: 'Start Vitals Check-In',

    radarBedEmptyAlert: 'Radar: Bed Empty Alert',
    tofFloorAlert: 'ToF: Floor Silhouette Alert',
    radarSafeActive: 'Radar: Safe & Active',
    highAssistWellnessTitle: 'High-Assist Wellness & Medication',
    todaysExerciseTitle: "Today's Exercise",
    hydrationProgressTitle: 'Hydration Progress Bar',
    dailyGoalSuffix: 'Daily Goal',
    dailyCareScheduleBtn: 'Daily Care Schedule',
    startDailySeniorLabel: 'START DAILY CHECK-IN',
    callFamilyLabel: 'CALL FAMILY / HELP',

    alertWord: 'ALERT',
    normalPulse: 'NORMAL PULSE',
    lowOxygen: 'LOW OXYGEN',
    healthyO2: 'HEALTHY O₂',
    feverWord: 'FEVER',
    normalWord: 'NORMAL',
    safeRangePrefix: 'Safe Range',
    targetMinPrefix: 'Target ≥',
    perfusionSteady: 'Perfusion Steady',
    maxSafePrefix: 'Max Safe ≤',
    contactlessIrNote: 'Contactless IR',
    dht22AmbientShort: 'DHT22 Ambient',
    mqGasShort: 'MQ-2 / MQ-135 Gas',
    inaPowerShort: 'INA219 Power',
    rhLabel: 'RH',
    ppgTraceTitle: 'MAX30102 Live Optical PPG / ECG Trace (60 FPS)',
    cycleSuffix: 's cycle',
    loggedPrefix: 'Logged',

    dailyScheduleTitle: 'Daily AI Care & Medication Schedule',
    alarmsActiveSuffix: 'Alarms Active',
    ringBtn: 'Ring',
    allergyGuardrailsTitle: 'Allergy & Diet Guardrails',
    hydrationSleepWatchTitle: 'Hydration & Sleep Radar Watch',
    goalPrefix: 'Goal:',
    perDayUnit: '/day',
    dailyMobilityLabel: 'Daily Mobility:',
    primaryGuardianLabel: 'Primary Guardian',
    goToVitalsBtn: 'Go to Vitals Check-In',

    secondsUnit: 's',
    anomalyDetectedFallback: 'Anomaly Detected',
    allergyPinPrefix: 'Allergy pin:',
    mq2CombustibleTitle: 'MQ-2 Combustible Gas / Smoke',
    ventilationInterlockTitle: 'Autonomous Ventilation Interlock Active',
    ventilationInterlockBody: (guardian) =>
      `Threshold exceeded (>400 ppm). Optocoupled 5V relay closed the exhaust fan circuit immediately, sounded local warning siren, and dispatched a family alert to ${guardian}.`,

    bpmUnit: 'BPM',
    mlUnit: 'ml',
    ppmUnit: 'ppm',
    voltUnit: 'V',
    tempFUnit: '°F',
    tempCUnit: '°C',
    airQualityLevels: {
      GOOD: 'GOOD',
      MODERATE: 'MODERATE',
      HAZARDOUS: 'HAZARDOUS',
    },
    alarmCategories: {
      VITALS: 'VITALS',
      EXERCISE: 'EXERCISE',
      MEDICATION: 'MEDICATION',
      HYDRATION: 'HYDRATION',
      MEAL: 'MEAL',
    },
  },
  hi: {
    tabs: {
      STANDBY: 'स्टैंडबाय',
      VITALS: 'वाइटल्स',
      CARE_PLAN: 'केयर प्लान',
      EMERGENCY: 'आपातकाल',
      SETUP: 'साइन अप',
    },
    ageSuffix: ' वर्ष',
    tierHighAssist: 'हाई-असिस्ट',
    tierCockpit: 'कॉकपिट',
    guestPrivacyLockTitle: 'अतिथि गोपनीयता लॉक',
    tapAudioBtn: 'आवाज़ चालू करें',
    dayLabel: 'दिन',
    nightLabel: 'रात',
    voiceWord: 'आवाज़',
    voiceActiveSuffix: 'आवाज़ · सक्रिय',
    nextReminderLabel: 'अगला रिमाइंडर',
    sleepWatchLabel: 'नींद निगरानी',
    testReminderBtn: 'रिमाइंडर टेस्ट',
    scheduledCareAlarmLabel: 'निर्धारित केयर अलार्म',
    doneCheckLabel: 'हो गया ✓',
    defaultReminderTitle: 'दैनिक जल और दवा रिमाइंडर',
    defaultReminderPrompt: (name) =>
      `${name} के लिए अनुस्मारक: एक गिलास पानी पिएं और अपनी सुबह की देखभाल सूची देखें।`,

    standbyTag: 'स्टैंडबाय निगरानी',
    vitalsTag: 'दैनिक स्वास्थ्य जांच',
    emergencyTag: 'आपातकालीन उलटी गिनती',
    hazardTag: 'गैस / धुआं चेतावनी',
    startCheckIn: 'स्वास्थ्य जांच शुरू करें',
    imOkLogVitals: 'मैं ठीक हूँ — जांच दर्ज करें',
    imOkayCancel: 'मैं ठीक हूँ (अलर्ट रद्द करें)',
    sendAlertNow: 'अभी अलर्ट भेजें',
    acknowledgeHazard: 'पुष्टि करें और रीसेट करें',
    roomTempLabel: 'कमरे का तापमान (DHT22)',
    airQualityLabel: 'वायु गुणवत्ता (MQ-135)',
    radarLabel: '24GHz रडार (LD2410B)',
    heartRateLabel: 'हृदय गति',
    spo2Label: 'ब्लड ऑक्सीजन (SpO₂)',
    bodyTempLabel: 'शरीर का तापमान',
    relayOnText: 'रिले CH1: एग्जॉस्ट फैन अपने आप चालू',
    countdownHint: 'यदि आप सुरक्षित हैं तो हरा बटन दबाएं',
    escalationSentHeadline: 'परिवार को आपातकालीन सूचना भेजी गई',
    vitalsLoggedBanner: 'स्वास्थ्य रिपोर्ट दर्ज समय:',
    guestLockTag: 'अतिथि गोपनीयता लॉक',
    guestLockHeadline: 'अपंजीकृत व्यक्ति — निजी स्वास्थ्य प्रोफ़ाइल लॉक है',
    guestLockBody:
      'अनजान चेहरे के लिए कोई भी स्वास्थ्य डेटा, व्यक्तिगत सीमा या पारिवारिक संपर्क प्रदर्शित या लॉग नहीं किया जाता।',
    guestSwitchFamily: 'पंजीकृत परिवार सदस्य पर जाएं',

    vaultRowLabel: 'परिवार स्वास्थ्य व दवा रिकॉर्ड',
    vaultRowValue: 'लॉक है (चेहरा पहचान आवश्यक)',
    cameraRowLabel: 'OV5647 कैमरा प्रोसेसिंग',
    cameraRowValue: 'केवल लोकल · क्लाउड शून्य',
    watchRowLabel: 'वातावरण सुरक्षा निगरानी',
    watchRowValue: 'MQ-2 गैस · रडार · UPS चालू',
    deviceSetupBtn: 'डिवाइस सेटअप',
    ambientTempSub: 'कमरे का तापमान',
    relHumiditySub: 'सापेक्ष आर्द्रता',
    safeLess180: 'सुरक्षित <180 पीपीएम',
    relayCh1Prefix: 'रिले CH1:',
    relayExhaustOn: 'एग्जॉस्ट चालू',
    relayReady400: 'तैयार (>400 पीपीएम)',
    radarUpsBusTitle: '24GHz रडार और 3S2P UPS बस',
    acMainsOk: 'मुख्य बिजली चालू',
    upsBatteryActive: 'UPS बैटरी चालू',
    radarMoving: 'सक्रिय हलचल',
    radarPresentStill: 'उपस्थित (शांत)',
    radarEmpty: 'कमरा खाली',

    allSystemsNominal: 'सभी सिस्टम सामान्य',
    hydrationExerciseTitle: 'हाइड्रेशन और व्यायाम',
    sleepRadarWatchTitle: 'नींद रडार निगरानी (LD2410B)',
    respirationPrefix: 'श्वसन दर:',
    brPerMinUnit: 'सांस/मि.',
    watchArmed15m: '15 मि. निगरानी सक्रिय',
    tempWord: 'तापमान',
    comfortableBandActive: 'आरामदायक वातावरण · I²C सक्रिय',
    airQualityMq2Title: 'वायु गुणवत्ता व एलपीजी (MQ-2)',
    zeroPpmSafe: '0 पीपीएम सुरक्षित',
    relayReadyShort: 'तैयार (400 पीपीएम)',
    upsPowerInaTitle: '3S2P UPS और पावर (INA219)',
    adapterOnline: '12.6V एडॉप्टर ऑनलाइन',
    runningOnUps: '3S2P Li-Ion UPS पर चालू',
    tofSilhouetteTitle: 'VL53L5CX 8×8 सिल्हूट',
    tofPostureLabels: {
      FLOOR_SILHOUETTE: 'गिरावट · फर्श',
      BED_EDGE_DROP: 'बिस्तर किनारा',
      IN_BED: 'बिस्तर पर',
      UPRIGHT: 'सीधे खड़े',
    },
    tofFooterNote: 'कैमरा-रहित रात्रि गहराई · I2C 0x52 · गहरा = नज़दीक',
    activeMonitoring: 'सक्रिय निगरानी',
    avoidPrefix: 'परहेज़:',
    noneWord: 'कोई नहीं',
    testAlarmBtn: 'अलार्म टेस्ट',
    carePlanBtn: 'केयर प्लान',
    startVitalsCheckInBtn: 'वाइटल्स जांच शुरू करें',

    radarBedEmptyAlert: 'रडार: बिस्तर खाली अलर्ट',
    tofFloorAlert: 'ToF: फर्श पर गिरावट अलर्ट',
    radarSafeActive: 'रडार: सुरक्षित और सक्रिय',
    highAssistWellnessTitle: 'हाई-असिस्ट स्वास्थ्य और दवा',
    todaysExerciseTitle: 'आज का व्यायाम',
    hydrationProgressTitle: 'दैनिक जल प्रगति',
    dailyGoalSuffix: 'दैनिक लक्ष्य',
    dailyCareScheduleBtn: 'दैनिक देखभाल शेड्यूल',
    startDailySeniorLabel: 'दैनिक जांच शुरू करें',
    callFamilyLabel: 'परिवार को कॉल करें',

    alertWord: 'चेतावनी',
    normalPulse: 'सामान्य नब्ज़',
    lowOxygen: 'कम ऑक्सीजन',
    healthyO2: 'स्वस्थ ऑक्सीजन',
    feverWord: 'बुखार',
    normalWord: 'सामान्य',
    safeRangePrefix: 'सुरक्षित सीमा',
    targetMinPrefix: 'लक्ष्य ≥',
    perfusionSteady: 'रक्त प्रवाह स्थिर',
    maxSafePrefix: 'अधिकतम सुरक्षित ≤',
    contactlessIrNote: 'बिना छुए IR जांच',
    dht22AmbientShort: 'DHT22 वातावरण',
    mqGasShort: 'MQ-2 / MQ-135 गैस',
    inaPowerShort: 'INA219 पावर',
    rhLabel: 'आर्द्रता',
    ppgTraceTitle: 'MAX30102 लाइव ऑप्टिकल PPG / ECG तरंग (60 FPS)',
    cycleSuffix: ' से. चक्र',
    loggedPrefix: 'दर्ज:',

    dailyScheduleTitle: 'दैनिक AI देखभाल और दवा शेड्यूल',
    alarmsActiveSuffix: 'अलार्म सक्रिय',
    ringBtn: 'बजाएं',
    allergyGuardrailsTitle: 'एलर्जी और आहार सावधानियाँ',
    hydrationSleepWatchTitle: 'हाइड्रेशन और नींद रडार निगरानी',
    goalPrefix: 'लक्ष्य:',
    perDayUnit: '/दिन',
    dailyMobilityLabel: 'दैनिक व्यायाम:',
    primaryGuardianLabel: 'मुख्य अभिभावक',
    goToVitalsBtn: 'वाइटल्स जांच पर जाएं',

    secondsUnit: ' से.',
    anomalyDetectedFallback: 'असामान्य स्थिति दर्ज',
    allergyPinPrefix: 'एलर्जी चेतावनी:',
    mq2CombustibleTitle: 'MQ-2 ज्वलनशील गैस / धुआं',
    ventilationInterlockTitle: 'स्वचालित वेंटिलेशन इंटरलॉक सक्रिय',
    ventilationInterlockBody: (guardian) =>
      `सीमा पार हो गई (>400 पीपीएम)। ऑप्टोकपल्ड 5V रिले ने तुरंत एग्जॉस्ट फैन सर्किट चालू किया, स्थानीय सायरन बजाया और ${guardian} को परिवार अलर्ट भेजा।`,

    bpmUnit: 'बीपीएम',
    mlUnit: 'मि.ली.',
    ppmUnit: 'पीपीएम',
    voltUnit: 'V',
    tempFUnit: '°F',
    tempCUnit: '°C',
    airQualityLevels: {
      GOOD: 'अच्छा',
      MODERATE: 'मध्यम',
      HAZARDOUS: 'खतरनाक',
    },
    alarmCategories: {
      VITALS: 'वाइटल्स',
      EXERCISE: 'व्यायाम',
      MEDICATION: 'दवा',
      HYDRATION: 'जल सेवन',
      MEAL: 'भोजन',
    },
  },
  bn: {
    tabs: {
      STANDBY: 'স্ট্যান্ডবাই',
      VITALS: 'স্বাস্থ্য',
      CARE_PLAN: 'কেয়ার প্ল্যান',
      EMERGENCY: 'জরুরি',
      SETUP: 'সাইন আপ',
    },
    ageSuffix: ' বছর',
    tierHighAssist: 'হাই-অ্যাসিস্ট',
    tierCockpit: 'ককপিট',
    guestPrivacyLockTitle: 'অতিথি গোপনীয়তা লক',
    tapAudioBtn: 'অডিও চালু করুন',
    dayLabel: 'দিন',
    nightLabel: 'রাত',
    voiceWord: 'ভয়েস',
    voiceActiveSuffix: 'ভয়েস · সক্রিয়',
    nextReminderLabel: 'পরবর্তী রিমাইন্ডার',
    sleepWatchLabel: 'ঘুম নজরদারি',
    testReminderBtn: 'রিমাইন্ডার টেস্ট',
    scheduledCareAlarmLabel: 'নির্ধারিত কেয়ার অ্যালার্ম',
    doneCheckLabel: 'সম্পন্ন ✓',
    defaultReminderTitle: 'দৈনিক জলপান ও ওষুধের রিমাইন্ডার',
    defaultReminderPrompt: (name) =>
      `${name}-এর জন্য স্মারক: এক গ্লাস জল পান করুন এবং সকালের যত্ন তালিকা দেখুন।`,

    standbyTag: 'স্ট্যান্ডবাই পর্যবেক্ষণ',
    vitalsTag: 'দৈনিক স্বাস্থ্য পরীক্ষা',
    emergencyTag: 'জরুরি কাউন্টডাউন',
    hazardTag: 'গ্যাস / ধোঁয়া সতর্কতা',
    startCheckIn: 'স্বাস্থ্য পরীক্ষা শুরু করুন',
    imOkLogVitals: 'আমি ঠিক আছি — তথ্য সংরক্ষণ করুন',
    imOkayCancel: 'আমি ঠিক আছি (সতর্কতা বাতিল)',
    sendAlertNow: 'এখনই সতর্কতা পাঠান',
    acknowledgeHazard: 'নিশ্চিত করুন ও রিসেট করুন',
    roomTempLabel: 'ঘরের তাপমাত্রা (DHT22)',
    airQualityLabel: 'বায়ুর মান (MQ-135)',
    radarLabel: '24GHz রাডার (LD2410B)',
    heartRateLabel: 'হৃদস্পন্দন',
    spo2Label: 'রক্তে অক্সিজেন (SpO₂)',
    bodyTempLabel: 'শরীরের তাপমাত্রা',
    relayOnText: 'রিলে CH1: এক্সহস্ট ফ্যান স্বয়ংক্রিয়ভাবে চালু',
    countdownHint: 'আপনি নিরাপদ থাকলে সবুজ বোতামে চাপ দিন',
    escalationSentHeadline: 'পরিবারের কাছে জরুরি সতর্কতা পাঠানো হয়েছে',
    vitalsLoggedBanner: 'স্বাস্থ্য তথ্য সংরক্ষণের সময়:',
    guestLockTag: 'অতিথি গোপনীয়তা লক',
    guestLockHeadline: 'অনিবন্ধিত দর্শনার্থী শনাক্ত — ব্যক্তিগত স্বাস্থ্য প্রোফাইল লক করা আছে',
    guestLockBody:
      'অপরিচিত মুখের সামনে কোনো স্বাস্থ্য তথ্য, ব্যক্তিগত বেসলাইন বা পারিবারিক যোগাযোগ প্রদর্শিত বা সংরক্ষিত হয় না।',
    guestSwitchFamily: 'নিবন্ধিত পরিবারের সদস্যে ফিরুন',

    vaultRowLabel: 'পারিবারিক স্বাস্থ্য ও ওষুধের ভল্ট',
    vaultRowValue: 'লক করা (মুখ শনাক্তকরণ প্রয়োজন)',
    cameraRowLabel: 'OV5647 ক্যামেরা প্রসেসিং',
    cameraRowValue: 'শুধু লোকাল · ক্লাউড শূন্য',
    watchRowLabel: 'পরিবেশ নিরাপত্তা নজরদারি',
    watchRowValue: 'MQ-2 গ্যাস · রাডার · UPS সক্রিয়',
    deviceSetupBtn: 'ডিভাইস সেটআপ',
    ambientTempSub: 'ঘরের তাপমাত্রা',
    relHumiditySub: 'আপেক্ষিক আর্দ্রতা',
    safeLess180: 'নিরাপদ <১৮০ পিপিএম',
    relayCh1Prefix: 'রিলে CH1:',
    relayExhaustOn: 'এক্সহস্ট চালু',
    relayReady400: 'প্রস্তুত (>৪০০ পিপিএম)',
    radarUpsBusTitle: '24GHz রাডার ও 3S2P UPS বাস',
    acMainsOk: 'মেইন বিদ্যুৎ চালু',
    upsBatteryActive: 'UPS ব্যাটারি চালু',
    radarMoving: 'সক্রিয় নড়াচড়া',
    radarPresentStill: 'উপস্থিত (স্থির)',
    radarEmpty: 'ঘর খালি',

    allSystemsNominal: 'সব সিস্টেম স্বাভাবিক',
    hydrationExerciseTitle: 'জলপান ও ব্যায়াম',
    sleepRadarWatchTitle: 'ঘুম রাডার নজরদারি (LD2410B)',
    respirationPrefix: 'শ্বাস-প্রশ্বাস:',
    brPerMinUnit: 'শ্বাস/মি.',
    watchArmed15m: '১৫ মি. নজরদারি সক্রিয়',
    tempWord: 'তাপমাত্রা',
    comfortableBandActive: 'আরামদায়ক পরিবেশ · I²C সক্রিয়',
    airQualityMq2Title: 'বায়ুর মান ও এলপিজি (MQ-2)',
    zeroPpmSafe: '০ পিপিএম নিরাপদ',
    relayReadyShort: 'প্রস্তুত (৪০০ পিপিএম)',
    upsPowerInaTitle: '3S2P UPS ও পাওয়ার (INA219)',
    adapterOnline: '১২.৬V অ্যাডাপ্টার অনলাইন',
    runningOnUps: '3S2P Li-Ion UPS-এ চলছে',
    tofSilhouetteTitle: 'VL53L5CX ৮×৮ সিলুয়েট',
    tofPostureLabels: {
      FLOOR_SILHOUETTE: 'পতন · মেঝে',
      BED_EDGE_DROP: 'বিছানার কিনারা',
      IN_BED: 'বিছানায়',
      UPRIGHT: 'সোজা দাঁড়ানো',
    },
    tofFooterNote: 'ক্যামেরাবিহীন রাতের গভীরতা · I2C 0x52 · গাঢ় = কাছাকাছি',
    activeMonitoring: 'সক্রিয় নজরদারি',
    avoidPrefix: 'বর্জনীয়:',
    noneWord: 'কিছুই না',
    testAlarmBtn: 'অ্যালার্ম টেস্ট',
    carePlanBtn: 'কেয়ার প্ল্যান',
    startVitalsCheckInBtn: 'স্বাস্থ্য পরীক্ষা শুরু করুন',

    radarBedEmptyAlert: 'রাডার: বিছানা খালি সতর্কতা',
    tofFloorAlert: 'ToF: মেঝেতে পতন সতর্কতা',
    radarSafeActive: 'রাডার: নিরাপদ ও সক্রিয়',
    highAssistWellnessTitle: 'হাই-অ্যাসিস্ট স্বাস্থ্য ও ওষুধ',
    todaysExerciseTitle: 'আজকের ব্যায়াম',
    hydrationProgressTitle: 'দৈনিক জলপানের অগ্রগতি',
    dailyGoalSuffix: 'দৈনিক লক্ষ্য',
    dailyCareScheduleBtn: 'দৈনিক যত্ন সময়সূচি',
    startDailySeniorLabel: 'দৈনিক পরীক্ষা শুরু করুন',
    callFamilyLabel: 'পরিবারকে কল করুন',

    alertWord: 'সতর্কতা',
    normalPulse: 'স্বাভাবিক নাড়ি',
    lowOxygen: 'কম অক্সিজেন',
    healthyO2: 'সুস্থ অক্সিজেন',
    feverWord: 'জ্বর',
    normalWord: 'স্বাভাবিক',
    safeRangePrefix: 'নিরাপদ সীমা',
    targetMinPrefix: 'লক্ষ্য ≥',
    perfusionSteady: 'রক্ত সঞ্চালন স্থির',
    maxSafePrefix: 'সর্বোচ্চ নিরাপদ ≤',
    contactlessIrNote: 'স্পর্শহীন IR তাপমাত্রা',
    dht22AmbientShort: 'DHT22 পরিবেশ',
    mqGasShort: 'MQ-2 / MQ-135 গ্যাস',
    inaPowerShort: 'INA219 পাওয়ার',
    rhLabel: 'আর্দ্রতা',
    ppgTraceTitle: 'MAX30102 লাইভ অপটিক্যাল PPG / ECG তরঙ্গ (৬০ FPS)',
    cycleSuffix: ' সে. চক্র',
    loggedPrefix: 'সংরক্ষিত:',

    dailyScheduleTitle: 'দৈনিক AI যত্ন ও ওষুধের সময়সূচি',
    alarmsActiveSuffix: 'টি অ্যালার্ম সক্রিয়',
    ringBtn: 'বাজান',
    allergyGuardrailsTitle: 'অ্যালার্জি ও খাদ্য সতর্কতা',
    hydrationSleepWatchTitle: 'জলপান ও ঘুম রাডার নজরদারি',
    goalPrefix: 'লক্ষ্য:',
    perDayUnit: '/দিন',
    dailyMobilityLabel: 'দৈনিক ব্যায়াম:',
    primaryGuardianLabel: 'প্রধান অভিভাবক',
    goToVitalsBtn: 'স্বাস্থ্য পরীক্ষায় যান',

    secondsUnit: ' সে.',
    anomalyDetectedFallback: 'অস্বাভাবিকতা শনাক্ত',
    allergyPinPrefix: 'অ্যালার্জি সতর্কতা:',
    mq2CombustibleTitle: 'MQ-2 দাহ্য গ্যাস / ধোঁয়া',
    ventilationInterlockTitle: 'স্বয়ংক্রিয় ভেন্টিলেশন ইন্টারলক সক্রিয়',
    ventilationInterlockBody: (guardian) =>
      `নিরাপদ সীমা অতিক্রম করেছে (>৪০০ পিপিএম)। অপটোকাপল্ড ৫V রিলে সাথে সাথে এক্সহস্ট ফ্যান চালু করেছে, স্থানীয় সতর্কীকরণ সাইরেন বাজিয়েছে এবং ${guardian}-এর কাছে পারিবারিক সতর্কতা পাঠিয়েছে।`,

    bpmUnit: 'বিপিএম',
    mlUnit: 'মি.লি.',
    ppmUnit: 'পিপিএম',
    voltUnit: 'V',
    tempFUnit: '°ফা',
    tempCUnit: '°সে',
    airQualityLevels: {
      GOOD: 'ভালো',
      MODERATE: 'মাঝারি',
      HAZARDOUS: 'বিপজ্জনক',
    },
    alarmCategories: {
      VITALS: 'স্বাস্থ্য পরীক্ষা',
      EXERCISE: 'ব্যায়াম',
      MEDICATION: 'ওষুধ',
      HYDRATION: 'জলপান',
      MEAL: 'খাবার',
    },
  },
};

const KNOWN_TEXT_TRANSLATIONS: Record<
  string,
  { hi: string; bn: string }
> = {
  // Sample profiles & guardians
  'Rohan Sen': { hi: 'रोहन सेन', bn: 'রোহন সেন' },
  'Subhashree Devi': { hi: 'सुभश्री देवी', bn: 'শুভশ্রী দেবী' },
  'Unregistered Visitor': { hi: 'अपंजीकृत व्यक्ति', bn: 'অনিবন্ধিত দর্শনার্থী' },
  'Sourav (Son)': { hi: 'सौरव (पुत्र)', bn: 'সৌরভ (পুত্র)' },
  'Sourav Biswas': { hi: 'सौरव बिस्वास', bn: 'সৌরভ বিশ্বাস' },
  'Ananya Sen (Spouse)': { hi: 'अनन्या सेन (पत्नी)', bn: 'অনন্যা সেন (স্ত্রী)' },
  'Primary Guardian': { hi: 'मुख्य अभिभावक', bn: 'প্রধান অভিভাবক' },
  'Resident': { hi: 'निवासी', bn: 'বাসিন্দা' },
  'Locked (Private)': { hi: 'लॉक (निजी)', bn: 'লক করা (ব্যক্তিগত)' },

  // Allergies & conditions
  'Peanuts': { hi: 'मूंगफली', bn: 'চিনাবাদাম' },
  'Shellfish': { hi: 'शेलफिश (केकड़ा/झींगा)', bn: 'চিংড়ি/খোলসযুক্ত মাছ' },
  'Dairy': { hi: 'डेयरी (दूध उत्पाद)', bn: 'দুগ্ধজাত খাবার' },
  'Gluten': { hi: 'ग्लूटेन', bn: 'গ্লুটেন' },
  'Penicillin': { hi: 'पेनिसिलिन', bn: 'পেনিসিলিন' },
  'Sulfa Drugs': { hi: 'सल्फा दवाइयाँ', bn: 'সালফা ওষুধ' },
  'Dust Mites': { hi: 'धूल के कण', bn: 'ধূলিকণা (ডাস্ট মাইট)' },
  'None': { hi: 'कोई नहीं', bn: 'কিছুই না' },
  'Hypertension': { hi: 'उच्च रक्तचाप (हाइपरटेंशन)', bn: 'উচ্চ রক্তচাপ' },
  'Borderline Hypertension': { hi: 'सीमावर्ती उच्च रक्तचाप', bn: 'সীমান্তবর্তী উচ্চ রক্তচাপ' },
  'Type 2 Diabetes': { hi: 'टाइप 2 मधुमेह', bn: 'টাইপ ২ ডায়াবেটিস' },
  'Asthma': { hi: 'दमा (अस्थमा)', bn: 'হাঁপানি' },
  'Asthma / COPD': { hi: 'दमा / सीओपीडी', bn: 'হাঁপানি / সিওপিডি' },
  'Osteoarthritis': { hi: 'ऑस्टियोआर्थराइटिस (जोड़ों का दर्द)', bn: 'অস্টিওআর্থ্রাইটিস (হাঁটুর ব্যথা)' },
  'Mild Cataract': { hi: 'हल्का मोतियाबिंद', bn: 'হালকা ছানি' },
  'Heart Arrhythmia': { hi: 'हृदय ताल अनियमितता', bn: 'হৃৎস্পন্দনের অনিয়ম' },

  // Exercise plans & care plan items
  '30-min brisk walk + stretching (07:00 AM)': {
    hi: '30 मिनट तेज़ चाल + स्ट्रेचिंग (सुबह 07:00)',
    bn: '৩০ মিনিট দ্রুত হাঁটা + স্ট্রেচিং (সকাল ০৭:০০)',
  },
  '15-min seated chair yoga & gentle joint mobility (07:15 AM)': {
    hi: '15 मिनट कुर्सी योग और हल्का जोड़ व्यायाम (सुबह 07:15)',
    bn: '১৫ মিনিট চেয়ারে বসে যোগব্যায়াম ও হালকা ব্যায়াম (সকাল ০৭:১৫)',
  },
  '15-min seated chair yoga & gentle joint mobility': {
    hi: '15 मिनट कुर्सी योग और हल्का जोड़ व्यायाम',
    bn: '১৫ মিনিট চেয়ারে বসে যোগব্যায়াম ও হালকা ব্যায়াম',
  },
  '15-Min Seated Chair Yoga & Joint Mobility': {
    hi: '15 मिनट कुर्सी योग और जोड़ व्यायाम',
    bn: '১৫ মিনিট চেয়ারে বসে যোগব্যায়াম ও ব্যায়াম',
  },
  '30-Min Brisk Walk & Stretching': {
    hi: '30 मिनट तेज़ चाल और स्ट्रेचिंग',
    bn: '৩০ মিনিট দ্রুত হাঁটা ও স্ট্রেচিং',
  },
  'Morning Baseline Vitals Check-In': {
    hi: 'सुबह की बेसलाइन वाइटल्स जांच',
    bn: 'সকালের বেসলাইন স্বাস্থ্য পরীক্ষা',
  },
  'Morning Pulse, SpO₂ & Temp Check-In': {
    hi: 'सुबह पल्स, SpO₂ और तापमान जांच',
    bn: 'সকালের নাড়ি, অক্সিজেন ও তাপমাত্রা পরীক্ষা',
  },
  'Telmisartan 20mg + 300 ml Water': {
    hi: 'टेलमिसार्टन 20mg + 300 मि.ली. पानी',
    bn: 'টেলমিসার্টান ২০ মিগ্রা + ৩০০ মি.লি. জল',
  },
  'Mid-Morning Hydration Reminder (300 ml)': {
    hi: 'सुबह का जल अनुस्मारक (300 मि.ली.)',
    bn: 'বেলার জলপানের রিমাইন্ডার (৩০০ মি.লি.)',
  },
  'Afternoon Hydration & Posture Stretch': {
    hi: 'दोपहर का जल और शरीर स्ट्रेच',
    bn: 'বিকালের জলপান ও ভঙ্গিমা স্ট্রেচ',
  },
  'Drink 1 Glass Water & Take Metformin 500mg': {
    hi: '1 गिलास पानी पिएं और मेटफॉर्मिन 500mg लें',
    bn: '১ গ্লাস জল পান করুন ও মেটফরমিন ৫০০ মিগ্রা নিন',
  },
  'Lunch + Vitamin D3 Supplement': {
    hi: 'दोपहर का भोजन + विटामिन D3 सप्लीमेंट',
    bn: 'দুপুরের খাবার + ভিটামিন ডি-৩ ট্যাবলেট',
  },
  'Night Dose: Metformin 500mg + Warm Water': {
    hi: 'रात की खुराक: मेटफॉर्मिन 500mg + गुनगुना पानी',
    bn: 'রাতের ডোজ: মেটফরমিন ৫০০ মিগ্রা + হালকা গরম জল',
  },

  // Nutrition guardrails
  'STRICTLY AVOID Shellfish (severe allergy)': {
    hi: 'सख़्त परहेज़: शेलफिश (गंभीर एलर्जी)',
    bn: 'কঠোরভাবে বর্জনীয়: চিংড়ি/খোলসযুক্ত মাছ (তীব্র অ্যালার্জি)',
  },
  'STRICTLY AVOID Penicillin-class antibiotics (drug allergy)': {
    hi: 'सख़्त परहेज़: पेनिसिलिन एंटीबायोटिक्स (दवा एलर्जी)',
    bn: 'কঠোরভাবে বর্জনীয়: পেনিসिलিন জাতীয় অ্যান্টিবায়োটিক',
  },
  'High-sodium pickles, cured meats, and processed salty snacks': {
    hi: 'ज्यादा नमक वाला अचार, प्रोसेस्ड मांस और नमकीन स्नैक्स',
    bn: 'বেশি নুনযুক্ত আচার, প্রক্রিয়াজাত খাবার ও নোনতা স্ন্যাকস',
  },
  'STRICTLY AVOID Peanuts (anaphylactic risk)': {
    hi: 'सख़्त परहेज़: मूंगफली (गंभीर एलर्जी जोखिम)',
    bn: 'কঠোরভাবে বর্জনীয়: চিনাবাদাম (গুরুতর অ্যালার্জি ঝুঁকি)',
  },
  'STRICTLY AVOID Sulfa Drugs (drug allergy alert pinned for paramedics)': {
    hi: 'सख़्त परहेज़: सल्फा दवाइयाँ (आपातकालीन टीम के लिए पिन की गई चेतावनी)',
    bn: 'কঠোরভাবে বর্জনীয়: সালফা ওষুধ (জরুরি চিকিৎসকদের জন্য পিন করা)',
  },
  'Dust-mite exposure in damp bedding; refined sugar or sweets': {
    hi: 'नम बिस्तर में धूल के कण; रिफाइंड चीनी या मिठाइयाँ',
    bn: 'স্যাতসেঁতে বিছানার ধূলিকণা; পরিশোধিত চিনি বা মিষ্টি',
  },
  'Packaged trans fats and late-night caffeinated beverages': {
    hi: 'पैक्ड ट्रांस फैट और देर रात की कैफीन पेय',
    bn: 'প্যাকেটজাত ট্রান্স ফ্যাট ও গভীর রাতে ক্যাফেইনযুক্ত পানীয়',
  },
  'Refined sugars, sweets, and sweetened juices': {
    hi: 'रिफाइंड चीनी, मिठाइयाँ और मीठे जूस',
    bn: 'পরিশোধিত চিনি, মিষ্টি এবং চিনিযুক্ত পানীয়',
  },
  'High-sodium pickles and ultra-processed snacks': {
    hi: 'ज्यादा नमक वाले अचार और अल्ट्रा-प्रोसेस्ड स्नैक्स',
    bn: 'অতিরিক্ত নুনযুক্ত আচার এবং প্রক্রিয়াজাত খাবার',
  },
  'Low-GI whole grains, high-fiber greens, and fixed meal timing': {
    hi: 'कम-GI साबुत अनाज, रेशेदार हरी सब्ज़ियाँ और नियमित भोजन समय',
    bn: 'কম-GI শস্য, আঁশযুক্ত সবুজ শাকসবজি ও নির্দিষ্ট সময়ে খাবার',
  },
  'Balanced seasonal vegetables, dals, and whole proteins': {
    hi: 'संतुलित मौसमी सब्ज़ियाँ, दाल और संपूर्ण प्रोटीन',
    bn: 'সুষম মৌসুমি সবজি, ডাল এবং সম্পূর্ণ প্রোটিন',
  },
  'Low-sodium meals (<1,500 mg/day) rich in potassium': {
    hi: 'पोटैशियम से भरपूर कम-नमक भोजन (<1,500 मिग्रा/दिन)',
    bn: 'পটাশিয়াম সমৃদ্ধ কম নুনের খাবার (<১৫০০ মিগ্রা/দিন)',
  },
  '2500 ml hydration evenly spaced across 06:30–23:00': {
    hi: '06:30–23:00 के बीच 2500 मि.ली. संतुलित जल सेवन',
    bn: '০৬:৩০–২৩:০০-এর মধ্যে ২৫০০ মি.লি. সুষম জলপান',
  },
  'Low-sodium DASH meals rich in potassium greens, oats, and berries': {
    hi: 'पोटैशियम सब्ज़ियों, ओट्स व बेरीज़ युक्त कम-नमक DASH आहार',
    bn: 'পটাশিয়াম সবজি, ওটস ও বেরিসহ কম-নুনের DASH খাবার',
  },
  'Lean legumes, grilled poultry, and olive oil': {
    hi: 'हल्की दालें, ग्रिल्ड प्रोटीन और जैतून का तेल',
    bn: 'হালকা ডাল, কম চর্বির প্রোটিন এবং অলিভ অয়েল',
  },
  '1800 ml gentle hydration spaced cleanly before 20:00': {
    hi: 'रात 20:00 से पहले 1800 मि.ली. सहज जल सेवन',
    bn: 'রাত ২০:০০-এর আগে ১৮০০ মি.লি. পরিমিত জলপান',
  },
  'Low-GI millets, steamed vegetables, moong dal, and warm turmeric milk': {
    hi: 'कम-GI मोटा अनाज, उबली सब्ज़ियाँ, मूंग दाल और हल्दी वाला गुनगुना दूध',
    bn: 'কম-GI শস্য, ভাপানো সবজি, মুগ ডাল ও হালকা হলুদ দুধ',
  },
  'Calcium and Vitamin D3 support for osteoarthritis joint health': {
    hi: 'जोड़ों के स्वास्थ्य के लिए कैल्शियम और विटामिन D3 सहायता',
    bn: 'হাঁটু ও হাড়ের সুস্থতায় ক্যালসিয়াম ও ভিটামিন ডি-৩ সহায়তা',
  },
  'Morning Hydration & Breakfast': {
    hi: 'सुबह का जल और नाश्ता',
    bn: 'সকালের জলপান ও জলখাবার',
  },
  'Allergy-Safe Afternoon Meal Check': {
    hi: 'एलर्जी-सुरक्षित दोपहर भोजन जांच',
    bn: 'অ্যালার্জি-সুরক্ষিত দুপুরের খাবার পরীক্ষা',
  },
};

const MULTILINGUAL_PROMPT_TRANSLATIONS: Record<
  string,
  Record<PromptLanguage, string>
> = {
  'Good morning Rohan. Place your finger on the pulse pad for your quick baseline check.':
    {
      en: 'Good morning Rohan. Place your finger on the pulse pad for your quick baseline check.',
      hi: 'सुप्रभात रोहन। अपनी त्वरित बेसलाइन जांच के लिए पल्स पैड पर उंगली रखें।',
      bn: 'সুপ্রভাত রোহন। আপনার দ্রুত বেসলাইন পরীক্ষার জন্য পালস প্যাডে আঙুল রাখুন।',
    },
  'Rohan, your 30-minute morning brisk walk and stretching block starts now.': {
    en: 'Rohan, your 30-minute morning brisk walk and stretching block starts now.',
    hi: 'रोहन, आपकी 30 मिनट की सुबह की तेज़ चाल और स्ट्रेचिंग का समय शुरू होता है।',
    bn: 'রোহন, আপনার ৩০ মিনিটের সকালের দ্রুত হাঁটা ও স্ট্রেচিংয়ের সময় শুরু হয়েছে।',
  },
  'Medication reminder: Take Telmisartan 20mg with a full glass of water.': {
    en: 'Medication reminder: Take Telmisartan 20mg with a full glass of water.',
    hi: 'दवा अनुस्मारक: पूरे एक गिलास पानी के साथ टेलमिसार्टन 20mg लें।',
    bn: 'ওষুধের রিমাইন্ডার: এক গ্লাস পূর্ণ জলের সাথে টেলমিসার্টান ২০ মিগ্রা নিন।',
  },
  'Hydration alert: Drink 300 ml of water to stay on track for 2500 ml today.': {
    en: 'Hydration alert: Drink 300 ml of water to stay on track for 2500 ml today.',
    hi: 'जल चेतावनी: आज 2500 मि.ली. लक्ष्य के लिए 300 मि.ली. पानी पिएं।',
    bn: 'জলপানের সতর্কতা: আজ ২৫০০ মি.লি. লক্ষ্যে থাকতে ৩০০ মি.লি. জল পান করুন।',
  },
  'Time for a 5-minute desk stretch and a glass of water.': {
    en: 'Time for a 5-minute desk stretch and a glass of water.',
    hi: '5 मिनट डेस्क स्ट्रेच और एक गिलास पानी पीने का समय हो गया है।',
    bn: '৫ মিনিটের ডেস্ক স্ট্রেচ ও এক গ্লাস জল পান করার সময় হয়েছে।',
  },
  'সুপ্রভাত সুভশ্রী দেবী। অনুগ্রহ করে সকালের স্বাস্থ্য পরীক্ষা সম্পন্ন করুন।': {
    en: 'Good morning Subhashree Devi. Please complete your morning wellness check-in.',
    hi: 'सुप्रभात सुभश्री देवी। कृपया अपनी सुबह की स्वास्थ्य जांच पूरी करें।',
    bn: 'সুপ্রভাত শুভশ্রী দেবী। অনুগ্রহ করে সকালের স্বাস্থ্য পরীক্ষা সম্পন্ন করুন।',
  },
  'সকাল ৭টা ১৫ মিনিট। চেয়ারে বসে হালকা যোগব্যায়াম ও হাঁটুর ব্যায়ামের সময় হয়েছে।':
    {
      en: 'It is 07:15 AM. Time for gentle seated chair yoga and knee mobility exercises.',
      hi: 'सुबह 07:15 बजे हैं। कुर्सी पर हल्के योग और घुटनों के व्यायाम का समय है।',
      bn: 'সকাল ৭টা ১৫ মিনিট। চেয়ারে বসে হালকা যোগব্যায়াম ও হাঁটুর ব্যায়ামের সময় হয়েছে।',
    },
  'সকাল ৮টা ৩০ মিনিট। এক গ্লাস জল পান করুন এবং মেটফরমিন ৫০০ মিলিগ্রাম ওষুধ খান।':
    {
      en: 'It is 08:30 AM. Please drink one glass of water and take Metformin 500mg.',
      hi: 'सुबह 08:30 बजे हैं। एक गिलास पानी पिएं और मेटफॉर्मिन 500mg लें।',
      bn: 'সকাল ৮টা ৩০ মিনিট। এক গ্লাস জল পান করুন এবং মেটফরমিন ৫০০ মিলিগ্রাম ওষুধ খান।',
    },
  'দুপুরের খাবার এবং ভিটামিন ডি-৩ ট্যাবলেট খাওয়ার সময় হয়েছে।': {
    en: 'It is time for lunch and your Vitamin D3 supplement.',
    hi: 'दोपहर का भोजन और विटामिन D3 टैबलेट लेने का समय हो गया है।',
    bn: 'দুপুরের খাবার এবং ভিটামিন ডি-৩ ট্যাবলেট খাওয়ার সময় হয়েছে।',
  },
  'রাত ৮টা ৩০ মিনিট। রাতের মেটফরমিন ওষুধ এবং হালকা গরম জল পান করুন।': {
    en: 'It is 08:30 PM. Take your night Metformin dose with warm water.',
    hi: 'रात 08:30 बजे हैं। रात की मेटफॉर्मिन दवा और गुनगुना पानी लें।',
    bn: 'রাত ৮টা ৩০ মিনিট। রাতের মেটফরমিন ওষুধ এবং হালকা গরম জল পান করুন।',
  },
};

/** Translates known profile names, medical chips, exercises, and rules into hi/bn cleanly. */
export function localizeKnownText(text: string, lang: PromptLanguage): string {
  if (!text) return text;

  const multiPrompt = MULTILINGUAL_PROMPT_TRANSLATIONS[text];
  if (multiPrompt) return multiPrompt[lang];

  if (lang === 'en') return text;

  const direct = KNOWN_TEXT_TRANSLATIONS[text];
  if (direct) return direct[lang];

  // Dynamic fallback patterns from carePlanFallback.ts
  if (text.startsWith('STRICTLY AVOID allergens:')) {
    const rest = text.replace('STRICTLY AVOID allergens:', '').trim();
    const translatedList = rest
      .split(',')
      .map((item) => localizeKnownText(item.trim(), lang))
      .join(', ');
    return lang === 'bn'
      ? `কঠোরভাবে বর্জনীয় অ্যালার্জি: ${translatedList}`
      : `सख़्त परहेज़ एलर्जी: ${translatedList}`;
  }
  if (text.startsWith('Mid-Day Hydration Reminder')) {
    const match = text.match(/\((\d+)/);
    const ml = match ? localizeDigits(match[1], lang) : localizeDigits(2000, lang);
    return lang === 'bn'
      ? `দুপুরের জলপান রিমাইন্ডার (${ml} মি.লি. লক্ষ্য)`
      : `दोपहर जल अनुस्मारक (${ml} मि.ली. लक्ष्य)`;
  }
  if (text.startsWith('Target ') && text.includes('hydration evenly across')) {
    const mlMatch = text.match(/Target (\d+) ml/);
    const ml = mlMatch ? localizeDigits(mlMatch[1], lang) : localizeDigits(2000, lang);
    return lang === 'bn'
      ? `সারাদিনে সমানভাবে ${ml} মি.লি. জলপানের লক্ষ্য`
      : `दिन भर में समान रूप से ${ml} मि.ली. जल का लक्ष्य`;
  }
  if (text.startsWith('Water & Medication:')) {
    const med = text.replace('Water & Medication:', '').trim();
    return lang === 'bn' ? `জল ও ওষুধ: ${med}` : `पानी व दवा: ${med}`;
  }
  if (text.startsWith('Lunch + ')) {
    const med = text.replace('Lunch + ', '').trim();
    return lang === 'bn' ? `দুপুরের খাবার + ${med}` : `दोपहर का भोजन + ${med}`;
  }

  return localizeDigits(text, lang);
}

/** Translates trigger reasons shown on Emergency countdown HUD. */
export function localizeEmergencyReason(
  reason: string | null,
  lang: PromptLanguage
): string {
  if (!reason) return KIOSK_COPY[lang].anomalyDetectedFallback;
  if (lang === 'en') return reason;

  if (reason.includes('Fall Detected')) {
    return lang === 'bn'
      ? 'পতন শনাক্ত: OV5647 AI ভঙ্গি + KY-037 শব্দের ধাক্কা'
      : 'गिरावट दर्ज: OV5647 AI मुद्रा + KY-037 तेज़ आवाज़';
  }
  if (reason.includes('Manual Emergency HUD')) {
    return lang === 'bn'
      ? 'ম্যানুয়াল জরুরি HUD প্রিভিউ'
      : 'मैनुअल आपातकालीन HUD पूर्वावलोकन';
  }
  if (reason.includes('Night Bed Absence')) {
    return lang === 'bn'
      ? 'রাতের বিছানায় অনুপস্থিতি (>১৫ মিনিট)'
      : 'रात में बिस्तर से अनुपस्थिति (>15 मिनट)';
  }
  if (reason.includes('Critical SpO2') || reason.includes('SpO₂')) {
    return lang === 'bn'
      ? 'অক্সিজেন (SpO₂) বিপজ্জনক মাত্রায় নেমেছে'
      : 'ऑक्सीजन स्तर (SpO₂) सुरक्षित सीमा से नीचे';
  }
  if (reason.includes('Heart Rate') || reason.includes('BPM')) {
    return lang === 'bn'
      ? 'হৃদস্পন্দন নিরাপদ সীমার বাইরে'
      : 'हृदय गति सुरक्षित सीमा से बाहर';
  }
  if (reason.includes('Temp') || reason.includes('°F')) {
    return lang === 'bn'
      ? 'উচ্চ শরীরের তাপমাত্রা শনাক্ত'
      : 'शरीर का तापमान सुरक्षित सीमा से अधिक';
  }
  return localizeDigits(reason, lang);
}
