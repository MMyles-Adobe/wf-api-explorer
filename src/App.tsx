import React, { useState, useEffect, useRef } from 'react';
import {
  Provider,
  defaultTheme,
  View,
  Heading,
  Text,
  Flex,
  ProgressBar,
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  Divider,
  Picker,
  Item,
  Dialog,
  DialogTrigger,
  Content,
  Button,
  StatusLight,
  NumberField,
  Tabs,
  TabList,
  TabPanels
} from '@adobe/react-spectrum';
import { useAsyncList } from '@react-stately/data';
import type { Key } from '@adobe/react-spectrum';
import axios from 'axios';
import * as d3 from 'd3';
import ProjectIcon from '@spectrum-icons/workflow/Project';
import TaskListIcon from '@spectrum-icons/workflow/TaskList';
import Chat from '@spectrum-icons/workflow/Chat';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001' // fallback for dev
});

interface BaseObject {
  ID: string;
  name: string;
  status?: string;
}

interface Project extends BaseObject {
  percentComplete?: number;
  plannedCompletionDate?: string;
}

interface Task extends BaseObject {
  projectID?: string;
  assignedToID?: string;
  duration?: number;
  percentComplete?: number;
}

interface Issue extends BaseObject {
  projectID?: string;
  priority?: string;
  severity?: string;
}

interface Portfolio extends BaseObject {
  description?: string;
}

interface Program extends BaseObject {
  description?: string;
  portfolioID?: string;
  ownerID?: string;
  isActive?: boolean;
}

type ApiObject = Project | Task | Issue | Portfolio | Program;

interface SortDescriptor {
  column: Key;
  direction: 'ascending' | 'descending';
}

interface PaginationData {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ApiResponse {
  data: ApiObject[];
  pagination: PaginationData;
}

interface AsyncListState {
  items: ApiObject[];
  cursor?: string;
  hasMore?: boolean;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'Portfolio' | 'Program' | 'Project' | 'Task' | 'Issue';
  group: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  value: number;
}

// TODO: Add proper Vite env types in vite-env.d.ts
// import.meta.env usage commented out for linter

// Utility to convert flat API data to nodes/links structure
function buildNetworkData(data: ApiObject[]): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const nodeIds = new Set<string>();

  data.forEach(item => {
    let type: 'Portfolio' | 'Program' | 'Project' | 'Task' | 'Issue' = 'Project';
    
    // Simplified type detection logic
    if ('portfolioID' in item && 'ownerID' in item && 'isActive' in item) {
      type = 'Program';
    } else if ('description' in item && !('ownerID' in item)) {
      type = 'Portfolio';
    } else if ('taskID' in item || 'priority' in item || 'severity' in item) {
      type = 'Issue';
    } else if ('assignedToID' in item || ('projectID' in item && !('priority' in item))) {
      type = 'Task';
    } else if ('percentComplete' in item || 'plannedCompletionDate' in item) {
      type = 'Project';
    }

    if (!nodeIds.has(item.ID)) {
      nodes.push({
        id: item.ID,
        name: item.name,
        type,
        group:
          type === 'Portfolio' ? -2 :
          type === 'Program' ? -1 :
          type === 'Project' ? 0 :
          type === 'Task' ? 1 : 2
      });
      nodeIds.add(item.ID);
    }
  });

