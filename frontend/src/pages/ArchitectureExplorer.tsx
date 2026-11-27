import { useCallback, useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  ArrowCounterClockwise,
  BatteryChargingVertical,
  BellRinging,
  Broadcast,
  CheckCircle,
  Fire,
  Heartbeat,
  Laptop,
  MoonStars,
  ShieldCheck,
} from '@phosphor-icons/react';
import {
  ArchitectureFlowCanvas,
  type SelectedFlowEntity,
} from '../components/ArchitectureFlowCanvas';
import { KioskDeviceScreen } from '../components/KioskDeviceScreen';
import { ProfileRecognitionSwitcher } from '../components/ProfileRecognitionSwitcher';
import { useSandbox } from '../context/SandboxContext';
import {
  SCENARIO_DEFINITIONS,
  type FlowScenarioId,
} from '../data/architectureTopology';
import { audioEngine } from '../utils/audioEngine';

const SCENARIO_BUTTONS: {
  id: FlowScenarioId;
  icon: React.ReactNode;
}[] = [
  { id: 'night_radar', icon: <MoonStars size={14} weight="duotone" /> },
  { id: 'vitals_checkin', icon: <Heartbeat size={14} weight="duotone" /> },
  { id: 'lan_stream', icon: <Laptop size={14} weight="duotone" /> },
  { id: 'fall_escalation', icon: <BellRinging size={14} weight="duotone" /> },
  { id: 'gas_hazard', icon: <Fire size={14} weight="duotone" /> },
  {
    id: 'power_cut',
    icon: <BatteryChargingVertical size={14} weight="duotone" />,
  },
];

const SYSTEM_STATE_RULES = [
  {
    category: '24/7 Always-On Safety Sensors',
    modules: 'LD2410B, MQ-2, MQ-135, KY-037, MPU-6050, DHT22, INA219',
    badge: 'ON · 24/7',
    tone: 'emerald',
    rule: 'Always awake day & night; never sleep during Night Radar Watch or AC Power Cuts.',
  },
  {
    category: 'Human-Proximity Vitals Sensors',
    modules: 'MAX30102 (HR + SpO₂), MLX90614 (IR Body Temp)',
    badge: 'STANDBY → ON',
    tone: 'blue',
    rule: 'Stay in STANDBY to save power until the elder places a finger or approaches for Daily Vitals Check-In.',
  },
  {
    category: 'Night Privacy Camera Rule',
    modules: 'OV5647 Wide-Angle Camera + 28BYJ-48 Gimbal',
    badge: 'NIGHT PRIVACY',
    tone: 'blue',
    rule: 'Sleeps respectfully in STANDBY during bedroom Night Watch while 24GHz Radar tracks breathing; wakes on fall trigger or LAN stream.',
  },
  {
    category: 'Dual-Rail Power Continuity',
    modules: '12.6V 2A Wall Adapter + 3S2P Li-Ion UPS (BMS + XL4015)',
    badge: '0 ms FAILOVER',
    tone: 'amber',
    rule: '12.6V Adapter powers the hub & float-charges UPS normally; 3S2P UPS takes over instantaneously on AC power cut.',
  },
  {
    category: 'Zero-Cloud Privacy Guarantee',
    modules: 'Isolated Outbound Wi-Fi Alert Gateway',
    badge: 'OFF → ALERT ONLY',
    tone: 'crimson',
    rule: 'Strictly OFF (0 cloud traffic) during normal hours; activates only during verified Stage 2–4 emergencies or gas leaks.',
  },
] as const;

