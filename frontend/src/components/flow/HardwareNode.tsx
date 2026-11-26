import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  BatteryChargingVertical,
  BellRinging,
  Camera,
  CloudArrowUp,
  Cpu,
  Desktop,
  Fire,
  HardDrives,
  Heartbeat,
  Laptop,
  Radio,
  Thermometer,
  WaveSine,
} from '@phosphor-icons/react';
import type {
  FlowTone,
  HardwareFlowNode,
  HardwareNodeData,
} from '../../data/architectureTopology';

const TONE_ACCENTS: Record<
  FlowTone,
  { border: string; headerBg: string; badgeText: string; badgeBg: string }
> = {
  emerald: {
    border: '#15803D',
    headerBg: '#F0FDF4',
    badgeText: '#15803D',
    badgeBg: '#DCFCE7',
  },
  blue: {
    border: '#1D4ED8',
    headerBg: '#EFF6FF',
    badgeText: '#1D4ED8',
    badgeBg: '#DBEAFE',
  },
  amber: {
    border: '#B45309',
    headerBg: '#FFFBEB',
    badgeText: '#B45309',
    badgeBg: '#FEF3C7',
  },
  crimson: {
    border: '#B91C1C',
    headerBg: '#FEF2F2',
    badgeText: '#B91C1C',
    badgeBg: '#FEE2E2',
  },
  slate: {
    border: '#CBD5E1',
    headerBg: '#F8FAFC',
    badgeText: '#475569',
    badgeBg: '#F1F5F9',
  },
};

function renderNodeIcon(iconKey: HardwareNodeData['iconKey'], color: string) {
  switch (iconKey) {
    case 'pulse':
      return <Heartbeat size={16} weight="duotone" color={color} />;
    case 'temp':
      return <Thermometer size={16} weight="duotone" color={color} />;
    case 'radar':
      return <Radio size={16} weight="duotone" color={color} />;
    case 'gas':
      return <Fire size={16} weight="duotone" color={color} />;
    case 'sensors':
      return <WaveSine size={16} weight="duotone" color={color} />;
    case 'relay':
      return <BellRinging size={16} weight="duotone" color={color} />;
    case 'camera':
      return <Camera size={16} weight="duotone" color={color} />;
    case 'esp32':
      return <Cpu size={16} weight="duotone" color={color} />;
    case 'rpi4':
      return <HardDrives size={16} weight="duotone" color={color} />;
    case 'ups':
      return <BatteryChargingVertical size={16} weight="duotone" color={color} />;
    case 'screen':
      return <Desktop size={16} weight="duotone" color={color} />;
    case 'laptop':
      return <Laptop size={16} weight="duotone" color={color} />;
    case 'cloud':
      return <CloudArrowUp size={16} weight="duotone" color={color} />;
  }
}

export function HardwareNode({ data }: NodeProps<HardwareFlowNode>) {
  const palette = TONE_ACCENTS[data.tone];
  const handleStyle = {
    width: 8,
    height: 8,
    backgroundColor: data.active ? palette.border : '#94A3B8',
    border: '1.5px solid #FFFFFF',
  };

  return (
    <div
      style={{
        width: 214,
        backgroundColor: '#FFFFFF',
        border: data.selected
          ? `2px solid #1D4ED8`
          : data.active
            ? `1.5px solid ${palette.border}`
            : '1px solid #CBD5E1',
        borderRadius: '6px',
        boxShadow: data.active
          ? '0 4px 12px rgba(15, 23, 42, 0.09)'
          : '0 1px 3px rgba(15, 23, 42, 0.05)',
        opacity: data.dimmed ? 0.52 : 1,
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

      {/* Crisp Color-Coded Header Strip (contained inside overflow:hidden, zero curved horns) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          padding: '6px 10px',
          backgroundColor: palette.headerBg,
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          {renderNodeIcon(data.iconKey, palette.badgeText)}
          <span
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
          </span>
        </div>

        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '3px',
            backgroundColor: palette.badgeBg,
            color: palette.badgeText,
            whiteSpace: 'nowrap',
          }}
        >
          {data.busTag}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '7px 10px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
          {data.subtitle}
        </div>
        {data.liveMetric ? (
          <div
            className="tabular-nums"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: data.active ? palette.badgeText : '#0F172A',
            }}
          >
            {data.liveMetric}
          </div>
        ) : null}
      </div>
    </div>
  );
}
