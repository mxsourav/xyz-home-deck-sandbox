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
  const isDimmed = Boolean(data?.dimmed);
  const tone: FlowTone = data?.tone ?? 'slate';
  const strokeColor = isActive ? EDGE_COLORS[tone] : '#CBD5E1';
  const markerEndId = `arrow-end-${id}`;
  const markerStartId = `arrow-start-${id}`;
  const packetDuration = data?.fast ? '1.15s' : '1.9s';

  const finalLabelX = labelX + (data?.labelOffsetX ?? 0);
  const finalLabelY = labelY + (data?.labelOffsetY ?? 0);

  return (
    <>
      <defs>
        <marker
          id={markerEndId}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="6.5"
          markerHeight="6.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={strokeColor} />
        </marker>
        {data?.bidirectional ? (
          <marker
            id={markerStartId}
            viewBox="0 0 10 10"
            refX="1.5"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
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
        markerStart={data?.bidirectional ? `url(#${markerStartId})` : undefined}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 3 : isActive ? 2.5 : 1.5,
          opacity: isDimmed ? 0.52 : 1,
          transition: 'stroke 160ms ease, opacity 160ms ease, stroke-width 160ms ease',
        }}
      />

      {/* Directional Traveling Data Packets */}
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

      {/* Clean Light-Mode #FFFFFF Compact Pill Edge Labels (Zero Black Boxes) */}
      {data?.label ? (
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
              color: '#0F172A',
              borderRadius: '9999px',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              opacity: isDimmed ? 0.65 : 1,
              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)',
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
