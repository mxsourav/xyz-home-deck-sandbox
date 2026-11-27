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
} from '../../data/architectureTopology';

const ACTIVE_BORDER_COLORS: Record<FlowTone, string> = {
  emerald: '#1E9E4F',
  blue: '#0071E3',
  amber: '#C93400',
  crimson: '#D70015',
  slate: '#CBD5E1',
};

function getStatusPillStyle(status: HardwareNodeStatus, tone: FlowTone) {
  if (status === 'ALERT') {
    return tone === 'amber'
      ? { bg: 'rgba(255, 159, 10, 0.1)', border: '#C93400', text: '#9A2A00', dot: '#C93400' }
      : { bg: 'rgba(255, 59, 48, 0.08)', border: '#D70015', text: '#B00011', dot: '#D70015' };
  }
  if (status === 'ON') {
    if (tone === 'amber') {
      return { bg: '#FEF3C7', border: '#C93400', text: '#92400E', dot: '#C93400' };
    }
    if (tone === 'blue') {
      return { bg: 'rgba(0, 113, 227, 0.08)', border: '#0071E3', text: '#0071E3', dot: '#0071E3' };
    }
    return { bg: 'rgba(52, 199, 89, 0.1)', border: '#1E9E4F', text: '#1E7A3E', dot: '#1E9E4F' };
  }
  // Muted inactive palette for both STANDBY & OFF
  return { bg: '#F1F5F9', border: '#CBD5E1', text: '#64748B', dot: '#94A3B8' };
}

function renderFallbackNodeIcon(iconKey: HardwareNodeData['iconKey'], isInactive: boolean) {
  const iconColor = (activeHex: string) => (isInactive ? '#64748B' : activeHex);
  switch (iconKey) {
    case 'plug':
      return <Plug size={20} weight="duotone" color={iconColor('#0071E3')} />;
    case 'pulse':
      return <Heartbeat size={20} weight="duotone" color={iconColor('#1E9E4F')} />;
    case 'temp':
      return <Thermometer size={20} weight="duotone" color={iconColor('#C93400')} />;
    case 'radar':
      return <Radio size={20} weight="duotone" color={iconColor('#0071E3')} />;
    case 'gas':
      return <Fire size={20} weight="duotone" color={iconColor('#D70015')} />;
    case 'sensors':
      return <WaveSine size={20} weight="duotone" color={iconColor('#0F172A')} />;
    case 'relay':
      return <BellRinging size={20} weight="duotone" color={iconColor('#D70015')} />;
    case 'camera':
      return <Camera size={20} weight="duotone" color={iconColor('#0071E3')} />;
    case 'esp32':
      return <Cpu size={20} weight="duotone" color={iconColor('#1E9E4F')} />;
    case 'rpi4':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
          <HardDrives size={18} weight="duotone" color={iconColor('#0071E3')} />
          <span style={{ fontSize: '8px', fontWeight: 800, color: iconColor('#0071E3') }}>
            RPi 4B
          </span>
        </div>
      );
    case 'ups':
      return <BatteryChargingVertical size={20} weight="duotone" color={iconColor('#C93400')} />;
    case 'screen':
      return <Desktop size={20} weight="duotone" color={iconColor('#0071E3')} />;
    case 'laptop':
      return <Laptop size={20} weight="duotone" color={iconColor('#0071E3')} />;
    case 'cloud':
      return <PhoneCall size={20} weight="duotone" color={iconColor('#D70015')} />;
  }
}

export function HardwareNode({ data }: NodeProps<HardwareFlowNode>) {
  const isInactive = data.nodeStatus === 'STANDBY' || data.nodeStatus === 'OFF';
  const isAlert = data.nodeStatus === 'ALERT';

  const activeColor = ACTIVE_BORDER_COLORS[data.tone];
  const statusPill = getStatusPillStyle(data.nodeStatus, data.tone);

  const cardBackground = isInactive
    ? '#F1F5F9'
    : isAlert
      ? data.tone === 'amber'
        ? '#FFFBEB'
        : '#FEF2F2'
      : '#FFFFFF';

  const cardBorder = data.selected
    ? '2px solid #0071E3'
    : isInactive
      ? '1px solid #CBD5E1'
      : `2px solid ${activeColor}`;

  const handleStyle = {
    width: 7,
    height: 7,
    backgroundColor: isInactive ? '#CBD5E1' : activeColor,
    border: '1.5px solid #FFFFFF',
  };

  return (
    <div
      style={{
        width: 245,
        minHeight: 98,
        maxHeight: 108,
        backgroundColor: cardBackground,
        border: cardBorder,
        borderRadius: '7px',
        boxShadow: isInactive
          ? 'none'
          : '0 4px 12px rgba(15, 23, 42, 0.08)',
        opacity: isInactive ? 0.55 : 1,
        overflow: 'hidden',
        transition: 'opacity 160ms ease, border-color 160ms ease, background-color 160ms ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Handle id="left-target" type="target" position={Position.Left} style={handleStyle} />
      <Handle id="right-source" type="source" position={Position.Right} style={handleStyle} />
      <Handle id="right-target" type="target" position={Position.Right} style={handleStyle} />
      <Handle id="top-target" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="top-source" type="source" position={Position.Top} style={handleStyle} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={handleStyle} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={handleStyle} />

      {/* Explicit State Badge + Step Role Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          padding: '4px 8px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: isInactive ? '#E2E8F0' : '#F8FAFC',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '9px',
            fontWeight: 800,
            padding: '1px 5px',
            borderRadius: '3px',
            backgroundColor: statusPill.bg,
            border: `1px solid ${statusPill.border}`,
            color: statusPill.text,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: statusPill.dot,
              flexShrink: 0,
            }}
          />
          <span>{data.statusBadgeLabel}</span>
        </span>

        <span
          style={{
            fontSize: '8.5px',
            fontWeight: 700,
            color: '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          {data.stepBadge}
        </span>
      </div>

      {/* Main Card Body with 40x40px Hardware Thumbnail */}
      <div
        style={{
          padding: '6px 9px',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          flex: 1,
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '5px',
            backgroundColor: isInactive ? '#E2E8F0' : '#FFFFFF',
            border: '1px solid #CBD5E1',
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
                filter: isInactive ? 'grayscale(100%)' : 'none',
              }}
            />
          ) : (
            renderFallbackNodeIcon(data.iconKey, isInactive)
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11.5px',
              fontWeight: 700,
              color: isInactive ? '#64748B' : '#0F172A',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: isInactive ? '#64748B' : '#475569',
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
              fontSize: '10px',
              fontWeight: 700,
              color: isInactive ? '#64748B' : activeColor,
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
