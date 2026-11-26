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
  Plug,
  Radio,
  Thermometer,
  WaveSine,
} from '@phosphor-icons/react';
import type {
  FlowTone,
  HardwareFlowNode,
  HardwareNodeData,
  HardwareNodeStatus,
  StepRole,
} from '../../data/architectureTopology';

const TONE_ACCENTS: Record<
  FlowTone,
  { border: string; accentBar: string; metricColor: string }
> = {
  emerald: {
    border: '#15803D',
    accentBar: '#15803D',
    metricColor: '#15803D',
  },
  blue: {
    border: '#1D4ED8',
    accentBar: '#1D4ED8',
    metricColor: '#1D4ED8',
  },
  amber: {
    border: '#B45309',
    accentBar: '#B45309',
    metricColor: '#B45309',
  },
  crimson: {
    border: '#B91C1C',
    accentBar: '#B91C1C',
    metricColor: '#B91C1C',
  },
  slate: {
    border: '#CBD5E1',
    accentBar: '#94A3B8',
    metricColor: '#475569',
  },
};

function getStatusPillStyle(status: HardwareNodeStatus, tone: FlowTone) {
  if (status === 'ALERT') {
    return tone === 'amber'
      ? { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', dot: '#B45309' }
      : { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', dot: '#B91C1C' };
  }
  if (status === 'ON') {
    if (tone === 'amber') {
      return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', dot: '#B45309' };
    }
    if (tone === 'blue') {
      return { bg: '#DBEAFE', border: '#60A5FA', text: '#1E40AF', dot: '#1D4ED8' };
    }
    return { bg: '#DCFCE7', border: '#4ADE80', text: '#166534', dot: '#15803D' };
  }
  if (status === 'STANDBY') {
    return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', dot: '#3B82F6' };
  }
  return { bg: '#F1F5F9', border: '#CBD5E1', text: '#64748B', dot: '#94A3B8' };
}

function getStepTagStyle(role: StepRole) {
  if (role === 'START') return { color: '#15803D', bg: '#F0FDF4' };
  if (role === 'END') return { color: '#1D4ED8', bg: '#EFF6FF' };
  return { color: '#475569', bg: '#F1F5F9' };
}

function renderFallbackNodeIcon(iconKey: HardwareNodeData['iconKey']) {
  switch (iconKey) {
    case 'plug':
      return <Plug size={22} weight="duotone" color="#1D4ED8" />;
    case 'pulse':
      return <Heartbeat size={22} weight="duotone" color="#15803D" />;
    case 'temp':
      return <Thermometer size={22} weight="duotone" color="#B45309" />;
    case 'radar':
      return <Radio size={22} weight="duotone" color="#1D4ED8" />;
    case 'gas':
      return <Fire size={22} weight="duotone" color="#B91C1C" />;
    case 'sensors':
      return <WaveSine size={22} weight="duotone" color="#0F172A" />;
    case 'relay':
      return <BellRinging size={22} weight="duotone" color="#B91C1C" />;
    case 'camera':
      return <Camera size={22} weight="duotone" color="#1D4ED8" />;
    case 'esp32':
      return <Cpu size={22} weight="duotone" color="#15803D" />;
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
          <HardDrives size={19} weight="duotone" color="#1D4ED8" />
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
      return <BatteryChargingVertical size={22} weight="duotone" color="#B45309" />;
    case 'screen':
      return <Desktop size={22} weight="duotone" color="#1D4ED8" />;
    case 'laptop':
      return <Laptop size={22} weight="duotone" color="#1D4ED8" />;
    case 'cloud':
      return <PhoneCall size={22} weight="duotone" color="#B91C1C" />;
  }
}

export function HardwareNode({ data }: NodeProps<HardwareFlowNode>) {
  const palette = TONE_ACCENTS[data.tone];
  const statusPill = getStatusPillStyle(data.nodeStatus, data.tone);
  const stepTag = getStepTagStyle(data.stepRole);

  const handleStyle = {
    width: 8,
    height: 8,
    backgroundColor: data.active ? palette.accentBar : '#94A3B8',
    border: '1.5px solid #FFFFFF',
  };

  return (
    <div
      style={{
        width: 260,
        backgroundColor: '#FFFFFF',
        border: data.selected
          ? '2px solid #1D4ED8'
          : data.nodeStatus === 'ALERT' || data.nodeStatus === 'ON'
            ? `1.5px solid ${palette.border}`
            : '1px solid #CBD5E1',
        borderRadius: '8px',
        boxShadow: data.active
          ? '0 4px 12px rgba(15, 23, 42, 0.08)'
          : '0 1px 3px rgba(15, 23, 42, 0.04)',
        opacity: data.nodeStatus === 'OFF' ? 0.72 : data.nodeStatus === 'STANDBY' ? 0.94 : 1,
        overflow: 'hidden',
        transition: 'opacity 160ms ease, border-color 160ms ease',
      }}
    >
      <Handle id="left-target" type="target" position={Position.Left} style={handleStyle} />
      <Handle id="right-source" type="source" position={Position.Right} style={handleStyle} />
      <Handle id="right-target" type="target" position={Position.Right} style={handleStyle} />
      <Handle id="top-target" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="top-source" type="source" position={Position.Top} style={handleStyle} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={handleStyle} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={handleStyle} />

      {/* Top Accent Bar */}
      <div
        style={{
          height: '3px',
          backgroundColor:
            data.nodeStatus === 'OFF'
              ? '#CBD5E1'
              : data.nodeStatus === 'STANDBY'
                ? '#93C5FD'
                : palette.accentBar,
        }}
      />

      {/* Explicit State Badge + Step Role Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '5px',
          padding: '5px 9px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '9.5px',
            fontWeight: 800,
            padding: '1.5px 6px',
            borderRadius: '4px',
            backgroundColor: statusPill.bg,
            border: `1px solid ${statusPill.border}`,
            color: statusPill.text,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: '5.5px',
              height: '5.5px',
              borderRadius: '50%',
              backgroundColor: statusPill.dot,
              flexShrink: 0,
            }}
          />
          <span>{data.statusBadgeLabel}</span>
        </span>

        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '1.5px 5px',
            borderRadius: '4px',
            backgroundColor: stepTag.bg,
            color: stepTag.color,
            whiteSpace: 'nowrap',
          }}
        >
          {data.stepBadge}
        </span>
      </div>

      {/* Main Card Body with 44x44px Hardware Thumbnail */}
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
              src={data.imagePath.replace(/^\/images\/components\/([^/.]+)\.[^.]+$/, '/images/thumbs/components/$1.webp')}
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
            renderFallbackNodeIcon(data.iconKey)
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
            {data.subtitle} · {data.busTag}
          </div>
          <div
            className="tabular-nums"
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: data.active ? palette.metricColor : '#64748B',
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.liveMetric}
          </div>
        </div>
      </div>
    </div>
  );
}
