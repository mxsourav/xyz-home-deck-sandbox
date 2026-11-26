import type { CarePlanResponse } from '../config/api';

export const ALLERGY_SUGGESTIONS = [
  'Peanuts',
  'Shellfish',
  'Dairy',
  'Gluten',
  'Penicillin',
  'Sulfa Drugs',
  'Dust Mites',
];

export const CONDITION_SUGGESTIONS = [
  'Borderline Hypertension',
  'Type 2 Diabetes',
  'Asthma / COPD',
  'Osteoarthritis',
  'Mild Cataract',
  'Heart Arrhythmia',
];

export interface CarePlanSeedProfile {
  name: string;
  age: number;
  allergies: string[];
  conditions: string[];
  medications: string[];
  wakeTime: string;
  sleepTime: string;
}

/**
 * Generates an instant deterministic daily care & alarm JSON schedule
 * matching the FastAPI `/api/ai/care-plan` schema for offline/instant previews.
 */
export function buildOfflineCarePlanFallback(
  profile: CarePlanSeedProfile
): CarePlanResponse {
  const cleanName = profile.name.trim() || 'Family Member';
  const isSenior = profile.age >= 65;
  const hasArthritis = profile.conditions.some((c) =>
    /arthrit|joint/i.test(c)
  );
  const hasDiabetes = profile.conditions.some((c) => /diabet/i.test(c));
  const hasHypertension = profile.conditions.some((c) =>
    /hypertens|bp/i.test(c)
  );
  const hydrationGoalMl = isSenior ? 1800 : 2500;

  return {
    mode: 'local-fallback',
    model: 'meta/llama-3.1-8b-instruct',
    latency_ms: 2,
    profile_summary: `${cleanName} (Age ${profile.age}) calibrated for ${isSenior ? 'High-Assist Ergonomic HUD' : 'Standard Multi-Metric Cockpit'} with Sleep Watch armed ${profile.sleepTime}–${profile.wakeTime}.`,
    ui_mode: isSenior ? 'HIGH_ASSIST_78' : 'STANDARD_50',
    hydration_goal_ml: hydrationGoalMl,
    sleep_watch_window: {
      start: profile.sleepTime,
      end: profile.wakeTime,
      absence_timeout_min: 15,
    },
    daily_alarms: [
      {
        time: profile.wakeTime,
        category: 'VITALS',
        title: 'Morning Baseline Vitals Check-In',
        spoken_prompt: `Good morning ${cleanName}. Place your finger on MAX30102 for your daily check-in.`,
      },
      {
        time: '07:15',
        category: 'EXERCISE',
        title:
          isSenior || hasArthritis
            ? '15-Min Seated Chair Yoga & Joint Mobility'
            : '30-Min Brisk Walk & Stretching',
        spoken_prompt:
          isSenior || hasArthritis
            ? `${cleanName}, time for gentle 15-minute seated chair yoga.`
            : `${cleanName}, time for your 30-minute morning walk and stretching.`,
      },
      {
        time: '08:30',
        category: 'MEDICATION',
        title: profile.medications[0]
          ? `Water & Medication: ${profile.medications[0]}`
          : 'Morning Hydration & Breakfast',
        spoken_prompt: profile.medications[0]
          ? `Reminder: Drink 1 glass of water and take ${profile.medications[0]}.`
          : `Reminder for ${cleanName}: Have a glass of water and breakfast.`,
      },
      {
        time: '11:30',
        category: 'HYDRATION',
        title: `Mid-Day Hydration Reminder (${hydrationGoalMl} ml goal)`,
        spoken_prompt: `Hydration reminder for ${cleanName}: please drink one glass of water.`,
      },
      {
        time: '13:30',
        category: 'MEAL',
        title: profile.medications[1]
          ? `Lunch + ${profile.medications[1]}`
          : 'Allergy-Safe Afternoon Meal Check',
        spoken_prompt: `Afternoon meal check for ${cleanName}. Stick to approved nutrition guidelines.`,
      },
    ],
    nutrition_rules: {
      recommended: [
        `Target ${hydrationGoalMl} ml hydration evenly across ${profile.wakeTime}–${profile.sleepTime}`,
        ...(hasDiabetes
          ? ['Low-GI whole grains, high-fiber greens, and fixed meal timing']
          : ['Balanced seasonal vegetables, dals, and whole proteins']),
        ...(hasHypertension
          ? ['Low-sodium meals (<1,500 mg/day) rich in potassium']
          : []),
      ],
      strictly_avoid: [
        ...(profile.allergies.length > 0
          ? [`STRICTLY AVOID allergens: ${profile.allergies.join(', ')}`]
          : ['Packaged trans fats and late-night caffeinated beverages']),
        ...(hasDiabetes ? ['Refined sugars, sweets, and sweetened juices'] : []),
        ...(hasHypertension ? ['High-sodium pickles and ultra-processed snacks'] : []),
      ],
    },
  };
}
