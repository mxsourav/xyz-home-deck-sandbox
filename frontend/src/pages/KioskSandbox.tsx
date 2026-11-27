import { useEffect } from 'react';
import {
  ArrowsCounterClockwise,
  BatteryChargingVertical,
  BellRinging,
  Fan,
  Fire,
  Heartbeat,
  MoonStars,
  Plug,
  Thermometer,
  Wind,
} from '@phosphor-icons/react';
import { AiSandboxEvaluator } from '../components/AiSandboxEvaluator';
import { KioskDeviceScreen } from '../components/KioskDeviceScreen';
import { ProfileRecognitionSwitcher } from '../components/ProfileRecognitionSwitcher';
import {
  useSandbox,
  type RadarPresenceState,
  type TofPostureState,
} from '../context/SandboxContext';
import { audioEngine } from '../utils/audioEngine';

export function KioskSandbox() {
  const {
    elderProfile,
    telemetry,
    screenMode,
    escalationStage,
    isMuted,
    eventLog,
    updateHeartRate,
    updateSpo2,
    updateBodyTempF,
    updateLpgPpm,
    updateRadarState,
    toggleAcMains,
    updateTofPosture,
    triggerFallScenario,
    triggerBedAbsenceScenario,
    triggerGasLeakScenario,
    resetHealthyBaseline,
  } = useSandbox();

  const tofMinCm = Math.min(...telemetry.tofZoneDistancesCm);
  const tofMaxCm = Math.max(...telemetry.tofZoneDistancesCm);

  // Sync Web Audio piezo siren cleanly with Emergency Stage 1 & Gas Hazard state
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

  // Stop active siren cleanly if user navigates away from the sandbox route
  useEffect(() => {
    return () => {
      audioEngine.stopSiren();
      audioEngine.cancelSpeech();
    };
  }, []);

  const bodyTempC = ((telemetry.bodyTempF - 32) * (5 / 9)).toFixed(1);
  const batteryVoltage = (11.1 + (telemetry.batteryPercent / 100) * 1.5).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Concise Page Header */}
      <section
        className="clinical-card"
        style={{
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
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
            Kiosk Sandbox · 60 FPS Touch HUD &amp; Offline Web Audio
          </div>
          <h1 style={{ fontSize: '23px', fontWeight: 800 }}>
            7-Inch Capacitive Kiosk Simulator &amp; Manual Sensor Overrides
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ProfileRecognitionSwitcher />
          <button
            type="button"
            onClick={resetHealthyBaseline}
            className="btn-secondary"
          >
            <ArrowsCounterClockwise size={15} weight="bold" />
            <span>Reset All to Healthy Baseline</span>
          </button>
        </div>
      </section>

      {/* Centered 7-Inch 1024x600 Hardware Simulator */}
      <div style={{ width: '100%', maxWidth: '1024px', margin: '0 auto' }}>
        <KioskDeviceScreen />
      </div>

      {/* Centered Two-Column Telemetry Controls & AI Evaluator Directly Below LCD */}
      <div className="sandbox-grid">
        {/* LEFT COLUMN: Manual Sensor Override, Power Cut & Scenarios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Manual Telemetry Sliders */}
          <div className="clinical-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>
                Manual Sensor Overrides
              </h2>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Auto-triggers on breach
              </span>
            </div>

            {/* Heart Rate (MAX30102) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label
                  htmlFor="slider-hr"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                >
                  <Heartbeat size={15} weight="duotone" color="var(--accent-emerald)" />
                  <span>Heart Rate (MAX30102)</span>
                </label>
                <span className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 700 }}>
                  {telemetry.heartRate} BPM
                </span>
              </div>
              <input
                id="slider-hr"
                type="range"
                min={40}
                max={160}
                step={1}
                value={telemetry.heartRate}
                onChange={(e) => updateHeartRate(Number(e.target.value))}
                className="clinical-slider"
              />
              <div className="tabular-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '3px' }}>
                <span>40 BPM</span>
                <span>
                  Baseline: {elderProfile.baseline.hrMin}–{elderProfile.baseline.hrMax} BPM
                </span>
                <span>160 BPM</span>
              </div>
            </div>

            {/* SpO2 (MAX30102) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label
                  htmlFor="slider-spo2"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                >
                  <Wind size={15} weight="duotone" color="var(--accent-blue)" />
                  <span>Blood Oxygen SpO₂ (MAX30102)</span>
                </label>
                <span className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 700 }}>
                  {telemetry.spo2}%
                </span>
              </div>
              <input
                id="slider-spo2"
                type="range"
                min={80}
                max={100}
                step={1}
                value={telemetry.spo2}
                onChange={(e) => updateSpo2(Number(e.target.value))}
                className="clinical-slider"
              />
              <div className="tabular-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '3px' }}>
                <span>80%</span>
                <span>Baseline min: ≥{elderProfile.baseline.spo2Min}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Body Temperature (MLX90614) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label
                  htmlFor="slider-temp"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                >
                  <Thermometer size={15} weight="duotone" color="var(--accent-amber)" />
                  <span>Body Temp (MLX90614)</span>
                </label>
                <span className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 700 }}>
                  {telemetry.bodyTempF.toFixed(1)}°F ({bodyTempC}°C)
                </span>
              </div>
              <input
                id="slider-temp"
                type="range"
                min={95.0}
                max={104.0}
                step={0.1}
                value={telemetry.bodyTempF}
                onChange={(e) => updateBodyTempF(Number(e.target.value))}
                className="clinical-slider"
              />
              <div className="tabular-nums" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '3px' }}>
                <span>95.0°F</span>
                <span>Baseline max: ≤{elderProfile.baseline.tempMax}°F</span>
                <span>104.0°F</span>
              </div>
            </div>

            {/* LPG / Smoke (MQ-2) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label
                  htmlFor="slider-lpg"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                >
                  <Fire size={15} weight="duotone" color="var(--accent-crimson)" />
                  <span>LPG / Smoke Gas (MQ-2)</span>
                </label>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: telemetry.lpgPpm > 400 ? 'var(--accent-crimson)' : 'var(--ink-primary)',
                  }}
                >
                  {telemetry.lpgPpm} ppm
                </span>
              </div>
              <input
                id="slider-lpg"
                type="range"
                min={0}
                max={1000}
                step={10}
                value={telemetry.lpgPpm}
                onChange={(e) => updateLpgPpm(Number(e.target.value))}
                className="clinical-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                <span>0 ppm</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: telemetry.exhaustFanRelay ? 'var(--accent-crimson)' : 'var(--ink-muted)' }}>
                  <Fan size={12} weight="duotone" />
                  <span>Relay CH1 (&gt;400 ppm): {telemetry.exhaustFanRelay ? 'ON' : 'OFF'}</span>
                </span>
                <span>1000 ppm</span>
              </div>
            </div>

            {/* Radar Presence Selector */}
            <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                24GHz Radar State (HLK-LD2410B)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                {(
                  [
                    { id: 'PRESENT_STILL', label: 'Present Still' },
                    { id: 'MOVING', label: 'Moving' },
                    { id: 'BED_EMPTY_NIGHT', label: 'Bed Empty' },
                  ] as { id: RadarPresenceState; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateRadarState(item.id)}
                    className={telemetry.radarState === item.id ? 'btn-primary' : 'btn-secondary'}
                    style={{ justifyContent: 'center', padding: '5px 8px', fontSize: '11.5px' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {/* VL53L5CX 64-Zone Depth Silhouette */}
            <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                  VL53L5CX 64-Zone Privacy Silhouette · I2C 0x52
                </div>
                <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                  {tofMinCm}–{tofMaxCm} cm
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                  gap: '3px',
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
                aria-label="VL53L5CX 8x8 depth grid"
              >
                {telemetry.tofZoneDistancesCm.map((cm, idx) => {
                  // darker slate = closer body, pale slate = far wall
                  const depth = Math.max(0, Math.min(1, 1 - (cm - 30) / 370));
                  const shade = Math.round(24 + depth * 150);
                  return (
                    <span
                      key={idx}
                      title={`Zone ${idx + 1}: ${cm} cm`}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '2px',
                        backgroundColor: `rgb(${shade}, ${shade + 4}, ${shade + 10})`,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', marginTop: '8px' }}>
                {(
                  [
                    { id: 'UPRIGHT', label: 'Upright' },
                    { id: 'IN_BED', label: 'In Bed' },
                    { id: 'BED_EDGE_DROP', label: 'Bed-Edge Drop' },
                    { id: 'FLOOR_SILHOUETTE', label: 'Floor Fall' },
                  ] as { id: TofPostureState; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateTofPosture(item.id)}
                    className={telemetry.tofPostureState === item.id ? 'btn-primary' : 'btn-secondary'}
                    style={{ justifyContent: 'center', padding: '5px 8px', fontSize: '11.5px' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Power Cut Simulator Switch (INA219 / 3S2P UPS) */}
          <div className="clinical-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14.5px', fontWeight: 700 }}>
                  {telemetry.acMainsConnected ? (
                    <Plug size={17} weight="duotone" color="var(--accent-emerald)" />
                  ) : (
                    <BatteryChargingVertical size={17} weight="duotone" color="var(--accent-amber)" />
                  )}
                  <span>Power Cut Simulator (INA219 / 3S2P UPS)</span>
                </div>
                <p className="tabular-nums" style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', marginTop: '3px' }}>
                  {telemetry.acMainsConnected
                    ? `Wall AC Connected · Pack ${telemetry.batteryPercent}% (${batteryVoltage}V)`
                    : `Grid Outage Simulated · Running on UPS ${telemetry.batteryPercent}% (${batteryVoltage}V)`}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleAcMains}
                className={telemetry.acMainsConnected ? 'btn-secondary' : 'btn-primary'}
                style={
                  !telemetry.acMainsConnected
                    ? {
                        backgroundColor: 'var(--accent-amber)',
                        borderColor: 'var(--accent-amber)',
                      }
                    : undefined
                }
              >
                {telemetry.acMainsConnected ? 'Cut Wall Power' : 'Restore AC Mains'}
              </button>
            </div>
          </div>

          {/* One-Click Demo Scenario Buttons */}
          <div className="clinical-card" style={{ padding: '16px 20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
              One-Click Exhibition Scenarios
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              <button
                type="button"
                onClick={triggerFallScenario}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '12.5px', textAlign: 'left', padding: '8px 10px' }}
              >
                <BellRinging size={15} weight="duotone" color="var(--accent-crimson)" style={{ flexShrink: 0 }} />
                <span>Trigger Fall (Pose + Thud)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateTofPosture('FLOOR_SILHOUETTE');
                  triggerFallScenario();
                }}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '12.5px', textAlign: 'left', padding: '8px 10px' }}
              >
                <Wind size={15} weight="duotone" color="var(--accent-crimson)" style={{ flexShrink: 0 }} />
                <span>Trigger Night Floor Fall (ToF 8×8 + Radar — Camera OFF)</span>
              </button>

              <button
                type="button"
                onClick={triggerBedAbsenceScenario}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '12.5px', textAlign: 'left', padding: '8px 10px' }}
              >
                <MoonStars size={15} weight="duotone" color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                <span>Night Bed Absence (&gt;15m)</span>
              </button>

              <button
                type="button"
                onClick={triggerGasLeakScenario}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '12.5px', textAlign: 'left', padding: '8px 10px' }}
              >
                <Fire size={15} weight="duotone" color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                <span>Simulate Gas Leak (650 ppm)</span>
              </button>

              <button
                type="button"
                onClick={resetHealthyBaseline}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '12.5px', textAlign: 'left', padding: '8px 10px' }}
              >
                <ArrowsCounterClockwise size={15} weight="duotone" color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                <span>Reset Healthy Baseline</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Guardian AI Telemetry Evaluator & Live Event Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <AiSandboxEvaluator />

          {/* Live Event & Reflex Log */}
          <div className="clinical-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700 }}>
                Live Event &amp; Reflex Log
              </h2>
              <span className="tabular-nums" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                {eventLog.length} events
              </span>
            </div>

            <div className="event-log-list">
              {eventLog.map((entry) => {
                const dotColor =
                  entry.category === 'emergency'
                    ? 'var(--accent-crimson)'
                    : entry.category === 'relay' || entry.category === 'power'
                      ? 'var(--accent-amber)'
                      : entry.category === 'warning'
                        ? 'var(--accent-blue)'
                        : 'var(--accent-emerald)';

                return (
                  <div
                    key={entry.id}
                    className="clinical-subtle-panel"
                    style={{
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      fontSize: '12.5px',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <span
                        className="tabular-nums"
                        style={{
                          fontWeight: 700,
                          color: 'var(--ink-muted)',
                          marginRight: '8px',
                          fontSize: '11.5px',
                        }}
                      >
                        {entry.timestamp}
                      </span>
                      <span style={{ color: 'var(--ink-primary)' }}>
                        {entry.message}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
