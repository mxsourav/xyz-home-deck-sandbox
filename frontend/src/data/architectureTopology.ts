import type { Edge, Node } from '@xyflow/react';
import type { SandboxTelemetry } from '../context/SandboxContext';

export type ArchitectureLayoutMode = 'pipeline' | 'dual-brain';
export type FlowTone = 'emerald' | 'blue' | 'amber' | 'crimson' | 'slate';
export type FlowScenarioId =
  | 'night_radar'
  | 'vitals_checkin'
  | 'lan_stream'
  | 'fall_escalation'
  | 'gas_hazard'
  | 'power_cut';

export type StepRole = 'START' | 'STEP_2' | 'STEP_3' | 'END';
export type HardwareNodeStatus = 'ON' | 'STANDBY' | 'ALERT' | 'OFF';

export interface HardwareNodeBaseData {
  title: string;
  subtitle: string;
  busTag: string;
  stepRole: StepRole;
  stepBadge: string;
  nodeStatus: HardwareNodeStatus;
  statusBadgeLabel: string;
  imagePath?: string;
  iconKey:
    | 'plug'
    | 'pulse'
    | 'temp'
    | 'radar'
    | 'gas'
    | 'sensors'
    | 'relay'
    | 'camera'
    | 'esp32'
    | 'rpi4'
    | 'ups'
    | 'screen'
    | 'laptop'
    | 'cloud';
  liveMetric: string;
  sourceDesc: string;
  routeDesc: string;
  actionDesc: string;
}

export type HardwareNodeData = HardwareNodeBaseData & {
  active: boolean;
  dimmed: boolean;
  tone: FlowTone;
  selected: boolean;
} & Record<string, unknown>;

export interface DataEdgeBaseData {
  label: string;
  protocol: string;
  bidirectional?: boolean;
  fast?: boolean;
  labelOffsetX?: number;
  labelOffsetY?: number;
  sourceDesc: string;
  routeDesc: string;
  actionDesc: string;
}

export type DataEdgeData = DataEdgeBaseData & {
  active: boolean;
  dimmed: boolean;
  tone: FlowTone;
  selected?: boolean;
} & Record<string, unknown>;

export type HardwareFlowNode = Node<HardwareNodeData, 'hardware'>;
export type DataFlowEdge = Edge<DataEdgeData, 'dataFlow'>;

export interface ScenarioMetadata {
  id: FlowScenarioId;
  label: string;
  tone: Exclude<FlowTone, 'slate'>;
  narrator: {
    triggerSource: string;
    dataRoute: string;
    autonomousAction: string;
  };
}

export const SCENARIO_DEFINITIONS: Record<FlowScenarioId, ScenarioMetadata> = {
  night_radar: {
    id: 'night_radar',
    label: 'Idle / Night Radar Watch',
    tone: 'emerald',
    narrator: {
      triggerSource:
        'STEP 1 (START): 24/7 safety sensors (LD2410B breathing radar, MQ-2/135 gas & AQI, KY-037 thud, DHT22 climate) stay awake continuously while contact vitals (MAX30102/MLX90614) and OV5647 night privacy camera rest in STANDBY.',
      dataRoute:
        'STEP 2 → 3: 12.6V Wall Adapter feeds the hub & float-charges 3S2P UPS (Standby); all 24/7 sensors stream @ 10Hz to ESP32-S3 → USB Serial → Raspberry Pi 4B.',
      autonomousAction:
        'STEP 4 (END): 7" Display holds dimmed Night Clock HUD, local relays stay Armed Standby, and Isolated Wi-Fi Cloud stays strictly OFF (Zero Cloud Traffic).',
    },
  },
  vitals_checkin: {
    id: 'vitals_checkin',
    label: 'Daily Vitals Check-In',
    tone: 'emerald',
    narrator: {
      triggerSource:
        'STEP 1 (START): Elder approaches bezel — MAX30102 (HR & SpO₂) and MLX90614 (IR forehead temp) wake to ON · SAMPLING while all 24/7 ambient/radar/gas sensors remain ON.',
      dataRoute:
        'STEP 2 → 3: MAX30102 & MLX90614 (I2C) + 24/7 safety telemetry → ESP32-S3 → USB Serial 10 Hz → Raspberry Pi 4B under 12.6V Grid Power.',
      autonomousAction:
        'STEP 4 (END): 7-Inch Display runs 60 FPS Vitals HUD with EN/HI/BN voice guidance; Isolated Wi-Fi Cloud stays OFF with zero data leaving home.',
    },
  },
  lan_stream: {
    id: 'lan_stream',
    label: '30 FPS LAN Stream',
    tone: 'blue',
    narrator: {
      triggerSource:
        'STEP 1 (START): OV5647 Camera + 2-Axis Gimbal switches ON (1080p @ 30 FPS) alongside all 24/7 safety sensors; finger/temp pads remain STANDBY.',
      dataRoute:
        'STEP 2 → 3: OV5647 MIPI-CSI → Raspberry Pi 4B ↔ Cat6 Gigabit Ethernet Wire (while ESP32-S3 drives silent 28BYJ-48 gimbal PWM).',
      autonomousAction:
        'STEP 4 (END): Local GPU Laptops receive 30 FPS AI pose inference strictly inside Cat6 LAN; Isolated Wi-Fi Cloud stays OFF.',
    },
  },
  fall_escalation: {
    id: 'fall_escalation',
    label: 'Silent Fall Escalation',
    tone: 'crimson',
    narrator: {
      triggerSource:
        'STEP 1 (START): ALERT! OV5647 30 FPS Fall Pose + KY-037 Acoustic Thud Spike + LD2410B motionless stillness corroborate collapse (MQ-2/135 stays ON 24/7).',
      dataRoute:
        'STEP 2 → 3: Sensors → ESP32-S3 + Cat6 Pose AI → Raspberry Pi 4B 10-second verification state machine.',
      autonomousAction:
        'STEP 4 (END): ALERT · 12V Siren + Red Countdown on 7" Display; on 10s silence, Isolated Wi-Fi Cloud fires phone call, SMS, Telegram 5s clip & EMS address pin.',
    },
  },
  gas_hazard: {
    id: 'gas_hazard',
    label: 'LPG Gas Leak Reflex',
    tone: 'amber',
    narrator: {
      triggerSource:
        'STEP 1 (START): ALERT! Always-On MQ-2 / MQ-135 sensor detects >400 ppm LPG gas / smoke (all other 24/7 sensors stay ON).',
      dataRoute:
        'STEP 2 → 3: MQ-2 Analog ADC → ESP32-S3 Hardware Safety Interrupt → Direct Relay GPIO CH1 + USB Serial → RPi 4B.',
      autonomousAction:
        'STEP 4 (END): 4-Ch Relay closes Exhaust Fan CH1 + 12V Siren instantly, 7" Screen flashes Hazard HUD, and Isolated Wi-Fi alerts the family phone.',
    },
  },
  power_cut: {
    id: 'power_cut',
    label: 'Monsoon Power Cut',
    tone: 'amber',
    narrator: {
      triggerSource:
        'STEP 1 (POWER CUT): 12.6V Wall Adapter drops to OFF · GRID CUT (0V). 3S2P Li-Ion UPS switches to ON · DISCHARGING in 0 ms via XL4015 5.1V Buck.',
      dataRoute:
        'STEP 2 → 3: 3S2P UPS powers all 24/7 sensors (LD2410B, MQ-2/135, KY-037/MPU/DHT22), ESP32-S3, RPi 4B & INA219 battery gauge without rebooting.',
      autonomousAction:
        'STEP 4 (END): 7-Inch Display stays ON showing live battery %, 24/7 monitoring continues seamlessly, and Cloud stays OFF.',
    },
  },
};

