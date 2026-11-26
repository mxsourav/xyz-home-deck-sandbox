export interface ImageSlotSpec {
  id: string;
  filename: string;
  title: string;
  caption: string;
  aspectRatio: string;
  phaseTarget: string;
  category: 'product' | 'kiosk-ui' | 'internals' | 'exhibition' | 'alert-demo';
}

export const IMAGE_SLOTS: ImageSlotSpec[] = [
  {
    id: 'hero',
    filename: 'hero.jpg',
    title: 'Main Tabletop Render',
    caption:
      'Matte dark-grey PLA+ desktop housing with 2-axis OV5647 camera turret, front bezel MAX30102/MLX90614/acoustic sensors, and 7-inch capacitive IPS display.',
    aspectRatio: '3 / 4',
    phaseTarget: 'Overview Tour',
    category: 'product',
  },
  {
    id: 'frontside',
    filename: 'frontside.jpg',
    title: 'Isolated 3/4 Front Sensor View',
    caption:
      'Studio view highlighting the front bezel sensor array, side rocker power switch, USB link, and DC barrel jack.',
    aspectRatio: '16 / 10',
    phaseTarget: 'Hardware Lab Hotspots',
    category: 'product',
  },
  {
    id: 'night',
    filename: 'night.jpg',
    title: 'Bedside Night Sleep-Monitoring Scene',
    caption:
      'Zero-light bedside deployment where the 24GHz HLK-LD2410B mmWave radar tracks breathing micro-movements through darkness without cloud cameras.',
    aspectRatio: '16 / 9',
    phaseTarget: 'Sleep Guardian Tour',
    category: 'product',
  },
  {
    id: 'expo',
    filename: 'expo.jpg',
    title: 'Exhibition Table + Wired Gigabit Laptop Setup',
    caption:
      'Cat6 Gigabit Ethernet feeds 1080p @ 30 FPS local video directly to an exhibition GPU laptop for real-time AI skeleton/fall detection.',
    aspectRatio: '21 / 8',
    phaseTarget: 'Local LAN Privacy Proof',
    category: 'exhibition',
  },
  {
    id: 'mobile-alert',
    filename: 'sms-notificaltion-in-mobile-demo.png',
    title: 'Child Phone Emergency Alert (Telegram + 5s Clip)',
    caption:
      'Stage 2 autonomous dispatch showing 115 BPM alert, 92% SpO2 warning, room climate, 5-second event capture video, and one-tap confirmation buttons.',
    aspectRatio: '3 / 4',
    phaseTarget: 'Autonomous Escalation Proof',
    category: 'alert-demo',
  },
  {
    id: 'kiosk1',
    filename: 'kiosk1.jpg',
    title: 'HUD State 1 — Standby Clock & Ambient Telemetry',
    caption:
      'High-contrast 11:42 PM standby screen displaying room temperature, air quality (98%), ambient dB, and one-tap menu entry.',
    aspectRatio: '3 / 4',
    phaseTarget: '60 FPS Kiosk Reference',
    category: 'kiosk-ui',
  },
  {
    id: 'kiosk2',
    filename: 'kiosk2.jpg',
    title: 'HUD State 2 — Daily Vitals Check-In',
    caption:
      'Live heart rate (72 BPM), blood oxygen (98% SpO2), contactless IR body temperature (98.6°F / 37.0°C), ECG trace, and oversized I\'M OK button.',
    aspectRatio: '3 / 4',
    phaseTarget: '60 FPS Kiosk Reference',
    category: 'kiosk-ui',
  },
  {
    id: 'kiosk3',
    filename: 'kiosk3.jpg',
    title: 'HUD State 3 — Emergency 10s Countdown',
    caption:
      'Autonomous 10-second verification window with audible siren alert, giant emerald I\'M OKAY cancel button, and immediate SEND ALERT NOW trigger.',
    aspectRatio: '3 / 4',
    phaseTarget: '60 FPS Kiosk Reference',
    category: 'kiosk-ui',
  },
  {
    id: 'ups',
    filename: 'ups.jpg',
    title: '3S2P 18650 + BMS + XL4015 UPS Internals',
    caption:
      'Internal power bay showing 6x 18650 Li-Ion cells (~5,200 mAh), 3S 20A BMS protection board, XL4015 5A DC-DC buck converter, and INA219 gauge.',
    aspectRatio: '4 / 3',
    phaseTarget: 'Power Architecture Inspector',
    category: 'internals',
  },
];
