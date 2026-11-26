import { useMemo, useState } from 'react';
import {
  BatteryChargingVertical,
  BellRinging,
  Broadcast,
  Cpu,
  FilePdf,
  Heartbeat,
  ShieldCheck,
  WifiHigh,
} from '@phosphor-icons/react';
import {
  BOM_VERIFIED_SUMMARY,
  VERIFIED_GALLERY_COMPONENTS,
  type HardwareComponent,
  type SubsystemId,
} from '../data/hardwareBom';
import { IMAGE_SLOTS } from '../data/imageSlots';
import { ComponentCard } from '../components/ComponentCard';
import { ComponentLightboxModal } from '../components/ComponentLightboxModal';
import { SafeImage } from '../components/SafeImage';

interface FilterOption {
  id: 'all' | 'brains' | 'vitals' | 'radar' | 'safety' | 'power';
  label: string;
  matches: SubsystemId[];
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All Verified Modules (12)', matches: [] },
  { id: 'brains', label: 'Brains & Display', matches: ['interface-brain', 'reflex-brain'] },
  { id: 'vitals', label: 'Biometric Vitals', matches: ['vitals-sensing'] },
  { id: 'radar', label: 'Radar & Fall Trigger', matches: ['guardian-radar'] },
  { id: 'safety', label: 'Gas & Climate', matches: ['safety-environment'] },
  { id: 'power', label: 'UPS Power Gauge', matches: ['power-ups'] },
];

const ESCALATION_STAGES = [
  {
    window: 't+0 s',
    stage: 'Anomaly Detected',
    detail: '24GHz radar stillness, AI fall pose, KY-037 thud spike, or vitals breach.',
    tone: 'crimson',
  },
  {
    window: 't+2 s',
    stage: 'Verify — 10s Window',
    detail: '12V siren + red countdown HUD. One tap on "I\'M OKAY" logs a false alarm.',
    tone: 'amber',
  },
  {
    window: 't+10 s',
    stage: 'No Response',
    detail: 'Automated phone call + SMS + chat alert with snapshot & live vitals.',
    tone: 'crimson',
  },
  {
    window: 't+20 s',
    stage: 'Live Check-In',
    detail: 'Two-way audio/video link opens directly on the child\'s phone.',
    tone: 'blue',
  },
  {
    window: 't+30 s',
    stage: 'Confirmed Emergency',
    detail: 'Ambulance / emergency services dispatched with pre-configured home address.',
    tone: 'crimson',
  },
] as const;

