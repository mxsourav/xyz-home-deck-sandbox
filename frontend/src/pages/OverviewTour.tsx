import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BatteryChargingVertical,
  BellRinging,
  Circuitry,
  Cpu,
  DeviceMobile,
  FilePdf,
  Heartbeat,
  MoonStars,
  SlidersHorizontal,
  UserCheck,
  WifiHigh,
} from '@phosphor-icons/react';
import { ComponentCard } from '../components/ComponentCard';
import { ComponentLightboxModal } from '../components/ComponentLightboxModal';
import {
  ImageLightboxModal,
  type ExpandedImageData,
} from '../components/ImageLightboxModal';
import { SafeImage } from '../components/SafeImage';
import {
  BOM_VERIFIED_SUMMARY,
  VERIFIED_GALLERY_COMPONENTS,
  type HardwareComponent,
  type SubsystemId,
} from '../data/hardwareBom';
import { IMAGE_SLOTS } from '../data/imageSlots';

interface FilterOption {
  id: 'all' | 'brains' | 'vitals' | 'radar' | 'safety' | 'power';
  label: string;
  matches: SubsystemId[];
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All Verified Modules (15)', matches: [] },
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
    detail: '24GHz radar stillness, VL53L5CX 64-zone floor silhouette, AI fall pose, KY-037 thud spike, or vitals breach.',
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
    detail: 'Automated phone call + SMS + Telegram alert with snapshot & live vitals.',
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
  const [expandedRender, setExpandedRender] =
    useState<ExpandedImageData | null>(null);

  const byId = useMemo(
    () => Object.fromEntries(IMAGE_SLOTS.map((slot) => [slot.id, slot])),
    []
  );

  const heroSlot = byId.hero;
  const nightSlot = byId.night;
  const expoSlot = byId.expo;
  const mobileAlertSlot = byId['mobile-alert'];
  const kioskSlots = [byId.kiosk1, byId.kiosk2, byId.kiosk3].filter(Boolean);
  const upsSlot = byId.ups;

  const filteredComponents = useMemo(() => {
    const active = FILTER_OPTIONS.find((opt) => opt.id === selectedFilter);
    if (!active || active.id === 'all') {
      return VERIFIED_GALLERY_COMPONENTS;
    }
    return VERIFIED_GALLERY_COMPONENTS.filter((item) =>
      active.matches.includes(item.subsystem)
    );
  }, [selectedFilter]);

