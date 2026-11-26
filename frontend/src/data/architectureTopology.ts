import type { Edge, Node } from '@xyflow/react';
import type { SandboxTelemetry } from '../context/SandboxContext';

export type ArchitectureLayoutMode = 'dual-brain' | 'pipeline';
export type FlowTone = 'emerald' | 'blue' | 'amber' | 'crimson' | 'slate';
export type FlowScenarioId =
  | 'night_radar'
  | 'vitals_checkin'
  | 'lan_stream'
  | 'fall_escalation'
  | 'gas_hazard'
  | 'power_cut';

export type NodeLayer = 'sensor' | 'actuator' | 'compute' | 'power' | 'output';

export interface HardwareNodeBaseData {
  title: string;
  subtitle: string;
  busTag: string;
  layer: NodeLayer;
  iconKey:
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
  liveMetric?: string;
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
  activeNodes: string[];
  activeEdges: string[];
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
    activeNodes: ['ld2410b', 'esp32-s3', 'rpi4', 'touchscreen'],
    activeEdges: ['e-radar-esp', 'e-esp-rpi', 'e-rpi-hud'],
    narrator: {
      triggerSource:
        'HLK-LD2410B 24GHz mmWave Radar tracks chest breathing micro-motion in total bedroom darkness.',
      dataRoute:
        'HLK-LD2410B → UART (256 kbps) → ESP32-S3 Reflex Brain → USB Serial JSON → Raspberry Pi 4 → MIPI-DSI 7" Standby HUD.',
      autonomousAction:
        'Display holds calm clock & room telemetry; cloud Wi-Fi stays silent because normal respiration is present.',
    },
  },
  vitals_checkin: {
    id: 'vitals_checkin',
    label: 'Daily Vitals Check-In',
    tone: 'emerald',
    activeNodes: ['max30102', 'mlx90614', 'esp32-s3', 'rpi4', 'touchscreen'],
    activeEdges: ['e-max-esp', 'e-mlx-esp', 'e-esp-rpi', 'e-rpi-hud'],
    narrator: {
      triggerSource:
        'MAX30102 optical PPG finger pad (HR & SpO₂) + MLX90614 contactless IR forehead optic.',
      dataRoute:
        'MAX30102 & MLX90614 → I2C Bus → ESP32-S3 (samples & baseline check) → USB Serial 10 Hz → RPi 4 → 60 FPS Vitals HUD + Native Voice.',
      autonomousAction:
        'Renders live 60 FPS cardiac waveform, verifies values against the elder\'s calibrated baseline, and logs check-in on "I\'M OK".',
    },
  },
  lan_stream: {
    id: 'lan_stream',
    label: '30 FPS Live Exhibition Stream',
    tone: 'blue',
    activeNodes: ['ov5647-gimbal', 'esp32-s3', 'rpi4', 'gpu-laptops'],
    activeEdges: ['e-esp-gimbal', 'e-ov-rpi', 'e-rpi-lan'],
    narrator: {
      triggerSource:
        'OV5647 wide-angle camera on 2-axis 28BYJ-48 gimbal tracks subject movement across the room.',
      dataRoute:
        'OV5647 → MIPI-CSI 1080p @ 30 FPS → Raspberry Pi 4 ↔ Cat6 Gigabit Ethernet ↔ Local GPU Laptops (Pose AI + Dashboard).',
      autonomousAction:
        'Zero frames ever leave the local wire — GPU laptop overlays AI skeleton pose while ESP32-S3 smoothly aims gimbal PWM.',
    },
  },
  fall_escalation: {
    id: 'fall_escalation',
    label: 'Silent Fall Escalation (t+0s → t+40s)',
    tone: 'crimson',
    activeNodes: [
      'ov5647-gimbal',
      'multi-sensors',
      'ld2410b',
      'esp32-s3',
      'rpi4',
      'touchscreen',
      'gpu-laptops',
      'relays-siren',
      'cloud-gateway',
    ],
    activeEdges: [
      'e-ov-rpi',
      'e-multi-esp',
      'e-radar-esp',
      'e-esp-rpi',
      'e-esp-relay',
      'e-rpi-hud',
      'e-rpi-lan',
      'e-rpi-cloud',
    ],
    narrator: {
      triggerSource:
        'Fused anomaly: GPU AI fall pose + KY-037 acoustic floor thud spike + LD2410B motionless stillness.',
      dataRoute:
        'Sensors → ESP32-S3 + Cat6 Pose AI → RPi 4 Escalation State Machine → 7" Red Countdown + GPIO 12V Siren → Isolated Wi-Fi Cloud Gateway.',
      autonomousAction:
        'Runs 10s "I\'M OKAY" countdown with piezo siren; on silence, dispatches automated call, SMS, Telegram 5s clip, and ambulance/police address pin.',
    },
  },
  gas_hazard: {
    id: 'gas_hazard',
    label: 'LPG Gas Leak Reflex',
    tone: 'amber',
    activeNodes: [
      'mq-gas',
      'esp32-s3',
      'relays-siren',
      'rpi4',
      'touchscreen',
      'cloud-gateway',
    ],
    activeEdges: [
      'e-gas-esp',
      'e-esp-relay',
      'e-esp-rpi',
      'e-rpi-hud',
      'e-rpi-cloud',
    ],
    narrator: {
      triggerSource:
        'MQ-2 combustible LPG/smoke sensor crosses >400 ppm threshold (paired with MQ-135 air quality index).',
      dataRoute:
        'MQ-2 Analog ADC → ESP32-S3 Safety Interrupt → Immediate GPIO Relay CH1 + Siren + USB Serial → RPi 4 Hazard HUD & Isolated Wi-Fi.',
      autonomousAction:
        'ESP32-S3 triggers exhaust fan relay + 12V piezo siren autonomously in milliseconds—even if the Pi screen is busy—and notifies the family phone.',
    },
  },
  power_cut: {
    id: 'power_cut',
    label: 'Monsoon Power Cut (UPS Continuity)',
    tone: 'amber',
    activeNodes: ['ups-pack', 'multi-sensors', 'esp32-s3', 'rpi4', 'touchscreen'],
    activeEdges: [
      'e-ups-esp',
      'e-ups-rpi',
      'e-multi-esp',
      'e-esp-rpi',
      'e-rpi-hud',
    ],
    narrator: {
      triggerSource:
        'Wall AC mains drops; 3S 20A BMS seamlessly holds bus voltage from the 6-cell 3S2P 18650 pack (~5,200 mAh).',
      dataRoute:
        '3S2P Li-Ion + XL4015 5.1V Buck → Dedicated Power Rails (0 ms switchover) · INA219 → I2C → ESP32-S3 → USB → RPi 4 Battery Gauge.',
      autonomousAction:
        'Zero brownouts or reboots: radar, gas sensors, siren, and 7-inch touch HUD stay active with live battery % & voltage on screen.',
    },
  },
};

