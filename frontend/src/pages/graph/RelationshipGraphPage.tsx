import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Network,
  Building2,
  FileText,
  ShieldAlert,
  RefreshCw,
  Unlock,
  X,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Select, Badge, StatusBadge } from '../../components/ui';
import { graphApi } from '../../api/graph';
import { institutionsApi } from '../../api/institutions';
import { Institution } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// Custom Node component
const CustomGraphNode = ({ data }: { data: any }) => {
  const typeIcons: Record<string, any> = {
    institution: Building2,
    fdr: FileText,
    case: ShieldAlert,
    renewal: RefreshCw,
    release: Unlock,
  };

  const typeBorders: Record<string, string> = {
    institution: 'border-blue-500 bg-blue-50/90 text-blue-900',
    fdr: 'border-teal-500 bg-teal-50/90 text-teal-900',
    case: 'border-sky-500 bg-sky-50/90 text-sky-900',
    renewal: 'border-emerald-500 bg-emerald-50/90 text-emerald-900',
    release: 'border-amber-500 bg-amber-50/90 text-amber-900',
  };

  const Icon = typeIcons[data.nodeType] || FileText;
  const styleClass = typeBorders[data.nodeType] || 'border-slate-300 bg-white';

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-md min-w-[190px] transition-all hover:scale-105 relative ${styleClass}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
          {data.title || data.nodeType}
        </span>
      </div>
      <div className="font-bold text-xs leading-tight truncate">{data.label}</div>
      {data.subtitle && (
        <div className="text-[11px] opacity-80 mt-0.5 truncate">{data.subtitle}</div>
      )}
      {data.amount && (
        <div className="text-[11px] font-bold mt-1 text-teal-800">
          {formatCurrency(data.amount)}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-teal-500 !border-2 !border-white"
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomGraphNode,
};

export const RelationshipGraphPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState('inst-001');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const loadGraph = useCallback(async (instId: string) => {
    try {
      const data = await graphApi.getInstitutionGraph(instId || 'default');

      const rfNodes: Node[] = data.nodes.map((n) => ({
        id: n.id,
        type: 'custom',
        position: n.position,
        data: {
          ...n.data,
          nodeType: n.type,
        },
      }));

      const rfEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.animated,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: '#0d9488',
        },
        style: {
          stroke: '#0d9488',
          strokeWidth: 2,
          ...e.style,
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
          fill: '#0f766e',
        },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error('Failed to load relationship graph:', err);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    const fetchInsts = async () => {
      try {
        const res = await institutionsApi.getInstitutions({ limit: 100 });
        setInstitutions(res.items);
        if (res.items && res.items.length > 0) {
          const firstId = (res.items[0] as any)._id || res.items[0].id;
          setSelectedInstId(firstId);
          loadGraph(firstId);
        } else {
          loadGraph('default');
        }
      } catch (err) {
        console.error(err);
        loadGraph('default');
      }
    };
    fetchInsts();
  }, [loadGraph]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-teal-600" />
            <span>Instrument Relationship Graph</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Interactive structural view connecting institutions, issuing banks, security deposits, and linked cases
          </p>
        </div>

        {/* Institution dropdown selector */}
        <div className="w-full sm:w-80">
          <Select
            value={selectedInstId}
            onChange={(e) => {
              setSelectedInstId(e.target.value);
              loadGraph(e.target.value);
            }}
          >
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Main Graph Canvas Container */}
      <div className="relative w-full h-[640px] bg-slate-900/5 rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls className="bg-white rounded-lg shadow-md border border-slate-200 text-slate-700" />
          <MiniMap
            nodeColor={(node) => {
              if (node.data?.nodeType === 'institution') return '#3b82f6';
              if (node.data?.nodeType === 'fdr') return '#0d9488';
              if (node.data?.nodeType === 'case') return '#0284c7';
              if (node.data?.nodeType === 'renewal') return '#10b981';
              return '#f59e0b';
            }}
            className="rounded-lg shadow-md border border-slate-200 bg-white"
          />
        </ReactFlow>

        {/* Node detail side slide-in panel */}
        {selectedNodeData && (
          <div className="absolute top-4 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-40 animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700">
                {selectedNodeData.title || selectedNodeData.nodeType}
              </span>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{selectedNodeData.label}</h3>
                {selectedNodeData.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedNodeData.subtitle}</p>
                )}
              </div>

              {selectedNodeData.amount && (
                <div className="p-3 bg-teal-50 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-teal-800">
                    Principal Guarantee
                  </span>
                  <div className="text-base font-bold text-teal-900 mt-0.5">
                    {formatCurrency(selectedNodeData.amount)}
                  </div>
                </div>
              )}

              {selectedNodeData.status && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Node Status:</span>
                  <StatusBadge status={selectedNodeData.status} />
                </div>
              )}

              {selectedNodeData.refNumber && (
                <div className="text-xs">
                  <span className="text-slate-500">Ref Code:</span>
                  <span className="ml-1 font-mono font-semibold text-slate-800">
                    {selectedNodeData.refNumber}
                  </span>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    if (selectedNodeData.nodeType === 'fdr' || selectedNodeData.nodeType === 'renewal') {
                      window.location.href = `/fdrs/fdr-001`;
                    } else if (selectedNodeData.nodeType === 'case') {
                      window.location.href = `/verification/case-001`;
                    } else if (selectedNodeData.nodeType === 'release') {
                      window.location.href = `/release`;
                    } else {
                      window.location.href = `/institutions/inst-001`;
                    }
                  }}
                >
                  Inspect Full Record
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        <span className="font-semibold text-slate-700">Graph Entity Legend:</span>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-600">Institution Node</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-teal-600" />
            <span className="text-slate-600">Active FDR Node</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500" />
            <span className="text-slate-600">Scrutiny Case</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Renewal Successor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-600">Release Request</span>
          </div>
        </div>
      </div>
    </div>
  );
};
