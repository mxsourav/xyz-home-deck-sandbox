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
    standby_mode: 'Standby monitoring active.',
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
    standby_mode: 'स्टैंडबाय निगरानी सक्रिय है।',
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
    standby_mode: 'স্ট্যান্ডবাই পর্যবেক্ষণ সক্রিয় আছে।',
    reset_baseline: 'সব সেন্সর স্বাভাবিক অবস্থায় রিসেট করা হয়েছে।',
    profile_saved: 'ব্যক্তিগত স্বাস্থ্য প্রোফাইল ও স্বাভাবিক সীমা সংরক্ষিত হয়েছে।',
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
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopSiren();
      this.cancelSpeech();
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

  public cancelSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  public speakPrompt(
    key: PromptKey,
    lang: PromptLanguage,
    speechRate = 0.96,
    customText?: string
  ): void {
    if (this.muted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const text = customText ?? PROMPT_TEXTS[lang][key];
    const targetLocale = LOCALE_MAP[lang];
    const langPrefix = lang.toLowerCase();
    const clampedRate = Math.max(0.5, Math.min(1.5, speechRate));

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLocale;
      utterance.rate = clampedRate;
      utterance.pitch = 1.0;

      const voices = synth.getVoices();
      if (voices.length > 0) {
        const exactMatch = voices.find(
          (v) => v.lang.toLowerCase() === targetLocale.toLowerCase()
        );
        const prefixMatch = voices.find((v) =>
          v.lang.toLowerCase().startsWith(langPrefix)
        );
        const chosen = exactMatch ?? prefixMatch ?? null;
        if (chosen) {
          utterance.voice = chosen;
          utterance.lang = chosen.lang;
        }
      }

      synth.speak(utterance);
    } catch {
      // Never throw if browser voice packs are unavailable
    }
  }
}

export const audioEngine = new AudioEngine();
