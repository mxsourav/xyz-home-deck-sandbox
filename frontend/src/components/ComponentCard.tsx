import { useState, type FocusEvent, type MouseEvent } from 'react';
import { ArrowsOutSimple, Cpu, Tag } from '@phosphor-icons/react';
import type { HardwareComponent } from '../data/hardwareBom';

interface ComponentCardProps {
  component: HardwareComponent;
  onInspect: (component: HardwareComponent) => void;
}

interface PopoverCoords {
  left: number;
  top: number;
  side: 'right' | 'left' | 'overlay';
}

function getComponentThumbSrc(imagePath?: string): string | undefined {
  if (!imagePath) return undefined;
  const match = imagePath.match(/^\/images\/components\/([^/.]+)\.[^.]+$/);
  return match ? `/images/thumbs/components/${match[1]}.webp` : imagePath;
}

export function ComponentCard({ component, onInspect }: ComponentCardProps) {
  const [coords, setCoords] = useState<PopoverCoords>({
    left: 24,
    top: 90,
    side: 'right',
  });
  const [useOrigImg, setUseOrigImg] = useState(false);

  const thumbSrc = getComponentThumbSrc(component.imagePath);
  const displaySrc = useOrigImg ? component.imagePath : (thumbSrc ?? component.imagePath);

  const computeFixedPlacement = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const POPOVER_W = 304;
    const POPOVER_EST_H = 268;
    const NAV_SAFE_TOP = 82;
    const GAP = 14;

    let left: number;
    let side: PopoverCoords['side'] = 'right';

    if (window.innerWidth - rect.right >= POPOVER_W + GAP + 12) {
      left = rect.right + GAP;
      side = 'right';
    } else if (rect.left >= POPOVER_W + GAP + 12) {
      left = rect.left - POPOVER_W - GAP;
      side = 'left';
    } else {
      left = Math.max(
        12,
        Math.min(
          window.innerWidth - POPOVER_W - 12,
          rect.left + (rect.width - POPOVER_W) / 2
        )
      );
      side = 'overlay';
    }

    // Always anchor inside the currently visible section of the viewport (never behind navbar or off bottom)
    const visibleTop = Math.max(rect.top, NAV_SAFE_TOP);
    const maxTop = Math.max(NAV_SAFE_TOP, window.innerHeight - POPOVER_EST_H - 14);
    const top = Math.max(NAV_SAFE_TOP, Math.min(maxTop, visibleTop));

    setCoords({ left, top, side });
  };

  const handleMouseEnter = (e: MouseEvent<HTMLElement>) => {
    computeFixedPlacement(e.currentTarget);
  };

  const handleFocus = (e: FocusEvent<HTMLElement>) => {
    computeFixedPlacement(e.currentTarget);
  };

  return (
    <article
      className="component-card"
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
    >
      {/* Fixed Viewport-Clamped Sensor Data Popover — opens side-by-side inside visible viewport */}
      <div
        className={`component-popover side-${coords.side}`}
        role="tooltip"
        style={{
          left: `${coords.left}px`,
          top: `${coords.top}px`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <span className="status-pill blue" style={{ fontSize: '11px', padding: '2px 8px' }}>
            {component.subsystemLabel}
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--accent-emerald)',
            }}
          >
            {component.priceDisplay}
          </span>
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '13.5px',
            color: 'var(--ink-primary)',
            marginBottom: '6px',
          }}
        >
          {component.shortName}
        </div>

        <p
          style={{
            fontSize: '12px',
            color: 'var(--ink-secondary)',
            marginBottom: '8px',
            lineHeight: 1.45,
          }}
        >
          <strong>What it is:</strong> {component.whatItIs}
        </p>

        <p
          style={{
            fontSize: '12px',
            color: 'var(--ink-secondary)',
            marginBottom: '8px',
            lineHeight: 1.45,
          }}
        >
          <strong>In XYZ Home Deck:</strong> {component.roleInDeck}
        </p>

        <div
          style={{
            paddingTop: '8px',
            borderTop: '1px solid var(--border-hairline)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            fontSize: '11.5px',
            color: 'var(--ink-muted)',
          }}
        >
          <div>
            Vendor:{' '}
            <strong style={{ color: 'var(--ink-primary)' }}>
              {component.vendorUrlDomain}
            </strong>
          </div>
          <div className="tabular-nums">
            SKU:{' '}
            <strong style={{ color: 'var(--ink-primary)' }}>
              {component.skuId}
            </strong>
          </div>
        </div>
      </div>

      {/* Crisp Static Hardware Photo Button — Click to Expand Fullscreen */}
      <button
        type="button"
        className="component-photo-button no-hover-zoom"
        onClick={() => onInspect(component)}
        aria-label={`Inspect ${component.name} in fullscreen`}
      >
        <div className="component-photo-frame no-hover-zoom">
          <img
            src={displaySrc}
            alt={component.name}
            loading="lazy"
            onError={() => {
              if (!useOrigImg) setUseOrigImg(true);
            }}
          />
        </div>
        <span className="component-expand-badge">
          <ArrowsOutSimple size={13} weight="bold" />
          <span>Expand</span>
        </span>
      </button>

      {/* Card Body */}
      <div
        style={{
          padding: '14px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--accent-blue)',
            }}
          >
            {component.subsystemLabel}
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--ink-muted)',
            }}
          >
            BOM #{component.bomRow}
          </span>
        </div>

        <h3
          style={{
            fontSize: '14.5px',
            fontWeight: 700,
            lineHeight: 1.35,
            color: 'var(--ink-primary)',
          }}
        >
          {component.shortName}
        </h3>

        <p
          style={{
            fontSize: '12.5px',
            color: 'var(--ink-secondary)',
            lineHeight: 1.45,
            flex: 1,
          }}
        >
          {component.whatItIs}
        </p>

        <div
          style={{
            paddingTop: '10px',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--ink-secondary)',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 7px',
              }}
            >
              <Tag size={12} weight="duotone" />
              <span className="tabular-nums">{component.skuId}</span>
            </span>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--ink-muted)',
              }}
            >
              {component.vendorUrlDomain}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="tabular-nums"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
              }}
            >
              {component.priceDisplay}
            </span>
            <button
              type="button"
              onClick={() => onInspect(component)}
              className="btn-secondary"
              style={{ padding: '4px 9px', fontSize: '12px' }}
            >
              <Cpu size={13} weight="duotone" />
              <span>Specs</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