// Spacious 4-Stage Left-to-Right START -> END Topology (14 Nodes, zero overlap)
export const POSITIONS_PIPELINE: Record<string, { x: number; y: number }> = {
  // COLUMN 1: STEP 1 · START (POWER INPUT + 6 SENSORS)
  'wall-adapter': { x: 30, y: 10 },
  max30102: { x: 30, y: 120 },
  mlx90614: { x: 30, y: 230 },
  ld2410b: { x: 30, y: 340 },
  'mq-gas': { x: 30, y: 450 },
  'multi-sensors': { x: 30, y: 560 },
  'ov5647-gimbal': { x: 30, y: 670 },

  // COLUMN 2: STEP 2 · UPS POWER RAIL & REFLEX MCU
  'ups-pack': { x: 410, y: 55 },
  'esp32-s3': { x: 410, y: 325 },

  // COLUMN 3: STEP 3 · MAIN BRAIN
  rpi4: { x: 790, y: 270 },

  // COLUMN 4: STEP 4 · END (ACTIONS & OUTPUTS)
  touchscreen: { x: 1170, y: 65 },
  'gpu-laptops': { x: 1170, y: 225 },
  'cloud-gateway': { x: 1170, y: 385 },
  'relays-siren': { x: 1170, y: 545 },
};

// Compact Tiered Topology
export const POSITIONS_DUAL_BRAIN: Record<string, { x: number; y: number }> = {
  'wall-adapter': { x: 30, y: 10 },
  max30102: { x: 30, y: 120 },
  mlx90614: { x: 30, y: 230 },
  ld2410b: { x: 30, y: 340 },
  'mq-gas': { x: 30, y: 450 },
  'multi-sensors': { x: 30, y: 560 },
  'ov5647-gimbal': { x: 30, y: 670 },

  'ups-pack': { x: 410, y: 45 },
  'esp32-s3': { x: 410, y: 245 },
  rpi4: { x: 410, y: 455 },

  touchscreen: { x: 810, y: 65 },
  'gpu-laptops': { x: 810, y: 225 },
  'cloud-gateway': { x: 810, y: 385 },
  'relays-siren': { x: 810, y: 545 },
};

export function buildArchitectureGraph(
  layoutMode: ArchitectureLayoutMode,
  scenarioId: FlowScenarioId,
  telemetry: SandboxTelemetry,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  existingPositions?: Record<string, { x: number; y: number }>
): { nodes: HardwareFlowNode[]; edges: DataFlowEdge[] } {
  const positions =
    existingPositions ??
    (layoutMode === 'pipeline' ? POSITIONS_PIPELINE : POSITIONS_DUAL_BRAIN);

  const isPowerCut = scenarioId === 'power_cut' || !telemetry.acMainsConnected;
  const isVitals = scenarioId === 'vitals_checkin';
  const isLan = scenarioId === 'lan_stream';
  const isFall = scenarioId === 'fall_escalation';
  const isGas = scenarioId === 'gas_hazard' || telemetry.lpgPpm > 400;
  const isNight = scenarioId === 'night_radar';
  const batteryVoltage = (11.1 + (telemetry.batteryPercent / 100) * 1.5).toFixed(1);

  const nodeDefs: Array<{
    id: string;
    tone: FlowTone;
    data: HardwareNodeBaseData;
  }> = [
    // COLUMN 1: POWER + SENSORS
    {
      id: 'wall-adapter',
      tone: isPowerCut ? 'crimson' : 'blue',
      data: {
        title: '12.6V 2A Wall Adapter',
        subtitle: 'AC Mains & Float Charger',
        busTag: '12.6V DC In',
        stepRole: 'START',
        stepBadge: 'START · AC MAINS',
        nodeStatus: isPowerCut ? 'OFF' : 'ON',
        statusBadgeLabel: isPowerCut ? 'OFF · GRID CUT' : 'ON · ACTIVE',
        iconKey: 'plug',
        liveMetric: isPowerCut ? '0V · Wall Mains Lost' : '12.6V Grid + Float Charge',
        sourceDesc: '12.6V 2A AC-DC adapter supplying mains power and BMS charging current.',
        routeDesc: 'Wall Outlet → 12.6V Barrel Jack → 3S 20A BMS + XL4015 5.1V Buck.',
        actionDesc: isPowerCut
          ? 'Mains offline; BMS cleanly isolates charger bus while 3S2P Li-Ion takes load in 0 ms.'
          : 'Powers the 5.1V rail directly and float-charges the 3S2P battery pack.',
      },
    },
    {
      id: 'max30102',
      tone: isVitals ? 'emerald' : 'slate',
      data: {
        title: 'MAX30102',
        subtitle: 'Optical HR & SpO₂ Pad',
        busTag: 'I2C 0x57',
        stepRole: 'START',
        stepBadge: 'START · VITALS',
        nodeStatus: isVitals ? 'ON' : 'STANDBY',
        statusBadgeLabel: isVitals
          ? 'ON · SAMPLING VITALS'
          : isFall
            ? 'STANDBY · POST-ALERT'
            : 'STANDBY · AWAIT FINGER',
        imagePath: '/images/components/max30102.jpg',
        iconKey: 'pulse',
        liveMetric: isVitals
          ? `${telemetry.heartRate} BPM · ${telemetry.spo2}% SpO₂`
          : 'Low-Power Ready',
        sourceDesc: 'MAX30102 optical Red/IR finger oximeter mounted on front bezel.',
        routeDesc: 'MAX30102 → I2C Bus → ESP32-S3 → USB Serial → RPi 4B HUD.',
        actionDesc: 'Sleeps LEDs cleanly in Standby until elder places finger for Daily Vitals Check-In.',
      },
    },
    {
      id: 'mlx90614',
      tone: isVitals ? 'emerald' : 'slate',
      data: {
        title: 'MLX90614',
        subtitle: 'IR Forehead Optic',
        busTag: 'SMBus I2C',
        stepRole: 'START',
        stepBadge: 'START · VITALS',
        nodeStatus: isVitals ? 'ON' : 'STANDBY',
        statusBadgeLabel: isVitals ? 'ON · SAMPLING TEMP' : 'STANDBY · AWAIT USER',
        imagePath: '/images/components/mlx90614.jpg',
        iconKey: 'temp',
        liveMetric: isVitals
          ? `${telemetry.bodyTempF.toFixed(1)}°F / ${((telemetry.bodyTempF - 32) * (5 / 9)).toFixed(1)}°C`
          : 'Ready (5–10 cm trigger)',
        sourceDesc: 'Melexis MLX90614 contactless IR thermopile inside TO-39 bezel optic.',
        routeDesc: 'MLX90614 → SMBus I2C (0x5A) → ESP32-S3 → USB → RPi 4B.',
        actionDesc: 'Wakes on proximity check-in to read fever status without skin contact.',
      },
    },
    {
      id: 'ld2410b',
      tone: isFall ? 'crimson' : 'emerald',
      data: {
        title: 'HLK-LD2410B',
        subtitle: '24GHz Breathing Radar',
        busTag: 'UART 256k',
        stepRole: 'START',
        stepBadge: 'START · 24/7',
        nodeStatus: isFall ? 'ALERT' : 'ON',
        statusBadgeLabel: isFall ? 'ALERT · STILLNESS' : 'ON · ACTIVE (24/7)',
        imagePath: '/images/components/ld2410.jpg',
        iconKey: 'radar',
        liveMetric:
          isFall
            ? 'ALERT · Zero Motion After Fall'
            : telemetry.radarState === 'PRESENT_STILL'
              ? 'Micro-Breathing Detected'
              : 'Presence Active (Day & Night)',
        sourceDesc: 'Hi-Link HLK-LD2410B 24GHz FMCW human respiration radar.',
        routeDesc: 'HLK-LD2410B → 256k UART → ESP32-S3 → USB → RPi 4B.',
        actionDesc: 'Always awake 24/7 (including bedroom night darkness & power cuts) without cloud cameras.',
      },
    },
    {
      id: 'mq-gas',
      tone: isGas ? 'crimson' : 'emerald',
      data: {
        title: 'MQ-2 & MQ-135',
        subtitle: 'LPG Gas, Smoke & AQI',
        busTag: 'Analog ADC',
        stepRole: 'START',
        stepBadge: 'START · 24/7',
        nodeStatus: isGas ? 'ALERT' : 'ON',
        statusBadgeLabel: isGas ? 'ALERT · >400 PPM' : 'ON · ACTIVE (24/7)',
        imagePath: '/images/components/mq2.jpg',
        iconKey: 'gas',
        liveMetric: isGas ? `HAZARD · ${Math.max(650, telemetry.lpgPpm)} ppm` : `${telemetry.lpgPpm} ppm · ${telemetry.airQuality}`,
        sourceDesc: 'MQ-2 combustible LPG/smoke & MQ-135 broad air quality sensors.',
        routeDesc: 'MQ-2 / MQ-135 → Analog ADC → ESP32-S3 Interrupt → Relay CH1 + RPi 4B.',
        actionDesc: 'Always powered 24/7 day, night & during power outages to fire exhaust relays on >400 ppm.',
      },
    },
    {
      id: 'multi-sensors',
      tone: isFall ? 'crimson' : 'emerald',
      data: {
        title: 'KY-037 + MPU-6050 + DHT22',
        subtitle: 'Thud, Tilt & Room Climate',
        busTag: 'I2C / ADC',
        stepRole: 'START',
        stepBadge: 'START · 24/7',
        nodeStatus: isFall ? 'ALERT' : 'ON',
        statusBadgeLabel: isFall ? 'ALERT · THUD SPIKE' : 'ON · ACTIVE (24/7)',
        imagePath: '/images/components/mpu6050.jpg',
        iconKey: 'sensors',
        liveMetric: isFall
          ? 'Acoustic Thud Impact + 24°C'
          : `${telemetry.roomTempC}°C · ${telemetry.humidity}% RH · Upright`,
        sourceDesc: 'KY-037 impact thud sensor, MPU-6050 tilt IMU & DHT22 room temp/humidity.',
        routeDesc: 'Multi-Sensor Array → I2C/ADC → ESP32-S3 → USB → RPi 4B.',
        actionDesc: 'Always active 24/7 to catch collapse floor thuds, hub knock-overs, and ambient heat waves.',
      },
    },
    {
      id: 'ov5647-gimbal',
      tone: isFall ? 'crimson' : isLan ? 'blue' : 'slate',
      data: {
        title: 'OV5647 Cam + 2-Axis Gimbal',
        subtitle: '1080p @ 30 FPS Local Vision',
        busTag: 'CSI + PWM',
        stepRole: 'START',
        stepBadge: 'START · VISION',
        nodeStatus: isFall || isLan ? 'ON' : 'STANDBY',
        statusBadgeLabel: isFall || isLan
          ? 'ON · ACTIVE (30 FPS LAN)'
          : isNight
            ? 'STANDBY · NIGHT PRIVACY'
            : 'STANDBY · LOCAL READY',
        imagePath: '/images/components/ov5647.jpg',
        iconKey: 'camera',
        liveMetric:
          isFall || isLan
            ? '1080p @ 30 FPS → Cat6 LAN'
            : isNight
              ? 'Privacy Sleep (Radar Watches)'
              : 'Armed on Local CSI Bus',
        sourceDesc: 'Wide-angle OV5647 CSI camera on silent 28BYJ-48 pan-tilt gimbal.',
        routeDesc: 'OV5647 → MIPI-CSI → RPi 4B · ESP32-S3 → ULN2003 Gimbal PWM.',
        actionDesc: 'Sleeps respectfully during Night Radar Watch; wakes immediately for fall confirmation or LAN feed.',
      },
    },

    // COLUMN 2: STEP 2 UPS & REFLEX BRAIN
    {
      id: 'ups-pack',
      tone: isPowerCut ? 'amber' : 'blue',
      data: {
        title: '3S2P Li-Ion UPS + INA219',
        subtitle: '5,200 mAh · 3S BMS + XL4015',
        busTag: '5.1V Buck + I2C',
        stepRole: 'STEP_2',
        stepBadge: 'STEP 2 · UPS',
        nodeStatus: isPowerCut ? 'ON' : 'STANDBY',
        statusBadgeLabel: isPowerCut
          ? 'ON · DISCHARGING'
          : 'STANDBY · FLOAT READY',
        imagePath: '/images/components/ina219.jpg',
        iconKey: 'ups',
        liveMetric: isPowerCut
          ? `5.1V Rail Active · ${telemetry.batteryPercent}% (${batteryVoltage}V)`
          : `${telemetry.batteryPercent}% Charged · ${batteryVoltage}V Ready`,
        sourceDesc: '6-cell 3S2P 18650 pack + 3S 20A BMS + XL4015 5A buck + INA219 gauge.',
        routeDesc: '3S2P Pack → XL4015 5.1V Regulated Rail → ESP32-S3, RPi 4B & All 24/7 Sensors.',
        actionDesc: isPowerCut
          ? 'Delivers 0 ms bump-free backup power during AC grid cuts while INA219 reports live %.'
          : 'Sits float-charged at 12.6V ready to carry the entire hub without brownouts.',
      },
    },
    {
      id: 'esp32-s3',
      tone: isFall ? 'crimson' : isGas ? 'amber' : 'emerald',
      data: {
        title: 'ESP32-S3-DevKitC-1',
        subtitle: 'Reflex MCU · Polls @ 10Hz',
        busTag: 'USB + GPIO',
        stepRole: 'STEP_2',
        stepBadge: 'STEP 2 · REFLEX',
        nodeStatus: isFall || isGas ? 'ALERT' : 'ON',
        statusBadgeLabel: isFall || isGas ? 'ALERT · TRIGGERED' : 'ON · ACTIVE (24/7)',
        imagePath: '/images/components/esp32s3.jpg',
        iconKey: 'esp32',
        liveMetric: isFall || isGas ? 'SAFETY INTERRUPT ACTIVE' : '24/7 10Hz Sensor Loop',
        sourceDesc: 'ESP32-S3 N16R8 real-time reflex brain polling all 24/7 sensors continuously.',
        routeDesc: 'All Sensors → ESP32-S3 ↔ USB Serial ↔ RPi 4B (plus Direct Relay GPIO).',
        actionDesc: 'Runs safety interrupts deterministically even on battery backup or if OS reboots.',
      },
    },

    // COLUMN 3: STEP 3 MAIN BRAIN
    {
      id: 'rpi4',
      tone: isFall ? 'crimson' : isGas ? 'amber' : isLan ? 'blue' : 'emerald',
      data: {
        title: 'Raspberry Pi 4 Model B (4GB)',
        subtitle: 'HUD, Voice & Escalation Core',
        busTag: '4GB ARM SBC',
        stepRole: 'STEP_3',
        stepBadge: 'STEP 3 · MAIN',
        nodeStatus: isFall || isGas ? 'ALERT' : 'ON',
        statusBadgeLabel: isFall || isGas ? 'ALERT · ESCALATION' : 'ON · ACTIVE (24/7)',
        iconKey: 'rpi4',
        liveMetric: isFall
          ? '10s Countdown State Machine'
          : isLan
            ? 'Cat6 Gigabit Streaming'
            : '60 FPS HUD + Voice Engine',
        sourceDesc: 'Raspberry Pi 4B interface & local orchestration core.',
        routeDesc: 'ESP32-S3 USB + OV5647 CSI → RPi 4B → 7" Screen, Cat6 LAN & Alert Wi-Fi.',
        actionDesc: 'Drives Age 50 / Age 78 kiosk UI, speaks EN/HI/BN audio, and manages emergency escalation.',
      },
    },

    // COLUMN 4: STEP 4 END ACTIONS & OUTPUTS
    {
      id: 'touchscreen',
      tone: isFall ? 'crimson' : isGas ? 'amber' : isLan ? 'blue' : 'emerald',
      data: {
        title: '7-Inch Touch Display (1024×600)',
        subtitle: 'Live Elderly HUD + Voice',
        busTag: 'HDMI + USB',
        stepRole: 'END',
        stepBadge: 'END · OUTPUT',
        nodeStatus: isFall || isGas ? 'ALERT' : 'ON',
        statusBadgeLabel: isFall || isGas
          ? 'ALERT · EMERGENCY HUD'
          : isNight
            ? 'ON · NIGHT CLOCK HUD'
            : 'ON · 60 FPS LIVE HUD',
        imagePath: '/images/components/display.jpg',
        iconKey: 'screen',
        liveMetric: isFall
          ? 'RED 10s I\'M OKAY HUD'
          : isGas
            ? 'AMBER GAS HAZARD HUD'
            : isNight
              ? 'Dimmed Bedside Clock'
              : '1024×600 IPS 60 FPS',
        sourceDesc: 'Waveshare 7-inch capacitive touchscreen + 0.5W speaker.',
        routeDesc: 'Raspberry Pi 4B → HDMI Video & Audio ↔ USB Touch Return.',
        actionDesc: 'Shows dimmed night clock, 60 FPS vitals, or giant red cancel controls.',
      },
    },
    {
      id: 'gpu-laptops',
      tone: isFall ? 'crimson' : isLan ? 'blue' : 'slate',
      data: {
        title: 'Local GPU Laptops (Cat6 LAN)',
        subtitle: '1080p @ 30 FPS AI Pose · Local',
        busTag: 'Cat6 Gigabit',
        stepRole: 'END',
        stepBadge: 'END · LOCAL LAN',
        nodeStatus: isLan || isFall ? 'ON' : 'STANDBY',
        statusBadgeLabel:
          isLan || isFall ? 'ON · 30 FPS AI POSE' : 'STANDBY · LAN LINKED',
        iconKey: 'laptop',
        liveMetric:
          isLan || isFall
            ? '100% Local AI Pose Inference'
            : 'Wired Gigabit Ready (0 Internet)',
        sourceDesc: 'Family/exhibition GPU laptops tethered over Cat6 Gigabit Ethernet.',
        routeDesc: 'Raspberry Pi 4B ↔ Cat6 Wired Gigabit ↔ Local GPU Laptops.',
        actionDesc: 'Runs local fall-pose inference without ever exposing video to the cloud.',
      },
    },
    {
      id: 'cloud-gateway',
      tone: isFall || isGas ? 'crimson' : 'slate',
      data: {
        title: 'Isolated Wi-Fi Cloud (Call/SMS/EMS)',
        subtitle: 'Twilio / Telegram / Emergency',
        busTag: 'Alert-Only Wi-Fi',
        stepRole: 'END',
        stepBadge: 'END · ALERTS',
        nodeStatus: isFall || isGas ? 'ALERT' : 'OFF',
        statusBadgeLabel:
          isFall || isGas ? 'ALERT · TRANSMITTING' : 'OFF · ZERO CLOUD',
        iconKey: 'cloud',
        liveMetric:
          isFall || isGas
            ? 'Dispatching Call + SMS + 5s Clip'
            : '0 Packets Sent (Strict Privacy)',
        sourceDesc: 'Isolated outbound Wi-Fi lane active ONLY on verified Stage 2–4 emergency.',
        routeDesc: 'Raspberry Pi 4B → Isolated Wi-Fi → Child Call, SMS, Telegram & EMS Address.',
        actionDesc: 'Remains completely OFF during daily life; fires instantly when elder needs help.',
      },
    },
    {
      id: 'relays-siren',
      tone: isFall ? 'crimson' : isGas ? 'amber' : 'slate',
      data: {
        title: '4-Ch Relay + Fan + 12V Siren',
        subtitle: 'Instant Hardware Reflexes',
        busTag: 'GPIO + 12V',
        stepRole: 'END',
        stepBadge: 'END · ACTUATOR',
        nodeStatus: isFall || isGas ? 'ALERT' : 'STANDBY',
        statusBadgeLabel: isFall
          ? 'ALERT · 12V SIREN ON'
          : isGas
            ? 'ALERT · FAN CH1 + SIREN'
            : 'STANDBY · ARMED',
        iconKey: 'relay',
        liveMetric: isGas
          ? 'Relay CH1 Fan + Siren ON'
          : isFall
            ? '12V Piezo Siren Active (10s)'
            : 'Ready on ESP32-S3 GPIO',
        sourceDesc: 'Optocoupled 4-Ch 5V Relay Block + Exhaust Fan + 12V Piezo Siren.',
        routeDesc: 'ESP32-S3 Direct Safety GPIO → Relay CH1 Ventilation & 12V Siren.',
        actionDesc: 'Activates hardware ventilation & bedside siren instantaneously.',
      },
    },
  ];

  const nodes: HardwareFlowNode[] = nodeDefs.map((def) => {
    const status = def.data.nodeStatus;
    const active = status === 'ON' || status === 'ALERT';
    const dimmed = status === 'OFF';
    return {
      id: def.id,
      type: 'hardware',
      position: positions[def.id] ?? { x: 0, y: 0 },
      draggable: true,
      data: {
        ...def.data,
        active,
        dimmed,
        tone: def.tone,
        selected: selectedNodeId === def.id,
      },
    };
  });

  const edgeDefs: Array<{
    id: string;
    source: string;
    target: string;
    active: boolean;
    tone: FlowTone;
    sourceHandle?: string;
    targetHandle?: string;
    data: DataEdgeBaseData;
  }> = [
    {
      id: 'e-wall-ups',
      source: 'wall-adapter',
      target: 'ups-pack',
      active: !isPowerCut,
      tone: isPowerCut ? 'slate' : 'blue',
      data: {
        label: isPowerCut ? 'AC Mains OFF (0V)' : '12.6V DC Grid + Charge',
        protocol: '12.6V 2A Barrel Input',
        fast: !isPowerCut,
        labelOffsetY: -12,
        sourceDesc: '12.6V wall mains adapter.',
        routeDesc: '12.6V Adapter → 3S BMS + UPS Buck Rail.',
        actionDesc: isPowerCut
          ? 'Grid loss detected; 0 ms failover engaged.'
          : 'Powers hub & float-charges 3S2P battery pack.',
      },
    },
    {
      id: 'e-ups-esp',
      source: 'ups-pack',
      target: 'esp32-s3',
      active: isPowerCut || true,
      tone: isPowerCut ? 'amber' : 'blue',
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
      data: {
        label: isPowerCut ? '5.1V UPS Backup (0 ms)' : '5.1V Regulated Bus',
        protocol: 'XL4015 5.1V + INA219 I2C',
        fast: isPowerCut,
        labelOffsetX: 54,
        sourceDesc: 'Regulated 5.1V buck rail + INA219 current monitor.',
        routeDesc: '3S2P UPS + XL4015 → ESP32-S3 + Sensors.',
        actionDesc: 'Sustains all 24/7 safety sensors without brownouts.',
      },
    },
    {
      id: 'e-ups-rpi',
      source: 'ups-pack',
      target: 'rpi4',
      active: true,
      tone: isPowerCut ? 'amber' : 'blue',
      data: {
        label: isPowerCut ? `UPS 5.1V · ${telemetry.batteryPercent}%` : '5.1V Bus (XL4015)',
        protocol: 'XL4015 5A Regulated',
        fast: isPowerCut,
        labelOffsetY: -14,
        sourceDesc: 'Clean 5.1V high-current bus to Raspberry Pi 4B.',
        routeDesc: '3S2P UPS + XL4015 → Raspberry Pi 4B.',
        actionDesc: 'Eliminates Raspberry Pi undervoltage warnings.',
      },
    },
    {
      id: 'e-max-esp',
      source: 'max30102',
      target: 'esp32-s3',
      active: isVitals,
      tone: isVitals ? 'emerald' : 'slate',
      data: {
        label: isVitals ? `I2C · ${telemetry.heartRate} BPM / ${telemetry.spo2}%` : 'I2C Standby',
        protocol: 'I2C Bus (0x57)',
        fast: isVitals,
        labelOffsetX: -42,
        labelOffsetY: -10,
        sourceDesc: 'MAX30102 pulse oximetry sensor.',
        routeDesc: 'MAX30102 → I2C → ESP32-S3.',
        actionDesc: 'Streams PPG waveforms during Daily Vitals Check-In.',
      },
    },
    {
      id: 'e-mlx-esp',
      source: 'mlx90614',
      target: 'esp32-s3',
      active: isVitals,
      tone: isVitals ? 'emerald' : 'slate',
      data: {
        label: isVitals ? `SMBus · ${telemetry.bodyTempF.toFixed(1)}°F` : 'SMBus Standby',
        protocol: 'SMBus I2C (0x5A)',
        fast: isVitals,
        labelOffsetX: -38,
        labelOffsetY: -4,
        sourceDesc: 'MLX90614 contactless IR thermopile.',
        routeDesc: 'MLX90614 → SMBus I2C → ESP32-S3.',
        actionDesc: 'Samples forehead temperature on elder approach.',
      },
    },
    {
      id: 'e-radar-esp',
      source: 'ld2410b',
      target: 'esp32-s3',
      active: true,
      tone: isFall ? 'crimson' : 'emerald',
      data: {
        label: 'UART · 24GHz Radar (24/7)',
        protocol: 'UART 256k baud',
        fast: true,
        labelOffsetX: -42,
        labelOffsetY: 4,
        sourceDesc: 'HLK-LD2410B 24/7 mmWave breathing radar.',
        routeDesc: 'HLK-LD2410B → UART → ESP32-S3.',
        actionDesc: 'Always ON day and night monitoring respiration and stillness.',
      },
    },
    {
      id: 'e-gas-esp',
      source: 'mq-gas',
      target: 'esp32-s3',
      active: true,
      tone: isGas ? 'crimson' : 'emerald',
      data: {
        label: isGas ? `ADC ALERT · ${Math.max(650, telemetry.lpgPpm)} ppm` : `ADC 24/7 · ${telemetry.lpgPpm} ppm`,
        protocol: 'Analog ADC + DO',
        fast: isGas,
        labelOffsetX: -38,
        labelOffsetY: 12,
        sourceDesc: 'MQ-2 & MQ-135 24/7 gas/AQI array.',
        routeDesc: 'MQ-2 / MQ-135 → ADC → ESP32-S3.',
        actionDesc: 'Continuously guards against LPG leaks and smoke plumes.',
      },
    },
    {
      id: 'e-multi-esp',
      source: 'multi-sensors',
      target: 'esp32-s3',
      active: true,
      tone: isFall ? 'crimson' : 'emerald',
      data: {
        label: isFall ? 'ALERT · Thud Impact Spike' : 'I2C/ADC 24/7 · Climate/Tilt',
        protocol: 'I2C + GPIO',
        fast: isFall,
        labelOffsetX: -34,
        labelOffsetY: 20,
        sourceDesc: 'KY-037 thud mic, MPU-6050 tilt IMU & DHT22.',
        routeDesc: 'Sensors → I2C/ADC → ESP32-S3.',
        actionDesc: 'Always awake monitoring impact thuds, tilt, and climate.',
      },
    },
    {
      id: 'e-esp-gimbal',
      source: 'esp32-s3',
      target: 'ov5647-gimbal',
      active: isLan || isFall,
      tone: isFall ? 'crimson' : isLan ? 'blue' : 'slate',
      sourceHandle: 'bottom-source',
      targetHandle: 'right-target',
      data: {
        label: isLan || isFall ? 'PWM · Tracking Gimbal' : 'PWM Gimbal Standby',
        protocol: 'ULN2003 Stepper PWM',
        labelOffsetX: -20,
        labelOffsetY: -12,
        sourceDesc: 'Gimbal pan/tilt steering commands.',
        routeDesc: 'ESP32-S3 → PWM → 28BYJ-48 Stepper Gimbal.',
        actionDesc: 'Rotates camera lens cleanly toward detected motion.',
      },
    },
    {
      id: 'e-ov-rpi',
      source: 'ov5647-gimbal',
      target: 'rpi4',
      active: isLan || isFall,
      tone: isFall ? 'crimson' : isLan ? 'blue' : 'slate',
      sourceHandle: 'right-source',
      targetHandle: 'bottom-target',
      data: {
        label: isLan || isFall ? 'MIPI-CSI · 1080p 30 FPS' : 'CSI Night Privacy Sleep',
        protocol: '15-pin MIPI-CSI',
        fast: isLan || isFall,
        labelOffsetX: 64,
        labelOffsetY: 16,
        sourceDesc: 'OV5647 CSI-2 camera link.',
        routeDesc: 'OV5647 → MIPI-CSI → Raspberry Pi 4B.',
        actionDesc: 'Sleeps during Night Radar Watch; wakes cleanly on fall or LAN stream.',
      },
    },
    {
      id: 'e-esp-rpi',
      source: 'esp32-s3',
      target: 'rpi4',
      active: true,
      tone: isFall ? 'crimson' : isGas ? 'amber' : 'emerald',
      data: {
        label: 'USB Serial · 10 Hz Fused Data',
        protocol: 'USB-UART Bridge',
        bidirectional: true,
        fast: true,
        labelOffsetY: -12,
        sourceDesc: 'Unified USB bus linking Reflex & Interface Brains.',
        routeDesc: 'ESP32-S3 ↔ USB Serial ↔ Raspberry Pi 4B.',
        actionDesc: 'Delivers continuous 10 Hz sensor frames & emergency triggers.',
      },
    },
    {
      id: 'e-esp-relay',
      source: 'esp32-s3',
      target: 'relays-siren',
      active: isFall || isGas,
      tone: isFall ? 'crimson' : isGas ? 'amber' : 'slate',
      data: {
        label: isFall
          ? 'GPIO · 12V SIREN ON'
          : isGas
            ? 'GPIO · FAN CH1 + SIREN'
            : 'GPIO Standby (Armed)',
        protocol: 'Direct Safety GPIO',
        fast: isFall || isGas,
        labelOffsetX: 50,
        labelOffsetY: 16,
        sourceDesc: 'Direct hardware safety output from ESP32-S3.',
        routeDesc: 'ESP32-S3 → Opto-Relay GPIO → Fan CH1 & 12V Siren.',
        actionDesc: 'Fires instantaneous hardware reflexes without cloud delay.',
      },
    },
    {
      id: 'e-rpi-hud',
      source: 'rpi4',
      target: 'touchscreen',
      active: true,
      tone: isFall ? 'crimson' : isGas ? 'amber' : isLan ? 'blue' : 'emerald',
      data: {
        label: isFall || isGas ? 'HDMI · ALERT HUD + VOICE' : 'HDMI · 60 FPS Touch HUD',
        protocol: 'HDMI + USB HID Touch',
        fast: true,
        labelOffsetX: 20,
        labelOffsetY: -12,
        sourceDesc: 'Raspberry Pi 4B compositor & TTS voice output.',
        routeDesc: 'Raspberry Pi 4B → HDMI/Audio ↔ 7" IPS Display.',
        actionDesc: 'Displays active scenario screen + multilingual voice prompts.',
      },
    },
    {
      id: 'e-rpi-lan',
      source: 'rpi4',
      target: 'gpu-laptops',
      active: isLan || isFall,
      tone: isFall ? 'crimson' : isLan ? 'blue' : 'slate',
      data: {
        label: isLan || isFall ? 'Cat6 LAN · 30 FPS Pose AI' : 'Cat6 LAN Linked (Idle)',
        protocol: 'Wired Gigabit Ethernet',
        bidirectional: true,
        fast: isLan || isFall,
        labelOffsetX: 28,
        labelOffsetY: -8,
        sourceDesc: 'Local-only wired Gigabit Ethernet stream.',
        routeDesc: 'Raspberry Pi 4B ↔ Cat6 LAN ↔ Local GPU Laptops.',
        actionDesc: 'Runs AI skeleton fall inference strictly inside the house.',
      },
    },
    {
      id: 'e-rpi-cloud',
      source: 'rpi4',
      target: 'cloud-gateway',
      active: isFall || isGas,
      tone: isFall ? 'crimson' : isGas ? 'amber' : 'slate',
      data: {
        label: isFall || isGas ? 'Isolated Wi-Fi · ALERT SENT' : 'Isolated Wi-Fi OFF (Private)',
        protocol: 'Emergency-Only Wi-Fi',
        fast: isFall || isGas,
        labelOffsetX: 24,
        labelOffsetY: 10,
        sourceDesc: 'Alert-only emergency cloud link.',
        routeDesc: 'Raspberry Pi 4B → Isolated Wi-Fi → Phone / SMS / Telegram / EMS.',
        actionDesc: 'Remains OFF during daily life; transmits only on verified emergency.',
      },
    },
  ];

  const edges: DataFlowEdge[] = edgeDefs.map((def) => ({
    id: def.id,
    type: 'dataFlow',
    source: def.source,
    target: def.target,
    sourceHandle: def.sourceHandle ?? 'right-source',
    targetHandle: def.targetHandle ?? 'left-target',
    animated: false,
    zIndex: def.active ? 20 : 1,
    data: {
      ...def.data,
      active: def.active,
      dimmed: !def.active,
      tone: def.active ? def.tone : 'slate',
      selected: selectedEdgeId === def.id,
    },
  }));

  return { nodes, edges };
}
