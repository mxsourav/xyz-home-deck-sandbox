export type AccessibilityTier = 'STANDARD' | 'HIGH_ASSIST';

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
  tone: 'blue' | 'amber';
}

export function computeAccessibilityTier(age: number): AccessibilityTierSpec {
  const safeAge = Number.isFinite(age) ? age : 78;

  if (safeAge >= 65) {
    return {
      tier: 'HIGH_ASSIST',
      shortLabel: 'High-Assist Senior HUD',
      fullLabel: 'High-Assist Ergonomic Senior HUD',
      ageRange: '65+ yrs',
      scale: 1.35,
      scaleLabel: '1.35×',
      speechRate: 0.78,
      speechRateLabel: '0.78×',
      buttonMinHeightPx: 76,
      borderWidthPx: 2,
      cardPaddingPx: 16,
      simplifiedLayout: true,
      tone: 'amber',
    };
  }

  return {
    tier: 'STANDARD',
    shortLabel: 'Standard Cockpit',
    fullLabel: 'Compact Multi-Metric Cockpit',
    ageRange: '50–64 yrs',
    scale: 1.0,
    scaleLabel: '1.0×',
    speechRate: 1.0,
    speechRateLabel: '1.0×',
    buttonMinHeightPx: 42,
    borderWidthPx: 1,
    cardPaddingPx: 12,
    simplifiedLayout: false,
    tone: 'blue',
  };
}