  const handleExpandRender = (src: string, title: string, caption: string) => {
    setExpandedRender({ src, title, caption });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Clinical Flagship Hero Section with Real hero.jpg */}
      <section
        className="clinical-card"
        style={{
          padding: '28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '28px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink-muted)',
              paddingBottom: '10px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            Department Funding Proposal · Paschim Banga Bigyan Mancha
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h1 style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.12 }}>
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
              A stationary bedside &amp; living-room hub pairing a{' '}
              <strong>Raspberry Pi 4B (4GB)</strong> interface brain and an{' '}
              <strong>ESP32-S3 N16R8</strong> reflex brain with 24GHz mmWave
              radar, biometric vitals, gas/smoke auto-exhaust, and an internal
              3S2P Li-Ion UPS.
            </p>
          </div>

          {/* Key Engineering Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Autonomous Escalation
              </div>
              <div className="tabular-nums" style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                &lt; 40s Guardian Loop
              </div>
            </div>

            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Video Privacy Guarantee
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                100% Local LAN Video
              </div>
            </div>

            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Outage Continuity
              </div>
              <div className="tabular-nums" style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                3S2P Power-Cut UPS
              </div>
            </div>

            <div className="clinical-subtle-panel" style={{ padding: '11px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Verified Hardware BOM
              </div>
              <div className="tabular-nums" style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                ≈ {BOM_VERIFIED_SUMMARY.subtotalDisplay} ({BOM_VERIFIED_SUMMARY.totalPartsCount} parts)
              </div>
            </div>
          </div>

          {/* Quick-Launch Interactive CTA Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link to="/sandbox" className="btn-primary">
              <SlidersHorizontal size={16} weight="duotone" />
              <span>Launch 60 FPS Kiosk Sandbox</span>
            </Link>

            <Link to="/setup" className="btn-secondary">
              <UserCheck size={16} weight="duotone" />
              <span>Try Age-Adaptive Setup</span>
            </Link>

            <Link to="/hardware" className="btn-secondary">
              <Circuitry size={16} weight="duotone" />
              <span>Inspect 3D Hardware &amp; BOM</span>
            </Link>

            <a
              href="/docs/XYZ_HomeDeck_Presentation.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <FilePdf size={16} weight="duotone" />
              <span>Proposal PDF</span>
            </a>
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
            Team: Aryan Banerjee · Sourav Biswas · Roktim · Arjya
          </div>
        </div>

        {/* Hero Tabletop Render (natural 3:4 portrait frame, zero hover zoom) */}
        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          <SafeImage
            filename={heroSlot.filename}
            alt={heroSlot.title}
            slotTitle={heroSlot.title}
            slotCaption={heroSlot.caption}
            aspectRatio={heroSlot.aspectRatio}
            priority
            onExpandImage={handleExpandRender}
          />
        </div>
      </section>

      {/* 2. Dual-Brain, Privacy & Outage Continuity Summary */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)' }}>
            <Cpu size={20} weight="duotone" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Two Brains, Zero Single-Point Failure</h2>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
            <strong>Raspberry Pi 4B</strong> runs the 7-inch 60 FPS touch HUD,
            OV5647 1080p @ 30 FPS stream, and multilingual audio.{' '}
            <strong>ESP32-S3 N16R8</strong> polls every sensor, drives the 2-axis
            gimbal, and keeps safety relays active over a single USB link.
          </p>
        </div>

        <div className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)' }}>
            <WifiHigh size={20} weight="duotone" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Video Never Leaves the House</h2>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
            Zero cloud camera streaming. Live 1080p @ 30 FPS video runs solely over
            wired <strong>Cat6 Gigabit Ethernet</strong> to local GPU laptops for AI
            pose/fall inference; isolated Wi-Fi sends alerts only on escalation.
          </p>
        </div>

        <div className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)' }}>
            <BatteryChargingVertical size={20} weight="duotone" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Built for Indian Power Cuts</h2>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
            Internal <strong>3S2P 18650 pack + 3S 20A BMS + XL4015 5A buck</strong>{' '}
            holds a clean 5.1V rail with live <strong>INA219</strong> battery % on
            screen so monitoring continues without brownouts.
          </p>
        </div>
      </section>

      {/* 3. Visual Walkthrough: Night Sleep Monitoring (night.jpg) & Mobile Alert Proof */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {/* Bedside Sleep Monitoring Card */}
        <article className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MoonStars size={19} weight="duotone" color="var(--accent-blue)" />
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
              24/7 Bedside Sleep &amp; Breathing Monitoring
            </h2>
          </div>
          <SafeImage
            filename={nightSlot.filename}
            alt={nightSlot.title}
            slotTitle={nightSlot.title}
            slotCaption={nightSlot.caption}
            aspectRatio={nightSlot.aspectRatio}
            onExpandImage={handleExpandRender}
          />
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
            In total bedroom darkness, the <strong>HLK-LD2410B 24GHz mmWave radar</strong>{' '}
            tracks chest breathing micro-movements while the{' '}
            <strong>VL53L5CX 64-zone ToF imager</strong> maps a camera-free 3D night
            posture &amp; bed-edge silhouette — the dual-layer privacy night watch that
            keeps the OV5647 camera in STANDBY · NIGHT PRIVACY, triggering intervention
            on unnatural stillness or prolonged night bed absence.
          </p>
        </article>

        {/* Child Phone Alert Proof Card (sms-notificaltion-in-mobile-demo.png) */}
        <article className="clinical-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DeviceMobile size={19} weight="duotone" color="var(--accent-crimson)" />
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
              What the Child Actually Receives on Escalation
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(160px, 0.9fr) minmax(0, 1.1fr)',
              gap: '16px',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <SafeImage
              filename={mobileAlertSlot.filename}
              alt={mobileAlertSlot.title}
              slotTitle={mobileAlertSlot.title}
              slotCaption={mobileAlertSlot.caption}
              aspectRatio={mobileAlertSlot.aspectRatio}
              onExpandImage={handleExpandRender}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--ink-secondary)' }}>
              <p>
                When the 10-second on-device verification window expires without an{' '}
                <strong>&quot;I&apos;M OKAY&quot;</strong> tap, the hub dispatches:
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Automated Phone Call:</strong> rings immediately without opening an app.</li>
                <li><strong>Telegram / SMS Alert:</strong> exact heart rate, SpO₂, room climate, and timestamp.</li>
                <li><strong>5-Second Event Snapshot:</strong> what the camera captured at collapse time.</li>
                <li><strong>One-Tap Verification:</strong> <em>Send Emergency Help</em> or <em>False Alarm / I&apos;m Okay</em>.</li>
              </ul>
            </div>
          </div>
        </article>
      </section>

      {/* 4. Autonomous Escalation Loop (t+0s to t+40s) — Clean uniform 1px borders */}
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
              style={{
                padding: '14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-canvas)',
                border: `1px solid var(--accent-${item.tone}-border)`,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '1px',
                    backgroundColor: `var(--accent-${item.tone})`,
                    flexShrink: 0,
                  }}
                />
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
              </div>
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

      {/* 5. Real Device UI Captures (kiosk1, kiosk2, kiosk3) */}
      <section className="clinical-card" style={{ padding: '24px' }}>
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
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
              The Three Core Kiosk Screens
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
              7-inch capacitive touch layouts tuned for quick recognition.
            </p>
          </div>

          <Link to="/sandbox" className="btn-secondary" style={{ fontSize: '12.5px' }}>
            <SlidersHorizontal size={15} weight="duotone" />
            <span>Try Interactive 60 FPS Kiosk</span>
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {kioskSlots.map((slot) => (
            <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SafeImage
                filename={slot.filename}
                alt={slot.title}
                slotTitle={slot.title}
                slotCaption={slot.caption}
                aspectRatio={slot.aspectRatio}
                onExpandImage={handleExpandRender}
              />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                {slot.title}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                {slot.caption}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Exhibition Table + Wired Gigabit Laptop Live Setup (expo.jpg) */}
      <section className="clinical-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                color: 'var(--accent-emerald)',
                marginBottom: '4px',
              }}
            >
              Exhibition-Hall Proof · Cat6 Gigabit LAN
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
              Live 30 FPS Local GPU Feed (Zero Crowded-Hall Wi-Fi Drops)
            </h2>
          </div>
          <Link to="/hardware" className="btn-secondary" style={{ fontSize: '12.5px' }}>
            <Circuitry size={15} weight="duotone" />
            <span>Explore 3D Enclosure &amp; Hotspots</span>
          </Link>
        </div>

        <SafeImage
          filename={expoSlot.filename}
          alt={expoSlot.title}
          slotTitle={expoSlot.title}
          slotCaption={expoSlot.caption}
          aspectRatio={expoSlot.aspectRatio}
          onExpandImage={handleExpandRender}
        />

        <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
          {expoSlot.caption}
        </p>
      </section>

      {/* 7. Interactive 12-Component Hardware Gallery */}
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
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
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
              Hover or focus any module for live specs, vendor, SKU ID, and INR
              pricing. Click any photo to inspect fullscreen.
            </p>
          </div>

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

      {/* Remaining Drop-In Asset Slot (ups.jpg) */}
      {upsSlot ? (
        <section className="clinical-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
              3S2P UPS Internal Build Photo Slot
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Drop <code>ups.jpg</code> into <code>frontend/public/images/</code>
            </span>
          </div>
          <div style={{ maxWidth: '460px' }}>
            <SafeImage
              filename={upsSlot.filename}
              alt={upsSlot.title}
              slotTitle={upsSlot.title}
              slotCaption={upsSlot.caption}
              aspectRatio={upsSlot.aspectRatio}
              phaseTarget={upsSlot.phaseTarget}
              onExpandImage={handleExpandRender}
            />
          </div>
        </section>
      ) : null}

      {/* Fullscreen Modals */}
      <ComponentLightboxModal
        component={inspectedComponent}
        items={VERIFIED_GALLERY_COMPONENTS}
        onClose={() => setInspectedComponent(null)}
        onSelect={setInspectedComponent}
      />
      <ImageLightboxModal
        image={expandedRender}
        onClose={() => setExpandedRender(null)}
      />
    </div>
  );
}
