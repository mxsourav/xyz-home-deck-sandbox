import { getApiBaseUrl } from '../config/api';

export type PromptLanguage = 'en' | 'hi' | 'bn';

export type PromptKey =
  | 'checkin_started'
  | 'vitals_logged'
  | 'im_okay'
  | 'emergency_active'
  | 'alert_sent'
  | 'gas_hazard'
  | 'gas_acknowledged'
  | 'power_cut'
  | 'power_restored'
  | 'standby_mode'
  | 'reset_baseline'
  | 'profile_saved';

export interface AudioPlaybackStatus {
  state: 'idle' | 'loading' | 'speaking' | 'blocked';
  source: 'os-voice' | 'neural-tts' | 'phonetic-fallback' | null;
  lang: PromptLanguage;
  message: string | null;
}

const LOCALE_MAP: Record<PromptLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
};

const PROMPT_TEXTS: Record<PromptLanguage, Record<PromptKey, string>> = {
  en: {
    checkin_started:
      'Daily vitals check-in started. Place your finger on the pulse pad and look at the temperature sensor.',
    vitals_logged: 'Vitals logged successfully. All readings are within your healthy baseline.',
    im_okay: 'Emergency cancelled. Marked as false alarm. Resuming normal monitoring.',
    emergency_active:
      'Emergency countdown active. Tap I am okay within 10 seconds to cancel.',
    alert_sent:
      'No response detected. Sending emergency call, SMS, and live vitals snapshot to family.',
    gas_hazard:
      'Gas or smoke hazard detected. Exhaust fan relay activated automatically.',
    gas_acknowledged: 'Gas hazard acknowledged. Continuous air monitoring remains active.',
    power_cut:
      'Wall power disconnected. Running seamlessly on internal 3S2P battery backup.',
    power_restored: 'Wall power restored. Charging internal battery pack.',
    standby_mode: 'Standby monitoring active in English.',
    reset_baseline: 'All sensors reset to healthy baseline.',
    profile_saved: 'Personal health baseline calibrated and saved to XYZ Home Deck.',
  },
  hi: {
    checkin_started:
      'दैनिक स्वास्थ्य जांच शुरू हो गई है। कृपया सेंसर पैड पर उंगली रखें।',
    vitals_logged: 'स्वास्थ्य जांच दर्ज हो गई है। सभी संकेत सामान्य हैं।',
    im_okay: 'आपातकालीन अलर्ट रद्द कर दिया गया है। सामान्य निगरानी जारी है।',
    emergency_active:
      'आपातकालीन उलटी गिनती शुरू है। रद्द करने के लिए दस सेकंड में मैं ठीक हूँ दबाएं।',
    alert_sent:
      'कोई उत्तर नहीं मिला। परिवार को कॉल, एसएमएस और लाइव रिपोर्ट भेजी जा रही है।',
    gas_hazard: 'गैस रिसाव का पता चला है। एग्जॉस्ट फैन अपने आप चालू हो गया है।',
    gas_acknowledged: 'गैस चेतावनी की पुष्टि हो गई है। निगरानी जारी है।',
    power_cut: 'बिजली चली गई है। डिवाइस आंतरिक बैटरी बैकअप पर सुरक्षित चल रहा है।',
    power_restored: 'बिजली वापस आ गई है। बैटरी चार्ज हो रही है।',
    standby_mode: 'स्टैंडबाय निगरानी हिंदी में सक्रिय है।',
    reset_baseline: 'सभी सेंसर सामान्य स्थिति पर रीसेट किए गए हैं।',
    profile_saved: 'व्यक्तिगत स्वास्थ्य प्रोफ़ाइल और सीमाएं सुरक्षित कर ली गई हैं।',
  },
  bn: {
    checkin_started:
      'দৈনিক স্বাস্থ্য পরীক্ষা শুরু হয়েছে। অনুগ্রহ করে সেন্সর প্যাডে আঙুল রাখুন।',
    vitals_logged: 'স্বাস্থ্য তথ্য সংরক্ষিত হয়েছে। সব পরিমাপ স্বাভাবিক আছে।',
    im_okay: 'জরুরি সতর্কতা বাতিল করা হয়েছে। স্বাভাবিক পর্যবেক্ষণ চলছে।',
    emergency_active:
      'জরুরি কাউন্টডাউন চলছে। বাতিল করতে দশ সেকেন্ডের মধ্যে আমি ঠিক আছি বোতামে চাপ দিন।',
    alert_sent:
      'কোনো সাড়া পাওয়া যায়নি। পরিবারের ফোনে কল, এসএমএস এবং লাইভ তথ্য পাঠানো হচ্ছে।',
    gas_hazard: 'গ্যাস বা ধোঁয়া ধরা পড়েছে। এক্সহস্ট ফ্যান স্বয়ংক্রিয়ভাবে চালু হয়েছে।',
    gas_acknowledged: 'গ্যাস সতর্কতা নিশ্চিত করা হয়েছে। পর্যবেক্ষণ অব্যাহত আছে।',
    power_cut: 'বিদ্যুৎ সংযোগ বিচ্ছিন্ন হয়েছে। অভ্যন্তরীণ ব্যাটারিতে ডিভাইস চলছে।',
    power_restored: 'বিদ্যুৎ সংযোগ ফিরে এসেছে। ব্যাটারি চার্জ হচ্ছে।',
    standby_mode: 'স্ট্যান্ডবাই পর্যবেক্ষণ বাংলায় সক্রিয় আছে।',
    reset_baseline: 'সব সেন্সর স্বাভাবিক অবস্থায় রিসেট করা হয়েছে।',
    profile_saved: 'ব্যক্তিগত স্বাস্থ্য প্রোফাইল ও স্বাভাবিক সীমা সংরক্ষিত হয়েছে।',
  },
};