export function ArchitectureExplorer() {
  const {
    telemetry,
    screenMode,
    escalationStage,
    isMuted,
    resetHealthyBaseline,
    applyFlowScenario,
  } = useSandbox();

  const [activeScenario, setActiveScenario] =
    useState<FlowScenarioId>('vitals_checkin');
  const [selectedEntity, setSelectedEntity] =
    useState<SelectedFlowEntity | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  useEffect(() => {
    const shouldSirenPlay =
      !isMuted &&
      ((screenMode === 'EMERGENCY' && escalationStage === 1) ||
        screenMode === 'HAZARD');

    if (shouldSirenPlay) {
      audioEngine.startSiren();
    } else {
      audioEngine.stopSiren();
    }
  }, [screenMode, escalationStage, isMuted]);

  useEffect(() => {
    return () => {
      audioEngine.stopSiren();
      audioEngine.cancelSpeech();
    };
  }, []);

  useEffect(() => {
    setSelectedEntity(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    if (screenMode === 'EMERGENCY') {
      setActiveScenario('fall_escalation');
      return;
    }
    if (screenMode === 'HAZARD') {
      setActiveScenario('gas_hazard');
      return;
    }
    if (
      screenMode === 'VITALS' ||
      screenMode === 'CARE_PLAN' ||
      screenMode === 'SETUP'
    ) {
      setActiveScenario('vitals_checkin');
      return;
    }
    if (!telemetry.acMainsConnected) {
      setActiveScenario('power_cut');
      return;
    }
    setActiveScenario((prev) =>
      prev === 'lan_stream' ? 'lan_stream' : 'night_radar'
    );
  }, [screenMode, telemetry.acMainsConnected]);

  const handleSelectScenario = (scenarioId: FlowScenarioId) => {
    setSelectedEntity(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setActiveScenario(scenarioId);
    applyFlowScenario(scenarioId);
  };

  const handleSelectEntity = useCallback(
    (
      entity: SelectedFlowEntity,
      nodeId: string | null,
      edgeId: string | null
    ) => {
      setSelectedEntity(entity);
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(edgeId);
    },
    []
  );

  const currentScenarioMeta = SCENARIO_DEFINITIONS[activeScenario];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header + Scenario Selector Bar */}
      <section
        className="clinical-card"
        style={{
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent-blue)',
                marginBottom: '4px',
              }}
            >
              System Flow · 24/7 Sensor &amp; Dual-Power Logic + True 7-Inch Display Sync
            </div>
            <h1 style={{ fontSize: '23px', fontWeight: 800 }}>
              Interactive Hardware Topology, State Rules &amp; 1024×600 Kiosk
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <ProfileRecognitionSwitcher />
            <button
              type="button"
              onClick={() => {
                resetHealthyBaseline();
                setSelectedEntity(null);
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setActiveScenario('night_radar');
              }}
              className="btn-secondary"
              style={{ fontSize: '12.5px' }}
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              <span>Reset Flow</span>
            </button>
          </div>
        </div>

        {/* 6 Live Scenario Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-hairline)',
          }}
        >
          {SCENARIO_BUTTONS.map((btn) => {
            const meta = SCENARIO_DEFINITIONS[btn.id];
            const isActive = activeScenario === btn.id;
            const activeBg =
              meta.tone === 'crimson'
                ? 'var(--accent-crimson)'
                : meta.tone === 'amber'
                  ? 'var(--accent-amber)'
                  : meta.tone === 'emerald'
                    ? 'var(--accent-emerald)'
                    : 'var(--accent-blue)';

            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleSelectScenario(btn.id)}
                className={isActive ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '6px 11px',
                  fontSize: '12.5px',
                  ...(isActive
                    ? {
                        backgroundColor: activeBg,
                        borderColor: activeBg,
                      }
                    : {}),
                }}
              >
                {btn.icon}
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* MAIN SIDE-BY-SIDE SPLIT: Left (~58%, 680px) Movable Architecture Graph | Right (~42%) Sticky 7-Inch Display + Explainer & Rules */}
      <div className="arch-split-grid">
        {/* LEFT COLUMN (~58%): Movable Light-Mode Architecture Canvas */}
        <div style={{ minWidth: 0 }}>
          <ReactFlowProvider>
            <ArchitectureFlowCanvas
              scenarioId={activeScenario}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              height={620}
              onSelectEntity={handleSelectEntity}
            />
          </ReactFlowProvider>
        </div>

        {/* RIGHT COLUMN (~42%): Live 7-Inch 1024x600 LCD Display + Stacked Explainer & State Rules */}
        <div
          style={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <KioskDeviceScreen showEscalationStrip={false} />

          {/* Live Explainer Card */}
          <section
            className="clinical-card"
            style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Broadcast size={18} weight="duotone" color="var(--accent-blue)" />
                <h2 style={{ fontSize: '15.5px', fontWeight: 800 }}>
                  What Is Happening Right Now
                </h2>
              </div>

              {selectedEntity ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntity(null);
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                  }}
                  className="btn-secondary"
                  style={{ padding: '3px 9px', fontSize: '11.5px' }}
                >
                  Show Active Scenario Flow
                </button>
              ) : (
                <span className={`status-pill ${currentScenarioMeta.tone}`}>
                  {currentScenarioMeta.label}
                </span>
              )}
            </div>

            {selectedEntity ? (
              <div
                className="clinical-subtle-panel"
                style={{ padding: '9px 12px', fontSize: '12.5px' }}
              >
                <strong>
                  Inspecting {selectedEntity.kind === 'node' ? 'Hardware Block' : 'Data Bus'}:
                </strong>{' '}
                {selectedEntity.title} ({selectedEntity.subtitle})
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="clinical-subtle-panel" style={{ padding: '10px 12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent-emerald)',
                    marginBottom: '3px',
                  }}
                >
                  1. Where Data Starts
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--ink-primary)', lineHeight: 1.45 }}>
                  {selectedEntity
                    ? selectedEntity.sourceDesc
                    : currentScenarioMeta.narrator.triggerSource}
                </p>
              </div>

              <div className="clinical-subtle-panel" style={{ padding: '10px 12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent-blue)',
                    marginBottom: '3px',
                  }}
                >
                  2. Which Brain &amp; Wire Carries It
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--ink-primary)', lineHeight: 1.45 }}>
                  {selectedEntity
                    ? selectedEntity.routeDesc
                    : currentScenarioMeta.narrator.dataRoute}
                </p>
              </div>

              <div className="clinical-subtle-panel" style={{ padding: '10px 12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--accent-amber)',
                    marginBottom: '3px',
                  }}
                >
                  3. Final Action on Screen / Room
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--ink-primary)', lineHeight: 1.45 }}>
                  {selectedEntity
                    ? selectedEntity.actionDesc
                    : currentScenarioMeta.narrator.autonomousAction}
                </p>
              </div>
            </div>
          </section>

          {/* Hardware ON / STANDBY / OFF State Rules Reference Card */}
          <section
            className="clinical-card"
            style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ShieldCheck size={18} weight="duotone" color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '15px', fontWeight: 800 }}>
                  Hardware ON / STANDBY / OFF State Rules
                </h2>
              </div>
              <span className="status-pill emerald" style={{ fontSize: '10.5px' }}>
                <CheckCircle size={12} weight="fill" />
                <span>24/7 Safety Verified</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SYSTEM_STATE_RULES.map((row) => (
                <div
                  key={row.category}
                  className="clinical-subtle-panel"
                  style={{
                    padding: '9px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                      {row.category}
                    </span>
                    <span className={`status-pill ${row.tone}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {row.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    {row.modules}
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                    {row.rule}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
