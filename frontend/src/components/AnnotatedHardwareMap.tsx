import { useState } from 'react';
import {
  BatteryChargingVertical,
  Camera,
  ImageSquare,
} from '@phosphor-icons/react';
import type { HardwareComponent } from '../data/hardwareBom';

interface AnnotatedHardwareMapProps {
  components: HardwareComponent[];
  selectedComponentId: string;
  onSelectComponent: (component: HardwareComponent) => void;
}

const UPS_SCHEMATIC_NODES: {
  componentId: string;
  step: string;
  title: string;
  detail: string;
  xPercent: number;
  yPercent: number;
}[] = [
  {
    componentId: 'charger-12v6-2a',
    step: '01',
    title: '12.6V 2A Adapter',
    detail: 'Mains AC-DC Input',
    xPercent: 18,
    yPercent: 25,
  },
  {
    componentId: 'bms-3s-20a',
    step: '02',
    title: '3S 20A Li-Ion BMS',
    detail: 'Over-charge & Short Guard',
    xPercent: 50,
    yPercent: 25,
  },
  {
    componentId: 'cells-18650-3s2p',
    step: '03',
    title: '6x 18650 3S2P Pack',
    detail: '11.1V Nominal · ~5,200 mAh',
    xPercent: 18,
    yPercent: 70,
  },
  {
    componentId: 'ina219-power-gauge',
    step: '04',
    title: 'INA219 Gauge',
    detail: 'Live % & Current on HUD',
    xPercent: 50,
    yPercent: 70,
  },
  {
    componentId: 'xl4015-buck',
    step: '05',
    title: 'XL4015 5A Buck',
    detail: 'Clean 5.1V RPi 4 + Sensor Rail',
    xPercent: 82,
    yPercent: 25,
  },
  {
    componentId: 'relay-4ch-5v',
    step: '06',
    title: '5V Relay + Direct Rail',
    detail: 'Exhaust Fan · Gimbal · Siren',
    xPercent: 82,
    yPercent: 70,
  },
];

