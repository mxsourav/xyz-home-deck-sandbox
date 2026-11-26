import type { PromptLanguage } from '../utils/audioEngine';

export interface KioskLocalizedCopy {
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
}

export const KIOSK_COPY: Record<PromptLanguage, KioskLocalizedCopy> = {
  en: {
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
  },
  hi: {
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
  },
  bn: {
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
  },
};
