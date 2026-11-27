import { ProfileRecognitionSwitcher } from '../components/ProfileRecognitionSwitcher';
import { KioskDeviceScreen } from '../components/KioskDeviceScreen';
import { useSandbox } from '../context/SandboxContext';

export function ElderSetup() {
  const { screenMode, setScreenModeManual } = useSandbox();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Clean Centered Setup Header Toolbar */}
      <section
        style={{
          width: '100%',
          maxWidth: '1024px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)' }}>
            Device Onboarding &amp; Calibration
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
            Complete registration, camera enrollment, sensor calibration, and daily care schedule directly inside the 7-inch display.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {screenMode !== 'SETUP' ? <ProfileRecognitionSwitcher /> : null}

          <div
            role="group"
            aria-label="Preview setup or active HUD"
            style={{
              display: 'inline-flex',
              padding: '3px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '8px',
              gap: '3px',
            }}
          >
            {(
              [
                { id: 'SETUP', label: 'Out-of-Box Setup' },
                { id: 'STANDBY', label: 'Standby HUD' },
                { id: 'VITALS', label: 'Vitals Check-In' },
              ] as const
            ).map((item) => {
              const active = screenMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreenModeManual(item.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    backgroundColor: active ? 'var(--accent-blue)' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--ink-secondary)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Display-Only Centered 7-Inch 1024x600 LCD Hardware Simulator */}
      <div style={{ width: '100%', maxWidth: '1024px', margin: '0 auto' }}>
        <KioskDeviceScreen
          showEscalationStrip={false}
          defaultSetupMode
          emptySetupDefaults
        />
      </div>
    </div>
  );
}
