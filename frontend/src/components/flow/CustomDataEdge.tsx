import { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import type { DataFlowEdge, FlowTone } from '../../data/architectureTopology';

const EDGE_COLORS: Record<FlowTone, string> = {
  emerald: '#15803D',
  blue: '#1D4ED8',
  amber: '#B45309',
  crimson: '#B91C1C',
  slate: '#CBD5E1',
};

export function CustomDataEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<DataFlowEdge>) {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const isActive = Boolean(data?.active);
  const tone: FlowTone = data?.tone ?? 'slate';
  const strokeColor = isActive ? EDGE_COLORS[tone] : '#CBD5E1';
  const markerEndId = `arrow-end-${id}`;
  const markerStartId = `arrow-start-${id}`;
  const packetDuration = data?.fast ? '1.15s' : '1.9s';

  const finalLabelX = labelX + (data?.labelOffsetX ?? 0);
  const finalLabelY = labelY + (data?.labelOffsetY ?? 0);

  // Only show edge pill labels on ACTIVE/ALERT wires, or on hover/selection for inactive wires
  const shouldShowLabel = Boolean(data?.label) && (isActive || isHovered || selected);

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <defs>
        <marker
          id={markerEndId}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={strokeColor} />
        </marker>
        {data?.bidirectional && isActive ? (
          <marker
            id={markerStartId}
            viewBox="0 0 10 10"
            refX="1.5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 10 1.5 L 1 5 L 10 8.5 z" fill={strokeColor} />
          </marker>
        ) : null}
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerEndId})`}
        markerStart={data?.bidirectional && isActive ? `url(#${markerStartId})` : undefined}
        interactionWidth={22}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 3 : isActive ? 2.5 : 1.5,
          strokeDasharray: isActive ? undefined : '5 4',
          opacity: isActive ? 1 : isHovered ? 0.9 : 0.65,
          transition: 'stroke 160ms ease, opacity 160ms ease',
        }}
      />

      {/* Directional Animated Traveling Data Packets ONLY on Active / Alert Edges */}
      {isActive ? (
        <g>
          <circle r="4" fill={strokeColor} stroke="#FFFFFF" strokeWidth="1.3">
            <animateMotion
              dur={packetDuration}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>

          {data?.bidirectional ? (
            <circle
              r="3.4"
              fill="#FFFFFF"
              stroke={strokeColor}
              strokeWidth="1.6"
            >
              <animateMotion
                dur={packetDuration}
                begin="0.45s"
                keyPoints="1;0"
                keyTimes="0;1"
                calcMode="linear"
                repeatCount="indefinite"
                path={edgePath}
              />
            </circle>
          ) : null}
        </g>
      ) : null}

      {/* Compact #FFFFFF Edge Labels for Active Wires (Inactive Shown Only on Hover) */}
      {shouldShowLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan tabular-nums"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${finalLabelX}px,${finalLabelY}px)`,
              pointerEvents: 'all',
              backgroundColor: '#FFFFFF',
              border: selected
                ? '1.5px solid #1D4ED8'
                : isActive
                  ? `1px solid ${strokeColor}`
                  : '1px solid #CBD5E1',
              color: isActive ? '#0F172A' : '#64748B',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 700,
              maxWidth: '145px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)',
              zIndex: isActive ? 30 : 10,
            }}
          >
            {data?.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}
