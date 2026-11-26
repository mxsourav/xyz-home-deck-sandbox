import { useMemo, useState } from 'react';
import {
  ArrowsOutSimple,
  CheckCircle,
  Circuitry,
  Cube,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  BOM_VERIFIED_SUMMARY,
  HARDWARE_COMPONENTS,
  VERIFIED_GALLERY_COMPONENTS,
  type HardwareComponent,
} from '../data/hardwareBom';
import { IMAGE_SLOTS } from '../data/imageSlots';
import { ComponentLightboxModal } from '../components/ComponentLightboxModal';
import { SafeImage } from '../components/SafeImage';

export function HardwareLab() {
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [inspectedComponent, setInspectedComponent] =
    useState<HardwareComponent | null>(null);

  const frontsideSlot = IMAGE_SLOTS.find((s) => s.id === 'frontside')!;
  const upsSlot = IMAGE_SLOTS.find((s) => s.id === 'ups')!;

  const filteredBom = useMemo(() => {
    if (vendorFilter === 'all') return HARDWARE_COMPONENTS;
    return HARDWARE_COMPONENTS.filter(
      (item) => item.vendorUrlDomain === vendorFilter
    );
  }, [vendorFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="clinical-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="status-pill blue">
            <Circuitry size={14} weight="duotone" />
            <span>Phase 4 Route Shell</span>
          </span>
          <span className="status-pill emerald">
            <span className="tabular-nums">
              Verified Subtotal ≈ {BOM_VERIFIED_SUMMARY.subtotalDisplay}
            </span>
          </span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
          Hardware Lab, Sensor Hotspots &amp; Complete BOM
        </h1>
        <p style={{ fontSize: '14.5px', color: 'var(--ink-secondary)', maxWidth: '820px' }}>
          Phase 4 mounts coordinate-mapped hover-data sensor hotspots onto the
          front-bezel and internal 3S2P UPS renders alongside an interactive
          matte dark-grey PLA+ enclosure breakdown. Below are the target image
          slots and the complete 27-part Bill of Materials verified from{' '}
          <strong>XYZ_HomeDeck_Presentation.pdf</strong>.
        </p>

        <div
          style={{
            marginTop: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          <SafeImage
            filename={frontsideSlot.filename}
            alt={frontsideSlot.title}
            slotTitle={frontsideSlot.title}
            slotCaption={frontsideSlot.caption}
            aspectRatio={frontsideSlot.aspectRatio}
            phaseTarget="Phase 4 — Front Bezel Hotspots"
          />
          <SafeImage
            filename={upsSlot.filename}
            alt={upsSlot.title}
            slotTitle={upsSlot.title}
            slotCaption={upsSlot.caption}
            aspectRatio={upsSlot.aspectRatio}
            phaseTarget="Phase 4 — 3S2P UPS Bay Hotspots"
          />
        </div>
      </section>

      {/* Complete 27-Part Verified BOM Table */}
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
            <h2 style={{ fontSize: '19px', fontWeight: 700 }}>
              Complete Raspberry Pi 4 Flagship Bill of Materials (27 Parts)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '3px' }}>
              {BOM_VERIFIED_SUMMARY.subtotalNote}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'Robocraze.com', 'FlyRobo.in', 'Department Provided'].map(
              (vendor) => (
                <button
                  key={vendor}
                  type="button"
                  onClick={() => setVendorFilter(vendor)}
                  className={vendorFilter === vendor ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  {vendor === 'all' ? 'All Vendors (27)' : vendor}
                </button>
              )
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--ink-secondary)',
                }}
              >
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Component</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Subsystem</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Qty</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Vendor</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>SKU ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Unit Price</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Photo</th>
              </tr>
            </thead>
            <tbody>
              {filteredBom.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: '1px solid var(--border-hairline)' }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      {item.verified ? (
                        <CheckCircle size={15} weight="duotone" color="var(--accent-emerald)" />
                      ) : (
                        <WarningCircle size={15} weight="duotone" color="var(--accent-amber)" />
                      )}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--ink-secondary)' }}>
                    {item.subsystemLabel}
                  </td>
                  <td className="tabular-nums" style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {item.qty}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--ink-secondary)' }}>
                    {item.vendorUrlDomain}
                  </td>
                  <td className="tabular-nums" style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {item.skuId}
                  </td>
                  <td
                    className="tabular-nums"
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: item.verified ? 'var(--accent-emerald)' : 'var(--ink-muted)',
                    }}
                  >
                    {item.priceDisplay}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {item.imagePath ? (
                      <button
                        type="button"
                        onClick={() => setInspectedComponent(item)}
                        className="btn-secondary"
                        style={{ padding: '4px 9px', fontSize: '12px' }}
                      >
                        <ArrowsOutSimple size={13} weight="bold" />
                        <span>Inspect</span>
                      </button>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: 'var(--ink-muted)',
                        }}
                      >
                        <Cube size={13} weight="regular" />
                        <span>Spec only</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ComponentLightboxModal
        component={inspectedComponent}
        items={VERIFIED_GALLERY_COMPONENTS}
        onClose={() => setInspectedComponent(null)}
        onSelect={setInspectedComponent}
      />
    </div>
  );
}
