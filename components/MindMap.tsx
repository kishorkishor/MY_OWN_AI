import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapNode, MindMapLink } from '../types';
import { Move, Edit2, Check, Activity, LayoutGrid, Shuffle } from 'lucide-react';

interface MindMapProps {
  data: MindMapNode | null;
  onNodeUpdate?: (updatedNode: MindMapNode) => void;
}

// Utility to ensure data has required fields for D3 with STABLE IDs
const sanitizeData = (node: MindMapNode, depth = 0, index = 0, parentId = 'root'): MindMapNode => {
  if (!node) return node;

  const newNode = { ...node };

  // Generate a stable-ish ID if missing, based on name/depth/index to prevent random regeneration on re-renders
  if (!newNode.id) {
    const safeName = (newNode.name || 'node').replace(/\s+/g, '-').toLowerCase();
    newNode.id = `${parentId}-${safeName}-${depth}-${index}`;
  }

  if (!newNode.weight) newNode.weight = 1;

  if (newNode.children && Array.isArray(newNode.children)) {
    newNode.children = newNode.children
      .filter(c => c !== null && c !== undefined)
      .map((child, idx) => sanitizeData(child, depth + 1, idx, newNode.id));
  } else {
    newNode.children = [];
  }

  return newNode;
}

// Flatten hierarchy for Force Graph
const flattenGraph = (node: MindMapNode): { nodes: MindMapNode[]; links: MindMapLink[] } => {
  let nodes: MindMapNode[] = [];
  let links: MindMapLink[] = [];

  const traverse = (currentNode: MindMapNode) => {
    const n = { ...currentNode } as any;
    nodes.push(n);

    if (currentNode.children && Array.isArray(currentNode.children)) {
      currentNode.children.forEach(child => {
        if (!child) return;
        const targetId = child.id;
        const sourceId = currentNode.id;

        // Ensure IDs are valid before linking
        if (sourceId && targetId) {
          links.push({ source: sourceId, target: targetId });
        }
        traverse(child);
      });
    }
  };

  traverse(node);
  return { nodes, links };
};

