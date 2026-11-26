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

export interface HardwareNodeBaseData {
  title: string;
  subtitle: string;
  busTag: string;
  stepRole: StepRole;
  stepBadge: string;
  imagePath?: string;
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
        'STEP 1 (START): HLK-LD2410B 24GHz mmWave Radar tracks chest breathing micro-motion in total darkness.',
      dataRoute:
        'STEP 2 → 3: HLK-LD2410B → UART (256 kbps) → ESP32-S3 Reflex Brain → USB Serial JSON → Raspberry Pi 4B.',
      autonomousAction:
        'STEP 4 (END): 7-Inch Display holds calm clock & bedside sleep telemetry while cloud Wi-Fi stays silent.',
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
        'STEP 1 (START): MAX30102 optical PPG finger pad (HR & SpO₂) + MLX90614 contactless IR forehead optic.',
      dataRoute:
        'STEP 2 → 3: MAX30102 & MLX90614 → I2C Bus → ESP32-S3 → USB Serial 10 Hz → Raspberry Pi 4B.',
      autonomousAction:
        'STEP 4 (END): Renders live 60 FPS PPG waveform on the 7" display and speaks EN/HI/BN voice guidance.',
    },
  },
  lan_stream: {
    id: 'lan_stream',
    label: '30 FPS LAN Stream',
    tone: 'blue',
    activeNodes: ['ov5647-gimbal', 'esp32-s3', 'rpi4', 'gpu-laptops'],
    activeEdges: ['e-esp-gimbal', 'e-ov-rpi', 'e-rpi-lan'],
    narrator: {
      triggerSource:
        'STEP 1 (START): Wide-angle OV5647 camera on silent 28BYJ-48 gimbal tracks movement locally.',
      dataRoute:
        'STEP 2 → 3: OV5647 → MIPI-CSI Ribbon → Raspberry Pi 4B ↔ Cat6 Gigabit Ethernet Wire.',
      autonomousAction:
        'STEP 4 (END): Local GPU laptops receive 1080p @ 30 FPS stream over Cat6 LAN for AI fall-pose detection — zero cloud upload.',
    },
  },
  fall_escalation: {
    id: 'fall_escalation',
    label: 'Silent Fall Escalation',
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
        'STEP 1 (START): GPU fall pose + KY-037 thud spike + LD2410B motionless stillness fire simultaneously.',
      dataRoute:
        'STEP 2 → 3: Sensors → ESP32-S3 USB & CSI Cam → Raspberry Pi 4B 10-second verification state machine.',
      autonomousAction:
        'STEP 4 (END): Triggers red 10s countdown on 7" HUD + 12V piezo siren; if unanswered, dials family + sends Telegram/SMS & EMS address.',
    },
  },
  gas_hazard: {
    id: 'gas_hazard',
    label: 'Gas Leak Reflex',
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
        'STEP 1 (START): MQ-2 combustible LPG/smoke concentration crosses >400 ppm threshold.',
      dataRoute:
        'STEP 2 → 3: MQ-2 Analog ADC → ESP32-S3 Hardware Interrupt → Direct Relay GPIO & USB Serial → RPi 4B.',
      autonomousAction:
        'STEP 4 (END): Energizes Relay CH1 exhaust fan + 12V siren in milliseconds and notifies family over isolated Wi-Fi.',
    },
  },
  power_cut: {
    id: 'power_cut',
    label: 'Monsoon Power Cut',
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
        'STEP 1 → 2 (POWER): Wall mains cuts out; 3S2P 18650 pack (~5,200 mAh) + 3S BMS + XL4015 hold clean 5.1V rails.',
      dataRoute:
        'STEP 2 → 3: INA219 I2C current/voltage telemetry → ESP32-S3 → USB → RPi 4B Battery Gauge.',
      autonomousAction:
        'STEP 4 (END): Zero brownout or reboot — 7" Kiosk HUD keeps guarding vitals and shows live UPS %.',
    },
  },
};

