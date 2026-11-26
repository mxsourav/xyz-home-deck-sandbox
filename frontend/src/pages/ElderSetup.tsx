import {
  Camera,
  Sliders,
  Translate,
  UserCheck,
  UserCirclePlus,
} from '@phosphor-icons/react';

const CALIBRATION_STEPS = [
  {
    step: '01',
    title: 'Register Parents',
    detail:
      'Capture parent name, age, reference photo, and family emergency contacts directly on the 7-inch touchscreen.',
    icon: <UserCirclePlus size={20} weight="duotone" color="var(--accent-blue)" />,
  },
  {
    step: '02',
    title: 'Learn Personal Baselines',
    detail:
      'Guided 30-second MAX30102 + MLX90614 check-ins establish individualized normal ranges instead of textbook averages.',
    icon: <Sliders size={20} weight="duotone" color="var(--accent-emerald)" />,
  },
  {
    step: '03',
    title: 'Native Language Binding',
    detail:
      'Bind Bengali, Hindi, or English voice prompts and large-type HUD screens independently from the child\'s alert language.',
    icon: <Translate size={20} weight="duotone" color="var(--accent-amber)" />,
  },
  {
    step: '04',
    title: 'Age-Adaptive Pacing & Guest Guard',
    detail:
      'Camera identification selects oversized controls and slower voice cadence for frail elders, while showing a neutral screen to unregistered guests.',
    icon: <Camera size={20} weight="duotone" color="var(--accent-blue)" />,
  },
];

export function ElderSetup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="clinical-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="status-pill blue">
            <UserCheck size={14} weight="duotone" />
            <span>Phase 3 Route Shell</span>
          </span>
          <span className="status-pill">Baseline Calibration &amp; Frailty Adaptation</span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
          Age-Adaptive Elder Registration &amp; Calibration
        </h1>
        <p style={{ fontSize: '14.5px', color: 'var(--ink-secondary)', maxWidth: '780px' }}>
          Every body has a different baseline: a resting heart rate of 55 BPM can
          be completely normal for one parent and an escalation trigger for
          another. Phase 3 implements this interactive onboarding and baseline
          calibration workflow.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        {CALIBRATION_STEPS.map((item) => (
          <div
            key={item.step}
            className="clinical-card"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {item.icon}
              <span
                className="tabular-nums"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--ink-muted)',
                }}
              >
                STEP {item.step}
              </span>
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{item.title}</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
              {item.detail}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
