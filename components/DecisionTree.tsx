import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DecisionTreeData, DecisionTreeNode } from '../types';
import { GitBranch, ChevronRight, Award, AlertTriangle, CheckCircle, HelpCircle, Move } from 'lucide-react';

interface DecisionTreeProps {
  data: DecisionTreeData | null;
}

const nodeTypeConfig = {
  decision: { color: '#3b82f6', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50', icon: GitBranch },
  chance: { color: '#f59e0b', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50', icon: HelpCircle },
  outcome: { color: '#10b981', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/50', icon: CheckCircle },
};

const sentimentColors = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
};

interface D3Node extends d3.HierarchyPointNode<DecisionTreeNode> {
  _children?: D3Node[];
}

const DecisionTree: React.FC<DecisionTreeProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<DecisionTreeNode | null>(null);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth || 800,
          height: wrapperRef.current.clientHeight || 600,
        });
      }
    };
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Main D3 Effect
  useEffect(() => {
    if (!svgRef.current || !data?.root) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    svg.selectAll('*').remove();

    // Setup
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create hierarchy
    const root = d3.hierarchy<DecisionTreeNode>(data.root);
    
    // Tree layout - horizontal
    const treeLayout = d3.tree<DecisionTreeNode>()
      .size([innerHeight, innerWidth])
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 2));

    treeLayout(root);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`);
      });
    svg.call(zoom);

    // Draw links
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        const targetNode = d.target.data;
        if (targetNode.sentiment) {
          return sentimentColors[targetNode.sentiment];
        }
        return '#4b5563';
      })
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr('opacity', 0.6);

    // Draw probability labels on links
    g.selectAll('.probability')
      .data(root.links().filter(d => d.target.data.probability !== undefined))
      .enter()
      .append('text')
      .attr('class', 'probability')
      .attr('x', d => (d.source.y + d.target.y) / 2)
      .attr('y', d => (d.source.x + d.target.x) / 2 - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(d => `${d.target.data.probability}%`)
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay((_, i) => i * 100 + 400)
      .attr('opacity', 1);

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.data);
      });

    // Node backgrounds
    nodes.append('rect')
      .attr('x', -60)
      .attr('y', -25)
      .attr('width', 120)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('fill', d => {
        const config = nodeTypeConfig[d.data.type];
        return config ? config.color + '20' : '#1f2937';
      })
      .attr('stroke', d => {
        const config = nodeTypeConfig[d.data.type];
        return config ? config.color + '80' : '#374151';
      })
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay((_, i) => i * 80)
      .attr('opacity', 1);

    // Recommended highlight
    nodes.filter(d => data.recommendation === d.data.id)
      .append('rect')
      .attr('x', -64)
      .attr('y', -29)
      .attr('width', 128)
      .attr('height', 58)
      .attr('rx', 10)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '4,4')
      .attr('class', 'recommended-highlight');

    // Sentiment indicator for outcomes
    nodes.filter(d => d.data.type === 'outcome' && d.data.sentiment)
      .append('circle')
      .attr('cx', 50)
      .attr('cy', -15)
      .attr('r', 6)
      .attr('fill', d => sentimentColors[d.data.sentiment || 'neutral']);

    // Node type icon
    nodes.append('circle')
      .attr('cx', -45)
      .attr('cy', 0)
      .attr('r', 12)
      .attr('fill', d => {
        const config = nodeTypeConfig[d.data.type];
        return config ? config.color + '40' : '#374151';
      });

    // Node labels
    nodes.append('text')
      .attr('x', -25)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(d => {
        const label = d.data.label;
        return label.length > 18 ? label.substring(0, 16) + '...' : label;
      })
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((_, i) => i * 80 + 200)
      .attr('opacity', 1);

    // Value indicator for outcomes
    nodes.filter(d => d.data.type === 'outcome' && d.data.value !== undefined)
      .append('text')
      .attr('x', 0)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('fill', d => sentimentColors[d.data.sentiment || 'neutral'])
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => `Score: ${d.data.value}/10`);

    // Animation for recommended path
    const recommendedNode = root.descendants().find(d => d.data.id === data.recommendation);
    if (recommendedNode) {
      svg.selectAll('.recommended-highlight')
        .style('animation', 'pulse 2s ease-in-out infinite');
    }

  }, [data, dimensions]);

  if (!data || !data.root) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500 p-8">
        <GitBranch size={48} className="mb-4 text-neutral-600" />
        <p className="text-sm uppercase tracking-widest mb-2">Decision Tree</p>
        <p className="text-xs text-neutral-600 text-center max-w-xs">
          Run Full Analysis to see branching decision paths with probabilities and outcomes
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="w-full h-full bg-[#050505] relative overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-black/90 backdrop-blur border border-neutral-800 px-3 py-2 rounded text-neutral-500 text-[10px] flex items-center gap-2">
          <Move size={12} /> <span className="uppercase tracking-wider">Pan & Zoom</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-black/90 backdrop-blur border border-neutral-800 p-3 rounded-lg">
        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Legend</h4>
        <div className="space-y-2">
          {Object.entries(nodeTypeConfig).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div className={`w-4 h-4 rounded ${config.bgColor} ${config.borderColor} border flex items-center justify-center`}>
                  <Icon size={10} style={{ color: config.color }} />
                </div>
                <span className="text-neutral-400 capitalize">{type}</span>
              </div>
            );
          })}
          <div className="border-t border-neutral-800 my-2 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-neutral-400">Positive</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-neutral-400">Negative</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#444 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Node Detail Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/95 backdrop-blur border border-neutral-800 p-4 rounded-xl max-w-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {nodeTypeConfig[selectedNode.type] && (
                  <div className={`p-1.5 rounded ${nodeTypeConfig[selectedNode.type].bgColor}`}>
                    {React.createElement(nodeTypeConfig[selectedNode.type].icon, {
                      size: 14,
                      style: { color: nodeTypeConfig[selectedNode.type].color },
                    })}
                  </div>
                )}
                <span className="text-xs text-neutral-400 uppercase tracking-wider">{selectedNode.type}</span>
                {data.recommendation === selectedNode.id && (
                  <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                    <Award size={10} />
                    Recommended
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold mb-2">{selectedNode.label}</h3>
              <div className="flex gap-4 text-xs">
                {selectedNode.probability !== undefined && (
                  <span className="text-amber-400">
                    Probability: {selectedNode.probability}%
                  </span>
                )}
                {selectedNode.value !== undefined && (
                  <span className={selectedNode.sentiment === 'positive' ? 'text-emerald-400' : selectedNode.sentiment === 'negative' ? 'text-rose-400' : 'text-neutral-400'}>
                    Value: {selectedNode.value}/10
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-neutral-500 hover:text-white text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default DecisionTree;

