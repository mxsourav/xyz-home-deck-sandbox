export type AccessibilityTier = 'STANDARD' | 'ENHANCED' | 'HIGH_ASSIST';

export interface AccessibilityTierSpec {
  tier: AccessibilityTier;
  shortLabel: string;
  fullLabel: string;
  ageRange: string;
  scale: number;
  scaleLabel: string;
  speechRate: number;
  speechRateLabel: string;
  buttonMinHeightPx: number;
  borderWidthPx: number;
  cardPaddingPx: number;
  simplifiedLayout: boolean;
  tone: 'emerald' | 'blue' | 'amber';
}

export function computeAccessibilityTier(age: number): AccessibilityTierSpec {
  const safeAge = Number.isFinite(age) ? age : 74;

  if (safeAge >= 80) {
    return {
      tier: 'HIGH_ASSIST',
      shortLabel: 'High-Assist UI',
      fullLabel: 'Frail / High-Assist Mode',
      ageRange: '80+ yrs',
      scale: 1.3,
      scaleLabel: '1.3×',
      speechRate: 0.76,
      speechRateLabel: '0.76×',
      buttonMinHeightPx: 68,
      borderWidthPx: 2,
      cardPaddingPx: 16,
      simplifiedLayout: true,
      tone: 'amber',
    };
  }

  if (safeAge >= 70) {
    return {
      tier: 'ENHANCED',
      shortLabel: 'Enhanced UI',
      fullLabel: 'Enhanced Legibility Mode',
      ageRange: '70–79 yrs',
      scale: 1.15,
      scaleLabel: '1.15×',
      speechRate: 0.88,
      speechRateLabel: '0.88×',
      buttonMinHeightPx: 56,
      borderWidthPx: 1.5,
      cardPaddingPx: 14,
      simplifiedLayout: false,
      tone: 'blue',
    };
  }

  return {
    tier: 'STANDARD',
    shortLabel: 'Standard UI',
    fullLabel: 'Active Senior Mode',
    ageRange: '50–69 yrs',
    scale: 1.0,
    scaleLabel: '1.0×',
    speechRate: 1.0,
    speechRateLabel: '1.0×',
    buttonMinHeightPx: 44,
    borderWidthPx: 1,
    cardPaddingPx: 12,
    simplifiedLayout: false,
    tone: 'emerald',
  };
}
