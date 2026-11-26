import { NavLink } from 'react-router-dom';
import {
  Circuitry,
  Cpu,
  FilePdf,
  GitFork,
  Heartbeat,
  SlidersHorizontal,
  UserCheck,
} from '@phosphor-icons/react';
import { BackendStatus } from './BackendStatus';

interface NavItem {
  to: string;
  label: string;
  phase?: string;
  icon: React.ReactNode;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Overview Tour',
    icon: <Heartbeat size={16} weight="duotone" />,
    end: true,
  },
  {
    to: '/sandbox',
    label: 'Kiosk Sandbox',
    icon: <SlidersHorizontal size={16} weight="duotone" />,
  },
  {
    to: '/setup',
    label: 'Elder Setup',
    icon: <UserCheck size={16} weight="duotone" />,
  },
  {
    to: '/hardware',
    label: 'Hardware Lab',
    icon: <Circuitry size={16} weight="duotone" />,
  },
  {
    to: '/architecture',
    label: 'System Flow',
    icon: <GitFork size={16} weight="duotone" />,
  },
];

export function Navbar() {
  return (
    <header className="top-navbar">
      <div className="top-navbar-inner">
        <NavLink to="/" className="brand-mark" aria-label="XYZ Home Deck Home">
          <div className="brand-badge">
            <Cpu size={19} weight="duotone" />
          </div>
          <div>
            <div className="brand-title">XYZ Home Deck</div>
            <div className="brand-subtitle">RPi 4 + ESP32-S3 Flagship</div>
          </div>
        </NavLink>

        <nav className="nav-links" aria-label="Primary sections">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link-item${isActive ? ' active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
              {item.phase ? (
                <span className="nav-phase-chip">{item.phase}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          <BackendStatus />
          <a
            href="/docs/XYZ_HomeDeck_Presentation.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            title="Open Department Funding Proposal PDF"
          >
            <FilePdf size={16} weight="duotone" />
            <span>Proposal PDF</span>
          </a>
        </div>
      </div>
    </header>
  );
}
