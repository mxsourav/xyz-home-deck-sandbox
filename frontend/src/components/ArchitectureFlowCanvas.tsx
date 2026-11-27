import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type EdgeMouseHandler,
  type EdgeTypes,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowRight,
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
  height?: number;
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
  height = 680,
  onSelectEntity,
}: ArchitectureFlowCanvasProps) {
  const { telemetry } = useSandbox();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [layoutMode, setLayoutMode] =
    useState<ArchitectureLayoutMode>('pipeline');

  const customPositionsRef = useRef<Record<string, { x: number; y: number }>>({
    ...POSITIONS_PIPELINE,
  });

  const initialGraph = buildArchitectureGraph(
    'pipeline',
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.14, minZoom: 0.25, duration: 200 });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [nodesInitialized, scenarioId, layoutMode, fitView]);

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

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        void fitView({ padding: 0.14, minZoom: 0.25, duration: 180 });
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitView]);

  const applyLayoutPreset = (mode: ArchitectureLayoutMode) => {
    const preset =
      mode === 'pipeline' ? POSITIONS_PIPELINE : POSITIONS_DUAL_BRAIN;
    customPositionsRef.current = { ...preset };
    setLayoutMode(mode);
    window.requestAnimationFrame(() => {
      void fitView({ padding: 0.14, minZoom: 0.25, duration: 220 });
    });
  };

  const handleResetPositions = () => {
    const preset =
      layoutMode === 'pipeline' ? POSITIONS_PIPELINE : POSITIONS_DUAL_BRAIN;
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
      void fitView({ padding: 0.14, minZoom: 0.25, duration: 220 });
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
    <div className="clinical-card" style={{ overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      {/* Top Pipeline Guide & Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: '#FFFFFF',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => applyLayoutPreset('pipeline')}
            className={layoutMode === 'pipeline' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <ArrowsLeftRight size={14} weight="duotone" />
            <span>START → END Pipeline</span>
          </button>

          <button
            type="button"
            onClick={() => applyLayoutPreset('dual-brain')}
            className={layoutMode === 'dual-brain' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <GitFork size={14} weight="duotone" />
            <span>Dual-Brain Stacked</span>
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

        {/* Crystal-Clear Direction Flow Guide */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#475569',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 7px', borderRadius: '4px' }}>
            1. START (Power &amp; Sensors)
          </span>
          <ArrowRight size={12} weight="bold" />
          <span style={{ backgroundColor: '#F1F5F9', padding: '2px 7px', borderRadius: '4px' }}>
            2. ESP32-S3 + UPS
          </span>
          <ArrowRight size={12} weight="bold" />
          <span style={{ backgroundColor: '#F1F5F9', padding: '2px 7px', borderRadius: '4px' }}>
            3. Raspberry Pi 4
          </span>
          <ArrowRight size={12} weight="bold" />
          <span style={{ color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '2px 7px', borderRadius: '4px' }}>
            4. END (Outputs)
          </span>
          <span style={{ marginLeft: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
            <HandGrabbing size={13} weight="duotone" />
            <span>Drag nodes</span>
          </span>
        </div>
      </div>

      {/* Bright Light-Mode @xyflow/react Canvas (MiniMap completely removed) */}
      <div
        ref={wrapperRef}
        style={{
          width: '100%',
          height: `${height}px`,
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
          onInit={() => void fitView({ padding: 0.14, minZoom: 0.25 })}
          fitView
          fitViewOptions={{ padding: 0.14, minZoom: 0.25 }}
          minZoom={0.25}
          maxZoom={1.75}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          style={{ backgroundColor: '#F8FAFC' }}
        >
          <Background
            bgColor="#F8FAFC"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#CBD5E1"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