  // Only add links if both source and target exist
  data.forEach(item => {
    // Project → Program
    if ('programID' in item && item.programID && nodeIds.has(item.programID) && nodeIds.has(item.ID)) {
      links.push({
        source: String(item.programID),
        target: String(item.ID),
        value: 1
      });
    }
    // Program → Portfolio
    if ('portfolioID' in item && item.portfolioID && nodeIds.has(item.portfolioID) && nodeIds.has(item.ID)) {
      links.push({
        source: String(item.portfolioID),
        target: String(item.ID),
        value: 1
      });
    }
    // Project → Portfolio (only if no program)
    if ('portfolioID' in item && item.portfolioID && nodeIds.has(item.portfolioID) && nodeIds.has(item.ID) && !('programID' in item)) {
      links.push({
        source: String(item.portfolioID),
        target: String(item.ID),
        value: 1
      });
    }
    // Task → Project
    if ('projectID' in item && item.projectID && nodeIds.has(item.projectID) && nodeIds.has(item.ID)) {
      links.push({
        source: String(item.projectID),
        target: String(item.ID),
        value: 1
      });
    }
    // Issue → Task
    if ('taskID' in item && item.taskID && nodeIds.has(item.taskID) && nodeIds.has(item.ID)) {
      links.push({
        source: String(item.taskID),
        target: String(item.ID),
        value: 1
      });
    }
    // Issue → Project (if no task)
    if ('projectID' in item && item.projectID && !('taskID' in item) && nodeIds.has(item.projectID) && nodeIds.has(item.ID)) {
      links.push({
        source: String(item.projectID),
        target: String(item.ID),
        value: 1
      });
    }
  });

  return { nodes, links };
}

// DraggableCircle component
type DraggableCircleProps = {
  node: NetworkNode;
  simulation: d3.Simulation<NetworkNode, undefined>;
  [key: string]: any;
};

function DraggableCircle({ node, simulation, ...props }: DraggableCircleProps) {
  const ref = useRef<SVGCircleElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const drag = d3.drag<SVGCircleElement, NetworkNode>()
      .on('start', (event: d3.D3DragEvent<SVGCircleElement, NetworkNode, NetworkNode>) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        node.fx = node.x;
        node.fy = node.y;
      })
      .on('drag', (event: d3.D3DragEvent<SVGCircleElement, NetworkNode, NetworkNode>) => {
        node.fx = event.x;
        node.fy = event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGCircleElement, NetworkNode, NetworkNode>) => {
        if (!event.active) simulation.alphaTarget(0);
        node.fx = null;
        node.fy = null;
      });
    d3.select(ref.current as SVGCircleElement).call(drag as any);
  }, [node, simulation]);
  return <circle ref={ref} {...props} />;
}