export function AnnotatedHardwareMap({
  components,
  selectedComponentId,
  onSelectComponent,
}: AnnotatedHardwareMapProps) {
  const [activeTarget, setActiveTarget] = useState<'frontside.jpg' | 'ups.jpg'>(
    'frontside.jpg'
  );
  const [upsImgError, setUpsImgError] = useState(false);

  const frontHotspots = components.filter(
    (c) => c.hotspot?.targetSlot === 'frontside.jpg'
  );
  const upsHotspots = components.filter(
    (c) => c.hotspot?.targetSlot === 'ups.jpg'
  );

  const byId = Object.fromEntries(components.map((c) => [c.id, c]));

  return (
    <div className="clinical-card" style={{ overflow: 'hidden' }}>
      {/* Mode B Sub-Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-surface)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTarget('frontside.jpg')}
            className={activeTarget === 'frontside.jpg' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '12.5px' }}
          >
            <Camera size={15} weight="duotone" />
            <span>Front Bezel &amp; Turret (frontside.jpg)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTarget('ups.jpg')}
            className={activeTarget === 'ups.jpg' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '12.5px' }}
          >
            <BatteryChargingVertical size={15} weight="duotone" />
            <span>3S2P UPS Power Bay (ups.jpg)</span>
          </button>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
          Hover or click any numbered pin — images remain static (0% zoom)
        </span>
      </div>

      {/* === CANVAS 1: FRONTSIDE.JPG ANNOTATED HARDWARE PHOTO === */}
      {activeTarget === 'frontside.jpg' ? (
        <div
          className="no-hover-zoom"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 10',
            backgroundColor: '#FFFFFF',
          }}
        >
          <img
            src="/images/thumbs/frontside.webp"
            alt="XYZ Home Deck isolated front three-quarter hardware angle with sensor hotspots"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {frontHotspots.map((item, idx) => {
            const coords = item.hotspot!;
            const isSelected = selectedComponentId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => onSelectComponent(item)}
                onFocus={() => onSelectComponent(item)}
                onClick={() => onSelectComponent(item)}
                className="hotspot-photo-pin"
                style={{
                  left: `${coords.xPercent}%`,
                  top: `${coords.yPercent}%`,
                  backgroundColor: isSelected
                    ? 'var(--accent-blue)'
                    : 'rgba(255, 255, 255, 0.96)',
                  color: isSelected ? '#FFFFFF' : 'var(--ink-primary)',
                  borderColor: isSelected
                    ? 'var(--accent-blue)'
                    : 'var(--border-strong)',
                  zIndex: isSelected ? 25 : 15,
                }}
                aria-label={`Inspect ${item.shortName}`}
              >
                <span
                  className="tabular-nums"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: isSelected
                      ? 'rgba(255,255,255,0.22)'
                      : 'var(--accent-blue-bg)',
                    color: isSelected ? '#FFFFFF' : 'var(--accent-blue)',
                  }}
                >
                  {idx + 1}
                </span>
                <span>{item.shortName}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* === CANVAS 2: UPS.JPG OR INTERACTIVE POWER ARCHITECTURE DIAGRAM === */}
      {activeTarget === 'ups.jpg' ? (
        !upsImgError ? (
          <div
            className="no-hover-zoom"
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              backgroundColor: '#FFFFFF',
            }}
          >
            <img
              src="/images/ups.jpg"
              alt="XYZ Home Deck 3S2P 18650 BMS and XL4015 UPS internals"
              onError={() => setUpsImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {upsHotspots.map((item, idx) => {
              const coords = item.hotspot!;
              const isSelected = selectedComponentId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => onSelectComponent(item)}
                  onFocus={() => onSelectComponent(item)}
                  onClick={() => onSelectComponent(item)}
                  className="hotspot-photo-pin"
                  style={{
                    left: `${coords.xPercent}%`,
                    top: `${coords.yPercent}%`,
                    backgroundColor: isSelected
                      ? 'var(--accent-blue)'
                      : 'rgba(255, 255, 255, 0.96)',
                    color: isSelected ? '#FFFFFF' : 'var(--ink-primary)',
                    borderColor: isSelected
                      ? 'var(--accent-blue)'
                      : 'var(--border-strong)',
                    zIndex: isSelected ? 25 : 15,
                  }}
                >
                  <span className="tabular-nums">{idx + 1}</span>
                  <span>{item.shortName}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Clean Light-Mode Interactive Power Bay Diagram until ups.jpg is uploaded */
          <div
            style={{
              padding: '22px',
              backgroundColor: 'var(--bg-canvas)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                  Interactive 3S2P Power Continuity Schematic (Zero-Brownout Rail)
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                  Hover or click any power stage below to inspect specs, SKU ID, and INR cost.
                </p>
              </div>
              <span className="status-pill">
                <ImageSquare size={14} weight="duotone" />
                <span>Drop ups.jpg into frontend/public/images/ when ready</span>
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '12px',
              }}
            >
              {UPS_SCHEMATIC_NODES.map((node) => {
                const comp = byId[node.componentId];
                if (!comp) return null;
                const isSelected = selectedComponentId === comp.id;
                return (
                  <button
                    key={node.componentId}
                    type="button"
                    onMouseEnter={() => onSelectComponent(comp)}
                    onFocus={() => onSelectComponent(comp)}
                    onClick={() => onSelectComponent(comp)}
                    className="clinical-card"
                    style={{
                      padding: '14px',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      borderColor: isSelected
                        ? 'var(--accent-blue)'
                        : 'var(--border-hairline)',
                      backgroundColor: isSelected
                        ? 'var(--accent-blue-bg)'
                        : 'var(--bg-surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--accent-blue)',
                        }}
                      >
                        STAGE {node.step}
                      </span>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--accent-emerald)',
                        }}
                      >
                        {comp.priceDisplay}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                      {node.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                      {node.detail}
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                      {comp.vendorUrlDomain} · SKU {comp.skuId}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
