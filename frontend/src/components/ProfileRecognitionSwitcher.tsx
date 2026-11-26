import { LockKey, UserCheck } from '@phosphor-icons/react';
import { useSandbox, type ProfileId } from '../context/SandboxContext';

interface ProfileRecognitionSwitcherProps {
  onSelectCallback?: (id: ProfileId) => void;
}

export function ProfileRecognitionSwitcher({
  onSelectCallback,
}: ProfileRecognitionSwitcherProps) {
  const { activeProfileId, profiles, selectProfile } = useSandbox();

  const handleSelect = (id: ProfileId) => {
    selectProfile(id);
    onSelectCallback?.(id);
  };

  const rohanFirst = profiles.rohan.name.split(' ')[0] || 'Rohan';
  const subhashreeFirst = profiles.subhashree.name.split(' ')[0] || 'Subhashree';

  const options: {
    id: ProfileId;
    label: string;
    isGuest?: boolean;
  }[] = [
    {
      id: 'rohan',
      label: `${rohanFirst} (${profiles.rohan.age})`,
    },
    {
      id: 'subhashree',
      label: `${subhashreeFirst} (${profiles.subhashree.age})`,
    },
    {
      id: 'guest',
      label: 'Guest Mode',
      isGuest: true,
    },
  ];

  return (
    <div
      role="group"
      aria-label="Active face recognition profile switcher"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '3px',
        backgroundColor: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        flexWrap: 'wrap',
      }}
    >
      {options.map((opt) => {
        const isActive = activeProfileId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelect(opt.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid transparent',
              outline: 'none',
              boxShadow: isActive ? '0 1px 2px rgba(15, 23, 42, 0.12)' : 'none',
              backgroundColor: isActive
                ? opt.isGuest
                  ? 'var(--accent-amber)'
                  : 'var(--accent-blue)'
                : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--ink-secondary)',
            }}
          >
            {opt.isGuest ? (
              <LockKey size={13} weight="duotone" />
            ) : (
              <UserCheck size={13} weight="duotone" />
            )}
            <span className="tabular-nums">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
