import { useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Cpu,
  PlugsConnected,
  Storefront,
  Tag,
  X,
} from '@phosphor-icons/react';
import type { HardwareComponent } from '../data/hardwareBom';

interface ComponentLightboxModalProps {
  component: HardwareComponent | null;
  items: HardwareComponent[];
  onClose: () => void;
  onSelect: (component: HardwareComponent) => void;
}

export function ComponentLightboxModal({
  component,
  items,
  onClose,
  onSelect,
}: ComponentLightboxModalProps) {
  const currentIndex = component
    ? items.findIndex((item) => item.id === component.id)
    : -1;

  useEffect(() => {
    if (!component) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight' && items.length > 1) {
        const nextIndex = (currentIndex + 1) % items.length;
        onSelect(items[nextIndex]);
      } else if (event.key === 'ArrowLeft' && items.length > 1) {
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        onSelect(items[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [component, currentIndex, items, onClose, onSelect]);

  if (!component) return null;

  const handlePrev = () => {
    if (items.length <= 1) return;
    onSelect(items[(currentIndex - 1 + items.length) % items.length]);
  };

  const handleNext = () => {
    if (items.length <= 1) return;
    onSelect(items[(currentIndex + 1) % items.length]);
  };

  return (
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-component-title"
      onClick={onClose}
    >
      <div
        className="lightbox-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-hairline)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="status-pill blue">{component.subsystemLabel}</span>
            <span className="status-pill emerald">
              <CheckCircle size={13} weight="duotone" />
              <span>Verified BOM Row #{component.bomRow}</span>
            </span>
            <span
              className="tabular-nums"
              style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-muted)' }}
            >
              Qty: {component.qty}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            aria-label="Close fullscreen hardware inspector"
            style={{ padding: '6px 10px' }}
          >
            <X size={16} weight="bold" />
            <span>Close</span>
          </button>
        </div>

        {/* Main 2-Column Inspection Body */}
        <div className="lightbox-body">
          {/* Left: High-Resolution Studio Image (zero hover zoom) */}
          <div
            className="no-hover-zoom"
            style={{
              backgroundColor: '#FFFFFF',
              borderRight: '1px solid var(--border-hairline)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '340px',
            }}
          >
            <img
              src={component.imagePath}
              alt={component.name}
              style={{
                maxWidth: '100%',
                maxHeight: '460px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {/* Right: Clinical Hardware Dossier */}
          <div
            style={{
              padding: '24px 26px',
              backgroundColor: 'var(--bg-canvas)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div>
              <h2
                id="lightbox-component-title"
                style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.25 }}
              >
                {component.name}
              </h2>
            </div>

            {/* Verified Procurement & Pricing Card */}
            <div
              className="clinical-card"
              style={{
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px',
                  }}
                >
                  <Storefront size={13} weight="duotone" />
                  <span>Vendor</span>
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                  {component.vendorUrlDomain}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px',
                  }}
                >
                  <Tag size={13} weight="duotone" />
                  <span>SKU ID</span>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-primary)' }}
                >
                  {component.skuId}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  Unit Price (INR)
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--accent-emerald)',
                  }}
                >
                  {component.priceDisplay}
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--ink-muted)',
                  marginBottom: '4px',
                }}
              >
                Component Overview
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink-secondary)' }}>
                {component.whatItIs}
              </p>
            </div>

            <div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--ink-muted)',
                  marginBottom: '4px',
                }}
              >
                Function Inside XYZ Home Deck
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink-primary)' }}>
                {component.roleInDeck}
              </p>
            </div>

            <div className="clinical-card" style={{ padding: '12px 14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--ink-primary)',
                  marginBottom: '8px',
                }}
              >
                <PlugsConnected size={15} weight="duotone" color="var(--accent-blue)" />
                <span>Bus & Wiring: {component.interfaceBus}</span>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  fontSize: '13px',
                  color: 'var(--ink-secondary)',
                }}
              >
                {component.specs.map((spec) => (
                  <li key={spec}>{spec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--border-hairline)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
            <Cpu size={15} weight="duotone" />
            <span>
              Source: <strong>XYZ_HomeDeck_Presentation.pdf</strong> (Bill of Materials, p. 14)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrev}
              className="btn-secondary"
              disabled={items.length <= 1}
              style={{ padding: '6px 11px', fontSize: '12.5px' }}
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Previous</span>
            </button>
            <span
              className="tabular-nums"
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--ink-secondary)',
                padding: '0 6px',
              }}
            >
              {currentIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="btn-secondary"
              disabled={items.length <= 1}
              style={{ padding: '6px 11px', fontSize: '12.5px' }}
            >
              <span>Next</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