// Phonetic fallback strings used ONLY if both native OS voice packs and backend /api/tts are unreachable offline.
const PHONETIC_TEXTS: Record<PromptLanguage, Record<PromptKey, string>> = {
  en: PROMPT_TEXTS.en,
  hi: {
    checkin_started:
      'Dainik swasthya jaanch shuru ho gayi hai. Kripya sensor pad par ungli rakhen.',
    vitals_logged: 'Swasthya jaanch darj ho gayi hai. Sabhi sanket samanya hain.',
    im_okay: 'Aapatkaleen alert radd kar diya gaya hai. Samanya nigrani jaari hai.',
    emergency_active:
      'Aapatkaleen ginti shuru hai. Radd karne ke liye main theek hoon dabayein.',
    alert_sent:
      'Koi uttar nahi mila. Parivar ko call aur live report bheji ja rahi hai.',
    gas_hazard: 'Gas risaav ka pata chala hai. Exhaust fan chalu ho gaya hai.',
    gas_acknowledged: 'Gas chetavni ki pushti ho gayi hai.',
    power_cut: 'Bijli chali gayi hai. Device battery backup par chal raha hai.',
    power_restored: 'Bijli wapas aa gayi hai. Battery charge ho rahi hai.',
    standby_mode: 'Standby nigrani Hindi mein sakriya hai.',
    reset_baseline: 'Sabhi sensor samanya sthiti par reset kiye gaye hain.',
    profile_saved: 'Vyaktigat swasthya profile surakshit kar li gayi hai.',
  },
  bn: {
    checkin_started:
      'Doinik swasthya porikkha shuru hoyeche. Sensor pad e angul rakhun.',
    vitals_logged: 'Swasthya tottho songrokkhito hoyeche. Shob porimap shabhabik ache.',
    im_okay: 'Joruri shotorkota batil kora hoyeche. Shabhabik porjobekkhon cholche.',
    emergency_active:
      'Joruri countdown cholche. Batil korte ami thik achi botame chap din.',
    alert_sent:
      'Kono sara pawa jayni. Poribarer phone e call ebong live tottho pathano hocche.',
    gas_hazard: 'Gas ba dhowa dhora poreche. Exhaust fan chalu hoyeche.',
    gas_acknowledged: 'Gas shotorkota nischit kora hoyeche.',
    power_cut: 'Biddyut songjog bicchinno hoyeche. Battery backupe device cholche.',
    power_restored: 'Biddyut songjog phire eseche. Battery charge hocche.',
    standby_mode: 'Standby porjobekkhon Banglay shokriyo ache.',
    reset_baseline: 'Shob sensor shabhabik obosthay reset kora hoyeche.',
    profile_saved: 'Byaktigoto swasthya profile songrokkhito hoyeche.',
  },
};

