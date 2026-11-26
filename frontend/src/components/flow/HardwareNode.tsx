import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  BatteryChargingVertical,
  BellRinging,
  Camera,
  Cpu,
  Desktop,
  Fire,
  HardDrives,
  Heartbeat,
  Laptop,
  PhoneCall,
  Radio,
  Thermometer,
  WaveSine,
} from '@phosphor-icons/react';
import type {
  FlowTone,
  HardwareFlowNode,
  HardwareNodeData,
  StepRole,
} from '../../data/architectureTopology';

const TONE_ACCENTS: Record<
  FlowTone,
  { border: string; accentBar: string; badgeText: string; badgeBg: string }
> = {
  emerald: {
    border: '#15803D',
    accentBar: '#15803D',
    badgeText: '#15803D',
    badgeBg: '#F0FDF4',
  },
  blue: {
    border: '#1D4ED8',
    accentBar: '#1D4ED8',
    badgeText: '#1D4ED8',
    badgeBg: '#EFF6FF',
  },
  amber: {
    border: '#B45309',
    accentBar: '#B45309',
    badgeText: '#B45309',
    badgeBg: '#FFFBEB',
  },
  crimson: {
    border: '#B91C1C',
    accentBar: '#B91C1C',
    badgeText: '#B91C1C',
    badgeBg: '#FEF2F2',
  },
  slate: {
    border: '#CBD5E1',
    accentBar: '#94A3B8',
    badgeText: '#475569',
    badgeBg: '#F1F5F9',
  },
};

function stepRoleColors(role: StepRole, tone: FlowTone) {
  if (role === 'START') {
    return {
      bg: '#DCFCE7',
      border: '#86EFAC',
      text: '#15803D',
    };
  }
  if (role === 'END') {
    return tone === 'crimson'
      ? {
          bg: '#FEE2E2',
          border: '#FCA5A5',
          text: '#B91C1C',
        }
      : {
          bg: '#DBEAFE',
          border: '#93C5FD',
          text: '#1D4ED8',
        };
  }
  return {
    bg: '#F1F5F9',
    border: '#CBD5E1',
    text: '#334155',
  };
}

function renderFallbackNodeIcon(
  iconKey: HardwareNodeData['iconKey'],
  color: string
) {
  switch (iconKey) {
    case 'pulse':
      return <Heartbeat size={22} weight="duotone" color={color} />;
    case 'temp':
      return <Thermometer size={22} weight="duotone" color={color} />;
    case 'radar':
      return <Radio size={22} weight="duotone" color={color} />;
    case 'gas':
      return <Fire size={22} weight="duotone" color={color} />;
    case 'sensors':
      return <WaveSine size={22} weight="duotone" color={color} />;
    case 'relay':
      return <BellRinging size={22} weight="duotone" color="#B91C1C" />;
    case 'camera':
      return <Camera size={22} weight="duotone" color={color} />;
    case 'esp32':
      return <Cpu size={22} weight="duotone" color={color} />;
    case 'rpi4':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px',
          }}
        >
          <HardDrives size={18} weight="duotone" color="#1D4ED8" />
          <span
            style={{
              fontSize: '8.5px',
              fontWeight: 800,
              color: '#1D4ED8',
              letterSpacing: '0.02em',
            }}
          >
            RPi 4B
          </span>
        </div>
      );
    case 'ups':
      return <BatteryChargingVertical size={22} weight="duotone" color={color} />;
    case 'screen':
      return <Desktop size={22} weight="duotone" color={color} />;
    case 'laptop':
      return <Laptop size={22} weight="duotone" color="#1D4ED8" />;
    case 'cloud':
      return <PhoneCall size={22} weight="duotone" color="#B91C1C" />;
  }
}

export function HardwareNode({ data }: NodeProps<HardwareFlowNode>) {
  const palette = TONE_ACCENTS[data.tone];
  const roleBadge = stepRoleColors(data.stepRole, data.tone);

  const handleStyle = {
    width: 8,
    height: 8,
    backgroundColor: data.active ? palette.accentBar : '#94A3B8',
    border: '1.5px solid #FFFFFF',
  };

  return (
    <div
      style={{
        width: 256,
        backgroundColor: '#FFFFFF',
        border: data.selected
          ? '2px solid #1D4ED8'
          : data.active
            ? `1.5px solid ${palette.border}`
            : '1px solid #CBD5E1',
        borderRadius: '8px',
        boxShadow: data.active
          ? '0 4px 12px rgba(15, 23, 42, 0.08)'
          : '0 1px 3px rgba(15, 23, 42, 0.04)',
        opacity: data.dimmed ? 0.72 : 1,
        overflow: 'hidden',
        transition: 'opacity 160ms ease, border-color 160ms ease',
      }}
    >
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        style={handleStyle}
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        style={handleStyle}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        style={handleStyle}
      />
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        style={handleStyle}
      />
      <Handle
        id="top-source"
        type="source"
        position={Position.Top}
        style={handleStyle}
      />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        style={handleStyle}
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />

      {/* Crisp Color Accent Bar */}
      <div style={{ height: '3px', backgroundColor: palette.accentBar }} />

      {/* Top Step Pill + Interface Bus Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          padding: '5px 9px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
        }}
      >
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            padding: '1.5px 6px',
            borderRadius: '4px',
            backgroundColor: roleBadge.bg,
            border: `1px solid ${roleBadge.border}`,
            color: roleBadge.text,
            whiteSpace: 'nowrap',
          }}
        >
          {data.stepBadge}
        </span>

        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 700,
            color: '#475569',
            whiteSpace: 'nowrap',
          }}
        >
          {data.busTag}
        </span>
      </div>

      {/* Main Card Body with 44x44px Real Hardware Thumbnail */}
      <div
        style={{
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            padding: data.imagePath ? '2px' : 0,
          }}
        >
          {data.imagePath ? (
            <img
              src={data.imagePath}
              alt={data.title}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: 'none',
              }}
            />
          ) : (
            renderFallbackNodeIcon(data.iconKey, palette.badgeText)
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0F172A',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              fontSize: '10.5px',
              color: '#475569',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.subtitle}
          </div>
          {data.liveMetric ? (
            <div
              className="tabular-nums"
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: data.active ? palette.badgeText : '#0F172A',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {data.liveMetric}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
