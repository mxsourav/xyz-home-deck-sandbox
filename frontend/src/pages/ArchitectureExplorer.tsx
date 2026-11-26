import { useCallback, useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  ArrowCounterClockwise,
  BatteryChargingVertical,
  BellRinging,
  Broadcast,
  Fire,
  Heartbeat,
  Laptop,
  MoonStars,
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

export function ArchitectureExplorer() {
  const {
    telemetry,
    screenMode,
    escalationStage,
    isMuted,
    setScreenModeManual,
    startVitalsCheckIn,
    triggerFallScenario,
    triggerGasLeakScenario,
    toggleAcMains,
    resetHealthyBaseline,
  } = useSandbox();

  const [activeScenario, setActiveScenario] =
    useState<FlowScenarioId>('vitals_checkin');
  const [selectedEntity, setSelectedEntity] =
    useState<SelectedFlowEntity | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Sync audio siren cleanly while on Architecture Explorer
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

  // Automatically sync graph flow & live narrator whenever user interacts directly with the 7-inch Kiosk Display
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
    if (screenMode === 'VITALS') {
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

    // Ensure AC mains state matches non-outage vs outage scenarios cleanly
    if (scenarioId === 'power_cut') {
      if (telemetry.acMainsConnected) {
        toggleAcMains();
      }
      setScreenModeManual('STANDBY');
      return;
    }

    if (!telemetry.acMainsConnected) {
      toggleAcMains();
    }

    if (scenarioId === 'night_radar' || scenarioId === 'lan_stream') {
      if (screenMode !== 'STANDBY') {
        setScreenModeManual('STANDBY');
      }
    } else if (scenarioId === 'vitals_checkin') {
      startVitalsCheckIn();
    } else if (scenarioId === 'fall_escalation') {
      triggerFallScenario();
    } else if (scenarioId === 'gas_hazard') {
      triggerGasLeakScenario();
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--accent-blue)',
                marginBottom: '4px',
              }}
            >
              System Flow · Movable Architecture Graph &amp; Live 7-Inch Display Sync
            </div>
            <h1 style={{ fontSize: '23px', fontWeight: 800 }}>
              Interactive Hardware Topology &amp; Live Data-Flow Visualizer
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

      {/* Main 62% Movable Graph / 38% Live 7-Inch Screen + Narrator Layout */}
      <div className="arch-explorer-grid">
        {/* LEFT PANEL (62%): Movable @xyflow/react Architecture Graph */}
        <ReactFlowProvider>
          <ArchitectureFlowCanvas
            scenarioId={activeScenario}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectEntity={handleSelectEntity}
          />
        </ReactFlowProvider>

        {/* RIGHT PANEL (38%): Live 7-Inch Display + "What Is Happening Right Now" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <KioskDeviceScreen compactPreview showEscalationStrip={false} />

          {/* "What Is Happening Right Now" 3-Step Telemetry Narrator */}
          <section
            className="clinical-card"
            style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
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
                <h2 style={{ fontSize: '16px', fontWeight: 800 }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                className="clinical-subtle-panel"
                style={{ padding: '11px 13px' }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent-blue)',
                    marginBottom: '3px',
                  }}
                >
                  1. Trigger &amp; Source Sensor
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                  {selectedEntity
                    ? selectedEntity.sourceDesc
                    : currentScenarioMeta.narrator.triggerSource}
                </p>
              </div>

              <div
                className="clinical-subtle-panel"
                style={{ padding: '11px 13px' }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent-emerald)',
                    marginBottom: '3px',
                  }}
                >
                  2. Data Route &amp; Bus
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                  {selectedEntity
                    ? selectedEntity.routeDesc
                    : currentScenarioMeta.narrator.dataRoute}
                </p>
              </div>

              <div
                className="clinical-subtle-panel"
                style={{ padding: '11px 13px' }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent-amber)',
                    marginBottom: '3px',
                  }}
                >
                  3. Autonomous Action &amp; Screen Response
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                  {selectedEntity
                    ? selectedEntity.actionDesc
                    : currentScenarioMeta.narrator.autonomousAction}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