export const POSITIONS_DUAL_BRAIN: Record<string, { x: number; y: number }> = {
  max30102: { x: 20, y: 20 },
  mlx90614: { x: 20, y: 120 },
  ld2410b: { x: 20, y: 220 },
  'mq-gas': { x: 20, y: 320 },
  'multi-sensors': { x: 20, y: 420 },
  'ov5647-gimbal': { x: 20, y: 530 },
  'relays-siren': { x: 340, y: 30 },

  'esp32-s3': { x: 340, y: 200 },
  rpi4: { x: 340, y: 375 },
  'ups-pack': { x: 340, y: 545 },

  touchscreen: { x: 680, y: 95 },
  'gpu-laptops': { x: 680, y: 280 },
  'cloud-gateway': { x: 680, y: 465 },
};

export const POSITIONS_PIPELINE: Record<string, { x: number; y: number }> = {
  max30102: { x: 10, y: 20 },
  mlx90614: { x: 10, y: 120 },
  ld2410b: { x: 10, y: 220 },
  'mq-gas': { x: 10, y: 320 },
  'multi-sensors': { x: 10, y: 420 },
  'ov5647-gimbal': { x: 10, y: 525 },

  'esp32-s3': { x: 280, y: 150 },
  'ups-pack': { x: 280, y: 340 },
  'relays-siren': { x: 280, y: 500 },

  rpi4: { x: 545, y: 245 },

  touchscreen: { x: 810, y: 80 },
  'gpu-laptops': { x: 810, y: 255 },
  'cloud-gateway': { x: 810, y: 430 },
};