function NetworkGraph({ data }: { data: ApiObject[] }) {
  const [simNodes, setSimNodes] = useState<NetworkNode[]>([]);
  const [simLinks, setSimLinks] = useState<NetworkLink[]>([]);
  const [viewBox, setViewBox] = useState<string | undefined>(undefined);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<NetworkNode, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const prevDataRef = useRef<ApiObject[]>([]);

  // Convert flat data to nodes/links
  const { nodes, links } = buildNetworkData(data);

  // Identify orphaned nodes by type
  const linkedNodeIds = new Set<string>();
  links.forEach(link => {
    if (typeof link.source === 'object' && link.source !== null) linkedNodeIds.add(link.source.id);
    else if (typeof link.source === 'string') linkedNodeIds.add(link.source);
    if (typeof link.target === 'object' && link.target !== null) linkedNodeIds.add(link.target.id);
    else if (typeof link.target === 'string') linkedNodeIds.add(link.target);
  });
  const orphanedByType: Record<string, NetworkNode[]> = {};
  nodes.forEach(node => {
    if (!linkedNodeIds.has(node.id)) {
      if (!orphanedByType[node.type]) orphanedByType[node.type] = [];
      orphanedByType[node.type].push(node);
    }
  });

  useEffect(() => {
    if (nodes.length === 0) {
      setSimNodes([]);
      setSimLinks([]);
      setViewBox(undefined);
      setSimulation(null);
      return;
    }
    const simNodes = nodes.map(n => ({ ...n }));
    const simLinks = links.map(l => ({ ...l }));
    const width = 800;
    const height = 600;
    const radius = Math.min(width, height) / 2.5; // Radius for orphaned nodes circle

    // Compute node degree and identify orphans
    const degreeMap: Record<string, number> = {};
    const isOrphan: Record<string, boolean> = {};
    simNodes.forEach(node => {
      isOrphan[node.id] = !linkedNodeIds.has(node.id);
      degreeMap[node.id] = 0;
    });
    simLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      degreeMap[sourceId] = (degreeMap[sourceId] || 0) + 1;
      degreeMap[targetId] = (degreeMap[targetId] || 0) + 1;
    });

    // Calculate initial positions for orphaned nodes in a circle
    const orphanCount = Object.values(isOrphan).filter(Boolean).length;
    let orphanIndex = 0;
    simNodes.forEach(node => {
      if (isOrphan[node.id]) {
        const angle = (orphanIndex / orphanCount) * 2 * Math.PI;
        node.x = width/2 + radius * Math.cos(angle);
        node.y = height/2 + radius * Math.sin(angle);
        orphanIndex++;
      }
    });

    const simulation = d3.forceSimulation<NetworkNode, undefined>(simNodes as NetworkNode[])
      .force('link', d3.forceLink<NetworkNode, NetworkLink>(simLinks.filter((l): l is NetworkLink => !!l && typeof l.source !== 'undefined' && typeof l.target !== 'undefined') as NetworkLink[])
        .id(d => (typeof d === 'object' && d !== null && 'id' in d) ? (d as NetworkNode).id : '')
        .distance(100) // Fixed distance between linked nodes
        .strength(0.3)) // Reduced link strength for more flexibility

      .force('charge', d3.forceManyBody()
        .strength(node => {
          if (isOrphan[node.id]) {
            return -300; // Stronger repulsion for orphaned nodes
          }
          const degree = degreeMap[node.id] || 1;
          return -500 * Math.sqrt(degree); // Much stronger repulsion for connected nodes
        })
        .distanceMin(50) // Increased minimum distance
        .distanceMax(500)) // Increased maximum distance

      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.1))

      .force('x', d3.forceX(width / 2).strength(node => 
        isOrphan[node.id] ? 0 : 0.05)) // Slightly stronger x-centering for linked nodes

      .force('y', d3.forceY(height / 2).strength(node => 
        isOrphan[node.id] ? 0 : 0.05)) // Slightly stronger y-centering for linked nodes

      .force('collide', d3.forceCollide()
        .radius(node => isOrphan[node.id] ? 45 : 40) // Increased collision radius
        .strength(0.8) // Slightly reduced collision strength
        .iterations(3)) // More iterations for better collision detection

      // Custom force to keep orphaned nodes in a circle
      .force('orbit', alpha => {
        simNodes.forEach(node => {
          if (isOrphan[node.id] && node.x && node.y) {
            const dx = node.x - width/2;
            const dy = node.y - height/2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;
            
            // Stronger force to maintain radius for orphans
            const targetDist = radius * 1.2; // Increased radius for orphaned nodes
            const strength = (dist - targetDist) * alpha * 0.3; // Increased strength
            node.x -= dx * strength / dist;
            node.y -= dy * strength / dist;

            // Enhanced tangential force for better spacing
            const angle = Math.atan2(dy, dx);
            const targetIndex = Object.keys(isOrphan).filter(id => isOrphan[id]).indexOf(node.id);
            const targetAngle = (targetIndex / orphanCount) * 2 * Math.PI;
            const angleDiff = (angle - targetAngle + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
            const rotationStrength = angleDiff * alpha * 0.3; // Increased rotation strength
            node.x += -dy * rotationStrength / dist;
            node.y += dx * rotationStrength / dist;
          }
        });
      })

      .alpha(1) // Start with full heat
      .alphaDecay(0.01) // Slower cooling
      .velocityDecay(0.3) // Reduced velocity decay for more movement
      .on('tick', () => {
        setSimNodes([...simNodes]);
        setSimLinks([...simLinks]);
        
        // Set a fixed viewBox that's large enough to contain the graph
        const padding = 1000; // Large fixed padding
        setViewBox(`${-padding} ${-padding} ${padding * 2} ${padding * 2}`);
      });

    setSimulation(simulation);
    return () => {
      simulation.stop();
    };
  }, [data]);

  // Update the zoom behavior configuration
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const g = d3.select<SVGGElement, unknown>(gRef.current);
    
    function handleZoom(e: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
      if (e.transform) {
        g.attr('transform', e.transform.toString());
      }
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 8])
      .on('zoom', handleZoom);

    svg.call(zoom);

    // Wait for the next frame to ensure the graph has been laid out
    requestAnimationFrame(() => {
      // Only proceed if we have valid bounds
      const bounds = gRef.current?.getBBox();
      const parent = svgRef.current?.getBoundingClientRect();
      
      if (bounds && parent && bounds.width > 0 && bounds.height > 0) {
        const width = parent.width || 600;
        const height = parent.height || 400;
        
        // Ensure we don't divide by zero
        const scale = 0.9 / Math.max(
          bounds.width / width || 1,
          bounds.height / height || 1
        );
        
        const translate = [
          width / 2 - scale * (bounds.x + bounds.width / 2),
          height / 2 - scale * (bounds.y + bounds.height / 2)
        ];

        // Only apply transform if we have valid numbers
        if (!isNaN(scale) && !isNaN(translate[0]) && !isNaN(translate[1])) {
          svg.transition()
            .duration(750)
            .call(
              zoom.transform,
              d3.zoomIdentity
                .translate(translate[0], translate[1])
                .scale(scale)
            );
        }
      }
    });

    return () => {
      svg.on('.zoom', null);
    };
  }, [data]);

  if (nodes.length === 0) {
    return (
      <View width="100%" height="100%" UNSAFE_style={{ flex: 1, minHeight: 0 }}>
        <Text>No network data to display. Try selecting Tasks or Issues, or ensure your data includes relationships.</Text>
      </View>
    );
  }

  return (
    <View width="100%" height="100%" UNSAFE_style={{ flex: 1, minHeight: '600px' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'grab',
          touchAction: 'none'  // Prevent touch scrolling
        }}
        viewBox="0 0 1200 800" // Add a default viewBox
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 -5 10 10"
            refX="20"
            refY="0"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,-5L10,0L0,5" fill="#999" />
          </marker>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          fill="transparent" 
          pointerEvents="all"
        />
        <g ref={gRef} transform="translate(0,0)"> {/* Add initial transform */}
          {/* Draw links */}
          {simLinks.map((link, i) => {
            const source = typeof link.source === 'object' && link.source !== null ? link.source as NetworkNode : undefined;
            const target = typeof link.target === 'object' && link.target !== null ? link.target as NetworkNode : undefined;
            if (!source || !target) return null;
            return (
              <line
                key={i}
                x1={typeof source.x === 'number' ? source.x : 0}
                y1={typeof source.y === 'number' ? source.y : 0}
                x2={typeof target.x === 'number' ? target.x : 0}
                y2={typeof target.y === 'number' ? target.y : 0}
                stroke="#999"
                strokeOpacity={0.6}
                strokeWidth={Math.sqrt(link.value)}
                markerEnd="url(#arrow)"
              />
            );
          })}
          {/* Draw nodes */}
          {simNodes.map((node) => {
            const nodeId = 'id' in node && typeof node.id === 'string' ? node.id : '';
            return (
              <g key={typeof node.id === 'string' ? node.id : String(node.id)}>
                {('type' in node) && typeof (node as any).type === 'string' && (
                  <DraggableCircle
                    node={node}
                    simulation={simulation as d3.Simulation<NetworkNode, undefined>}
                    cx={typeof node.x === 'number' ? node.x : 0}
                    cy={typeof node.y === 'number' ? node.y : 0}
                    r={18}
                    fill={
                      (node as NetworkNode).type === 'Project'
                        ? '#0072F5'
                        : (node as NetworkNode).type === 'Task'
                        ? '#00B8A9'
                        : (node as NetworkNode).type === 'Issue'
                        ? '#f68511'
                        : (node as NetworkNode).type === 'Program'
                        ? '#e055e2'
                        : (node as NetworkNode).type === 'Portfolio'
                        ? '#f8d904'
                        : '#888'
                    }
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
                {'type' in node && typeof (node as any).type === 'string' && (node as NetworkNode).type === 'Project' && (
                  <foreignObject
                    x={typeof node.x === 'number' ? node.x - 12 : 0}
                    y={typeof node.y === 'number' ? node.y - 12 : 0}
                    width={24}
                    height={24}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ProjectIcon size="S" />
                    </div>
                  </foreignObject>
                )}
                {'type' in node && typeof (node as any).type === 'string' && (node as NetworkNode).type === 'Task' && (
                  <foreignObject
                    x={typeof node.x === 'number' ? node.x - 12 : 0}
                    y={typeof node.y === 'number' ? node.y - 12 : 0}
                    width={24}
                    height={24}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TaskListIcon size="S" />
                    </div>
                  </foreignObject>
                )}
                {'type' in node && typeof (node as any).type === 'string' && (node as NetworkNode).type === 'Issue' && (
                  <foreignObject
                    x={typeof node.x === 'number' ? node.x - 12 : 0}
                    y={typeof node.y === 'number' ? node.y - 12 : 0}
                    width={24}
                    height={24}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff7f50' }}>
                      <Chat size="S" />
                    </div>
                  </foreignObject>
                )}
                {'type' in node && typeof (node as any).type === 'string' && (
                  <text
                    x={typeof node.x === 'number' ? node.x : 0}
                    y={typeof node.y === 'number' ? ((node as NetworkNode).type === 'Project' || (node as NetworkNode).type === 'Task' ? (node.y ?? 0) + 28 : (node.y ?? 0) + 20) : 0}
                    textAnchor="middle"
                    fontSize={12}
                  >
                    {typeof node.name === 'string' && node.name.length > 18 ? node.name.slice(0, 18) + '…' : node.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </View>
  );
}

function NetworkLegend({ counts }: { counts: Record<string, number> }) {
  return (
    <Flex direction="row" gap="size-300" alignItems="center" marginBottom="size-200">
      <Flex alignItems="center" gap="size-100">
        <svg width={36} height={36}><circle cx={18} cy={18} r={18} fill="#0072F5" stroke="#fff" strokeWidth={2} /></svg>
        <Text>Project ({counts.Project || 0})</Text>
      </Flex>
      <Flex alignItems="center" gap="size-100">
        <svg width={36} height={36}><circle cx={18} cy={18} r={18} fill="#00B8A9" stroke="#fff" strokeWidth={2} /></svg>
        <Text>Task ({counts.Task || 0})</Text>
      </Flex>
      <Flex alignItems="center" gap="size-100">
        <svg width={36} height={36}><circle cx={18} cy={18} r={18} fill="#f68511" stroke="#fff" strokeWidth={2} /></svg>
        <Text>Issue ({counts.Issue || 0})</Text>
      </Flex>
      <Flex alignItems="center" gap="size-100">
        <svg width={36} height={36}><circle cx={18} cy={18} r={18} fill="#e055e2" stroke="#fff" strokeWidth={2} /></svg>
        <Text>Program ({counts.Program || 0})</Text>
      </Flex>
      <Flex alignItems="center" gap="size-100">
        <svg width={36} height={36}><circle cx={18} cy={18} r={18} fill="#f8d904" stroke="#fff" strokeWidth={2} /></svg>
        <Text>Portfolio ({counts.Portfolio || 0})</Text>
      </Flex>
    </Flex>
  );
}

function App() {
  const [objectType, setObjectType] = useState<Key>('project');
  const [error, setError] = useState<Error | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [selectedTab, setSelectedTab] = useState<Key>('table');
  const [allObjects, setAllObjects] = useState<ApiObject[]>([]);
  const [loadingAll, setLoadingAll] = useState<boolean>(true);

  // Fetch all objects on mount
  useEffect(() => {
    async function fetchAll() {
      setLoadingAll(true);
      try {
        const endpoints = ['portfolio', 'program', 'project', 'task', 'issue'];
        const allResults: ApiObject[] = [];
        for (const endpoint of endpoints) {
          let fields = '';
          if (endpoint === 'portfolio') {
            fields = 'ID,name,description';
          } else if (endpoint === 'program') {
            fields = 'ID,name,description,portfolioID,ownerID,isActive';
          } else if (endpoint === 'project') {
            fields = 'ID,name,status,percentComplete,plannedCompletionDate,portfolioID,programID';
          } else if (endpoint === 'task') {
            fields = 'ID,name,status,assignedToID,percentComplete,projectID';
          } else if (endpoint === 'issue') {
            fields = 'ID,name,status,priority,severity,projectID,taskID';
          }
          const response = await api.get(`/api/${endpoint}/search`, {
            params: { page: 1, pageSize: 200, fields }
          });
          if (response.data && Array.isArray(response.data.data)) {
            allResults.push(...response.data.data);
          }
        }
        setAllObjects(allResults);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load all objects'));
      } finally {
        setLoadingAll(false);
      }
    }
    fetchAll();
  }, []);

  // TableView uses filtered items
  const filteredItems = allObjects.filter(obj => {
    if (objectType === 'portfolio') return (obj as Portfolio).description !== undefined && (obj as Program).ownerID === undefined;
    if (objectType === 'program') return (obj as Program).portfolioID !== undefined && (obj as Program).ownerID !== undefined;
    if (objectType === 'project') return isProject(obj);
    if (objectType === 'task') return isTask(obj);
    if (objectType === 'issue') return isIssue(obj);
    return false;
  });

  const list = useAsyncList<ApiObject>({
    async load({ signal }) {
      try {
        const endpoint = String(objectType).toLowerCase();
        const pageSize = 200;
        
        let fields = '';
        if (objectType === 'portfolio') {
          fields = 'ID,name,description';
        } else if (objectType === 'program') {
          fields = 'ID,name,description,portfolioID,ownerID,isActive';
        } else if (objectType === 'project') {
          fields = 'ID,name,status,percentComplete,plannedCompletionDate,portfolioID,programID';
        } else if (objectType === 'task') {
          fields = 'ID,name,status,assignedToID,percentComplete,projectID';
        } else if (objectType === 'issue') {
          fields = 'ID,name,status,priority,severity,projectID,taskID';
        }

        const response = await api.get<ApiResponse>(`/api/${endpoint}/search`, {
          params: { 
            page: 1, 
            pageSize,
            fields
          }
        });

        if (!response.data) {
          throw new Error('No data received from server');
        }

        const items = Array.isArray(response.data.data) ? response.data.data : [];
        return { items };
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error instanceof Error ? error : new Error('Failed to load data'));
        return { items: [] };
      }
    },
    async sort({ items, sortDescriptor }) {
      return {
        items: items.sort((a, b) => {
          let first: any = a[sortDescriptor.column as keyof ApiObject];
          let second: any = b[sortDescriptor.column as keyof ApiObject];

          // Handle nested properties
          if (sortDescriptor.column === 'project.name') {
            first = isTask(a) || isIssue(a) ? a.projectID : undefined;
            second = isTask(b) || isIssue(b) ? b.projectID : undefined;
          }

          // Handle numeric values
          if (typeof first === 'number' && typeof second === 'number') {
            return sortDescriptor.direction === 'ascending' 
              ? first - second 
              : second - first;
          }

          // Handle string values
          const firstStr = String(first || '');
          const secondStr = String(second || '');
          const comparison = firstStr.localeCompare(secondStr);
          return sortDescriptor.direction === 'ascending' ? comparison : -comparison;
        })
      };
    }
  });

  const handleObjectTypeChange = (key: Key) => {
    setObjectType(key);
    list.reload();
  };

  const getStatusVariant = (status: string) => {
    const statusMap: Record<string, 'positive' | 'negative' | 'notice' | 'info' | 'neutral'> = {
      'CUR': 'positive',    // Current
      'PLN': 'info',        // Planning
      'CPL': 'positive',    // Complete
      'IDA': 'notice',      // In Development
      'INP': 'notice',      // In Progress
      'NEW': 'info',        // New
      'CLS': 'positive',    // Closed
      'RLV': 'neutral',     // Resolved
      'QUE': 'notice'       // Queued
    };
    return statusMap[status] || 'neutral';
  };

  // Add type guards for property access
  function isTask(obj: ApiObject): obj is Task {
    return !isIssue(obj) && ((obj as Task).projectID !== undefined || (obj as Task).assignedToID !== undefined);
  }
  function isIssue(obj: ApiObject): obj is Issue {
    return (obj as Issue).priority !== undefined || (obj as Issue).severity !== undefined;
  }
  function isProject(obj: ApiObject): obj is Project {
    return (obj as Project).percentComplete !== undefined || (obj as Project).plannedCompletionDate !== undefined;
  }

  // Use type guards in renderTableRow
  const renderTableRow = (item: ApiObject): JSX.Element => {
    const renderers = {
      project: (project: Project) => (
        <Row key={project.ID}>
          <Cell>{project.name}</Cell>
          <Cell>
            <StatusLight variant={getStatusVariant(project.status || '')}>
              {project.status || 'Unknown'}
            </StatusLight>
          </Cell>
          <Cell>{project.percentComplete !== undefined ? project.percentComplete : ''}%</Cell>
          <Cell>{project.plannedCompletionDate || ''}</Cell>
        </Row>
      ),
      task: (task: Task) => (
        <Row key={task.ID}>
          <Cell>{task.name}</Cell>
          <Cell>
            <StatusLight variant={getStatusVariant(task.status || '')}>
              {task.status || 'Unknown'}
            </StatusLight>
          </Cell>
          <Cell>{task.assignedToID || ''}</Cell>
          <Cell>{task.percentComplete !== undefined ? task.percentComplete : ''}%</Cell>
          <Cell>{task.projectID || ''}</Cell>
        </Row>
      ),
      issue: (issue: Issue) => (
        <Row key={issue.ID}>
          <Cell>{issue.name}</Cell>
          <Cell>
            <StatusLight variant={getStatusVariant(issue.status || '')}>
              {issue.status || 'Unknown'}
            </StatusLight>
          </Cell>
          <Cell>{issue.priority || ''}</Cell>
          <Cell>{issue.severity || ''}</Cell>
          <Cell>{issue.projectID || ''}</Cell>
        </Row>
      ),
      portfolio: (portfolio: Portfolio) => (
        <Row key={portfolio.ID}>
          <Cell>{portfolio.name}</Cell>
          <Cell>{portfolio.status || 'Unknown'}</Cell>
          <Cell>{portfolio.description || ''}</Cell>
        </Row>
      ),
      program: (program: Program) => (
        <Row key={program.ID}>
          <Cell>{program.name}</Cell>
          <Cell>{program.description || ''}</Cell>
          <Cell>{program.portfolioID || ''}</Cell>
          <Cell>{program.ownerID || ''}</Cell>
          <Cell>{program.isActive ? 'Yes' : 'No'}</Cell>
        </Row>
      )
    };
    const renderer = renderers[String(objectType) as keyof typeof renderers];
    return renderer ? renderer(item as any) : <Row><Cell>No data available</Cell></Row>;
  };

  const renderTableColumns = () => {
    const columns = {
      project: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="status" allowsSorting>Status</Column>,
        <Column key="percentComplete" allowsSorting>Progress</Column>,
        <Column key="plannedCompletionDate" allowsSorting>Due Date</Column>
      ],
      task: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="status" allowsSorting>Status</Column>,
        <Column key="assignedToID" allowsSorting>Assigned To</Column>,
        <Column key="percentComplete" allowsSorting>Progress</Column>,
        <Column key="projectID" allowsSorting>Project</Column>
      ],
      issue: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="status" allowsSorting>Status</Column>,
        <Column key="priority" allowsSorting>Priority</Column>,
        <Column key="severity" allowsSorting>Severity</Column>,
        <Column key="projectID" allowsSorting>Project</Column>
      ],
      portfolio: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="status" allowsSorting>Status</Column>,
        <Column key="description" allowsSorting>Description</Column>
      ],
      program: [
        <Column key="name" allowsSorting>Name</Column>,
        <Column key="description" allowsSorting>Description</Column>,
        <Column key="portfolioID" allowsSorting>Portfolio</Column>,
        <Column key="ownerID" allowsSorting>Owner</Column>,
        <Column key="isActive" allowsSorting>Active</Column>
      ]
    };

    return columns[String(objectType) as keyof typeof columns] || [];
  };

  // Utility to count object types for the legend
  function countObjectTypes(objects: ApiObject[]): Record<string, number> {
    return objects.reduce((acc, obj) => {
      if (isProject(obj)) acc.Project = (acc.Project || 0) + 1;
      else if (isIssue(obj)) acc.Issue = (acc.Issue || 0) + 1;
      else if (isTask(obj)) acc.Task = (acc.Task || 0) + 1;
      else if ('portfolioID' in obj && 'ownerID' in obj) acc.Program = (acc.Program || 0) + 1;
      else if ('description' in obj) acc.Portfolio = (acc.Portfolio || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  return (
    <Provider theme={defaultTheme}>
      <View paddingX="size-300">
        <Flex direction="column" gap="size-200">
          <View>
            <Heading level={1}>API Explorer</Heading>
            <Text>Select an object type to view its data</Text>
          </View>

          <Tabs selectedKey={selectedTab} onSelectionChange={setSelectedTab}>
            <TabList aria-label="View type">
              <Item key="table">Table</Item>
              <Item key="network">Network</Item>
            </TabList>
            <TabPanels>
              <Item key="table">
                <Flex direction="column" gap="size-200">
                  <Flex gap="size-200" alignItems="center">
                    <Picker
                      label="Object Type"
                      selectedKey={objectType}
                      onSelectionChange={handleObjectTypeChange}
                    >
                      <Item key="portfolio">Portfolios</Item>
                      <Item key="program">Programs</Item>
                      <Item key="project">Projects</Item>
                      <Item key="task">Tasks</Item>
                      <Item key="issue">Issues</Item>
                    </Picker>
                  </Flex>

                  {list.loadingState === 'loading' && list.items.length === 0 && (
                    <ProgressBar
                      label="Loading data..."
                      isIndeterminate
                    />
                  )}

                  {error && (
                    <DialogTrigger>
                      <Button variant="negative">Error</Button>
                      <Dialog>
                        <Heading>Error</Heading>
                        <Content>{error.message}</Content>
                      </Dialog>
                    </DialogTrigger>
                  )}

                  {!error && (
                    <>
                      <div ref={tableRef} style={{ height: '500px', overflow: 'auto' }}>
                        <TableView
                          aria-label={`${String(objectType)} table`}
                          width="100%"
                          height="100%"
                          sortDescriptor={list.sortDescriptor}
                          onSortChange={list.sort}
                        >
                          <TableHeader>
                            {renderTableColumns()}
                          </TableHeader>
                          <TableBody items={filteredItems}>
                            {renderTableRow}
                          </TableBody>
                        </TableView>
                      </div>
                      
                      {list.loadingState === 'loading' && list.items.length > 0 && (
                        <ProgressBar
                          label="Loading more data..."
                          isIndeterminate
                        />
                      )}
                    </>
                  )}
                </Flex>
              </Item>
              <Item key="network">
                <NetworkLegend counts={countObjectTypes(allObjects)} />
                <NetworkGraph data={allObjects} />
              </Item>
            </TabPanels>
          </Tabs>
        </Flex>
      </View>
    </Provider>
  );
}

export default App; 