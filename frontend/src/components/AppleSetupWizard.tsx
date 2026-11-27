import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Code,
  Heartbeat,
  LockKey,
  Minus,
  Moon,
  Plus,
  Sun,
  ThermometerSimple,
  Trash,
  UploadSimple,
  UserCircle,
  Wind,
} from '@phosphor-icons/react';
import {
  generateCarePlanWithAi,
  type CarePlanResponse,
} from '../config/api';
import { useSandbox } from '../context/SandboxContext';
import { computeAccessibilityTier } from '../utils/accessibilityTier';
import { audioEngine, type PromptLanguage } from '../utils/audioEngine';
import { buildOfflineCarePlanFallback } from '../utils/carePlanFallback';
import { buildSamplePortraitDataUrl } from '../components/WebcamCaptureBox';
import {
  OnScreenKioskKeyboard,
  type KioskKeyboardField,
} from '../components/OnScreenKioskKeyboard';
import '../styles/elderSetup.css';

type SetupScreenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type CalibrationStep = 'pulse_spo2' | 'temp' | 'radar';
type CapturePhase = 'waiting' | 'sampling' | 'captured';

const ALLERGY_CHIPS = ['Peanuts', 'Shellfish', 'Dairy', 'Penicillin', 'Sulfa Drugs', 'None'];
const CONDITION_CHIPS = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Osteoarthritis', 'None'];