export function buildArchitectureGraph(
  layoutMode: ArchitectureLayoutMode,
  scenarioId: FlowScenarioId,
  telemetry: SandboxTelemetry,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  existingPositions?: Record<string, { x: number; y: number }>
): { nodes: HardwareFlowNode[]; edges: DataFlowEdge[] } {
  const scenario = SCENARIO_DEFINITIONS[scenarioId];
  const positions =
    existingPositions ??
    (layoutMode === 'dual-brain' ? POSITIONS_DUAL_BRAIN : POSITIONS_PIPELINE);

  const activeNodeSet = new Set(scenario.activeNodes);
  const activeEdgeSet = new Set(scenario.activeEdges);
  const batteryVoltage = (11.1 + (telemetry.batteryPercent / 100) * 1.5).toFixed(1);

  const nodeDefs: Array<{
    id: string;
    data: HardwareNodeBaseData;
  }> = [
    {
      id: 'max30102',
      data: {
        title: 'MAX30102',
        subtitle: 'Heart Rate & SpO₂ Pad',
        busTag: 'I2C (0x57)',
        layer: 'sensor',
        iconKey: 'pulse',
        liveMetric: `${telemetry.heartRate} BPM · ${telemetry.spo2}%`,
        sourceDesc: `MAX30102 optical pulse oximeter currently reading ${telemetry.heartRate} BPM and ${telemetry.spo2}% SpO₂.`,
        routeDesc: 'MAX30102 → I2C Bus → ESP32-S3 → USB Serial → Raspberry Pi 4 → 7" Kiosk HUD.',
        actionDesc: 'Streams 60 FPS PPG waveform and checks readings against the active elder\'s calibrated baseline.',
      },
    },
    {
      id: 'mlx90614',
      data: {
        title: 'MLX90614',
        subtitle: 'Contactless IR Temp Optic',
        busTag: 'I2C / SMBus',
        layer: 'sensor',
        iconKey: 'temp',
        liveMetric: `${telemetry.bodyTempF.toFixed(1)}°F`,
        sourceDesc: `MLX90614 medical IR thermopile measuring ${telemetry.bodyTempF.toFixed(1)}°F without skin contact.`,
        routeDesc: 'MLX90614 → SMBus I2C (0x5A) → ESP32-S3 → USB Serial → RPi 4 HUD.',
        actionDesc: 'Captures hygiene-friendly body temperature during morning & night check-ins.',
      },
    },
    {
      id: 'ld2410b',
      data: {
        title: 'HLK-LD2410B',
        subtitle: '24GHz mmWave Radar',
        busTag: 'UART 256k',
        layer: 'sensor',
        iconKey: 'radar',
        liveMetric:
          telemetry.radarState === 'PRESENT_STILL'
            ? 'Still / Breathing'
            : telemetry.radarState === 'MOVING'
              ? 'Active Motion'
              : 'Bed Empty',
        sourceDesc: `HLK-LD2410B 24GHz radar currently reporting "${telemetry.radarState}".`,
        routeDesc: 'HLK-LD2410B → High-speed UART → ESP32-S3 → USB Serial → RPi 4.',
        actionDesc: 'Monitors nocturnal respiration through blankets in total darkness and flags prolonged bed absence.',
      },
    },
    {
      id: 'mq-gas',
      data: {
        title: 'MQ-2 & MQ-135',
        subtitle: 'LPG Smoke & Air Quality',
        busTag: 'Analog ADC',
        layer: 'sensor',
        iconKey: 'gas',
        liveMetric: `${telemetry.lpgPpm} ppm · ${telemetry.airQuality}`,
        sourceDesc: `MQ-2 & MQ-135 sensors reading ${telemetry.lpgPpm} ppm (${telemetry.airQuality} air).`,
        routeDesc: 'MQ-2 / MQ-135 → Analog ADC → ESP32-S3 Interrupt → Relay GPIO + RPi 4 Hazard HUD.',
        actionDesc: 'Automatically engages Relay CH1 exhaust fan and 12V siren above 400 ppm.',
      },
    },
    {
      id: 'multi-sensors',
      data: {
        title: 'KY-037 + MPU + DHT + INA',
        subtitle: 'Thud, Tilt, Climate & Gauge',
        busTag: 'I2C / ADC',
        layer: 'sensor',
        iconKey: 'sensors',
        liveMetric: `${telemetry.roomTempC}°C · ${telemetry.humidity}% RH`,
        sourceDesc: `Fused telemetry array: KY-037 thud mic, MPU-6050 tilt IMU, DHT22 (${telemetry.roomTempC}°C), INA219 (${telemetry.batteryPercent}%).`,
        routeDesc: 'KY-037 / MPU-6050 / DHT22 / INA219 → ESP32-S3 → USB Serial → RPi 4.',
        actionDesc: 'Detects collapse thuds behind furniture, unit knock-over, room heat waves, and battery draw.',
      },
    },
    {
      id: 'relays-siren',
      data: {
        title: '4-Ch Relay + Fan + Siren',
        subtitle: 'Local Reflex Actuators',
        busTag: 'GPIO + 12V',
        layer: 'actuator',
        iconKey: 'relay',
        liveMetric: telemetry.exhaustFanRelay ? 'Fan Relay ON' : 'Armed Standby',
        sourceDesc: 'Optocoupled 4-Channel 5V Relay Block + Exhaust Fan + 12V Piezo Siren.',
        routeDesc: 'ESP32-S3 Deterministic Safety Loop → Direct GPIO → 5V Opto Relay & 12V Piezo Alarm.',
        actionDesc: 'Fires instantaneous acoustic countdown alarm and exhaust ventilation without cloud latency.',
      },
    },
    {
      id: 'ov5647-gimbal',
      data: {
        title: 'OV5647 + 2-Axis Gimbal',
        subtitle: '1080p Vision + 28BYJ-48',
        busTag: 'CSI + PWM',
        layer: 'sensor',
        iconKey: 'camera',
        liveMetric: '1080p @ 30 FPS',
        sourceDesc: 'Wide-angle OV5647 CSI camera mounted on silent dual-axis 28BYJ-48 stepper gimbal.',
        routeDesc: 'OV5647 → MIPI-CSI Ribbon → RPi 4 (Stream) · ESP32-S3 → ULN2003 PWM (Gimbal Tracking).',
        actionDesc: 'Keeps elderly person centered in frame for local GPU AI fall-pose detection and parent ID.',
      },
    },
    {
      id: 'esp32-s3',
      data: {
        title: 'ESP32-S3 (Reflex Brain)',
        subtitle: 'Sensor Polling & Safety Logic',
        busTag: 'N16R8 MCU',
        layer: 'compute',
        iconKey: 'esp32',
        liveMetric: 'Always-On Loop',
        sourceDesc: 'ESP32-S3-DevKitC-1 N16R8 real-time microcontroller polling every sensor deterministically.',
        routeDesc: 'All Physical Sensors → ESP32-S3 ↔ USB Serial ↔ Raspberry Pi 4 (and direct GPIO to Relays/Gimbal).',
        actionDesc: 'Eliminates single point of failure: continues guarding gas, radar, and sirens even if UI reboots.',
      },
    },
    {
      id: 'rpi4',
      data: {
        title: 'Raspberry Pi 4 (Interface)',
        subtitle: 'HUD, Audio & Escalation Core',
        busTag: '4GB ARM SBC',
        layer: 'compute',
        iconKey: 'rpi4',
        liveMetric: '60 FPS Engine',
        sourceDesc: 'Raspberry Pi 4 Model B (4GB) orchestrating the 7-inch kiosk, voice engine, and network routing.',
        routeDesc: 'ESP32-S3 USB + OV5647 CSI → Raspberry Pi 4 → 7" HUD, Cat6 Local LAN, & Emergency Wi-Fi.',
        actionDesc: 'Serves 60 FPS elder-adaptive HUD, speaks Bengali/Hindi/English prompts, and runs 10s verification.',
      },
    },
    {
      id: 'ups-pack',
      data: {
        title: '3S2P Li-Ion UPS + XL4015',
        subtitle: '5,200 mAh + 3S 20A BMS',
        busTag: '5.1V Buck',
        layer: 'power',
        iconKey: 'ups',
        liveMetric: `${telemetry.acMainsConnected ? 'AC + ' : 'UPS '}${telemetry.batteryPercent}% (${batteryVoltage}V)`,
        sourceDesc: `3S2P 18650 pack + 3S 20A BMS + XL4015 5A converter (${telemetry.acMainsConnected ? 'AC Mains OK' : 'Running on Battery'}).`,
        routeDesc: '12.6V Charger → 3S BMS → 3S2P Pack → XL4015 5.1V Buck → Both Brains & Display (0 ms switchover).',
        actionDesc: 'Prevents power-bank sag brownouts during Indian monsoon/summer outages; INA219 reports live %.',
      },
    },
    {
      id: 'touchscreen',
      data: {
        title: '7-Inch Capacitive Display',
        subtitle: '60 FPS HUD + Native Voice',
        busTag: 'HDMI/DSI + USB',
        layer: 'output',
        iconKey: 'screen',
        liveMetric: '1024×600 IPS',
        sourceDesc: 'Waveshare 7-inch 1024×600 capacitive IPS display paired with 0.5W 8Ω mini speaker.',
        routeDesc: 'Raspberry Pi 4 → HDMI/DSI Video + Audio → 7-Inch Touchscreen & Speaker (USB HID Touch back).',
        actionDesc: 'Adapts font/button scale to age and provides huge one-tap "I\'M OK" / "I\'M OKAY" controls.',
      },
    },
    {
      id: 'gpu-laptops',
      data: {
        title: 'Local GPU Laptops',
        subtitle: 'AI Pose & Live Dashboard',
        busTag: 'Cat6 Gigabit',
        layer: 'output',
        iconKey: 'laptop',
        liveMetric: '100% Local LAN',
        sourceDesc: 'Family or exhibition laptops connected directly via shielded Cat6 Gigabit Ethernet.',
        routeDesc: 'Raspberry Pi 4 ↔ Cat6 Wired Gigabit LAN ↔ GPU Laptops (30 FPS Stream & Fall Inference).',
        actionDesc: 'Processes real-time AI skeleton pose detection strictly inside the home—zero cloud video exposure.',
      },
    },
    {
      id: 'cloud-gateway',
      data: {
        title: 'Isolated Wi-Fi Cloud',
        subtitle: 'Calls, SMS, Telegram & EMS',
        busTag: 'Emergencies Only',
        layer: 'output',
        iconKey: 'cloud',
        liveMetric: 'Alert-Only Lane',
        sourceDesc: 'Isolated Wi-Fi outbound link carrying lightweight emergency alert payloads only during escalation.',
        routeDesc: 'Raspberry Pi 4 (Stage 2+ Trigger) → Isolated Wi-Fi → Child Call + SMS + Telegram 5s Clip + EMS.',
        actionDesc: 'Dormant during normal hours; guarantees unblocked bandwidth for emergency phone calls & location pins.',
      },
    },
  ];

  const nodes: HardwareFlowNode[] = nodeDefs.map((def) => {
    const active = activeNodeSet.has(def.id);
    return {
      id: def.id,
      type: 'hardware',
      position: positions[def.id] ?? { x: 0, y: 0 },
      draggable: true,
      data: {
        ...def.data,
        active,
        dimmed: !active,
        tone: active ? scenario.tone : 'slate',
        selected: selectedNodeId === def.id,
      },
    };
  });

  const edgeDefs: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    data: DataEdgeBaseData;
  }> = [
    {
      id: 'e-max-esp',
      source: 'max30102',
      target: 'esp32-s3',
      data: {
        label: `I2C · ${telemetry.heartRate} BPM / ${telemetry.spo2}%`,
        protocol: 'I2C Bus (0x57)',
        fast: true,
        sourceDesc: 'MAX30102 optical PPG sensor capturing arterial pulse & SpO₂.',
        routeDesc: 'MAX30102 → I2C Bus → ESP32-S3 Reflex Brain.',
        actionDesc: 'Samples raw red/IR PPG pulses continuously for heart rate and oxygen saturation.',
      },
    },
    {
      id: 'e-mlx-esp',
      source: 'mlx90614',
      target: 'esp32-s3',
      data: {
        label: `I2C · ${telemetry.bodyTempF.toFixed(1)}°F`,
        protocol: 'SMBus I2C (0x5A)',
        sourceDesc: 'MLX90614 contactless IR thermopile reading body temperature.',
        routeDesc: 'MLX90614 → SMBus I2C → ESP32-S3 Reflex Brain.',
        actionDesc: 'Flags elevated fever spikes relative to the parent\'s personal normal temperature.',
      },
    },
    {
      id: 'e-radar-esp',
      source: 'ld2410b',
      target: 'esp32-s3',
      data: {
        label: 'UART · 24GHz Radar',
        protocol: 'UART 256k baud',
        fast: true,
        sourceDesc: 'HLK-LD2410B 24GHz mmWave radar reporting chest micro-motion.',
        routeDesc: 'HLK-LD2410B → Dedicated UART → ESP32-S3 Reflex Brain.',
        actionDesc: 'Detects breathing stillness or night bed absence even in complete darkness.',
      },
    },
    {
      id: 'e-gas-esp',
      source: 'mq-gas',
      target: 'esp32-s3',
      data: {
        label: `ADC · ${telemetry.lpgPpm} ppm`,
        protocol: 'Analog ADC + DO',
        fast: telemetry.lpgPpm > 400,
        sourceDesc: 'MQ-2 combustible LPG/smoke & MQ-135 indoor air quality sensors.',
        routeDesc: 'MQ-2 / MQ-135 → Analog ADC → ESP32-S3 Reflex Brain.',
        actionDesc: 'Evaluates ppm hazard thresholds every cycle and triggers immediate fan relay above 400 ppm.',
      },
    },
    {
      id: 'e-multi-esp',
      source: 'multi-sensors',
      target: 'esp32-s3',
      data: {
        label: 'I2C/ADC · Thud & Gauge',
        protocol: 'I2C + GPIO/ADC',
        sourceDesc: 'KY-037 fall-thud sensor, MPU-6050 tilt IMU, DHT22 climate, INA219 power gauge.',
        routeDesc: 'Multi-Sensor Array → I2C / ADC → ESP32-S3 Reflex Brain.',
        actionDesc: 'Feeds acoustic collapse spikes, enclosure tilt alarms, climate, and battery telemetry.',
      },
    },
    {
      id: 'e-esp-relay',
      source: 'esp32-s3',
      target: 'relays-siren',
      sourceHandle: layoutMode === 'dual-brain' ? 'top-source' : 'bottom-source',
      targetHandle: layoutMode === 'dual-brain' ? 'bottom-target' : 'top-target',
      data: {
        label: telemetry.exhaustFanRelay ? 'GPIO · FAN + SIREN ON' : 'GPIO · Relay & Siren',
        protocol: 'Direct GPIO Control',
        fast: true,
        sourceDesc: 'ESP32-S3 autonomous reflex safety decision.',
        routeDesc: 'ESP32-S3 → Optocoupled GPIO → 4-Ch 5V Relay + Exhaust Fan + 12V Piezo Siren.',
        actionDesc: 'Triggers local acoustic alarm and exhaust fan immediately without waiting for cloud.',
      },
    },
    {
      id: 'e-esp-gimbal',
      source: 'esp32-s3',
      target: 'ov5647-gimbal',
      data: {
        label: 'PWM · 2-Axis Aim',
        protocol: 'ULN2003 Stepper PWM',
        sourceDesc: 'Subject tracking target offsets forwarded to ESP32-S3.',
        routeDesc: 'ESP32-S3 → ULN2003 Stepper Drivers → 28BYJ-48 Pan/Tilt Camera Gimbal.',
        actionDesc: 'Quietly rotates camera turret to keep the elder in view.',
      },
    },
    {
      id: 'e-ov-rpi',
      source: 'ov5647-gimbal',
      target: 'rpi4',
      data: {
        label: 'MIPI-CSI · 1080p 30 FPS',
        protocol: '15-pin MIPI-CSI',
        fast: true,
        sourceDesc: 'OV5647 wide-angle camera optical sensor.',
        routeDesc: 'OV5647 → Direct MIPI-CSI Ribbon → Raspberry Pi 4 Video Encoder.',
        actionDesc: 'Supplies hardware-accelerated local 1080p @ 30 FPS frames for face ID & pose AI.',
      },
    },
    {
      id: 'e-esp-rpi',
      source: 'esp32-s3',
      target: 'rpi4',
      sourceHandle: layoutMode === 'dual-brain' ? 'bottom-source' : 'right-source',
      targetHandle: layoutMode === 'dual-brain' ? 'top-target' : 'left-target',
      data: {
        label: 'USB Serial · 10 Hz JSON',
        protocol: 'USB-UART Bridge',
        bidirectional: true,
        fast: true,
        sourceDesc: 'Single clean USB bridge uniting the Reflex Brain and Interface Brain.',
        routeDesc: 'ESP32-S3 ↔ USB Serial (10 Hz JSON Telemetry & Commands) ↔ Raspberry Pi 4.',
        actionDesc: 'Streams sensor frames upstream to the HUD while carrying gimbal & test commands back.',
      },
    },
    {
      id: 'e-ups-esp',
      source: 'ups-pack',
      target: 'esp32-s3',
      data: {
        label: '5.1V Rail · 0 ms UPS',
        protocol: 'XL4015 Regulated 5.1V',
        sourceDesc: '3S2P 18650 pack regulated via 3S 20A BMS and XL4015 5A buck.',
        routeDesc: '3S2P UPS → Clean 5.1V Rail → ESP32-S3 & Sensor Array.',
        actionDesc: 'Keeps safety sensing online continuously through wall power cuts.',
      },
    },
    {
      id: 'e-ups-rpi',
      source: 'ups-pack',
      target: 'rpi4',
      sourceHandle: layoutMode === 'dual-brain' ? 'top-source' : 'right-source',
      targetHandle: layoutMode === 'dual-brain' ? 'bottom-target' : 'left-target',
      data: {
        label: `5.1V Rail · ${telemetry.batteryPercent}%`,
        protocol: 'XL4015 5A High-Current',
        sourceDesc: 'Clean 5.1V high-current bus eliminating Pi undervoltage brownouts.',
        routeDesc: '3S2P UPS → XL4015 5A Buck → Raspberry Pi 4 + 7" Display.',
        actionDesc: 'Seamless zero-reboot continuity during outages with live INA219 battery gauge.',
      },
    },
    {
      id: 'e-rpi-hud',
      source: 'rpi4',
      target: 'touchscreen',
      data: {
        label: 'HDMI/DSI · 60 FPS UI',
        protocol: 'HDMI + USB HID Touch',
        fast: true,
        sourceDesc: 'Raspberry Pi 4 kiosk compositor + multilingual voice synthesizer.',
        routeDesc: 'Raspberry Pi 4 → HDMI/DSI Display & Speaker (Capacitive Touch returns via USB).',
        actionDesc: 'Renders age-adaptive 60 FPS Standby, Vitals, and Emergency HUDs.',
      },
    },
    {
      id: 'e-rpi-lan',
      source: 'rpi4',
      target: 'gpu-laptops',
      data: {
        label: 'Cat6 LAN · 30 FPS + Pose AI',
        protocol: 'Wired Gigabit Ethernet',
        bidirectional: true,
        fast: true,
        sourceDesc: 'Local-only wired Gigabit Ethernet video & AI inference pipeline.',
        routeDesc: 'Raspberry Pi 4 ↔ Cat6 Gigabit Patch Cable ↔ Family / Exhibition GPU Laptops.',
        actionDesc: 'Video never touches the cloud; GPU laptop runs fall-pose AI and returns fall confidence.',
      },
    },
    {
      id: 'e-rpi-cloud',
      source: 'rpi4',
      target: 'cloud-gateway',
      data: {
        label: 'Isolated Wi-Fi · Alert Only',
        protocol: 'Emergency-Only Wi-Fi',
        fast: true,
        sourceDesc: 'Escalation Stage 2+ dispatch triggered only after 10s silence.',
        routeDesc: 'Raspberry Pi 4 → Isolated Wi-Fi Interface → Automated Call + SMS + Telegram + EMS.',
        actionDesc: 'Transmits lightweight alert, live vitals, address pin, and 5s collapse snapshot.',
      },
    },
  ];

  const edges: DataFlowEdge[] = edgeDefs.map((def) => {
    const active = activeEdgeSet.has(def.id);
    return {
      id: def.id,
      type: 'dataFlow',
      source: def.source,
      target: def.target,
      sourceHandle: def.sourceHandle ?? 'right-source',
      targetHandle: def.targetHandle ?? 'left-target',
      animated: false,
      zIndex: active ? 20 : 1,
      data: {
        ...def.data,
        active,
        dimmed: !active,
        tone: active ? scenario.tone : 'slate',
        selected: selectedEdgeId === def.id,
      },
    };
  });

  return { nodes, edges };
}
