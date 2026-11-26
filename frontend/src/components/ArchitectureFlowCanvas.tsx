import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeTypes,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowsCounterClockwise,
  ArrowsLeftRight,
  GitFork,
  HandGrabbing,
} from '@phosphor-icons/react';
import { useSandbox } from '../context/SandboxContext';
import {
  POSITIONS_DUAL_BRAIN,
  POSITIONS_PIPELINE,
  buildArchitectureGraph,
  type ArchitectureLayoutMode,
  type DataFlowEdge,
  type FlowScenarioId,
  type HardwareFlowNode,
} from '../data/architectureTopology';
import { CustomDataEdge } from './flow/CustomDataEdge';
import { HardwareNode } from './flow/HardwareNode';

// Memoized outside component for React 19 / @xyflow/react stability
const nodeTypes: NodeTypes = {
  hardware: HardwareNode,
};

const edgeTypes: EdgeTypes = {
  dataFlow: CustomDataEdge,
};

export interface SelectedFlowEntity {
  kind: 'node' | 'edge';
  title: string;
  subtitle: string;
  sourceDesc: string;
  routeDesc: string;
  actionDesc: string;
}

interface ArchitectureFlowCanvasProps {
  scenarioId: FlowScenarioId;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectEntity: (
    entity: SelectedFlowEntity,
    nodeId: string | null,
    edgeId: string | null
  ) => void;
}

export function ArchitectureFlowCanvas({
  scenarioId,
  selectedNodeId,
  selectedEdgeId,
  onSelectEntity,
}: ArchitectureFlowCanvasProps) {
  const { telemetry } = useSandbox();
  const { fitView } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [layoutMode, setLayoutMode] =
    useState<ArchitectureLayoutMode>('dual-brain');

  // Preserve dragged coordinates when telemetry/scenarios update
  const customPositionsRef = useRef<Record<string, { x: number; y: number }>>({
    ...POSITIONS_DUAL_BRAIN,
  });

  const initialGraph = buildArchitectureGraph(
    'dual-brain',
    scenarioId,
    telemetry,
    selectedNodeId,
    selectedEdgeId,
    customPositionsRef.current
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<HardwareFlowNode>(
    initialGraph.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<DataFlowEdge>(
    initialGraph.edges
  );

  // Sync telemetry, scenario highlights, and selection without overwriting dragged coordinates
  useEffect(() => {
    const nextGraph = buildArchitectureGraph(
      layoutMode,
      scenarioId,
      telemetry,
      selectedNodeId,
      selectedEdgeId,
      customPositionsRef.current
    );
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
  }, [
    layoutMode,
    scenarioId,
    telemetry,
    selectedNodeId,
    selectedEdgeId,
    setNodes,
    setEdges,
  ]);

  // Capture user-dragged node positions into ref
  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) {
          customPositionsRef.current[ch.id] = {
            x: ch.position.x,
            y: ch.position.y,
          };
        }
      }
    },
    [onNodesChange]
  );

  // Fit view smoothly on container resize
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        void fitView({ padding: 0.14, duration: 200 });
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitView]);

  const applyLayoutPreset = (mode: ArchitectureLayoutMode) => {
    const preset =
      mode === 'dual-brain' ? POSITIONS_DUAL_BRAIN : POSITIONS_PIPELINE;
    customPositionsRef.current = { ...preset };
    setLayoutMode(mode);
    window.requestAnimationFrame(() => {
      void fitView({ padding: 0.14, duration: 280 });
    });
  };

  const handleResetPositions = () => {
    const preset =
      layoutMode === 'dual-brain' ? POSITIONS_DUAL_BRAIN : POSITIONS_PIPELINE;
    customPositionsRef.current = { ...preset };
    const nextGraph = buildArchitectureGraph(
      layoutMode,
      scenarioId,
      telemetry,
      selectedNodeId,
      selectedEdgeId,
      customPositionsRef.current
    );
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
    window.requestAnimationFrame(() => {
      void fitView({ padding: 0.14, duration: 280 });
    });
  };

  const handleNodeClick: NodeMouseHandler<HardwareFlowNode> = useCallback(
    (_event, node) => {
      onSelectEntity(
        {
          kind: 'node',
          title: node.data.title,
          subtitle: `${node.data.subtitle} · ${node.data.busTag}`,
          sourceDesc: node.data.sourceDesc,
          routeDesc: node.data.routeDesc,
          actionDesc: node.data.actionDesc,
        },
        node.id,
        null
      );
    },
    [onSelectEntity]
  );

  const handleEdgeClick: EdgeMouseHandler<DataFlowEdge> = useCallback(
    (_event, edge) => {
      if (!edge.data) return;
      onSelectEntity(
        {
          kind: 'edge',
          title: edge.data.protocol,
          subtitle: edge.data.label,
          sourceDesc: edge.data.sourceDesc,
          routeDesc: edge.data.routeDesc,
          actionDesc: edge.data.actionDesc,
        },
        null,
        edge.id
      );
    },
    [onSelectEntity]
  );

  return (
    <div className="clinical-card" style={{ overflow: 'hidden' }}>
      {/* Top Canvas Layout & Movability Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-surface)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => applyLayoutPreset('dual-brain')}
            className={layoutMode === 'dual-brain' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <GitFork size={14} weight="duotone" />
            <span>Dual-Brain Topology</span>
          </button>

          <button
            type="button"
            onClick={() => applyLayoutPreset('pipeline')}
            className={layoutMode === 'pipeline' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <ArrowsLeftRight size={14} weight="duotone" />
            <span>Left-to-Right Pipeline</span>
          </button>

          <button
            type="button"
            onClick={handleResetPositions}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <ArrowsCounterClockwise size={14} weight="bold" />
            <span>Reset Positions</span>
          </button>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11.5px',
            fontWeight: 600,
            color: 'var(--ink-muted)',
          }}
        >
          <HandGrabbing size={14} weight="duotone" color="var(--accent-blue)" />
          <span>Drag any node · Scroll to zoom · Click nodes or links</span>
        </span>
      </div>

      {/* @xyflow/react Interactive Node Canvas */}
      <div
        ref={wrapperRef}
        style={{
          width: '100%',
          height: '640px',
          backgroundColor: '#F8FAFC',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          minZoom={0.45}
          maxZoom={1.75}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="#CBD5E1"
          />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => {
              const d = n.data as HardwareFlowNode['data'] | undefined;
              if (!d?.active) return '#CBD5E1';
              if (d.tone === 'crimson') return '#B91C1C';
              if (d.tone === 'amber') return '#B45309';
              if (d.tone === 'blue') return '#1D4ED8';
              return '#15803D';
            }}
            maskColor="rgba(241, 245, 249, 0.72)"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