export function buildSampleGreeting(
  name: string,
  lang: PromptLanguage
): string {
  const safeName = name.trim() || 'Family Member';
  if (lang === 'hi') {
    return `नमस्ते ${safeName}। एक्सवाईजेड होम डेक आपकी आयु के अनुसार स्पष्ट और शांत गति से बोल रहा है।`;
  }
  if (lang === 'bn') {
    return `নমস্কার ${safeName}। এক্সওয়াইজেড হোম ডেক আপনার বয়সের উপযোগী স্পষ্ট ও ধীর গতিতে কথা বলছে।`;
  }
  return `Hello ${safeName}. XYZ Home Deck voice pacing is calibrated for your comfort.`;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private sirenTimer: number | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenHighTone = false;

  private activeAudio: HTMLAudioElement | null = null;
  private ttsBlobCache = new Map<string, string>();
  private inFlightCache = new Map<string, Promise<string | null>>();
  private speechSeq = 0;

  private status: AudioPlaybackStatus = {
    state: 'idle',
    source: null,
    lang: 'en',
    message: null,
  };
  private listeners = new Set<(status: AudioPlaybackStatus) => void>();

  constructor() {
    // Prime speechSynthesis voice registry early when running in browser
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        // ignore voice warmup failure
      }
    }
  }

  private setStatus(next: AudioPlaybackStatus): void {
    this.status = next;
    this.listeners.forEach((cb) => cb(next));
  }

  public getAudioStatus(): AudioPlaybackStatus {
    return this.status;
  }

  public subscribeAudioStatus(
    listener: (status: AudioPlaybackStatus) => void
  ): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }

    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
    if (this.status.state === 'blocked') {
      this.setStatus({
        state: 'idle',
        source: this.status.source,
        lang: this.status.lang,
        message: null,
      });
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopSiren();
      this.cancelSpeech();
    } else {
      this.unlock();
    }
  }

  public startSiren(): void {
    if (this.muted || this.sirenTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.setTargetAtTime(0.055, ctx.currentTime, 0.03);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.sirenOsc = osc;
      this.sirenGain = gain;
      this.sirenHighTone = false;

      this.sirenTimer = window.setInterval(() => {
        if (!this.ctx || !this.sirenOsc || this.muted) {
          this.stopSiren();
          return;
        }
        this.sirenHighTone = !this.sirenHighTone;
        const targetFreq = this.sirenHighTone ? 1320 : 880;
        this.sirenOsc.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
      }, 260);
    } catch {
      this.stopSiren();
    }
  }

  public stopSiren(): void {
    if (this.sirenTimer !== null) {
      window.clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }

    if (this.sirenGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.sirenGain.gain.setTargetAtTime(0.0001, now, 0.02);
      } catch {
        // ignore audio context teardown errors
      }
    }

    if (this.sirenOsc) {
      const oscToStop = this.sirenOsc;
      this.sirenOsc = null;
      this.sirenGain = null;
      window.setTimeout(() => {
        try {
          oscToStop.stop();
          oscToStop.disconnect();
        } catch {
          // already stopped
        }
      }, 60);
    }
  }

  public playConfirmChime(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startAt = now + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.linearRampToValueAtTime(0.08, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + 0.3);
      } catch {
        // ignore audio playback failure
      }
    });
  }

  public playWarningPing(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [660, 520].forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startAt = now + idx * 0.14;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.linearRampToValueAtTime(0.075, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + 0.24);
      } catch {
        // ignore audio playback failure
      }
    });
  }

  private stopNeuralAudio(): void {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // ignore stop failure
      }
      this.activeAudio = null;
    }
  }

  public cancelSpeech(): void {
    this.speechSeq += 1;
    this.stopNeuralAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.setStatus({
      state: 'idle',
      source: this.status.source,
      lang: this.status.lang,
      message: null,
    });
  }

  private findNativeVoice(lang: PromptLanguage): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const targetLocale = LOCALE_MAP[lang].toLowerCase();
    const langPrefix = lang.toLowerCase();

    return (
      voices.find((v) => v.lang.toLowerCase() === targetLocale) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ??
      null
    );
  }

  private async fetchNeuralBlobUrl(
    text: string,
    lang: PromptLanguage,
    rate: number
  ): Promise<string | null> {
    const rateKey = rate.toFixed(2);
    const cacheKey = `${lang}|${rateKey}|${text}`;

    const cached = this.ttsBlobCache.get(cacheKey);
    if (cached) return cached;

    const existingFlight = this.inFlightCache.get(cacheKey);
    if (existingFlight) return existingFlight;

    const url = `${getApiBaseUrl()}/api/tts?lang=${lang}&rate=${encodeURIComponent(
      rateKey
    )}&text=${encodeURIComponent(text)}`;

    const promise = (async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 14_000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const blob = await res.blob();
        if (!blob || blob.size === 0) return null;
        const objectUrl = URL.createObjectURL(blob);
        this.ttsBlobCache.set(cacheKey, objectUrl);
        return objectUrl;
      } catch {
        return null;
      } finally {
        window.clearTimeout(timeoutId);
        this.inFlightCache.delete(cacheKey);
      }
    })();

    this.inFlightCache.set(cacheKey, promise);
    return promise;
  }

  /**
   * Warm neural TTS cache for key exhibition phrases in HI/BN so button clicks respond immediately.
   */
  public preloadLanguage(lang: PromptLanguage, speechRate = 0.88): void {
    if (typeof window === 'undefined' || lang === 'en') return;
    if (this.findNativeVoice(lang)) return;

    const clampedRate = Math.max(0.65, Math.min(1.4, speechRate));
    const priorityKeys: PromptKey[] = [
      'checkin_started',
      'vitals_logged',
      'emergency_active',
      'im_okay',
      'gas_hazard',
    ];
    priorityKeys.forEach((k) => {
      void this.fetchNeuralBlobUrl(PROMPT_TEXTS[lang][k], lang, clampedRate);
    });
  }

  private speakWithBrowserVoice(
    text: string,
    lang: PromptLanguage,
    rate: number,
    voice: SpeechSynthesisVoice | null,
    seq: number,
    sourceLabel: 'os-voice' | 'phonetic-fallback'
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voice ? voice.lang : LOCALE_MAP[lang];
      utterance.rate = rate;
      utterance.pitch = 1.0;
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (this.speechSeq !== seq) return;
        this.setStatus({
          state: 'speaking',
          source: sourceLabel,
          lang,
          message:
            sourceLabel === 'phonetic-fallback'
              ? `${lang.toUpperCase()} phonetic offline voice`
              : `${lang.toUpperCase()} speaking`,
        });
      };

      utterance.onend = () => {
        if (this.speechSeq !== seq) return;
        this.setStatus({
          state: 'idle',
          source: sourceLabel,
          lang,
          message: null,
        });
      };

      utterance.onerror = () => {
        if (this.speechSeq !== seq) return;
        this.setStatus({
          state: 'idle',
          source: sourceLabel,
          lang,
          message: null,
        });
      };

      synth.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  private async playNeuralOrPhonetic(
    text: string,
    phoneticFallbackText: string,
    lang: PromptLanguage,
    rate: number,
    seq: number
  ): Promise<void> {
    this.setStatus({
      state: 'loading',
      source: 'neural-tts',
      lang,
      message: `Loading ${lang.toUpperCase()} neural voice...`,
    });

    const blobUrl = await this.fetchNeuralBlobUrl(text, lang, rate);
    if (this.speechSeq !== seq || this.muted) return;

    if (blobUrl) {
      const audio = new Audio(blobUrl);
      this.activeAudio = audio;

      audio.onended = () => {
        if (this.speechSeq !== seq) return;
        this.activeAudio = null;
        this.setStatus({
          state: 'idle',
          source: 'neural-tts',
          lang,
          message: null,
        });
      };

      audio.onerror = () => {
        if (this.speechSeq !== seq) return;
        this.activeAudio = null;
        const fallbackVoice = this.findNativeVoice('en');
        this.speakWithBrowserVoice(
          phoneticFallbackText,
          'en',
          rate,
          fallbackVoice,
          seq,
          'phonetic-fallback'
        );
      };

      try {
        await audio.play();
        if (this.speechSeq !== seq) {
          audio.pause();
          return;
        }
        this.setStatus({
          state: 'speaking',
          source: 'neural-tts',
          lang,
          message: `${lang.toUpperCase()} Neural Voice active`,
        });
        return;
      } catch (err) {
        this.activeAudio = null;
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          this.setStatus({
            state: 'blocked',
            source: 'neural-tts',
            lang,
            message: 'Browser muted autoplay — tap Audio button to allow voice',
          });
          return;
        }
      }
    }

    // Both matching OS voice pack and backend MP3 unavailable: clean spoken phonetic fallback
    const englishFallbackVoice = this.findNativeVoice('en');
    this.speakWithBrowserVoice(
      phoneticFallbackText,
      'en',
      rate,
      englishFallbackVoice,
      seq,
      'phonetic-fallback'
    );
  }

  public speakPrompt(
    key: PromptKey,
    lang: PromptLanguage,
    speechRate = 0.96,
    customText?: string
  ): void {
    if (this.muted || typeof window === 'undefined') return;

    this.speechSeq += 1;
    const seq = this.speechSeq;
    this.stopNeuralAudio();

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel error
      }
    }

    const text = customText ?? PROMPT_TEXTS[lang][key];
    const phoneticFallback = customText ?? PHONETIC_TEXTS[lang][key];
    const clampedRate = Math.max(0.65, Math.min(1.4, speechRate));

    if (lang === 'en') {
      const enVoice = this.findNativeVoice('en');
      if ('speechSynthesis' in window) {
        this.speakWithBrowserVoice(
          text,
          'en',
          clampedRate,
          enVoice,
          seq,
          'os-voice'
        );
        return;
      }
      void this.playNeuralOrPhonetic(text, text, 'en', clampedRate, seq);
      return;
    }

    // For Hindi ('hi') and Bengali ('bn'): check if an actual OS hi/bn voice exists first.
    const nativeRegionalVoice = this.findNativeVoice(lang);
    if (nativeRegionalVoice) {
      this.speakWithBrowserVoice(
        text,
        lang,
        clampedRate,
        nativeRegionalVoice,
        seq,
        'os-voice'
      );
      return;
    }

    // Common case on Windows/Linux/macOS browsers missing hi-IN / bn-IN packs: use Edge Neural TTS MP3.
    void this.playNeuralOrPhonetic(
      text,
      phoneticFallback,
      lang,
      clampedRate,
      seq
    );
  }
}

export const audioEngine = new AudioEngine();
