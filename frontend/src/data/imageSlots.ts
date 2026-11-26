export interface ImageSlotSpec {
  id: string;
  filename: string;
  title: string;
  caption: string;
  aspectRatio: string;
  phaseTarget: string;
  category: 'product' | 'kiosk-ui' | 'internals' | 'exhibition';
}

export const IMAGE_SLOTS: ImageSlotSpec[] = [
  {
    id: 'hero',
    filename: 'hero.jpg',
    title: 'Main Tabletop Render',
    caption:
      'Primary living-room tabletop view showing the matte dark-grey PLA+ enclosure, pan-tilt camera turret, bezel vitals pads, and 7-inch IPS display.',
    aspectRatio: '16 / 10',
    phaseTarget: 'Phase 1 — Hero Tour',
    category: 'product',
  },
  {
    id: 'frontside',
    filename: 'frontside.jpg',
    title: 'Isolated Front / 3-4 Sensor Hotspots',
    caption:
      'Clean orthographic front-bezel angle prepared for Phase 4 interactive sensor hotspot coordinates (MAX30102, MLX90614, LD2410B, OV5647, KY-037).',
    aspectRatio: '4 / 3',
    phaseTarget: 'Phase 4 — Hardware Lab Hotspots',
    category: 'product',
  },
  {
    id: 'night',
    filename: 'night.jpg',
    title: 'Bedside Night Sleep-Monitoring Scene',
    caption:
      'Low-light bedside placement demonstrating zero-light 24GHz mmWave breathing & stillness tracking without invasive cloud recording.',
    aspectRatio: '16 / 10',
    phaseTarget: 'Phase 1 & Phase 2 — Sleep Guardian',
    category: 'product',
  },
  {
    id: 'kiosk1',
    filename: 'kiosk1.jpg',
    title: 'Kiosk State 1 — Standby Clock & Ambient Telemetry',
    caption:
      'High-contrast 11:42 PM standby screen displaying room temperature, humidity, ambient dB, radar status, and single-tap check-in trigger.',
    aspectRatio: '16 / 10',
    phaseTarget: 'Phase 2 — 60 FPS Kiosk Sandbox',
    category: 'kiosk-ui',
  },
  {
    id: 'kiosk2',
    filename: 'kiosk2.jpg',
    title: 'Kiosk State 2 — Daily Vitals Check-In HUD',
    caption:
      'Live heart rate (72 BPM), blood oxygen (98% SpO2), contactless IR body temperature (98.6°F), ECG-style pulse trace, and gas safety readout.',
    aspectRatio: '16 / 10',
    phaseTarget: 'Phase 2 — 60 FPS Kiosk Sandbox',
    category: 'kiosk-ui',
  },
  {
    id: 'kiosk3',
    filename: 'kiosk3.jpg',
    title: 'Kiosk State 3 — Emergency 10s Countdown HUD',
    caption:
      'Autonomous 10-second verification window with audible siren alert and oversized "I\'M OKAY" capacitive touch cancel button.',
    aspectRatio: '16 / 10',
    phaseTarget: 'Phase 2 — Escalation Simulator',
    category: 'kiosk-ui',
  },
  {
    id: 'ups',
    filename: 'ups.jpg',
    title: '3S2P 18650 + BMS + XL4015 UPS Internals',
    caption:
      'Internal power bay showing 6x 18650 Li-Ion cells (~5,200 mAh), 3S 20A BMS protection board, XL4015 5A DC-DC buck converter, and INA219 gauge.',
    aspectRatio: '4 / 3',
    phaseTarget: 'Phase 4 — Power Architecture Inspector',
    category: 'internals',
  },
  {
    id: 'expo',
    filename: 'expo.jpg',
    title: 'Exhibition Table + Laptop Live Feed Setup',
    caption:
      'Paschim Banga Bigyan Mancha exhibition table showing Cat6 Gigabit Ethernet link to local GPU laptop running 30 FPS AI skeleton overlay.',
    aspectRatio: '16 / 9',
    phaseTarget: 'Phase 1 & Phase 4 — Privacy & Live Demo',
    category: 'exhibition',
  },
];
