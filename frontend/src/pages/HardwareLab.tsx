import { useMemo, useState } from 'react';
import {
  ArrowsOutSimple,
  Camera,
  CheckCircle,
  Cube,
  CubeTransparent,
  ListBullets,
  MagnifyingGlass,
  WarningCircle,
} from '@phosphor-icons/react';
import { AnnotatedHardwareMap } from '../components/AnnotatedHardwareMap';
import { ComponentCard } from '../components/ComponentCard';
import { ComponentLightboxModal } from '../components/ComponentLightboxModal';
import { Enclosure3DViewer } from '../components/Enclosure3DViewer';
import { SensorInspectorCard } from '../components/SensorInspectorCard';
import {
  BOM_VERIFIED_SUMMARY,
  HARDWARE_COMPONENTS,
  VERIFIED_GALLERY_COMPONENTS,
  type GalleryCategory,
  type HardwareComponent,
} from '../data/hardwareBom';

type HardwareLabMode = '3d-xray' | 'annotated-map' | 'bom-gallery';

const GALLERY_FILTERS: { id: 'all' | GalleryCategory; label: string }[] = [
  { id: 'all', label: 'All (14)' },
  { id: 'vitals', label: 'Vitals & Biometrics' },
  { id: 'spatial', label: 'Spatial & Vision' },
  { id: 'safety', label: 'Environment & Safety' },
  { id: 'compute-power', label: 'Compute & Power' },
];

export function HardwareLab() {
  const [activeMode, setActiveMode] = useState<HardwareLabMode>('3d-xray');
  const [selectedComponent, setSelectedComponent] = useState<HardwareComponent>(
    () =>
      HARDWARE_COMPONENTS.find((c) => c.id === 'ov5647-wide-angle') ??
      HARDWARE_COMPONENTS[0]
  );

  // Mode C state
  const [galleryCategory, setGalleryCategory] = useState<'all' | GalleryCategory>(
    'all'
  );
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [bomSearch, setBomSearch] = useState<string>('');
  const [lightboxComponent, setLightboxComponent] =
    useState<HardwareComponent | null>(null);

  const componentsById = useMemo(
    () => Object.fromEntries(HARDWARE_COMPONENTS.map((c) => [c.id, c])),
    []
  );

  const filteredGallery = useMemo(() => {
    if (galleryCategory === 'all') return VERIFIED_GALLERY_COMPONENTS;
    return VERIFIED_GALLERY_COMPONENTS.filter(
      (item) => item.galleryCategory === galleryCategory
    );
  }, [galleryCategory]);

  const filteredBom = useMemo(() => {
    const q = bomSearch.trim().toLowerCase();
    return HARDWARE_COMPONENTS.filter((item) => {
      const matchesVendor =
        vendorFilter === 'all' || item.vendor === vendorFilter;
      if (!matchesVendor) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.skuId.toLowerCase().includes(q) ||
        item.subsystemLabel.toLowerCase().includes(q) ||
        item.vendorUrlDomain.toLowerCase().includes(q)
      );
    });
  }, [vendorFilter, bomSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Clean Header + 3-Mode Switcher */}
      <section
        className="clinical-card"
        style={{
          padding: '20px 24px',
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
            Hardware Lab · RPi 4 + ESP32-S3 Enclosure, Hotspots &amp; Verified BOM
          </div>
          <h1 style={{ fontSize: '23px', fontWeight: 800 }}>
            Interactive Hardware Explorer &amp; 3D Enclosure Viewer
          </h1>
        </div>

        {/* Mode Switcher */}
        <div
          role="tablist"
          aria-label="Hardware lab exploration modes"
          style={{
            display: 'inline-flex',
            gap: '6px',
            padding: '4px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === '3d-xray'}
            onClick={() => setActiveMode('3d-xray')}
            className={activeMode === '3d-xray' ? 'btn-primary' : 'btn-secondary'}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              border: activeMode === '3d-xray' ? undefined : 'none',
            }}
          >
            <CubeTransparent size={15} weight="duotone" />
            <span>3D Enclosure &amp; X-Ray</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'annotated-map'}
            onClick={() => setActiveMode('annotated-map')}
            className={activeMode === 'annotated-map' ? 'btn-primary' : 'btn-secondary'}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              border: activeMode === 'annotated-map' ? undefined : 'none',
            }}
          >
            <Camera size={15} weight="duotone" />
            <span>Annotated Hardware Map</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'bom-gallery'}
            onClick={() => setActiveMode('bom-gallery')}
            className={activeMode === 'bom-gallery' ? 'btn-primary' : 'btn-secondary'}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              border: activeMode === 'bom-gallery' ? undefined : 'none',
            }}
          >
            <ListBullets size={15} weight="duotone" />
            <span>Full 27-Item BOM &amp; Gallery</span>
          </button>
        </div>
      </section>

      {/* === MODE A: PROCEDURAL 3D ENCLOSURE & INTERNAL X-RAY === */}
      {activeMode === '3d-xray' ? (
        <div className="hardware-lab-grid">
          <Enclosure3DViewer
            componentsById={componentsById}
            selectedComponentId={selectedComponent.id}
            onSelectComponent={setSelectedComponent}
          />
          <SensorInspectorCard
            component={selectedComponent}
            onExpandPhoto={setLightboxComponent}
          />
        </div>
      ) : null}

      {/* === MODE B: ANNOTATED HARDWARE PHOTO EXPLORER === */}
      {activeMode === 'annotated-map' ? (
        <div className="hardware-lab-grid">
          <AnnotatedHardwareMap
            components={HARDWARE_COMPONENTS}
            selectedComponentId={selectedComponent.id}
            onSelectComponent={setSelectedComponent}
          />
          <SensorInspectorCard
            component={selectedComponent}
            onExpandPhoto={setLightboxComponent}
          />
        </div>
      ) : null}

      {/* === MODE C: FILTERABLE 12-SENSOR GALLERY & FULL 27-ITEM BOM === */}
      {activeMode === 'bom-gallery' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 12-Sensor Gallery */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>
                  Verified Sensor &amp; Input Gallery (12 Photographed Modules)
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '3px' }}>
                  Hover any module for sensor telemetry popover (zero image zoom).
                  Click any photo to inspect fullscreen.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {GALLERY_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setGalleryCategory(f.id)}
                    className={galleryCategory === f.id ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '6px 11px', fontSize: '12px' }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredGallery.map((item) => (
                <ComponentCard
                  key={item.id}
                  component={item}
                  onInspect={setLightboxComponent}
                />
              ))}
            </div>
          </section>

          {/* Complete 27-Item BOM Table */}
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
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>
                  Complete 27-Item Flagship Bill of Materials
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                  {BOM_VERIFIED_SUMMARY.subtotalNote}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Instant Search */}
                <div style={{ position: 'relative', minWidth: '230px' }}>
                  <MagnifyingGlass
                    size={15}
                    weight="bold"
                    color="var(--ink-muted)"
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="search"
                    aria-label="Search BOM components, SKUs, or subsystems"
                    placeholder="Search component, SKU, or bus..."
                    value={bomSearch}
                    onChange={(e) => setBomSearch(e.target.value)}
                    className="clinical-input"
                    style={{ paddingLeft: '32px' }}
                  />
                </div>

                {/* Vendor Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {['all', 'Robocraze', 'FlyRobo', 'Department Provided'].map(
                    (vendor) => (
                      <button
                        key={vendor}
                        type="button"
                        onClick={() => setVendorFilter(vendor)}
                        className={
                          vendorFilter === vendor ? 'btn-primary' : 'btn-secondary'
                        }
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        {vendor === 'all' ? 'All Vendors' : vendor}
                      </button>
                    )
                  )}
                </div>
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
                    <th style={{ padding: '10px 10px', fontWeight: 700 }}>#</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Component</th>
                    <th style={{ padding: '10px 10px', fontWeight: 700 }}>Qty</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Vendor</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>SKU</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Line Price (₹)</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBom.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--border-hairline)' }}
                    >
                      <td className="tabular-nums" style={{ padding: '10px 10px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          {item.verified ? (
                            <CheckCircle size={15} weight="duotone" color="var(--accent-emerald)" />
                          ) : (
                            <WarningCircle size={15} weight="duotone" color="var(--accent-amber)" />
                          )}
                          <div>
                            <div>{item.name}</div>
                            <div style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--ink-muted)' }}>
                              {item.subsystemLabel} · {item.interfaceBus}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="tabular-nums" style={{ padding: '10px 10px', fontWeight: 600 }}>
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
                        {item.lineTotalDisplay}
                        {item.qtyMultiplier > 1 ? (
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--ink-muted)' }}>
                            ({item.priceDisplay} each)
                          </span>
                        ) : null}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {item.imagePath ? (
                          <button
                            type="button"
                            onClick={() => setLightboxComponent(item)}
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

            {/* Summary Footer */}
            <div
              className="clinical-subtle-panel"
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                  Department-Provided RPi 4 Build Subtotal:{' '}
                  <span className="tabular-nums" style={{ color: 'var(--accent-emerald)' }}>
                    ≈ {BOM_VERIFIED_SUMMARY.subtotalDisplay}
                  </span>{' '}
                  (Raspberry Pi 4 Model B 4GB lab-issued at ₹0)
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', marginTop: '3px' }}>
                  <strong>Dual-Network Upgrade:</strong>{' '}
                  {BOM_VERIFIED_SUMMARY.dualNetworkNote}
                </p>
              </div>

              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                Showing {filteredBom.length} of {HARDWARE_COMPONENTS.length} BOM rows
              </span>
            </div>
          </section>
        </div>
      ) : null}

      <ComponentLightboxModal
        component={lightboxComponent}
        items={VERIFIED_GALLERY_COMPONENTS}
        onClose={() => setLightboxComponent(null)}
        onSelect={setLightboxComponent}
      />
    </div>
  );
}