// Primary Spacious 4-Stage Left-to-Right START -> END Topology (x: 40, 420, 800, 1180; 120px row spacing)
export const POSITIONS_PIPELINE: Record<string, { x: number; y: number }> = {
  // COLUMN 1: STEP 1 · START (SENSORS)
  max30102: { x: 40, y: 20 },
  mlx90614: { x: 40, y: 140 },
  ld2410b: { x: 40, y: 260 },
  'mq-gas': { x: 40, y: 380 },
  'multi-sensors': { x: 40, y: 500 },
  'ov5647-gimbal': { x: 40, y: 620 },

  // COLUMN 2: STEP 2 · REFLEX BRAIN & POWER
  'esp32-s3': { x: 420, y: 195 },
  'ups-pack': { x: 420, y: 420 },

  // COLUMN 3: STEP 3 · MAIN BRAIN
  rpi4: { x: 800, y: 270 },

  // COLUMN 4: STEP 4 · END (ACTIONS & OUTPUTS)
  touchscreen: { x: 1180, y: 60 },
  'gpu-laptops': { x: 1180, y: 220 },
  'cloud-gateway': { x: 1180, y: 380 },
  'relays-siren': { x: 1180, y: 540 },
};

// Optional Compact Tiered Topology
export const POSITIONS_DUAL_BRAIN: Record<string, { x: number; y: number }> = {
  max30102: { x: 40, y: 20 },
  mlx90614: { x: 40, y: 140 },
  ld2410b: { x: 40, y: 260 },
  'mq-gas': { x: 40, y: 380 },
  'multi-sensors': { x: 40, y: 500 },
  'ov5647-gimbal': { x: 40, y: 620 },

  'esp32-s3': { x: 420, y: 140 },
  rpi4: { x: 420, y: 340 },
  'ups-pack': { x: 420, y: 525 },

  touchscreen: { x: 820, y: 70 },
  'gpu-laptops': { x: 820, y: 230 },
  'cloud-gateway': { x: 820, y: 390 },
  'relays-siren': { x: 820, y: 550 },
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
    (layoutMode === 'pipeline' ? POSITIONS_PIPELINE : POSITIONS_DUAL_BRAIN);

  const activeNodeSet = new Set(scenario.activeNodes);
  const activeEdgeSet = new Set(scenario.activeEdges);
  const batteryVoltage = (11.1 + (telemetry.batteryPercent / 100) * 1.5).toFixed(1);

  const nodeDefs: Array<{
    id: string;
    data: HardwareNodeBaseData;
  }> = [
    // COLUMN 1: START SENSORS
    {
      id: 'max30102',
      data: {
        title: 'MAX30102',
        subtitle: 'Pulse & SpO₂ Sensor',
        busTag: 'I2C 0x57',
        stepRole: 'START',
        stepBadge: 'START · INPUT',
        imagePath: '/images/components/max30102.jpg',
        iconKey: 'pulse',
        liveMetric: `${telemetry.heartRate} BPM · ${telemetry.spo2}% SpO₂`,
        sourceDesc: `MAX30102 optical pulse oximeter currently reading ${telemetry.heartRate} BPM and ${telemetry.spo2}% SpO₂.`,
        routeDesc: 'MAX30102 → I2C Bus → ESP32-S3 → USB Serial → Raspberry Pi 4B → 7" Kiosk HUD.',
        actionDesc: 'Streams 60 FPS optical PPG pulse waveforms and verifies personal baseline thresholds.',
      },
    },
    {
      id: 'mlx90614',
      data: {
        title: 'MLX90614',
        subtitle: 'IR Body Temp Optic',
        busTag: 'SMBus I2C',
        stepRole: 'START',
        stepBadge: 'START · INPUT',
        imagePath: '/images/components/mlx90614.jpg',
        iconKey: 'temp',
        liveMetric: `${telemetry.bodyTempF.toFixed(1)}°F`,
        sourceDesc: `MLX90614 medical IR thermopile measuring ${telemetry.bodyTempF.toFixed(1)}°F contactless.`,
        routeDesc: 'MLX90614 → SMBus I2C (0x5A) → ESP32-S3 → USB Serial → RPi 4B HUD.',
        actionDesc: 'Captures hygiene-friendly forehead temperature during daily check-ins.',
      },
    },
    {
      id: 'ld2410b',
      data: {
        title: 'HLK-LD2410B',
        subtitle: '24GHz Breathing Radar',
        busTag: 'UART 256k',
        stepRole: 'START',
        stepBadge: 'START · INPUT',
        imagePath: '/images/components/ld2410.jpg',
        iconKey: 'radar',
        liveMetric:
          telemetry.radarState === 'PRESENT_STILL'
            ? 'Still / Breathing'
            : telemetry.radarState === 'MOVING'
              ? 'Active Motion'
              : 'Bed Empty Night',
        sourceDesc: `HLK-LD2410B 24GHz mmWave radar reporting "${telemetry.radarState}".`,
        routeDesc: 'HLK-LD2410B → High-speed UART → ESP32-S3 → USB Serial → RPi 4B.',
        actionDesc: 'Detects stationary chest respiration in dark rooms and bathroom absence timeouts.',
      },
    },
    {
      id: 'mq-gas',
      data: {
        title: 'MQ-2 & MQ-135',
        subtitle: 'LPG Gas & Air Quality',
        busTag: 'Analog ADC',
        stepRole: 'START',
        stepBadge: 'START · INPUT',
        imagePath: '/images/components/mq2.jpg',
        iconKey: 'gas',
        liveMetric: `${telemetry.lpgPpm} ppm · ${telemetry.airQuality}`,
        sourceDesc: `MQ-2 & MQ-135 sensors reading ${telemetry.lpgPpm} ppm (${telemetry.airQuality} air).`,
        routeDesc: 'MQ-2 / MQ-135 → Analog ADC → ESP32-S3 Interrupt → Relay GPIO + RPi 4B Hazard HUD.',
        actionDesc: 'Engages Relay CH1 exhaust fan and 12V siren immediately above 400 ppm.',
      },
    },
    {
      id: 'multi-sensors',
      data: {
        title: 'KY-037 + MPU-6050 + DHT22',
        subtitle: 'Thud, Tilt & Climate',
        busTag: 'I2C / ADC',
        stepRole: 'START',
        stepBadge: 'START · INPUT',
        imagePath: '/images/components/mpu6050.jpg',
        iconKey: 'sensors',
        liveMetric: `${telemetry.roomTempC}°C · ${telemetry.humidity}% RH`,
        sourceDesc: `Acoustic fall thud (KY-037), 6-axis enclosure IMU (MPU-6050), and climate (DHT22 ${telemetry.roomTempC}°C).`,
        routeDesc: 'KY-037 / MPU-6050 / DHT22 → ESP32-S3 → USB Serial → RPi 4B.',
        actionDesc: 'Detects sudden floor impact thuds, hub knock-over tilt, and room heat spikes.',
      },
    },
    {
      id: 'ov5647-gimbal',
      data: {
        title: 'OV5647 Cam + Gimbal',
        subtitle: '1080p @ 30 FPS Vision',
        busTag: 'CSI + PWM',
        stepRole: 'START',
        stepBadge: 'START · INPUT',
        imagePath: '/images/components/ov5647.jpg',
        iconKey: 'camera',
        liveMetric: 'Local 1080p 30 FPS',
        sourceDesc: 'Wide-angle OV5647 camera on silent 2-axis 28BYJ-48 stepper turret.',
        routeDesc: 'OV5647 → MIPI-CSI Ribbon → RPi 4B (Stream) · ESP32-S3 → Gimbal Stepper PWM.',
        actionDesc: 'Feeds local Gigabit LAN AI pose/fall inference and family face recognition.',
      },
    },

    // COLUMN 2: STEP 2 REFLEX BRAIN & POWER
    {
      id: 'esp32-s3',
      data: {
        title: 'ESP32-S3-DevKitC-1',
        subtitle: 'Reflex MCU · 10Hz Polling',
        busTag: 'USB + GPIO',
        stepRole: 'STEP_2',
        stepBadge: 'STEP 2 · REFLEX',
        imagePath: '/images/components/esp32s3.jpg',
        iconKey: 'esp32',
        liveMetric: 'Always-On Reflex Loop',
        sourceDesc: 'ESP32-S3 N16R8 real-time reflex brain sampling all physical sensors @ 10Hz.',
        routeDesc: 'Sensors → ESP32-S3 ↔ USB Serial ↔ Raspberry Pi 4B (plus direct Relay/Siren GPIO).',
        actionDesc: 'Guarantees instant gas & siren reflexes with zero OS or Wi-Fi dependency.',
      },
    },
    {
      id: 'ups-pack',
      data: {
        title: '3S2P Li-Ion UPS + INA219',
        subtitle: '5,200 mAh · XL4015 5.1V Rail',
        busTag: 'I2C + 5.1V',
        stepRole: 'STEP_2',
        stepBadge: 'STEP 2 · POWER',
        imagePath: '/images/components/xl4015.jpg',
        iconKey: 'ups',
        liveMetric: `${telemetry.acMainsConnected ? 'AC + ' : 'UPS '}${telemetry.batteryPercent}% (${batteryVoltage}V)`,
        sourceDesc: `3S2P 18650 pack + 3S 20A BMS + XL4015 5A buck + INA219 (${telemetry.batteryPercent}%).`,
        routeDesc: '3S2P Li-Ion → XL4015 5.1V Buck → Clean Zero-Reboot Power Rails + INA219 I2C Telemetry.',
        actionDesc: 'Eliminates Indian power-cut brownouts and reports live battery % to the 7" display.',
      },
    },

    // COLUMN 3: STEP 3 MAIN BRAIN
    {
      id: 'rpi4',
      data: {
        title: 'Raspberry Pi 4 Model B (4GB)',
        subtitle: 'HUD, Voice & Escalation Core',
        busTag: '4GB ARM SBC',
        stepRole: 'STEP_3',
        stepBadge: 'STEP 3 · MAIN',
        iconKey: 'rpi4',
        liveMetric: '60 FPS Engine + LAN',
        sourceDesc: 'Raspberry Pi 4 Model B (4GB) orchestrating 60 FPS kiosk HUD, neural TTS voice, and escalation logic.',
        routeDesc: 'ESP32-S3 USB + OV5647 CSI → Raspberry Pi 4B → 7" Display, Cat6 LAN & Emergency Wi-Fi.',
        actionDesc: 'Runs age-adaptive elderly HUD, plays EN/HI/BN speech prompts, and manages 10s emergency verification.',
      },
    },

    // COLUMN 4: STEP 4 END ACTIONS & OUTPUTS
    {
      id: 'touchscreen',
      data: {
        title: '7-Inch Touch Display (1024×600)',
        subtitle: 'Live Elderly HUD + Voice',
        busTag: 'HDMI + USB',
        stepRole: 'END',
        stepBadge: 'END · OUTPUT',
        imagePath: '/images/components/display.jpg',
        iconKey: 'screen',
        liveMetric: '1024×600 IPS 60 FPS',
        sourceDesc: 'Waveshare 7-inch 1024×600 capacitive IPS touchscreen + 0.5W speaker.',
        routeDesc: 'Raspberry Pi 4B → HDMI Video & Audio → 7-Inch Display + Touch HID Return.',
        actionDesc: 'Adapts structurally to Age 50 vs Age 78 and rings scheduled care/emergency prompts.',
      },
    },
    {
      id: 'gpu-laptops',
      data: {
        title: 'Local GPU Laptops (Cat6 LAN)',
        subtitle: '1080p @ 30 FPS Pose AI · Local',
        busTag: 'Cat6 Gigabit',
        stepRole: 'END',
        stepBadge: 'END · OUTPUT',
        iconKey: 'laptop',
        liveMetric: '100% Local LAN',
        sourceDesc: 'Shielded wired Cat6 Gigabit Ethernet feeding exhibition/home GPU laptops.',
        routeDesc: 'Raspberry Pi 4B ↔ Cat6 Wired Gigabit Ethernet ↔ Local GPU Laptops.',
        actionDesc: 'Runs private local skeleton fall inference with zero video leaving the house.',
      },
    },
    {
      id: 'cloud-gateway',
      data: {
        title: 'Emergency Phone / SMS / EMS',
        subtitle: 'Isolated Wi-Fi · Alert Only',
        busTag: 'Emergency Only',
        stepRole: 'END',
        stepBadge: 'END · OUTPUT',
        iconKey: 'cloud',
        liveMetric: 'Standby Until Stage 2+',
        sourceDesc: 'Isolated outbound alert link triggered strictly after 10s countdown expiry.',
        routeDesc: 'Raspberry Pi 4B → Isolated Wi-Fi → Child Call + SMS + Telegram 5s Snapshot + EMS Pin.',
        actionDesc: 'Delivers live vitals, snapshot, and exact street address to family & emergency responders.',
      },
    },
    {
      id: 'relays-siren',
      data: {
        title: '4-Ch Relay + Fan + 12V Siren',
        subtitle: 'Instant Local Hardware Reflex',
        busTag: 'GPIO + 12V',
        stepRole: 'END',
        stepBadge: 'END · OUTPUT',
        iconKey: 'relay',
        liveMetric: telemetry.exhaustFanRelay ? 'FAN RELAY ON' : 'Armed Standby',
        sourceDesc: 'Optocoupled 4-Channel 5V Relay + Exhaust Fan + 12V Piezo Siren.',
        routeDesc: 'ESP32-S3 Direct Reflex GPIO → Relay CH1 Ventilation & 12V Piezo Acoustic Siren.',
        actionDesc: 'Evacuates gas leaks and sounds bedside countdown siren with zero cloud latency.',
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
        label: `I2C · ${telemetry.heartRate} BPM`,
        protocol: 'I2C Bus (0x57)',
        fast: true,
        labelOffsetX: -38,
        labelOffsetY: -10,
        sourceDesc: 'MAX30102 optical PPG sensor capturing HR & SpO₂.',
        routeDesc: 'MAX30102 → I2C Bus → ESP32-S3.',
        actionDesc: 'Samples red/IR PPG pulse waves for vitals check-in.',
      },
    },
    {
      id: 'e-mlx-esp',
      source: 'mlx90614',
      target: 'esp32-s3',
      data: {
        label: `SMBus · ${telemetry.bodyTempF.toFixed(1)}°F`,
        protocol: 'SMBus I2C (0x5A)',
        labelOffsetX: -35,
        labelOffsetY: -6,
        sourceDesc: 'MLX90614 IR body temp sensor.',
        routeDesc: 'MLX90614 → SMBus I2C → ESP32-S3.',
        actionDesc: 'Reads contactless forehead temperature.',
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
        labelOffsetX: -38,
        labelOffsetY: 4,
        sourceDesc: 'HLK-LD2410B mmWave radar.',
        routeDesc: 'HLK-LD2410B → UART → ESP32-S3.',
        actionDesc: 'Detects breathing stillness or night bed absence.',
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
        labelOffsetX: -36,
        labelOffsetY: 12,
        sourceDesc: 'MQ-2 LPG/smoke & MQ-135 sensors.',
        routeDesc: 'MQ-2 / MQ-135 → ADC → ESP32-S3.',
        actionDesc: 'Trips gas hazard interrupt above 400 ppm.',
      },
    },
    {
      id: 'e-multi-esp',
      source: 'multi-sensors',
      target: 'esp32-s3',
      data: {
        label: 'I2C/ADC · Thud & Climate',
        protocol: 'I2C + GPIO',
        labelOffsetX: -34,
        labelOffsetY: 18,
        sourceDesc: 'KY-037 thud mic, MPU-6050 IMU & DHT22 climate.',
        routeDesc: 'Sensors → I2C/ADC → ESP32-S3.',
        actionDesc: 'Flags fall impact thuds and unit knock-over tilt.',
      },
    },
    {
      id: 'e-esp-gimbal',
      source: 'esp32-s3',
      target: 'ov5647-gimbal',
      sourceHandle: 'bottom-source',
      targetHandle: 'right-target',
      data: {
        label: 'PWM · Gimbal Aim',
        protocol: 'ULN2003 Stepper PWM',
        labelOffsetX: -20,
        labelOffsetY: -12,
        sourceDesc: 'Tracking offset sent to ESP32-S3.',
        routeDesc: 'ESP32-S3 → PWM → 28BYJ-48 Pan/Tilt Gimbal.',
        actionDesc: 'Aim OV5647 camera silently toward subject.',
      },
    },
    {
      id: 'e-ups-esp',
      source: 'ups-pack',
      target: 'esp32-s3',
      sourceHandle: 'top-source',
      targetHandle: 'bottom-target',
      data: {
        label: '5.1V Rail + INA219',
        protocol: 'XL4015 5.1V + I2C',
        labelOffsetX: 54,
        labelOffsetY: 0,
        sourceDesc: '3S2P UPS regulated 5.1V rail & INA219 gauge.',
        routeDesc: '3S2P UPS → 5.1V Power & INA219 I2C → ESP32-S3.',
        actionDesc: 'Prevents power-cut brownouts.',
      },
    },
    {
      id: 'e-ov-rpi',
      source: 'ov5647-gimbal',
      target: 'rpi4',
      sourceHandle: 'right-source',
      targetHandle: 'bottom-target',
      data: {
        label: 'MIPI-CSI · 1080p 30 FPS',
        protocol: '15-pin MIPI-CSI',
        fast: true,
        labelOffsetX: 70,
        labelOffsetY: 18,
        sourceDesc: 'OV5647 CSI-2 optical sensor.',
        routeDesc: 'OV5647 → MIPI-CSI Ribbon → Raspberry Pi 4B.',
        actionDesc: 'Feeds local GPU LAN stream & family recognition.',
      },
    },
    {
      id: 'e-esp-rpi',
      source: 'esp32-s3',
      target: 'rpi4',
      data: {
        label: 'USB Serial · 10 Hz JSON',
        protocol: 'USB-UART Bridge',
        bidirectional: true,
        fast: true,
        labelOffsetY: -14,
        sourceDesc: 'Single USB bridge linking Reflex & Interface Brains.',
        routeDesc: 'ESP32-S3 ↔ USB Serial ↔ Raspberry Pi 4B.',
        actionDesc: 'Carries fused telemetry packets and gimbal commands.',
      },
    },
    {
      id: 'e-ups-rpi',
      source: 'ups-pack',
      target: 'rpi4',
      data: {
        label: `5.1V Bus · ${telemetry.batteryPercent}%`,
        protocol: 'XL4015 5A Regulated',
        labelOffsetY: 14,
        sourceDesc: 'Clean 5.1V 5A UPS rail to Raspberry Pi 4B.',
        routeDesc: '3S2P UPS + XL4015 → Raspberry Pi 4B & 7" Screen.',
        actionDesc: 'Zero-reboot failover through Indian grid outages.',
      },
    },
    {
      id: 'e-esp-relay',
      source: 'esp32-s3',
      target: 'relays-siren',
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      data: {
        label: telemetry.exhaustFanRelay ? 'GPIO · FAN + SIREN ON' : 'GPIO · Relay & Siren',
        protocol: 'Direct Safety GPIO',
        fast: true,
        labelOffsetX: 48,
        labelOffsetY: 16,
        sourceDesc: 'ESP32-S3 autonomous reflex interrupt.',
        routeDesc: 'ESP32-S3 → Direct Opto-Relay GPIO → Exhaust Fan & 12V Siren.',
        actionDesc: 'Fires local siren & exhaust fan even without Wi-Fi.',
      },
    },
    {
      id: 'e-rpi-hud',
      source: 'rpi4',
      target: 'touchscreen',
      data: {
        label: 'HDMI + Touch · 60 FPS UI',
        protocol: 'HDMI + USB HID',
        fast: true,
        labelOffsetX: 24,
        labelOffsetY: -12,
        sourceDesc: 'RPi 4B UI compositor & neural voice output.',
        routeDesc: 'Raspberry Pi 4B → HDMI/Audio ↔ 7" IPS Touchscreen.',
        actionDesc: 'Renders Age 50 / Age 78 HUD and speaks alerts.',
      },
    },
    {
      id: 'e-rpi-lan',
      source: 'rpi4',
      target: 'gpu-laptops',
      data: {
        label: 'Cat6 LAN · 30 FPS Pose AI',
        protocol: 'Wired Gigabit Ethernet',
        bidirectional: true,
        fast: true,
        labelOffsetX: 28,
        labelOffsetY: -10,
        sourceDesc: 'Local-only Cat6 Gigabit camera stream.',
        routeDesc: 'Raspberry Pi 4B ↔ Cat6 LAN ↔ Local GPU Laptops.',
        actionDesc: 'Runs local fall-pose detection with zero cloud video.',
      },
    },
    {
      id: 'e-rpi-cloud',
      source: 'rpi4',
      target: 'cloud-gateway',
      data: {
        label: 'Isolated Wi-Fi · Alert Only',
        protocol: 'Emergency Wi-Fi Lane',
        fast: true,
        labelOffsetX: 26,
        labelOffsetY: 10,
        sourceDesc: 'Escalation Stage 2+ emergency dispatch.',
        routeDesc: 'Raspberry Pi 4B → Isolated Wi-Fi → Phone / SMS / Telegram / EMS.',
        actionDesc: 'Dispatches alerts, live vitals, and home pin on silence.',
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