function shiftTime24(hhmm: string, deltaMinutes: number): string {
  const base = hhmm || '06:00';
  const [hStr, mStr] = base.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const total =
    (((Number.isFinite(h) ? h : 6) * 60 + (Number.isFinite(m) ? m : 0) + deltaMinutes) %
      1440 +
      1440 +
      1440) %
    1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function format12Hour(hhmm: string, notSetLabel: string = 'Not set'): string {
  if (!hhmm) return notSetLabel;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

const WELCOME_TEXTS: Record<PromptLanguage, string> = {
  en: 'Hello. Welcome to XYZ Home Deck. I will guide you through the setup in clear English.',
  hi: 'नमस्ते। एक्सवाईज़ेड होम डेक में आपका स्वागत है। मैं आपको हिंदी में सेटअप कराऊंगी।',
  bn: 'নমস্কার। এক্সওয়াইজেড হোম ডেকে স্বাগতম। আমি বাংলায় সেটআপ করিয়ে দেব।',
};

/* Full UI localization — every visible wizard string, all 3 languages */
const SETUP_COPY = {
  en: {
    brand: 'XYZ HOME DECK',
    greetingEyebrow: 'FIRST-TIME DEVICE SETUP',
    greetingTitle: 'Hello · Welcome',
    greetingSub: 'Set up your parent’s vitals baseline, daily care schedule, and emergency contacts in under two minutes.',
    getStarted: 'Get Started',
    loadDemo: 'Load Demo Profile →',
    back: 'Back',
    continue: 'Continue',
    completeSetup: 'Complete Setup',
    stepOf: (n: number) => `Step ${n} of 7`,
    s1Eyebrow: 'STEP 1 · LANGUAGE',
    s1Title: 'Choose Preferred Language',
    s1Sub: 'All voice announcements and daily check-in prompts will use this language.',
    s1Cards: [
      { title: 'English', sub: 'Clear Indian English voice & display', sample: '“Good morning. Time for your vitals check-in.”' },
      { title: 'हिन्दी', sub: 'हिन्दी आवाज़ और स्पष्ट निर्देश', sample: '“सुप्रभात। दैनिक जांच का समय हो गया है।”' },
      { title: 'বাংলা', sub: 'বাংলায় ভয়েস নির্দেশনা ও সহজ স্ক্রিন', sample: '“সুপ্রভাত। দৈনিক পরীক্ষার সময় হয়েছে।”' },
    ],
    s2Eyebrow: 'STEP 2 · PARENT PROFILE',
    s2Title: 'Parent’s Profile',
    s2Sub: 'Voice cadence and screen layout adapt automatically to your parent’s age.',
    s2Name: 'Parent’s Full Name',
    s2NamePh: 'Enter parent’s full name',
    s2Age: 'Age',
    s2AgePresets: ['50 yrs', '78 yrs'],
    s2PreviewEyebrow: 'LIVE HUD ADAPTATION PREVIEW',
    s2PreviewCards: [
      { title: 'Standard Multi-Metric Cockpit', lines: ['6-tile compact telemetry grid', '1.0× voice cadence', 'Corner utility controls'] },
      { title: 'High-Assist Ergonomic HUD', lines: ['3 oversized vital cards', '0.78× calm voice cadence', 'Full-width bottom touch dock'] },
    ],
    s3Eyebrow: 'STEP 3 · EMERGENCY CONTACT',
    s3Title: 'Guardian Contact & Home Pin',
    s3Sub: 'Who should the deck call if an alert goes unanswered?',
    s3Rows: [
      { label: 'Guardian Name', ph: 'Sourav Biswas' },
      { label: 'Phone / Telegram', ph: '+91 98300 41280 · @sourav_family_alert' },
      { label: 'Home Address', ph: '42/B Shyambazar Street, Kolkata 700004' },
    ],
    s3Footnote: 'Dispatched to family and emergency responders only if a Stage 2–4 alert goes unanswered.',
    s4Eyebrow: 'STEP 4 · HEALTH PROFILE',
    s4Title: 'Health Profile & Daily Rhythm',
    s4Sub: 'Allergies, conditions, medications, and the sleep window radar guards.',
    s4Allergies: 'Allergies',
    s4Conditions: 'Conditions',
    s4MedsPh: 'Add daily medication…',
    s4Add: 'Add',
    s4SleepEyebrow: 'DAILY SLEEP & WAKE WINDOW',
    s4Wake: 'Wake-Up Time',
    s4Sleep: 'Sleep Time',
    s4RadarNote: '24GHz mmWave radar automatically arms the 15-minute night bed-absence watch between Sleep and Wake times.',
    s5Eyebrow: 'STEP 5 · FACE ENROLLMENT',
    s5Title: 'Face Enrollment',
    s5Sub: 'Captured once on the OV5647 camera so only family unlocks personal vitals.',
    s5Capture: 'Capture',
    s5Upload: 'Upload',
    s5Sample: 'Sample Portrait',
    s5SpecTitle: 'On-Device Recognition Only',
    s5SpecBody: '100% local matching on Raspberry Pi 4; unregistered visitors are locked out of personal vitals.',
    s5Status: 'Status',
    s5Enrolled: 'Portrait Enrolled',
    s5Live: 'Camera Live',
    s5Waiting: 'Awaiting Capture',
    s5AgePending: 'Age pending',
    s6Eyebrows: ['SENSOR CALIBRATION · 1/3 MAX30102', 'SENSOR CALIBRATION · 2/3 MLX90614', 'SENSOR CALIBRATION · 3/3 HLK-LD2410B'],
    s6Titles: ['Pulse & SpO₂', 'Forehead IR Temperature', 'Radar Breathing'],
    s6Prompts: ['Place finger on bezel pulse pad', 'Hold forehead 5–10 cm from IR optic', 'Sit still 3 seconds for breathing lock'],
    s6Note: 'Sets personal alert bounds so resting variation never triggers a false alarm.',
    s6Locked: '✓ Baseline locked',
    s6Acquiring: (pct: number) => `Acquiring baseline · ${pct}%`,
    s6DemoTitle: 'Demo Sensor Input',
    s6LockNext: 'Lock & Next →',
    s6Locking: (pct: number) => `Locking ${pct}%`,
    s7Eyebrow: 'AI CARE & ALARM SCHEDULE',
    s7PlanOf: (name: string) => `${name}’s Daily Plan`,
    s7Alarms: 'Daily Alarms',
    s7WaterGoal: (ml: number) => `${ml} ml water goal`,
    s7Voice: 'voice',
    s7Recommended: 'RECOMMENDED',
    s7Avoid: 'STRICTLY AVOID',
    s7ViewJson: 'View JSON',
    s7HideJson: 'Hide JSON',
    s7Syncing: 'Syncing…',
    s7Refining: 'Refining with NVIDIA NIM…',
    keyboardDone: 'Done',
    notSet: 'Not set',
    residentFallback: 'Resident',
  },
  hi: {
    brand: 'XYZ होम डेक',
    greetingEyebrow: 'पहली बार डिवाइस सेटअप',
    greetingTitle: 'नमस्ते · स्वागत है',
    greetingSub: 'दो मिनट में अपने माता-पिता की वाइटल्स बेसलाइन, दैनिक देखभाल शेड्यूल और आपातकालीन संपर्क सेट करें।',
    getStarted: 'शुरू करें',
    loadDemo: 'डेमो प्रोफ़ाइल लोड करें →',
    back: 'वापस',
    continue: 'आगे बढ़ें',
    completeSetup: 'सेटअप पूरा करें',
    stepOf: (n: number) => `चरण ${n} / 7`,
    s1Eyebrow: 'चरण 1 · भाषा',
    s1Title: 'अपनी पसंदीदा भाषा चुनें',
    s1Sub: 'सभी आवाज़ सूचनाएँ और दैनिक जांच संकेत इसी भाषा में होंगे।',
    s1Cards: [
      { title: 'English', sub: 'स्पष्ट भारतीय अंग्रेज़ी आवाज़ और स्क्रीन', sample: '“Good morning. Time for your vitals check-in.”' },
      { title: 'हिन्दी', sub: 'हिन्दी आवाज़ और स्पष्ट निर्देश', sample: '“सुप्रभात। दैनिक जांच का समय हो गया है।”' },
      { title: 'বাংলা', sub: 'বাংলায় ভয়েস নির্দেশনা ও সহজ স্ক্রিন', sample: '“সুপ্রভাত। দৈনিক পরীক্ষার সময় হয়েছে।”' },
    ],
    s2Eyebrow: 'चरण 2 · प्रोफ़ाइल',
    s2Title: 'माता-पिता की प्रोफ़ाइल',
    s2Sub: 'आवाज़ की गति और स्क्रीन लेआउट उम्र के अनुसार अपने आप बदलता है।',
    s2Name: 'पूरा नाम',
    s2NamePh: 'माता-पिता का पूरा नाम लिखें',
    s2Age: 'उम्र',
    s2AgePresets: ['50 वर्ष', '78 वर्ष'],
    s2PreviewEyebrow: 'लाइव HUD अनुकूलन प्रीव्यू',
    s2PreviewCards: [
      { title: 'स्टैंडर्ड मल्टी-मेट्रिक कॉकपिट', lines: ['6-टाइल कॉम्पैक्ट टेलीमेट्री ग्रिड', '1.0× आवाज़ गति', 'कोने के यूटिलिटी कंट्रोल'] },
      { title: 'हाई-असिस्ट एर्गोनॉमिक HUD', lines: ['3 बड़े वाइटल कार्ड', '0.78× शांत आवाज़ गति', 'पूरी चौड़ाई वाला निचला टच डॉक'] },
    ],
    s3Eyebrow: 'चरण 3 · आपातकालीन संपर्क',
    s3Title: 'गार्जियन संपर्क और घर का पता',
    s3Sub: 'अलर्ट का जवाब न मिलने पर डेक किसे कॉल करे?',
    s3Rows: [
      { label: 'गार्जियन का नाम', ph: 'Sourav Biswas' },
      { label: 'फ़ोन / टेलीग्राम', ph: '+91 98300 41280 · @sourav_family_alert' },
      { label: 'घर का पता', ph: '42/B Shyambazar Street, Kolkata 700004' },
    ],
    s3Footnote: 'केवल स्टेज 2–4 अलर्ट का जवाब न मिलने पर ही परिवार और आपातकालीन सेवाओं को भेजा जाता है।',
    s4Eyebrow: 'चरण 4 · स्वास्थ्य प्रोफ़ाइल',
    s4Title: 'स्वास्थ्य प्रोफ़ाइल और दैनिक दिनचर्या',
    s4Sub: 'एलर्जी, बीमारियाँ, दवाइयाँ और नींद की विंडो जिसे रडार देखता है।',
    s4Allergies: 'एलर्जी',
    s4Conditions: 'बीमारियाँ',
    s4MedsPh: 'रोज़ की दवा जोड़ें…',
    s4Add: 'जोड़ें',
    s4SleepEyebrow: 'दैनिक नींद और जागने की विंडो',
    s4Wake: 'जागने का समय',
    s4Sleep: 'सोने का समय',
    s4RadarNote: 'सोने और जागने के समय के बीच 24GHz mmWave रडार अपने आप 15-मिनट की रात की बिस्तर-अनुपस्थिति निगरानी चालू करता है।',
    s5Eyebrow: 'चरण 5 · चेहरा पंजीकरण',
    s5Title: 'चेहरा पंजीकरण',
    s5Sub: 'OV5647 कैमरे पर एक बार कैप्चर करें ताकि केवल परिवार ही वाइटल्स देख सके।',
    s5Capture: 'कैप्चर',
    s5Upload: 'अपलोड',
    s5Sample: 'नमूना तस्वीर',
    s5SpecTitle: 'केवल ऑन-डिवाइस पहचान',
    s5SpecBody: '100% लोकल मैचिंग Raspberry Pi 4 पर; अनजान चेहरे व्यक्तिगत वाइटल्स से बाहर रखे जाते हैं।',
    s5Status: 'स्थिति',
    s5Enrolled: 'तस्वीर पंजीकृत',
    s5Live: 'कैमरा चालू',
    s5Waiting: 'कैप्चर की प्रतीक्षा',
    s5AgePending: 'उम्र बाकी',
    s6Eyebrows: ['सेंसर कैलिब्रेशन · 1/3 MAX30102', 'सेंसर कैलिब्रेशन · 2/3 MLX90614', 'सेंसर कैलिब्रेशन · 3/3 HLK-LD2410B'],
    s6Titles: ['पल्स और SpO₂', 'माथे का IR तापमान', 'रडार सांस दर'],
    s6Prompts: ['उंगली पल्स पैड पर रखें', 'माथा IR सेंसर से 5–10 सेमी दूर रखें', 'सांस लॉक के लिए 3 सेकंड शांत बैठें'],
    s6Note: 'आराम के समय के बदलाव से झूठा अलर्ट न हो, इसलिए निजी सीमाएँ सेट होती हैं।',
    s6Locked: '✓ बेसलाइन लॉक हो गई',
    s6Acquiring: (pct: number) => `बेसलाइन ली जा रही है · ${pct}%`,
    s6DemoTitle: 'डेमो सेंसर इनपुट',
    s6LockNext: 'लॉक करें और आगे →',
    s6Locking: (pct: number) => `लॉक हो रहा है ${pct}%`,
    s7Eyebrow: 'AI देखभाल और अलार्म शेड्यूल',
    s7PlanOf: (name: string) => `${name} की दैनिक योजना`,
    s7Alarms: 'दैनिक अलार्म',
    s7WaterGoal: (ml: number) => `${ml} मिली पानी का लक्ष्य`,
    s7Voice: 'आवाज़',
    s7Recommended: 'अनुशंसित',
    s7Avoid: 'सख़्ती से परहेज़',
    s7ViewJson: 'JSON देखें',
    s7HideJson: 'JSON छिपाएँ',
    s7Syncing: 'सिंक हो रहा है…',
    s7Refining: 'NVIDIA NIM से बेहतर हो रहा है…',
    keyboardDone: 'पूर्ण',
    notSet: 'सेट नहीं',
    residentFallback: 'निवासी',
  },
  bn: {
    brand: 'XYZ হোম ডেক',
    greetingEyebrow: 'প্রথমবারের ডিভাইস সেটআপ',
    greetingTitle: 'নমস্কার · স্বাগতম',
    greetingSub: 'দুই মিনিটেই আপনার পিতামাতার ভাইটালস বেসলাইন, দৈনিক যত্নের সময়সূচি এবং জরুরি যোগাযোগ সেট করুন।',
    getStarted: 'শুরু করুন',
    loadDemo: 'ডেমো প্রোফাইল লোড করুন →',
    back: 'পেছনে',
    continue: 'এগিয়ে যান',
    completeSetup: 'সেটআপ সম্পূর্ণ করুন',
    stepOf: (n: number) => `ধাপ ${n} / 7`,
    s1Eyebrow: 'ধাপ ১ · ভাষা',
    s1Title: 'পছন্দের ভাষা বেছে নিন',
    s1Sub: 'সব ভয়েস ঘোষণা এবং দৈনিক চেক-ইন প্রম্পট এই ভাষায় হবে।',
    s1Cards: [
      { title: 'English', sub: 'স্পষ্ট ভারতীয় ইংরেজি ভয়েস ও স্ক্রিন', sample: '“Good morning. Time for your vitals check-in.”' },
      { title: 'हिन्दी', sub: 'हिन्दी आवाज़ और स्पष्ट निर्देश', sample: '“सुप्रभात। दैनिक जांच का समय हो गया है।”' },
      { title: 'বাংলা', sub: 'বাংলায় ভয়েস নির্দেশনা ও সহজ স্ক্রিন', sample: '“সুপ্রভাত। দৈনিক পরীক্ষার সময় হয়েছে।”' },
    ],
    s2Eyebrow: 'ধাপ ২ · প্রোফাইল',
    s2Title: 'পিতামাতার প্রোফাইল',
    s2Sub: 'বয়স অনুযায়ী ভয়েসের গতি এবং স্ক্রিন লেআউট নিজেই বদলে যায়।',
    s2Name: 'পূর্ণ নাম',
    s2NamePh: 'পিতামাতার পূর্ণ নাম লিখুন',
    s2Age: 'বয়স',
    s2AgePresets: ['৫০ বছর', '৭৮ বছর'],
    s2PreviewEyebrow: 'লাইভ HUD অ্যাডাপ্টেশন প্রিভিউ',
    s2PreviewCards: [
      { title: 'স্ট্যান্ডার্ড মাল্টি-মেট্রিক ককপিট', lines: ['৬-টাইল কমপ্যাক্ট টেলিমেট্রি গ্রিড', '১.০× ভয়েস গতি', 'কোণার ইউটিলিটি কন্ট্রোল'] },
      { title: 'হাই-অ্যাসিস্ট এর্গোনমিক HUD', lines: ['৩টি বড় ভাইটাল কার্ড', '০.৭৮× শান্ত ভয়েস গতি', 'পুরো প্রস্থের নিচের টাচ ডক'] },
    ],
    s3Eyebrow: 'ধাপ ৩ · জরুরি যোগাযোগ',
    s3Title: 'গার্জিয়ান যোগাযোগ ও বাড়ির ঠিকানা',
    s3Sub: 'অ্যালার্টের উত্তর না পেলে ডেক কাকে কল করবে?',
    s3Rows: [
      { label: 'গার্জিয়ানের নাম', ph: 'Sourav Biswas' },
      { label: 'ফোন / টেলিগ্রাম', ph: '+91 98300 41280 · @sourav_family_alert' },
      { label: 'বাড়ির ঠিকানা', ph: '42/B Shyambazar Street, Kolkata 700004' },
    ],
    s3Footnote: 'শুধুমাত্র স্টেজ ২–৪ অ্যালার্টের উত্তর না পেলেই পরিবার ও জরুরি সেবাকে পাঠানো হয়।',
    s4Eyebrow: 'ধাপ ৪ · স্বাস্থ্য প্রোফাইল',
    s4Title: 'স্বাস্থ্য প্রোফাইল ও দৈনিক ছন্দ',
    s4Sub: 'অ্যালার্জি, রোগ, ওষুধ এবং ঘুমের সময়জালা যেটা রাডার পাহারা দেয়।',
    s4Allergies: 'অ্যালার্জি',
    s4Conditions: 'রোগ',
    s4MedsPh: 'প্রতিদিনের ওষুধ যোগ করুন…',
    s4Add: 'যোগ করুন',
    s4SleepEyebrow: 'দৈনিক ঘুম ও জাগার সময়',
    s4Wake: 'জাগার সময়',
    s4Sleep: 'ঘুমানোর সময়',
    s4RadarNote: 'ঘুম ও জাগার সময়ের মধ্যে 24GHz mmWave রাডার নিজে থেকেই ১৫-মিনিটের রাতের বিছানা-অনুপস্থিতি নজরদারি চালু করে।',
    s5Eyebrow: 'ধাপ ৫ · মুখের নিবন্ধন',
    s5Title: 'মুখের নিবন্ধন',
    s5Sub: 'OV5647 ক্যামেরায় একবার ক্যাপচার করুন যাতে শুধু পরিবারই ভাইটালস দেখতে পারে।',
    s5Capture: 'ক্যাপচার',
    s5Upload: 'আপলোড',
    s5Sample: 'নমুনা ছবি',
    s5SpecTitle: 'শুধুমাত্র অন-ডিভাইস শনাক্তকরণ',
    s5SpecBody: 'Raspberry Pi 4-এ ১০০% লোকাল ম্যাচিং; অচেনা মানুষ ব্যক্তিগত ভাইটালস থেকে বাদ রাখা হয়।',
    s5Status: 'অবস্থা',
    s5Enrolled: 'ছবি নিবন্ধিত',
    s5Live: 'ক্যামেরা চালু',
    s5Waiting: 'ক্যাপচারের অপেক্ষায়',
    s5AgePending: 'বয়স বাকি',
    s6Eyebrows: ['সেন্সর ক্যালিব্রেশন · ১/৩ MAX30102', 'সেন্সর ক্যালিব্রেশন · ২/৩ MLX90614', 'সেন্সর ক্যালিব্রেশন · ৩/৩ HLK-LD2410B'],
    s6Titles: ['পালস ও SpO₂', 'কপালের IR তাপমাত্রা', 'রাডার শ্বাসের হার'],
    s6Prompts: ['আঙুল পালস প্যাডে রাখুন', 'কপাল IR সেন্সর থেকে ৫–১০ সেমি দূরে রাখুন', 'শ্বাস লকের জন্য ৩ সেকেন্ড শান্ত থাকুন'],
    s6Note: 'বিশ্রামের পরিবর্তনে মিথ্যা অ্যালার্ট না হয় তাই ব্যক্তিগত সীমা সেট হয়।',
    s6Locked: '✓ বেসলাইন লক হয়েছে',
    s6Acquiring: (pct: number) => `বেসলাইন নেওয়া হচ্ছে · ${pct}%`,
    s6DemoTitle: 'ডেমো সেন্সর ইনপুট',
    s6LockNext: 'লক করুন ও এগোন →',
    s6Locking: (pct: number) => `লক হচ্ছে ${pct}%`,
    s7Eyebrow: 'AI যত্ন ও অ্যালার্ম সময়সূচি',
    s7PlanOf: (name: string) => `${name}-এর দৈনিক পরিকল্পনা`,
    s7Alarms: 'দৈনিক অ্যালার্ম',
    s7WaterGoal: (ml: number) => `${ml} মিলি জলের লক্ষ্য`,
    s7Voice: 'ভয়েস',
    s7Recommended: 'সুপারিশকৃত',
    s7Avoid: 'কঠোরভাবে বর্জনীয়',
    s7ViewJson: 'JSON দেখুন',
    s7HideJson: 'JSON লুকান',
    s7Syncing: 'সিঙ্ক হচ্ছে…',
    s7Refining: 'NVIDIA NIM দিয়ে উন্নত হচ্ছে…',
    keyboardDone: 'সম্পন্ন',
    notSet: 'সেট করা নেই',
    residentFallback: 'বাসিন্দা',
  },
} as const;

interface AppleSetupWizardProps {
  onCancel?: () => void;
}

export function AppleSetupWizard({ onCancel }: AppleSetupWizardProps) {
  const {
    kioskTheme,
    toggleKioskTheme,
    setLanguage: setContextLanguage,
    selectProfile,
    completeOnDeviceEnrollment,
  } = useSandbox();

  const isDark = kioskTheme === 'dark';

  const [screen, setScreen] = useState<SetupScreenIndex>(0);
  const [language, setLocalLanguage] = useState<PromptLanguage>('en');
  const [languagePicked, setLanguagePicked] = useState(false);

  const t = SETUP_COPY[language];

  // Empty-by-default onboarding form state
  const [nameValue, setNameValue] = useState('');
  const [ageDraft, setAgeDraft] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [homeAddress, setHomeAddress] = useState('');

  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [newMedInput, setNewMedInput] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [sleepTime, setSleepTime] = useState('');

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sequential 1-by-1 sensor calibration
  const [calibStep, setCalibStep] = useState<CalibrationStep>('pulse_spo2');
  const [calibPhase, setCalibPhase] = useState<CapturePhase>('waiting');
  const [samplingPct, setSamplingPct] = useState(0);
  const [draftHr, setDraftHr] = useState('');
  const [draftSpo2, setDraftSpo2] = useState('');
  const [draftTempF, setDraftTempF] = useState('');
  const [draftBreathing, setDraftBreathing] = useState('');
  const [lockedHr, setLockedHr] = useState<number | null>(null);
  const [lockedSpo2, setLockedSpo2] = useState<number | null>(null);
  const [lockedTempF, setLockedTempF] = useState<number | null>(null);
  const [lockedBreathing, setLockedBreathing] = useState<number | null>(null);
  const [calibError, setCalibError] = useState<string | null>(null);
  const samplingTimerRef = useRef<number | null>(null);

  const [generatedPlan, setGeneratedPlan] = useState<CarePlanResponse | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showJsonDrawer, setShowJsonDrawer] = useState(false);

  // Collapsible touch keyboard — closed unless a text field is focused
  const [kbField, setKbField] = useState<KioskKeyboardField | null>(null);

  const parsedAge = Number(ageDraft);
  const hasValidAge = Number.isFinite(parsedAge) && parsedAge >= 18 && parsedAge <= 110;
  const effectiveAge = hasValidAge ? Math.round(parsedAge) : 65;
  const tier = computeAccessibilityTier(effectiveAge);
  const kbOpen = kbField !== null;

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

  const goToScreen = (next: SetupScreenIndex) => {
    setKbField(null);
    if (screen === 5 && next !== 5) {
      stopWebcamStream();
    }
    if (next === 7) {
      void prepareCarePlan();
    }
    setScreen(next);
  };

  // ----- Virtual keyboard field binding -----

  const getKbValue = (field: KioskKeyboardField): string => {
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
      case 'medication':
        return newMedInput;
    }
  };

  const setKbValue = (field: KioskKeyboardField, next: string) => {
    const cap = (v: string, n: number) => v.slice(0, n);
    switch (field) {
      case 'name':
        setNameValue(cap(next, 42));
        break;
      case 'guardianName':
        setGuardianName(cap(next, 42));
        break;
      case 'guardianPhone':
        setGuardianPhone(cap(next, 28));
        break;
      case 'telegramHandle':
        setTelegramHandle(cap(next, 32));
        break;
      case 'homeAddress':
        setHomeAddress(cap(next, 80));
        break;
      case 'medication':
        setNewMedInput(cap(next, 44));
        break;
    }
  };

  const openKbFor = (field: KioskKeyboardField) => setKbField(field);

  const commitMedication = () => {
    const cleaned = newMedInput.trim();
    if (cleaned && !medications.includes(cleaned)) {
      setMedications((prev) => [...prev, cleaned]);
    }
    setNewMedInput('');
  };

  const handleKbInsert = (text: string) => {
    if (!kbField) return;
    setKbValue(kbField, `${getKbValue(kbField)}${text}`);
  };

  const handleKbBackspace = () => {
    if (!kbField) return;
    setKbValue(kbField, getKbValue(kbField).slice(0, -1));
  };

  const handleKbDone = () => {
    if (kbField === 'medication') {
      commitMedication();
    }
    setKbField(null);
  };

  // ----- Language & demo profile -----

  const pickLanguage = (lang: PromptLanguage) => {
    setLocalLanguage(lang);
    setLanguagePicked(true);
    setContextLanguage(lang);
    audioEngine.unlock();
    audioEngine.playConfirmChime();
    audioEngine.speakPrompt('standby_mode', lang, tier.speechRate, WELCOME_TEXTS[lang]);
  };

  const loadDemoProfile = (id: 'rohan' | 'subhashree') => {
    selectProfile(id);
    onCancel?.();
  };

  // ----- Camera handlers -----

  const handleStartWebcam = async () => {
    setCameraNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraNotice('Webcam access unavailable. Upload a photo or use the sample portrait.');
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
      setCameraNotice('Camera blocked or unavailable. Use Upload or Sample Portrait.');
      stopWebcamStream();
    }
  };

  const cropSquareToDataUrl = (
    source: HTMLVideoElement | HTMLImageElement,
    sw: number,
    sh: number
  ): string | null => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const side = Math.min(sw, sh);
    ctx.drawImage(source, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, 256, 256);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const dataUrl = cropSquareToDataUrl(video, video.videoWidth, video.videoHeight);
    if (dataUrl) setAvatarDataUrl(dataUrl);
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
        const dataUrl = cropSquareToDataUrl(img, img.width, img.height);
        if (dataUrl) setAvatarDataUrl(dataUrl);
        stopWebcamStream();
        audioEngine.playConfirmChime();
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ----- Sequential calibration handlers -----

  const switchCalibStep = (next: CalibrationStep) => {
    if (samplingTimerRef.current !== null) {
      window.clearInterval(samplingTimerRef.current);
      samplingTimerRef.current = null;
    }
    setCalibStep(next);
    setCalibPhase('waiting');
    setSamplingPct(0);
    setCalibError(null);
  };

  const handleLockSensorReading = () => {
    setCalibError(null);
    const hrVal = Number(draftHr || 72);
    const spVal = Number(draftSpo2 || 98);
    const tfVal = Number(draftTempF || 98.4);
    const brVal = Number(draftBreathing || 16);

    if (calibStep === 'pulse_spo2') {
      if (!draftHr.trim() || !draftSpo2.trim()) {
        setCalibError('Enter resting heart rate and SpO₂ to lock.');
        return;
      }
      if (!Number.isFinite(hrVal) || hrVal < 40 || hrVal > 160) {
        setCalibError('Heart rate must be 40–160 BPM.');
        return;
      }
      if (!Number.isFinite(spVal) || spVal < 80 || spVal > 100) {
        setCalibError('SpO₂ must be 80–100%.');
        return;
      }
    } else if (calibStep === 'temp') {
      if (!draftTempF.trim()) {
        setCalibError('Enter forehead IR temperature (°F) to lock.');
        return;
      }
      if (!Number.isFinite(tfVal) || tfVal < 94 || tfVal > 104) {
        setCalibError('Body temperature must be 94.0–104.0°F.');
        return;
      }
    } else {
      if (!draftBreathing.trim()) {
        setCalibError('Enter radar breathing rate to lock.');
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

  const handleCalibEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && calibPhase === 'waiting') {
      handleLockSensorReading();
    }
  };

  // ----- Care plan -----

  const prepareCarePlan = async () => {
    const cleanAllergies = allergies.filter((a) => a !== 'None');
    const cleanConditions = conditions.filter((c) => c !== 'None');
    const seedProfile = {
      name: nameValue.trim() || 'Resident',
      age: effectiveAge,
      allergies: cleanAllergies,
      conditions: cleanConditions,
      medications,
      wakeTime: wakeTime || '06:00',
      sleepTime: sleepTime || '21:30',
    };
    const instantFallback = buildOfflineCarePlanFallback(seedProfile);
    setGeneratedPlan(instantFallback);
    setIsGeneratingPlan(true);
    try {
      const aiPlan = await generateCarePlanWithAi({
        name: seedProfile.name,
        age: seedProfile.age,
        language,
        allergies: cleanAllergies,
        conditions: cleanConditions,
        medications,
        wake_time: seedProfile.wakeTime,
        sleep_time: seedProfile.sleepTime,
      });
      setGeneratedPlan(aiPlan);
    } catch {
      setGeneratedPlan(instantFallback);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleCompleteSetup = () => {
    const finalPlan =
      generatedPlan ??
      buildOfflineCarePlanFallback({
        name: nameValue.trim() || 'Resident',
        age: effectiveAge,
        allergies: allergies.filter((a) => a !== 'None'),
        conditions: conditions.filter((c) => c !== 'None'),
        medications,
        wakeTime: wakeTime || '06:00',
        sleepTime: sleepTime || '21:30',
      });

    completeOnDeviceEnrollment({
      name: nameValue.trim() || 'Resident',
      age: effectiveAge,
      heartRate: lockedHr ?? (Number(draftHr) || 72),
      spo2: lockedSpo2 ?? (Number(draftSpo2) || 98),
      bodyTempF: lockedTempF ?? (Number(draftTempF) || 98.4),
      language,
      guardianName: guardianName.trim() || 'Primary Guardian',
      guardianPhone: guardianPhone.trim() || 'Not specified',
      telegramHandle: telegramHandle.trim() || 'Not configured',
      homeAddress: homeAddress.trim() || 'Home Location Saved',
      allergies: allergies.filter((a) => a !== 'None'),
      conditions: conditions.filter((c) => c !== 'None'),
      medications,
      wakeTime: wakeTime || '06:00',
      sleepTime: sleepTime || '21:30',
      avatarDataUrl,
      carePlan: finalPlan,
    });
  };

  // ----- Shared chrome -----

  const renderTopBar = () => (
    <div className="es-topbar">
      <span className="es-topbar-brand">{t.brand}</span>
      <div className="es-step-dots" aria-label={`Step ${screen} of 7`}>
        {[1, 2, 3, 4, 5, 6, 7].map((step) => (
          <span
            key={step}
            className={`es-dot${screen === step ? ' active' : ''}${
              screen > step ? ' done' : ''
            }`}
          />
        ))}
      </div>
      <div className="es-topbar-right">
        <div className="es-lang-seg" role="group" aria-label="Appearance language quick pick">
          {(['en', 'hi', 'bn'] as PromptLanguage[]).map((lang) => (
            <button
              key={lang}
              type="button"
              className={languagePicked && language === lang ? 'on' : ''}
              onClick={() => pickLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="es-icon-btn"
          aria-label={isDark ? 'Switch to Day appearance' : 'Switch to Night appearance'}
          onClick={toggleKioskTheme}
        >
          {isDark ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
        </button>
      </div>
    </div>
  );

  const renderBottomBar = (opts: {
    backTo?: SetupScreenIndex;
    backAction?: () => void;
    nextLabel: string;
    nextDisabled?: boolean;
    onNext: () => void;
    nextIcon?: React.ReactNode;
  }) => (
    <div className="es-bottombar">
      <button
        type="button"
        className="es-btn-back"
        onClick={() =>
          opts.backAction ? opts.backAction() : opts.backTo !== undefined ? goToScreen(opts.backTo) : setScreen(0)
        }
      >
        <ArrowLeft size={16} weight="regular" />
        <span>{t.back}</span>
      </button>
      <button
        type="button"
        className="es-btn-cta"
        disabled={opts.nextDisabled}
        onClick={opts.onNext}
      >
        <span>{opts.nextLabel}</span>
        {opts.nextIcon ?? <ArrowRight size={16} weight="regular" />}
      </button>
    </div>
  );

  // ----- Screen 0: first-boot greeting (no bottom bar) -----

  return (
    <div className="es-device-outer">
      <div className="es-bezel">
        <span className="es-bezel-ear tl" />
        <span className="es-bezel-ear tr" />
        <span className="es-bezel-ear bl" />
        <span className="es-bezel-ear br" />
        <div className="es-lcd es-root" data-appearance={isDark ? 'dark' : 'light'}>
          {renderTopBar()}

          {screen === 0 ? (
            /* Screen 0 — 492px centered greeting canvas, no bottom bar */
            <div
              className="es-screen-enter"
              key="screen-0"
              style={{
                height: '492px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <span className="es-eyebrow">{t.greetingEyebrow}</span>
              <h1 className="es-h1" style={{ marginTop: '14px' }}>
                {t.greetingTitle}
              </h1>
              <p className="es-sub" style={{ maxWidth: '520px', marginTop: '14px', fontSize: '16px' }}>
                {t.greetingSub}
              </p>
              <button
                type="button"
                aria-label="Get started"
                onClick={() => goToScreen(1)}
                style={{
                  marginTop: '28px',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--es-cta-bg)',
                  color: 'var(--es-cta-ink)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <ArrowRight size={24} weight="regular" />
              </button>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--es-ink-2)',
                  marginTop: '10px',
                }}
              >
                {t.getStarted}
              </span>
              <button
                type="button"
                onClick={() => loadDemoProfile('subhashree')}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '36px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--es-ink-2)',
                }}
              >
                {t.loadDemo}
              </button>
            </div>
          ) : (
            <div
              key={`screen-${screen}`}
              className={`es-stage es-screen-enter${kbOpen ? ' kb-open' : ''}`}
              style={{ height: kbOpen ? '340px' : '492px' }}
              onMouseDown={(e) => {
                const target = e.target as HTMLElement | null;
                if (
                  target?.closest('[data-setup-input="true"]') ||
                  target?.closest('[data-virtual-kb="true"]')
                ) {
                  return;
                }
                setKbField(null);
              }}
            >
              {screen === 1 ? (
                /* Screen 1 — Language selection: three 304x196 cards */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <span className="es-eyebrow">{t.s1Eyebrow}</span>
                      <h2 className="es-h2" style={{ marginTop: '8px' }}>{t.s1Title}</h2>
                      <p className="es-sub" style={{ marginTop: '8px' }}>{t.s1Sub}</p>
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '18px',
                    }}
                  >
                    {(
                      (['en', 'hi', 'bn'] as PromptLanguage[]).map((code, i) => ({
                        code,
                        title: t.s1Cards[i].title,
                        sub: t.s1Cards[i].sub,
                        sample: t.s1Cards[i].sample,
                      }))
                    ).map((item) => {
                      const selected = language === item.code;
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => pickLanguage(item.code)}
                          style={{
                            width: '304px',
                            height: '196px',
                            borderRadius: '14px',
                            padding: '20px 22px',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            background: selected
                              ? 'var(--es-info-soft)'
                              : 'var(--es-surface)',
                            border: selected
                              ? '1.5px solid var(--es-focus)'
                              : '1px solid var(--es-card-border)',
                            boxShadow: selected
                              ? 'var(--es-focus-ring)'
                              : 'var(--es-card-shadow)',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            <span className="es-eyebrow" style={{ color: selected ? 'var(--es-focus)' : 'var(--es-ink-3)' }}>
                              {item.code}-IN
                            </span>
                            {selected ? (
                              <span
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: 'var(--es-success)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Check size={14} weight="bold" color="#FFFFFF" />
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--es-ink-2)', lineHeight: 1.45, marginTop: '6px' }}>
                              {item.sub}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--es-ink-3)',
                              lineHeight: 1.4,
                              fontStyle: 'italic',
                              borderTop: '1px solid var(--es-hairline)',
                              paddingTop: '8px',
                            }}
                          >
                            {item.sample}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {screen === 2 ? (
                /* Screen 2 — Parent identity & age adaptation (540/392 columns) */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div>
                    <span className="es-eyebrow">{t.s2Eyebrow}</span>
                    <h2 className="es-h2" style={{ marginTop: '8px' }}>{t.s2Title}</h2>
                    <p className="es-sub" style={{ marginTop: '8px' }}>{t.s2Sub}</p>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '540px 392px',
                      gap: '20px',
                      minHeight: 0,
                      marginTop: '16px',
                    }}
                  >
                    {/* Left: grouped inset form */}
                    <div className="es-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '18px' }}>
                      <div data-setup-input="true">
                        <label className="es-card-label" htmlFor="es-parent-name" style={{ display: 'block', marginBottom: '8px' }}>
                          {t.s2Name}
                        </label>
                        <input
                          id="es-parent-name"
                          className="es-input"
                          type="text"
                          value={nameValue}
                          onFocus={() => openKbFor('name')}
                          onChange={(e) => setNameValue(e.target.value.slice(0, 42))}
                          placeholder={t.s2NamePh}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label className="es-card-label" htmlFor="es-parent-age">
                            {t.s2Age}
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {(t.s2AgePresets as readonly string[]).map((preset) => {
                              const val = preset.split(' ')[0];
                              const on = ageDraft === val;
                              return (
                                <button
                                  key={preset}
                                  type="button"
                                  className={`es-chip${on ? ' on' : ''}`}
                                  style={{ height: '28px', fontSize: '12px' }}
                                  onClick={() => setAgeDraft(val)}
                                >
                                  {preset}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div data-setup-input="true" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            aria-label="Decrease age"
                            onClick={() => setAgeDraft(String(Math.max(18, (Number(ageDraft) || 65) - 1)))}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              border: '1px solid var(--es-hairline)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--es-ink)',
                            }}
                          >
                            <Minus size={18} weight="regular" />
                          </button>
                          <input
                            id="es-parent-age"
                            data-setup-input="true"
                            className="es-input es-num"
                            type="text"
                            inputMode="numeric"
                            value={ageDraft}
                            onFocus={() => openKbFor('name')}
                            onChange={(e) => setAgeDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                            placeholder="65"
                            style={{ flex: 1, textAlign: 'center', fontSize: '34px', fontWeight: 600 }}
                          />
                          <button
                            type="button"
                            aria-label="Increase age"
                            onClick={() => setAgeDraft(String(Math.min(110, (Number(ageDraft) || 64) + 1)))}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '10px',
                              border: '1px solid var(--es-hairline)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--es-ink)',
                            }}
                          >
                            <Plus size={18} weight="regular" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: live HUD adaptation preview */}
                    <div className="es-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                      <span className="es-eyebrow">{t.s2PreviewEyebrow}</span>
                      {(
                        [
                          {
                            active: effectiveAge < 65,
                            title: t.s2PreviewCards[0].title,
                            lines: [...t.s2PreviewCards[0].lines],
                            accent: 'var(--es-info)',
                            accentSoft: 'var(--es-info-soft)',
                          },
                          {
                            active: effectiveAge >= 65,
                            title: t.s2PreviewCards[1].title,
                            lines: [...t.s2PreviewCards[1].lines],
                            accent: 'var(--es-caution)',
                            accentSoft: 'var(--es-caution-soft)',
                          },
                        ] as { active: boolean; title: string; lines: string[]; accent: string; accentSoft: string }[]
                      ).map((mode) => (
                        <div
                          key={mode.title}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: mode.active
                              ? `1.5px solid ${mode.accent}`
                              : '1px solid var(--es-hairline)',
                            background: mode.active ? mode.accentSoft : 'transparent',
                            opacity: mode.active ? 1 : 0.55,
                            transition: 'all 0.25s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14.5px', fontWeight: 600 }}>{mode.title}</span>
                            {mode.active ? (
                              <span
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: mode.accent,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Check size={13} weight="bold" color="#FFFFFF" />
                              </span>
                            ) : null}
                          </div>
                          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {mode.lines.map((line) => (
                              <span key={line} style={{ fontSize: '12.5px', color: 'var(--es-ink-2)' }}>
                                {line}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {screen === 3 ? (
                /* Screen 3 — Guardian contact & home pin (centered 680px grouped card) */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span className="es-eyebrow">{t.s3Eyebrow}</span>
                    <h2 className="es-h2" style={{ marginTop: '8px' }}>{t.s3Title}</h2>
                    <p className="es-sub" style={{ marginTop: '6px' }}>{t.s3Sub}</p>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      width: '100%',
                    }}
                  >
                    <div className="es-card" style={{ width: '680px', margin: '0 auto', overflow: 'hidden' }}>
                      {(
                        [
                          { field: 'guardianName', label: t.s3Rows[0].label, value: guardianName, set: setGuardianName, placeholder: t.s3Rows[0].ph },
                          { field: 'guardianPhone', label: t.s3Rows[1].label, value: guardianPhone, set: setGuardianPhone, placeholder: t.s3Rows[1].ph },
                          { field: 'homeAddress', label: t.s3Rows[2].label, value: homeAddress, set: setHomeAddress, placeholder: t.s3Rows[2].ph },
                        ] as {
                          field: KioskKeyboardField;
                          label: string;
                          value: string;
                          set: (v: string) => void;
                          placeholder: string;
                        }[]
                      ).map((row, idx) => (
                        <div
                          key={row.field}
                          data-setup-input="true"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            height: '54px',
                            padding: '0 22px',
                            borderTop: idx > 0 ? '1px solid var(--es-hairline)' : 'none',
                          }}
                        >
                          <label
                            htmlFor={`es-${row.field}`}
                            style={{ width: '180px', flexShrink: 0, fontSize: '16px', fontWeight: 500, color: 'var(--es-ink-2)' }}
                          >
                            {row.label}
                          </label>
                          <input
                            id={`es-${row.field}`}
                            type="text"
                            value={row.value}
                            onFocus={() => openKbFor(row.field)}
                            onChange={(e) => row.set(e.target.value)}
                            placeholder={row.placeholder}
                            style={{
                              flex: 1,
                              border: 'none',
                              background: 'transparent',
                              fontSize: '17px',
                              color: 'var(--es-ink)',
                              minWidth: 0,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p
                      style={{
                        margin: '14px auto 0',
                        width: '680px',
                        fontSize: '12px',
                        color: 'var(--es-ink-3)',
                        textAlign: 'center',
                      }}
                    >
                      {t.s3Footnote}
                    </p>
                  </div>
                </div>
              ) : null}

              {screen === 4 ? (
                /* Screen 4 — Health profile, allergies & sleep/wake (490/442) */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div>
                    <span className="es-eyebrow">{t.s4Eyebrow}</span>
                    <h2 className="es-h2" style={{ marginTop: '8px' }}>{t.s4Title}</h2>
                    <p className="es-sub" style={{ marginTop: '6px' }}>{t.s4Sub}</p>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '490px 442px',
                      gap: '20px',
                      minHeight: 0,
                      marginTop: '16px',
                    }}
                  >
                    {/* Left: clinical notes & allergies */}
                    <div className="es-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: '10px' }}>
                      <div>
                        <span className="es-card-label" style={{ display: 'block', marginBottom: '8px' }}>
                          {t.s4Allergies}
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {ALLERGY_CHIPS.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              className={`es-chip${allergies.includes(chip) ? ' on' : ''}`}
                              onClick={() =>
                                chip === 'None'
                                  ? setAllergies(['None'])
                                  : setAllergies((prev) => {
                                      const base = prev.filter((x) => x !== 'None');
                                      return base.includes(chip)
                                        ? base.filter((x) => x !== chip)
                                        : [...base, chip];
                                    })
                              }
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="es-card-label" style={{ display: 'block', marginBottom: '8px' }}>
                          {t.s4Conditions}
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {CONDITION_CHIPS.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              className={`es-chip${conditions.includes(chip) ? ' on' : ''}`}
                              onClick={() =>
                                chip === 'None'
                                  ? setConditions(['None'])
                                  : setConditions((prev) => {
                                      const base = prev.filter((x) => x !== 'None');
                                      return base.includes(chip)
                                        ? base.filter((x) => x !== chip)
                                        : [...base, chip];
                                    })
                              }
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div data-setup-input="true" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          className="es-input"
                          type="text"
                          value={newMedInput}
                          onFocus={() => openKbFor('medication')}
                          onChange={(e) => setNewMedInput(e.target.value.slice(0, 44))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitMedication();
                          }}
                          placeholder={t.s4MedsPh}
                          style={{ height: '40px', flex: 1 }}
                        />
                        {newMedInput.trim() ? (
                          <button
                            type="button"
                            className="es-btn-ghost"
                            style={{ height: '40px' }}
                            onClick={commitMedication}
                          >
                            <Plus size={15} weight="regular" />
                            <span>{t.s4Add}</span>
                          </button>
                        ) : null}
                      </div>
                      {medications.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {medications.map((med) => (
                            <span
                              key={med}
                              className="es-chip"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'default' }}
                            >
                              <span>{med}</span>
                              <button
                                type="button"
                                aria-label={`Remove ${med}`}
                                onClick={() => setMedications((prev) => prev.filter((x) => x !== med))}
                                style={{ display: 'inline-flex', color: 'var(--es-ink-3)' }}
                              >
                                <Trash size={12} weight="regular" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Right: sleep & wake window */}
                    <div className="es-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                      <span className="es-eyebrow">{t.s4SleepEyebrow}</span>
                      {(
                        [
                          { label: t.s4Wake, value: wakeTime, set: setWakeTime, def: '06:00' },
                          { label: t.s4Sleep, value: sleepTime, set: setSleepTime, def: '21:30' },
                        ] as const
                      ).map((row) => (
                        <div key={row.label}>
                          <span className="es-card-label" style={{ display: 'block', marginBottom: '6px' }}>
                            {row.label}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <button
                              type="button"
                              aria-label={`${row.label} earlier`}
                              onClick={() => row.set(shiftTime24(row.value || row.def, -15))}
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                border: '1px solid var(--es-hairline)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--es-ink)',
                              }}
                            >
                              <Minus size={18} weight="regular" />
                            </button>
                            <span
                              className="es-num"
                              style={{ fontSize: '30px', fontWeight: 600, color: row.value ? 'var(--es-ink)' : 'var(--es-ink-3)' }}
                            >
                              {format12Hour(row.value || row.def, t.notSet)}
                            </span>
                            <button
                              type="button"
                              aria-label={`${row.label} later`}
                              onClick={() => row.set(shiftTime24(row.value || row.def, 15))}
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                border: '1px solid var(--es-hairline)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--es-ink)',
                              }}
                            >
                              <Plus size={18} weight="regular" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--es-ink-3)', lineHeight: 1.5 }}>
                        {t.s4RadarNote}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {screen === 5 ? (
                /* Screen 5 — Local face enrollment (420/512) */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div>
                    <span className="es-eyebrow">{t.s5Eyebrow}</span>
                    <h2 className="es-h2" style={{ marginTop: '8px' }}>{t.s5Title}</h2>
                    <p className="es-sub" style={{ marginTop: '6px' }}>{t.s5Sub}</p>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '420px 512px',
                      gap: '20px',
                      minHeight: 0,
                      marginTop: '16px',
                    }}
                  >
                    {/* Left: circular webcam frame + actions */}
                    <div className="es-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '200px',
                          height: '200px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '1px solid var(--es-hairline)',
                          background: 'var(--es-surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        {cameraActive ? (
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                          />
                        ) : avatarDataUrl ? (
                          <img
                            src={avatarDataUrl}
                            alt={nameValue || 'Enrolled portrait'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <UserCircle size={72} weight="regular" color="var(--es-ink-3)" />
                        )}
                      </div>
                      {cameraNotice ? (
                        <span style={{ fontSize: '12px', color: 'var(--es-ink-2)', textAlign: 'center' }}>
                          {cameraNotice}
                        </span>
                      ) : null}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {cameraActive ? (
                          <button type="button" className="es-btn-cta" style={{ height: '36px', padding: '0 16px' }} onClick={handleCaptureCameraFrame}>
                            <Camera size={16} weight="regular" />
                            <span>{t.s5Capture}</span>
                          </button>
                        ) : (
                          <button type="button" className="es-btn-ghost" style={{ height: '36px' }} onClick={() => void handleStartWebcam()}>
                            <Camera size={16} weight="regular" />
                            <span>{t.s5Capture}</span>
                          </button>
                        )}
                        <button type="button" className="es-btn-ghost" style={{ height: '36px' }} onClick={() => fileInputRef.current?.click()}>
                          <UploadSimple size={16} weight="regular" />
                          <span>{t.s5Upload}</span>
                        </button>
                        <button
                          type="button"
                          className="es-btn-ghost"
                          style={{ height: '36px' }}
                          onClick={() => {
                            stopWebcamStream();
                            setAvatarDataUrl(buildSamplePortraitDataUrl(nameValue || 'Resident', effectiveAge));
                            audioEngine.playConfirmChime();
                          }}
                        >
                          <UserCircle size={16} weight="regular" />
                          <span>{t.s5Sample}</span>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {/* Right: recognition spec */}
                    <div className="es-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                        <LockKey size={18} weight="regular" />
                        <span>{t.s5SpecTitle}</span>
                      </div>
                      <p className="es-sub" style={{ fontSize: '14px' }}>
                        {t.s5SpecBody}
                      </p>
                      <div className="es-hairline-sep" />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--es-ink-2)' }}>{t.s5Status}</span>
                        <span className="es-num" style={{ fontSize: '13px', fontWeight: 600 }}>
                          {avatarDataUrl ? t.s5Enrolled : cameraActive ? t.s5Live : t.s5Waiting}
                        </span>
                      </div>
                      {avatarDataUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={avatarDataUrl}
                            alt="Enrolled thumbnail"
                            style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--es-hairline)' }}
                          />
                          <span style={{ fontSize: '13px', color: 'var(--es-ink-2)' }}>
                            {nameValue || 'New Resident'} · {hasValidAge ? `${effectiveAge} yrs` : t.s5AgePending}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove enrolled portrait"
                            onClick={() => setAvatarDataUrl(null)}
                            style={{ marginLeft: 'auto', display: 'inline-flex', color: 'var(--es-ink-3)' }}
                          >
                            <Trash size={15} weight="regular" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {screen === 6 ? (
                /* Screen 6 — Sequential 1-by-1 sensor calibration */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <span className="es-eyebrow">
                        {calibStep === 'pulse_spo2' ? t.s6Eyebrows[0] : calibStep === 'temp' ? t.s6Eyebrows[1] : t.s6Eyebrows[2]}
                      </span>
                      <h2 className="es-h2" style={{ fontSize: '30px', marginTop: '6px' }}>
                        {calibStep === 'pulse_spo2'
                          ? t.s6Titles[0]
                          : calibStep === 'temp'
                            ? t.s6Titles[1]
                            : t.s6Titles[2]}
                      </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', paddingBottom: '4px' }}>
                      {(['pulse_spo2', 'temp', 'radar'] as CalibrationStep[]).map((step, idx) => (
                        <span
                          key={step}
                          className={`es-dot${calibStep === step ? ' active' : ''}${
                            (step === 'pulse_spo2' && lockedHr !== null) ||
                            (step === 'temp' && lockedTempF !== null) ||
                            (step === 'radar' && lockedBreathing !== null)
                              ? ' done'
                              : ''
                          }`}
                          style={{ width: calibStep === step ? '20px' : '6px', height: '6px', cursor: 'pointer' }}
                          onClick={() => switchCalibStep(step)}
                          role="button"
                          aria-label={`Calibration step ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', gap: '20px', minHeight: 0, marginTop: '14px', position: 'relative' }}>
                    {/* Left 620px: concentric ring + instruction + locked readout */}
                    <div
                      className="es-card"
                      style={{
                        width: '620px',
                        flexShrink: 0,
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '28px',
                      }}
                    >
                      <div
                        style={{
                          width: '168px',
                          height: '168px',
                          flexShrink: 0,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          className="es-ping"
                          style={{
                            animationPlayState: calibPhase === 'waiting' ? 'running' : 'paused',
                            opacity: calibPhase === 'waiting' ? undefined : 0,
                            borderColor:
                              calibPhase === 'captured' ? 'var(--es-success)' : 'var(--es-info)',
                          }}
                        />
                        <span
                          style={{
                            width: '128px',
                            height: '128px',
                            borderRadius: '50%',
                            border:
                              calibPhase === 'captured'
                                ? '1.5px solid var(--es-success)'
                                : calibPhase === 'sampling'
                                  ? '1.5px solid var(--es-info)'
                                  : '1.5px solid var(--es-hairline)',
                            background:
                              calibPhase === 'captured'
                                ? 'var(--es-success-soft)'
                                : calibPhase === 'sampling'
                                  ? 'var(--es-info-soft)'
                                  : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {calibStep === 'pulse_spo2' ? (
                            <Heartbeat size={40} weight="light" color={calibPhase === 'captured' ? 'var(--es-success)' : calibPhase === 'sampling' ? 'var(--es-info)' : 'var(--es-ink-3)'} />
                          ) : calibStep === 'temp' ? (
                            <ThermometerSimple size={40} weight="light" color={calibPhase === 'captured' ? 'var(--es-success)' : calibPhase === 'sampling' ? 'var(--es-info)' : 'var(--es-ink-3)'} />
                          ) : (
                            <Wind size={40} weight="light" color={calibPhase === 'captured' ? 'var(--es-success)' : calibPhase === 'sampling' ? 'var(--es-info)' : 'var(--es-ink-3)'} />
                          )}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color:
                              calibPhase === 'captured'
                                ? 'var(--es-success)'
                                : calibPhase === 'sampling'
                                  ? 'var(--es-info)'
                                  : 'var(--es-ink)',
                            display: 'block',
                            transition: 'color 0.3s ease',
                          }}
                        >
                          {calibPhase === 'captured'
                            ? t.s6Locked
                            : calibPhase === 'sampling'
                              ? t.s6Acquiring(samplingPct)
                              : calibStep === 'pulse_spo2'
                                ? t.s6Prompts[0]
                                : calibStep === 'temp'
                                  ? t.s6Prompts[1]
                                  : t.s6Prompts[2]}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--es-ink-2)', display: 'block', marginTop: '4px' }}>
                          {t.s6Note}
                        </span>
                        <div className="es-progress-track" style={{ marginTop: '14px' }}>
                          <div
                            className="es-progress-fill"
                            style={{ width: `${calibPhase === 'waiting' ? 0 : samplingPct}%` }}
                          />
                        </div>
                        <div className="es-num" style={{ marginTop: '14px', fontSize: '40px', fontWeight: 600, letterSpacing: '-0.02em', color: calibPhase === 'captured' ? 'var(--es-success)' : 'var(--es-ink)' }}>
                          {calibStep === 'pulse_spo2'
                            ? `${lockedHr ?? (calibPhase === 'sampling' ? draftHr : '--')} BPM · ${lockedSpo2 ?? (calibPhase === 'sampling' ? draftSpo2 : '--')}%`
                            : calibStep === 'temp'
                              ? `${lockedTempF?.toFixed(1) ?? (calibPhase === 'sampling' ? draftTempF : '--')} °F`
                              : `${lockedBreathing ?? (calibPhase === 'sampling' ? draftBreathing : '--')} br/min`}
                        </div>
                      </div>
                    </div>

                    {/* Bottom-right 268px demo sensor input card */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div className="es-card" style={{ width: '268px', marginLeft: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span className="es-card-label">{t.s6DemoTitle}</span>
                        {calibStep === 'pulse_spo2' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input
                              className="es-input es-num"
                              type="text"
                              inputMode="numeric"
                              value={draftHr}
                              onChange={(e) => {
                                setCalibError(null);
                                setDraftHr(e.target.value.replace(/[^0-9]/g, '').slice(0, 3));
                              }}
                              onKeyDown={handleCalibEnterKey}
                              placeholder="72"
                              aria-label="Heart rate BPM"
                              style={{ height: '40px', fontSize: '15px' }}
                            />
                            <input
                              className="es-input es-num"
                              type="text"
                              inputMode="numeric"
                              value={draftSpo2}
                              onChange={(e) => {
                                setCalibError(null);
                                setDraftSpo2(e.target.value.replace(/[^0-9]/g, '').slice(0, 3));
                              }}
                              onKeyDown={handleCalibEnterKey}
                              placeholder="98"
                              aria-label="SpO2 percent"
                              style={{ height: '40px', fontSize: '15px' }}
                            />
                          </div>
                        ) : (
                          <input
                            className="es-input es-num"
                            type="text"
                            inputMode="decimal"
                            value={calibStep === 'temp' ? draftTempF : draftBreathing}
                            onChange={(e) => {
                              setCalibError(null);
                              if (calibStep === 'temp') setDraftTempF(e.target.value.slice(0, 5));
                              else setDraftBreathing(e.target.value.replace(/[^0-9]/g, '').slice(0, 2));
                            }}
                            onKeyDown={handleCalibEnterKey}
                            placeholder={calibStep === 'temp' ? '98.4' : '16'}
                            aria-label={calibStep === 'temp' ? 'Temperature Fahrenheit' : 'Breathing rate'}
                            style={{ height: '40px', fontSize: '15px' }}
                          />
                        )}
                        {calibError ? (
                          <span style={{ fontSize: '12px', color: 'var(--es-ink-2)' }}>{calibError}</span>
                        ) : null}
                        <button
                          type="button"
                          className="es-btn-cta"
                          style={{ height: '36px', justifyContent: 'center' }}
                          disabled={calibPhase === 'sampling'}
                          onClick={handleLockSensorReading}
                        >
                          <LockKey size={15} weight="regular" />
                          <span>
                            {calibPhase === 'sampling' ? t.s6Locking(samplingPct) : t.s6LockNext}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {screen === 7 ? (
                /* Screen 7 — AI care & alarm schedule (540/392) */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <span className="es-eyebrow">{t.s7Eyebrow}</span>
                      <h2 className="es-h2" style={{ fontSize: '30px', marginTop: '6px' }}>
                        {t.s7PlanOf(nameValue.trim() || t.residentFallback)}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="es-btn-ghost"
                      style={{ height: '32px', flexShrink: 0 }}
                      onClick={() => setShowJsonDrawer((prev) => !prev)}
                    >
                      <Code size={15} weight="regular" />
                      <span>{showJsonDrawer ? t.s7HideJson : isGeneratingPlan ? t.s7Syncing : t.s7ViewJson}</span>
                    </button>
                  </div>

                  {showJsonDrawer && generatedPlan ? (
                    <pre className="es-json-drawer" style={{ flex: 1, marginTop: '14px' }}>
                      {JSON.stringify(generatedPlan, null, 2)}
                    </pre>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: '540px 392px',
                        gap: '20px',
                        minHeight: 0,
                        marginTop: '14px',
                      }}
                    >
                      {/* Left: chronological daily alarms */}
                      <div className="es-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span className="es-card-label">{t.s7Alarms}</span>
                          <span className="es-num" style={{ fontSize: '12.5px', color: 'var(--es-ink-3)' }}>
                            {t.s7WaterGoal(generatedPlan?.hydration_goal_ml ?? 2000)}
                          </span>
                        </div>
                        {(generatedPlan?.daily_alarms ?? []).slice(0, 5).map((alarm, idx) => (
                          <div
                            key={`${alarm.time}-${idx}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '9px 0',
                              borderTop: idx === 0 ? 'none' : '1px solid var(--es-hairline)',
                            }}
                          >
                            <span className="es-num" style={{ width: '64px', flexShrink: 0, fontSize: '16px', fontWeight: 600, color: 'var(--es-focus)' }}>
                              {alarm.time}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '15.5px', fontWeight: 500 }}>{alarm.title}</div>
                              <div style={{ fontSize: '12px', color: 'var(--es-ink-3)' }}>
                                {alarm.category} · {tier.speechRateLabel} {t.s7Voice}
                              </div>
                            </div>
                          </div>
                        ))}
                        {isGeneratingPlan ? (
                          <span className="es-eyebrow" style={{ marginTop: 'auto' }}>
                            {t.s7Refining}
                          </span>
                        ) : null}
                      </div>

                      {/* Right: nutrition guardrails */}
                      <div className="es-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                        <div>
                          <span className="es-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>
                            {t.s7Recommended}
                          </span>
                          {(generatedPlan?.nutrition_rules.recommended ?? []).slice(0, 3).map((rule) => (
                            <span key={rule} style={{ display: 'block', fontSize: '13px', color: 'var(--es-ink-2)', lineHeight: 1.45 }}>
                              · {rule}
                            </span>
                          ))}
                        </div>
                        <div className="es-hairline-sep" style={{ paddingTop: '10px' }}>
                          <span className="es-eyebrow" style={{ display: 'block', marginBottom: '6px' }}>
                            {t.s7Avoid}
                          </span>
                          {(generatedPlan?.nutrition_rules.strictly_avoid ?? []).slice(0, 3).map((rule) => (
                            <span key={rule} style={{ display: 'block', fontSize: '13px', color: 'var(--es-ink-2)', lineHeight: 1.45 }}>
                              · {rule}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {!kbOpen && screen > 0 ? (
            <>
              {screen === 1
                ? renderBottomBar({
                    backTo: 0,
                    nextLabel: t.continue,
                    nextDisabled: !languagePicked,
                    onNext: () => goToScreen(2),
                  })
                : null}
              {screen === 2
                ? renderBottomBar({
                    backTo: 1,
                    nextLabel: t.continue,
                    nextDisabled: !nameValue.trim() || !hasValidAge,
                    onNext: () => goToScreen(3),
                  })
                : null}
              {screen === 3
                ? renderBottomBar({
                    backTo: 2,
                    nextLabel: t.continue,
                    onNext: () => goToScreen(4),
                  })
                : null}
              {screen === 4
                ? renderBottomBar({
                    backTo: 3,
                    nextLabel: t.continue,
                    onNext: () => goToScreen(5),
                  })
                : null}
              {screen === 5
                ? renderBottomBar({
                    backTo: 4,
                    nextLabel: t.continue,
                    onNext: () => {
                      switchCalibStep('pulse_spo2');
                      goToScreen(6);
                    },
                  })
                : null}
              {screen === 6
                ? renderBottomBar({
                    backAction: () => {
                      if (calibStep === 'radar') switchCalibStep('temp');
                      else if (calibStep === 'temp') switchCalibStep('pulse_spo2');
                      else goToScreen(5);
                    },
                    nextLabel: t.continue,
                    nextDisabled:
                      calibStep === 'pulse_spo2'
                        ? lockedHr === null
                        : calibStep === 'temp'
                          ? lockedTempF === null
                          : lockedBreathing === null,
                    onNext: () => {
                      if (calibStep === 'pulse_spo2') switchCalibStep('temp');
                      else if (calibStep === 'temp') switchCalibStep('radar');
                      else goToScreen(7);
                    },
                  })
                : null}
              {screen === 7
                ? renderBottomBar({
                    backTo: 6,
                    nextLabel: t.completeSetup,
                    nextDisabled: isGeneratingPlan,
                    onNext: handleCompleteSetup,
                    nextIcon: (
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'var(--es-success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={12} weight="bold" color="#FFFFFF" />
                      </span>
                    ),
                  })
                : null}
            </>
          ) : null}

          {kbField ? (
            <OnScreenKioskKeyboard
              field={kbField}
              value={getKbValue(kbField)}
              noAutoCapitalize={kbField === 'telegramHandle' || kbField === 'guardianPhone'}
              onInsert={handleKbInsert}
              onBackspace={handleKbBackspace}
              onMinimize={() => setKbField(null)}
              onDone={handleKbDone}
              doneLabel={t.keyboardDone}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

}
