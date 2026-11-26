import {
  ArrowsOutSimple,
  CheckCircle,
  Cpu,
  PlugsConnected,
  Storefront,
  Tag,
  WarningCircle,
} from '@phosphor-icons/react';
import type { HardwareComponent } from '../data/hardwareBom';

interface SensorInspectorCardProps {
  component: HardwareComponent;
  onExpandPhoto?: (component: HardwareComponent) => void;
}

export function SensorInspectorCard({
  component,
  onExpandPhoto,
}: SensorInspectorCardProps) {
  return (
    <aside
      className="clinical-card"
      aria-label={`Selected hardware inspector: ${component.shortName}`}
      style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'sticky',
        top: '88px',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span className="status-pill blue">{component.subsystemLabel}</span>
        <span className={`status-pill ${component.verified ? 'emerald' : 'amber'}`}>
          {component.verified ? (
            <CheckCircle size={13} weight="duotone" />
          ) : (
            <WarningCircle size={13} weight="duotone" />
          )}
          <span className="tabular-nums">
            BOM #{component.bomRow} · Qty {component.qty}
          </span>
        </span>
      </div>

      {/* Photo Thumbnail (strictly zero hover zoom) */}
      {component.imagePath ? (
        <button
          type="button"
          onClick={() => onExpandPhoto?.(component)}
          className="no-hover-zoom"
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            backgroundColor: '#FFFFFF',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={`Open ${component.shortName} in fullscreen modal`}
        >
          <img
            src={component.imagePath}
            alt={component.name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          {onExpandPhoto ? (
            <span className="component-expand-badge">
              <ArrowsOutSimple size={12} weight="bold" />
              <span>Fullscreen</span>
            </span>
          ) : null}
        </button>
      ) : (
        <div
          className="clinical-subtle-panel"
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12.5px',
            color: 'var(--ink-secondary)',
          }}
        >
          <Cpu size={22} weight="duotone" color="var(--accent-blue)" />
          <span>
            Integrated internal subsystem module (BOM Row #{component.bomRow}).
          </span>
        </div>
      )}

      {/* Title & Procurement Metadata */}
      <div>
        <h3 style={{ fontSize: '16.5px', fontWeight: 800, lineHeight: 1.3 }}>
          {component.name}
        </h3>
      </div>

      <div
        className="clinical-subtle-panel"
        style={{
          padding: '11px 13px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '8px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Storefront size={12} weight="duotone" />
            <span>Vendor</span>
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, marginTop: '2px' }}>
            {component.vendorUrlDomain}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Tag size={12} weight="duotone" />
            <span>SKU ID</span>
          </div>
          <div
            className="tabular-nums"
            style={{ fontSize: '12.5px', fontWeight: 700, marginTop: '2px' }}
          >
            {component.skuId}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            Price (INR)
          </div>
          <div
            className="tabular-nums"
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: component.verified ? 'var(--accent-emerald)' : 'var(--ink-muted)',
              marginTop: '2px',
            }}
          >
            {component.priceDisplay}
          </div>
        </div>
      </div>

      {/* Role & Technical Specs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            What It Is
          </div>
          <p style={{ color: 'var(--ink-secondary)', marginTop: '2px' }}>
            {component.whatItIs}
          </p>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            How It Works in XYZ Home Deck
          </div>
          <p style={{ color: 'var(--ink-primary)', marginTop: '2px' }}>
            {component.roleInDeck}
          </p>
        </div>
      </div>

      <div className="clinical-subtle-panel" style={{ padding: '10px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--ink-primary)',
            marginBottom: '6px',
          }}
        >
          <PlugsConnected size={14} weight="duotone" color="var(--accent-blue)" />
          <span>{component.interfaceBus}</span>
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--ink-secondary)',
          }}
        >
          {component.specs.map((spec) => (
            <li key={spec}>{spec}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