export function OverviewTour() {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption['id']>('all');
  const [inspectedComponent, setInspectedComponent] =
    useState<HardwareComponent | null>(null);

  const heroSlot = IMAGE_SLOTS[0];
  const secondarySlots = IMAGE_SLOTS.slice(1);

  const filteredComponents = useMemo(() => {
    const active = FILTER_OPTIONS.find((opt) => opt.id === selectedFilter);
    if (!active || active.id === 'all') {
      return VERIFIED_GALLERY_COMPONENTS;
    }
    return VERIFIED_GALLERY_COMPONENTS.filter((item) =>
      active.matches.includes(item.subsystem)
    );
  }, [selectedFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 1. Clinical Flagship Hero Section */}
      <section
        className="clinical-card"
        style={{
          padding: '28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '28px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="status-pill emerald">
              <ShieldCheck size={14} weight="duotone" />
              <span>Phase 1 Flagship Architecture</span>
            </span>
            <span className="status-pill blue">
              <span>Paschim Banga Bigyan Mancha</span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.15 }}>
              XYZ Home Deck
            </h1>
            <p
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--ink-primary)',
                lineHeight: 1.4,
              }}
            >
              The autonomous elderly-care guardian that acts when your parents
              can&apos;t even call for help.
            </p>
            <p style={{ fontSize: '14.5px', color: 'var(--ink-secondary)' }}>
              A stationary bedside &amp; living-room hub combining a{' '}
              <strong>Raspberry Pi 4B (4GB)</strong> interface brain and an{' '}
              <strong>ESP32-S3 N16R8</strong> reflex brain with 24GHz mmWave
              radar, biometric vitals, gas/smoke auto-exhaust, and an internal
              3S2P Li-Ion UPS.
            </p>
          </div>

          {/* 4 Engineering Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Dual-Brain Redundancy
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                RPi 4B + ESP32-S3
              </div>
            </div>

            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Verified Hardware BOM
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--accent-emerald)' }}
              >
                ≈ {BOM_VERIFIED_SUMMARY.subtotalDisplay} ({BOM_VERIFIED_SUMMARY.totalPartsCount} parts)
              </div>
            </div>

            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Video Privacy Guarantee
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                100% Wired Local LAN
              </div>
            </div>

            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Outage Continuity
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink-primary)' }}
              >
                3S2P · ~5,200 mAh UPS
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="/docs/XYZ_HomeDeck_Presentation.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <FilePdf size={16} weight="duotone" />
              <span>View Presentation PDF</span>
            </a>
            <span style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
              Team: Aryan Banerjee · Sourav Biswas · Roktim · Arjya
            </span>
          </div>
        </div>

        {/* Hero Product Render Slot */}
        <div>
          <SafeImage
            filename={heroSlot.filename}
            alt={heroSlot.title}
            slotTitle={heroSlot.title}
            slotCaption={heroSlot.caption}
            aspectRatio={heroSlot.aspectRatio}
            phaseTarget={heroSlot.phaseTarget}
          />
        </div>
      </section>

      {/* 2. Dual-Brain, Privacy & Outage Continuity Architecture */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)' }}>
            <Cpu size={20} weight="duotone" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Two Brains, Zero Single-Point Failure</h2>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
            <strong>Raspberry Pi 4B</strong> runs the 7-inch 60 FPS touch HUD,
            OV5647 1080p @ 30 FPS stream, and multilingual audio.{' '}
            <strong>ESP32-S3 N16R8</strong> handles every sensor, the 2-axis
            gimbal, and relay safety logic over one USB link — keeping watch even
            if the UI restarts.
          </p>
        </div>

        <div className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)' }}>
            <WifiHigh size={20} weight="duotone" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Video Never Leaves the House</h2>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
            Zero cloud camera feeds. Full 1080p @ 30 FPS video flows strictly
            over wired <strong>Cat6 Gigabit Ethernet</strong> to local GPU
            laptops for AI skeleton/fall detection. Isolated Wi-Fi sends alerts
            only during active escalation.
          </p>
        </div>

        <div className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)' }}>
            <BatteryChargingVertical size={20} weight="duotone" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Built for Indian Power Cuts</h2>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
            Consumer power banks sag and reboot under Pi + screen load. Our
            internal <strong>3S2P 18650 pack + 3S 20A BMS + XL4015 5A buck</strong>{' '}
            holds a clean 5.1V rail with live <strong>INA219</strong> battery %
            telemetry on screen.
          </p>
        </div>
      </section>

      {/* 3. Autonomous Escalation Loop (t+0s to t+30s+) */}
      <section className="clinical-card" style={{ padding: '22px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <BellRinging size={20} weight="duotone" color="var(--accent-crimson)" />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
              Autonomous Escalation Pipeline (t+0 s to t+40 s)
            </h2>
          </div>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
            Every stage waits for the previous one to fail — one tap cancels on silence
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
          }}
        >
          {ESCALATION_STAGES.map((item) => (
            <div
              key={item.window}
              className="clinical-subtle-panel"
              style={{
                padding: '13px 14px',
                borderTop: `3px solid var(--accent-${item.tone})`,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: `var(--accent-${item.tone})`,
                }}
              >
                {item.window}
              </span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                {item.stage}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Interactive 12-Component Hardware Gallery (Hover Popover + Click Fullscreen) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--accent-blue)',
                marginBottom: '4px',
              }}
            >
              <Heartbeat size={15} weight="duotone" />
              <span>Verified Hardware Components</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
              Core Sensors, Compute &amp; Telemetry Modules
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
              Hover or focus any component card for live engineering specs, vendor,
              SKU ID, and INR pricing from the proposal BOM. Click any photo to
              inspect fullscreen.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {FILTER_OPTIONS.map((option) => {
              const isSelected = selectedFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedFilter(option.id)}
                  className={isSelected ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '6px 11px', fontSize: '12.5px' }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredComponents.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onInspect={setInspectedComponent}
            />
          ))}
        </div>
      </section>

      {/* 5. Product Render & Exhibition Image Asset Slots */}
      <section className="clinical-card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '18px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--accent-blue)',
                marginBottom: '4px',
              }}
            >
              <Broadcast size={15} weight="duotone" />
              <span>Phase 1 Asset Drop-In Slots</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
              Product Renders, Kiosk HUD Captures &amp; Exhibition Photography
            </h2>
          </div>
          <span className="status-pill">
            <span>Drop folder: </span>
            <code>frontend/public/images/</code>
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {secondarySlots.map((slot) => (
            <SafeImage
              key={slot.id}
              filename={slot.filename}
              alt={slot.title}
              slotTitle={slot.title}
              slotCaption={slot.caption}
              aspectRatio={slot.aspectRatio}
              phaseTarget={slot.phaseTarget}
            />
          ))}
        </div>
      </section>

      {/* Fullscreen Modal for Verified Component Photography */}
      <ComponentLightboxModal
        component={inspectedComponent}
        items={VERIFIED_GALLERY_COMPONENTS}
        onClose={() => setInspectedComponent(null)}
        onSelect={setInspectedComponent}
      />
    </div>
  );
}