const MindMap: React.FC<MindMapProps> = ({ data: rawData, onNodeUpdate }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const nodesRef = useRef<any[]>([]); // Track current node positions

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);
  const [editName, setEditName] = useState("");
  const [layoutMode, setLayoutMode] = useState<'chaos' | 'organized'>('chaos');

  // Handle Resize
  useEffect(() => {
    const updateDimensions = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth || 800,
          height: wrapperRef.current.clientHeight || 600
        });
      }
    };
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Main D3 Effect
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    try {
      const width = dimensions.width;
      const height = dimensions.height;
      const svg = d3.select(svgRef.current);

      // Setup Filters (Optimized Neumorphic Shadow - fewer operations for better performance)
      let defs = svg.select("defs");
      if (defs.empty()) {
        defs = svg.append("defs");

        // Neumorphic Gradient for inner highlight
        const neuGradient = defs.append("radialGradient")
          .attr("id", "neu-gradient")
          .attr("cx", "30%")
          .attr("cy", "30%")
          .attr("r", "70%");
        neuGradient.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255,255,255,0.25)");
        neuGradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0,0,0,0.1)");

        // Optimized Neumorphic shadow filter - 2 operations instead of 4
        const neuFilter = defs.append("filter")
          .attr("id", "neu-shadow")
          .attr("x", "-50%")
          .attr("y", "-50%")
          .attr("width", "200%")
          .attr("height", "200%");

        // Dark shadow (bottom-right) - main depth
        neuFilter.append("feDropShadow")
          .attr("dx", "5")
          .attr("dy", "5")
          .attr("stdDeviation", "6")
          .attr("flood-color", "#000000")
          .attr("flood-opacity", "0.45");

        // Light highlight (top-left)
        neuFilter.append("feDropShadow")
          .attr("dx", "-3")
          .attr("dy", "-3")
          .attr("stdDeviation", "4")
          .attr("flood-color", "#ffffff")
          .attr("flood-opacity", "0.12");

        // Recommended node glow filter - optimized
        const recFilter = defs.append("filter")
          .attr("id", "neu-recommended")
          .attr("x", "-50%")
          .attr("y", "-50%")
          .attr("width", "200%")
          .attr("height", "200%");

        recFilter.append("feDropShadow")
          .attr("dx", "0")
          .attr("dy", "0")
          .attr("stdDeviation", "8")
          .attr("flood-color", "#ffffff")
          .attr("flood-opacity", "0.35");

        recFilter.append("feDropShadow")
          .attr("dx", "4")
          .attr("dy", "4")
          .attr("stdDeviation", "5")
          .attr("flood-color", "#000000")
          .attr("flood-opacity", "0.4");

        // Legacy glow filter (keep for compatibility)
        const filter = defs.append("filter").attr("id", "glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");
      }

      // Layer Setup
      let g = svg.select<SVGGElement>(".main-group");
      if (g.empty()) {
        g = svg.append("g").attr("class", "main-group");
        g.append("g").attr("class", "links");
        g.append("g").attr("class", "nodes");

        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 4])
          .on("zoom", (event) => g.attr("transform", event.transform));
        svg.call(zoom);

        // Center initial view
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));
      }

      // Initialize Simulation - Optimized for faster settling
      if (!simulationRef.current) {
        simulationRef.current = d3.forceSimulation()
          .force("charge", d3.forceManyBody().strength(-400))
          .force("collide", d3.forceCollide().radius(25))
          .force("link", d3.forceLink().id((d: any) => d.id))
          .alphaDecay(0.05) // Faster settling (default 0.0228)
          .velocityDecay(0.4); // More damping for stability
      }

      const simulation = simulationRef.current;

      // Process Data
      let nodes: any[] = [];
      let links: any[] = [];
      let treeTargets: Record<string, { x: number, y: number }> = {};

      if (rawData) {
        const safeData = sanitizeData(rawData);
        const flat = flattenGraph(safeData);
        nodes = flat.nodes;
        links = flat.links;

        // Calculate Tree Layout if Organized
        if (layoutMode === 'organized') {
          const root = d3.hierarchy(safeData);
          const treeLayout = d3.tree().nodeSize([60, 180]);
          treeLayout(root);
          root.descendants().forEach((d: any) => {
            treeTargets[d.data.id] = {
              x: d.y - (width * 0.2),
              y: d.x
            };
          });
        }
      }

      // MERGE STRATEGY: Preserve Physics State
      const oldNodesMap = new Map<string, any>(
        (nodesRef.current || []).filter(n => n && n.id).map((n: any) => [n.id, n])
      );

      nodes = nodes.map((newNode: any) => {
        if (!newNode.id) return newNode;
        const oldNode = oldNodesMap.get(newNode.id);
        if (oldNode) {
          return { ...newNode, x: oldNode.x, y: oldNode.y, vx: oldNode.vx, vy: oldNode.vy };
        }
        return newNode;
      });
      nodesRef.current = nodes;

      // Update Forces based on Mode
      if (layoutMode === 'organized') {
        simulation.force("charge", null);
        simulation.force("center", null);
        simulation.force("collide", null);
        simulation.force("x", d3.forceX((d: any) => treeTargets[d.id]?.x || 0).strength(0.3));
        simulation.force("y", d3.forceY((d: any) => treeTargets[d.id]?.y || 0).strength(0.3));
        (simulation.force("link") as d3.ForceLink<any, any>).strength(0);
      } else {
        // Cool Chaos Mode - Organic, Floaty, and Springy
        simulation.force("x", d3.forceX(0).strength(0.04));
        simulation.force("y", d3.forceY(0).strength(0.06));
        simulation.force("charge", d3.forceManyBody().strength(-800));
        simulation.force("collide", d3.forceCollide().radius((d: any) => (d.weight || 1) * 12 + 25).iterations(2));

        (simulation.force("link") as d3.ForceLink<any, any>)
          .id((d: any) => d.id)
          .distance((d: any) => 100 + (d.source.weight + d.target.weight) * 3)
          .strength(0.8); // High strength for "connected" feel
      }

      // CRITICAL: Update nodes and links properly
      simulation.nodes(nodes);
      (simulation.force("link") as d3.ForceLink<any, any>).links(links);

      simulation.alpha(0.8).restart(); // Lower alpha = faster settling

      // --- DRAWING ---

      const t = svg.transition().duration(750);

      // 1. Links
      const linkGroup = g.select(".links");
      const link = linkGroup.selectAll<SVGPathElement, unknown>("path")
        .data(links, (d: any) => {
          const sId = typeof d.source === 'object' ? d.source.id : d.source;
          const tId = typeof d.target === 'object' ? d.target.id : d.target;
          return `${sId}-${tId}`;
        });

      link.exit().transition(t).attr("opacity", 0).remove();

      const linkEnter = link.enter().append("path")
        .attr("fill", "none")
        .attr("stroke", "var(--text-tertiary)") // Neumorphic grey
        .attr("stroke-width", 2)
        .attr("opacity", 0)
        .attr("stroke-dasharray", "8,4"); // Dash pattern for animation

      // Flash then fade to normal - neumorphic grey spectrum
      linkEnter.transition()
        .duration(200)
        .attr("opacity", 0.6)
        .attr("stroke", "var(--text-secondary)")
        .transition()
        .duration(400)
        .ease(d3.easeQuadOut)
        .attr("stroke", "var(--text-muted)")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.4)
        .attr("stroke-dasharray", "none"); // Remove dash after animation

      const linkMerge = linkEnter.merge(link);

      // 2. Nodes
      const nodeGroup = g.select(".nodes");
      const node = nodeGroup.selectAll<SVGGElement, unknown>("g")
        .data(nodes, (d: any) => d.id);

      // EXIT
      node.exit()
        .transition().duration(500).ease(d3.easeBackIn)
        .attr("transform", (d: any) => `translate(${d.x || 0},${d.y || 0}) scale(0)`)
        .remove();

      // ENTER
      const nodeEnter = node.enter().append("g")
        .call(d3.drag<any, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
        )
        .on("click", (e, d) => {
          e.stopPropagation();
          setEditingNode(d);
          setEditName(d.name);
        });

      // Spawn Animation - Enhanced Pop Effect
      nodeEnter.attr("transform", (d: any) => {
        // Try to find a parent to spawn from for the "burst" effect
        const l = links.find((link: any) => {
          const tId = typeof link.target === 'object' ? link.target.id : link.target;
          return tId === d.id;
        });
        if (l) {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const parent = oldNodesMap.get(sourceId);
          if (parent) return `translate(${parent.x || 0},${parent.y || 0}) scale(0)`;
        }
        return `translate(0,0) scale(0)`;
      });

      // NEUMORPHIC SHOCKWAVE - Single optimized ripple
      nodeEnter.append("circle")
        .attr("class", "ripple")
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "var(--text-tertiary)")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.5)
        .transition()
        .duration(500) // Faster animation
        .ease(d3.easeQuadOut)
        .attr("r", (d: any) => calcRadius(d.weight) * 3)
        .attr("opacity", 0)
        .remove();

      // PARTICLE SPARKLES - Reduced to 4 for better performance
      const particleCount = 4;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        nodeEnter.append("circle")
          .attr("class", `particle-${i}`)
          .attr("r", 2)
          .attr("fill", "var(--text-secondary)")
          .attr("cx", 0)
          .attr("cy", 0)
          .attr("opacity", 0.7)
          .transition()
          .delay(50) // Faster start
          .duration(400) // Faster animation
          .ease(d3.easeQuadOut)
          .attr("cx", (d: any) => Math.cos(angle) * calcRadius(d.weight) * 1.8)
          .attr("cy", (d: any) => Math.sin(angle) * calcRadius(d.weight) * 1.8)
          .attr("r", 0)
          .attr("opacity", 0)
          .remove();
      }

      // Main Circle - PREMIUM NEUMORPHIC BUBBLE with optimized pop animation
      // Uses inverted colors: WHITE in dark mode, BLACK in light mode
      nodeEnter.append("circle")
        .attr("class", "main-circle")
        .attr("r", 0)
        .attr("fill", "var(--bubble-bg)")
        .attr("stroke", "none")
        .attr("filter", (d: any) => d.isRecommendation ? "url(#neu-recommended)" : "url(#neu-shadow)")
        .attr("opacity", 0)
        .style("cursor", "pointer")
        .style("will-change", "transform, opacity") // GPU hint
        .transition()
        .duration(280) // Faster pop
        .ease(d3.easeBackOut.overshoot(1.3))
        .attr("r", (d: any) => calcRadius(d.weight))
        .attr("opacity", 1);

      // Outer ring for depth (neumorphic border effect)
      nodeEnter.append("circle")
        .attr("class", "outer-ring")
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "var(--bubble-border)")
        .attr("stroke-width", 2)
        .attr("opacity", 0.4)
        .transition()
        .delay(100)
        .duration(400)
        .attr("r", (d: any) => calcRadius(d.weight) + 2);

      // Inner gradient highlight (top-left light reflection)
      nodeEnter.append("circle")
        .attr("class", "inner-highlight-top")
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.5)")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", (d: any) => `${calcRadius(d.weight) * 1.2} ${calcRadius(d.weight) * 3}`)
        .attr("transform", "rotate(-45)")
        .attr("opacity", 0)
        .transition()
        .delay(200)
        .duration(400)
        .attr("r", (d: any) => calcRadius(d.weight) * 0.7)
        .attr("opacity", 0.6);

      // Inner shadow (bottom-right darker area)
      nodeEnter.append("circle")
        .attr("class", "inner-shadow")
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "rgba(0,0,0,0.15)")
        .attr("stroke-width", 4)
        .attr("stroke-dasharray", (d: any) => `${calcRadius(d.weight) * 1.2} ${calcRadius(d.weight) * 3}`)
        .attr("transform", "rotate(135)")
        .attr("opacity", 0)
        .transition()
        .delay(200)
        .duration(400)
        .attr("r", (d: any) => calcRadius(d.weight) * 0.7)
        .attr("opacity", 0.5);

      // Center highlight dot (3D pop effect)
      nodeEnter.append("circle")
        .attr("class", "center-highlight")
        .attr("r", 0)
        .attr("cx", (d: any) => -calcRadius(d.weight) * 0.25)
        .attr("cy", (d: any) => -calcRadius(d.weight) * 0.25)
        .attr("fill", "rgba(255,255,255,0.4)")
        .attr("opacity", 0)
        .transition()
        .delay(300)
        .duration(300)
        .attr("r", (d: any) => calcRadius(d.weight) * 0.15)
        .attr("opacity", 0.7);

      // Pulse Ring - grey
      nodeEnter.append("circle")
        .attr("class", "pulse-ring")
        .attr("fill", "none")
        .attr("stroke", "var(--text-secondary)")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .attr("r", (d: any) => calcRadius(d.weight));

      // Label with POP animation - contrasting color
      nodeEnter.append("text")
        .attr("class", "node-text")
        .attr("text-anchor", "middle")
        .attr("dy", (d: any) => calcRadius(d.weight) + 18)
        .attr("fill", "var(--text-primary)")
        .style("font-weight", "500")
        .style("font-size", "0px")
        .style("font-weight", "bold")
        .style("pointer-events", "none")
        .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)")
        .attr("opacity", 0)
        .text((d: any) => d.name)
        .transition()
        .delay(300)
        .duration(400)
        .ease(d3.easeBackOut)
        .style("font-size", (d: any) => Math.max(10, Math.min(16, (d.weight || 1) + 10)) + "px")
        .attr("opacity", 1)
        .attr("y", (d: any) => calcRadius(d.weight) + 18)
        .transition()
        .duration(200)
        .ease(d3.easeQuadInOut)
        .attr("y", (d: any) => calcRadius(d.weight) + 20) // Slight bounce
        .transition()
        .duration(150)
        .ease(d3.easeQuadOut)
        .attr("y", (d: any) => calcRadius(d.weight) + 18); // Final position

      // Star Icon with SPARKLE animation - grey spectrum
      nodeEnter.append("text")
        .attr("class", "star-icon")
        .attr("text-anchor", "middle")
        .attr("dy", -25)
        .text("★")
        .attr("fill", "var(--text-primary)")
        .attr("font-size", "0px")
        .attr("opacity", 0);

      // MERGE with enhanced animations
      const nodeMerge = nodeEnter.merge(node);

      // Transform animation with bounce
      nodeMerge.transition()
        .duration(800)
        .ease(d3.easeElasticOut.amplitude(1.2).period(0.6))
        .attr("transform", (d: any) => {
          if (isNaN(d.x) || isNaN(d.y)) return "translate(0,0) scale(1)";
          return `translate(${d.x},${d.y}) scale(1)`;
        });

      // Update Styles - enhanced neumorphic effect
      nodeMerge.select(".main-circle")
        .transition()
        .duration(300)
        .attr("r", (d: any) => calcRadius(d.weight))
        .attr("filter", (d: any) => d.isRecommendation ? "url(#neu-recommended)" : "url(#neu-shadow)");

      // Update outer ring
      nodeMerge.select(".outer-ring")
        .transition()
        .duration(300)
        .attr("r", (d: any) => calcRadius(d.weight) + 2);

      // Update inner highlights
      nodeMerge.select(".inner-highlight-top")
        .transition()
        .duration(300)
        .attr("r", (d: any) => calcRadius(d.weight) * 0.7)
        .attr("stroke-dasharray", (d: any) => `${calcRadius(d.weight) * 1.2} ${calcRadius(d.weight) * 3}`);

      nodeMerge.select(".inner-shadow")
        .transition()
        .duration(300)
        .attr("r", (d: any) => calcRadius(d.weight) * 0.7)
        .attr("stroke-dasharray", (d: any) => `${calcRadius(d.weight) * 1.2} ${calcRadius(d.weight) * 3}`);

      nodeMerge.select(".center-highlight")
        .transition()
        .duration(300)
        .attr("r", (d: any) => calcRadius(d.weight) * 0.15)
        .attr("cx", (d: any) => -calcRadius(d.weight) * 0.25)
        .attr("cy", (d: any) => -calcRadius(d.weight) * 0.25);

      // Text animation with pop
      nodeMerge.select(".node-text")
        .text((d: any) => d.name)
        .transition()
        .duration(400)
        .ease(d3.easeBackOut)
        .attr("dy", (d: any) => calcRadius(d.weight) + 18)
        .style("font-size", (d: any) => Math.max(10, Math.min(16, (d.weight || 1) + 10)) + "px")
        .attr("opacity", 1);

      // Star Icon with sparkle animation - grey spectrum
      nodeMerge.select(".star-icon")
        .transition()
        .duration(300)
        .attr("opacity", (d: any) => d.isRecommendation ? 1 : 0)
        .style("font-size", (d: any) => d.isRecommendation ? "0px" : "0px")
        .transition()
        .delay(200)
        .duration(400)
        .ease(d3.easeBackOut.overshoot(2))
        .style("font-size", (d: any) => d.isRecommendation ? "28px" : "0px")
        .attr("fill", "var(--text-primary)")
        .transition()
        .duration(200)
        .style("font-size", (d: any) => d.isRecommendation ? "24px" : "0px");

      nodeMerge.selectAll(".pulse-ring")
        .filter((d: any) => d.isRecommendation)
        .style("display", "block")
        .each(function (d: any) {
          const sel = d3.select(this);
          sel.selectAll("animate").remove();
          sel.append("animate")
            .attr("attributeName", "r")
            .attr("from", calcRadius(d.weight))
            .attr("to", calcRadius(d.weight) + 20)
            .attr("dur", "1.5s")
            .attr("repeatCount", "indefinite");
          sel.append("animate")
            .attr("attributeName", "opacity")
            .attr("from", 1)
            .attr("to", 0)
            .attr("dur", "1.5s")
            .attr("repeatCount", "indefinite");
        });

      // Tick
      simulation.on("tick", () => {
        linkMerge.attr("d", (d: any) => {
          // If D3 hasn't resolved objects yet, skip
          if (!d.source || !d.target || typeof d.source === 'string' || typeof d.target === 'string') return "";

          if (layoutMode === 'organized') {
            // Curved tree lines
            return `M${d.source.x},${d.source.y}
                            C${(d.source.x + d.target.x) / 2},${d.source.y}
                             ${(d.source.x + d.target.x) / 2},${d.target.y}
                             ${d.target.x},${d.target.y}`;
          }
          // Straight chaos lines
          return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
        });

        nodeMerge.attr("transform", (d: any) => {
          if (isNaN(d.x) || isNaN(d.y)) return "translate(0,0)";
          return `translate(${d.x},${d.y})`
        });
      });

      function calcRadius(weight: number = 1) {
        return 8 + (weight * 3.5);
      }

      function dragstarted(event: any, d: any) {
        if (!event.active) simulation?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event: any, d: any) {
        if (!event.active) simulation?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    } catch (e) {
      console.error("D3 Render Error:", e);
    }

  }, [rawData, dimensions, layoutMode]);

  const saveEdit = () => {
    if (editingNode && onNodeUpdate) {
      onNodeUpdate({ ...editingNode, name: editName });
      setEditingNode(null);
    }
  };

  if (!rawData) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4"
        style={{ color: 'var(--text-muted)' }}
      >
        <Activity className="animate-pulse" size={24} style={{ color: 'var(--accent)' }} />
        <p className="tracking-widest uppercase text-xs">Waiting for first thought...</p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="w-full h-full relative overflow-hidden group" style={{ background: 'transparent' }}>

      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 transition-opacity duration-300 opacity-60 group-hover:opacity-100">
        <div
          className="p-1.5 rounded-xl flex flex-col gap-1 backdrop-blur-xl"
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <button
            onClick={() => setLayoutMode('chaos')}
            className="p-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-xs uppercase font-semibold hover:scale-105"
            style={{
              background: layoutMode === 'chaos'
                ? 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)'
                : 'transparent',
              color: layoutMode === 'chaos' ? 'white' : 'var(--text-tertiary)',
              boxShadow: layoutMode === 'chaos' ? '0 2px 10px var(--accent-glow)' : 'none',
            }}
          >
            <Shuffle size={14} /> Chaos
          </button>
          <button
            onClick={() => setLayoutMode('organized')}
            className="p-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-xs uppercase font-semibold hover:scale-105"
            style={{
              background: layoutMode === 'organized'
                ? 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)'
                : 'transparent',
              color: layoutMode === 'organized' ? 'white' : 'var(--text-tertiary)',
              boxShadow: layoutMode === 'organized' ? '0 2px 10px var(--accent-glow)' : 'none',
            }}
          >
            <LayoutGrid size={14} /> Organized
          </button>
        </div>

        <div
          className="px-3 py-2 rounded-lg text-[10px] flex items-center gap-2 backdrop-blur-xl"
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-muted)',
          }}
        >
          <Move size={12} /> <span className="uppercase tracking-wider">Pan & Zoom</span>
        </div>
        <div
          className="px-3 py-2 rounded-lg text-[10px] flex items-center gap-2 backdrop-blur-xl"
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-muted)',
          }}
        >
          <Edit2 size={12} /> <span className="uppercase tracking-wider">Click Node</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2 pointer-events-none">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl"
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <span
            className="text-[10px] uppercase font-bold tracking-widest"
            style={{ color: 'var(--text-secondary)' }}
          >
            Recommended
          </span>
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 0 10px var(--accent-glow)',
            }}
          />
        </div>
      </div>

      {/* Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}
      />

      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Edit Modal */}
      {editingNode && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="p-6 rounded-2xl shadow-2xl w-80 transform scale-100 transition-all animate-scale-in"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <h3
              className="text-sm font-bold uppercase mb-4 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Edit2 size={16} style={{ color: 'var(--accent)' }} /> Edit Node
            </h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl p-3 text-sm mb-4 focus:outline-none transition-all duration-200"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              placeholder="Rename this thought..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingNode(null)}
                className="px-4 py-2 transition-all duration-200 text-xs uppercase font-semibold rounded-lg hover:scale-105"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-xs uppercase font-semibold hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
                  color: 'white',
                  boxShadow: '0 2px 10px var(--accent-glow)',
                }}
              >
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMap;