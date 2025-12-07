import React, { useState, useEffect, useRef, ErrorInfo, ReactNode, Component } from 'react';
import {
  Message,
  MindMapNode,
  ProjectionScenario,
  ComparisonData,
  DecisionTreeData,
  SWOTAnalysis,
  CostBenefitAnalysis,
  TimelineData
} from './types';
import { useTheme } from './contexts/ThemeContext';
import ChatInterface from './components/ChatInterface';
import MindMap from './components/MindMap';
import ProjectionView from './components/ProjectionView';
import ComparisonView from './components/ComparisonView';
import DecisionTree from './components/DecisionTree';
import SWOTView from './components/SWOTView';
import CostBenefitView from './components/CostBenefitView';
import TimelineView from './components/TimelineView';
import QuickActions from './components/QuickActions';
// GradientBackground removed for neumorphic design
import ThemeToggle from './components/ThemeToggle';
import {
  sendMessageStream,
  generateMindMapData,
  generateProjectionData,
  generateComparisonData,
  generateDecisionTree,
  generateSWOTAnalysis,
  generateCostBenefit,
  generateTimelineData
} from './services/deepseekService';
import {
  GitBranch,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Maximize2,
  Scale,
  Download,
  Network,
  Target,
  Calendar,
  BarChart3,
  Navigation
} from 'lucide-react';

interface VisErrorBoundaryProps {
  children?: ReactNode;
}

interface VisErrorBoundaryState {
  hasError: boolean;
}

// Kompass Logo Component - Neumorphic Style
const KompassLogo: React.FC<{ className?: string; isDark?: boolean }> = ({ className = '', isDark = true }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="neu-shadow-dark" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
        <feDropShadow dx="-2" dy="-2" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.05" />
      </filter>
      <filter id="neu-shadow-light" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.15" />
        <feDropShadow dx="-2" dy="-2" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.8" />
      </filter>
    </defs>
    <circle
      cx="20" cy="20" r="18"
      fill={isDark ? "#2a2a2a" : "#e8e8e8"}
      filter={isDark ? "url(#neu-shadow-dark)" : "url(#neu-shadow-light)"}
    />
    <path
      d="M20 6 L22 17 L32 20 L22 23 L20 34 L18 23 L8 20 L18 17 Z"
      fill={isDark ? "#ffffff" : "#1a1a1a"}
      fillOpacity="0.9"
    />
    <circle cx="20" cy="20" r="3" fill={isDark ? "#404040" : "#c0c0c0"} />
  </svg>
);

// Error Boundary for Visualization Section
class VisErrorBoundary extends Component<VisErrorBoundaryProps, VisErrorBoundaryState> {
  constructor(props: VisErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): VisErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Visualization Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full neu-panel p-8">
          <AlertCircle size={32} className="mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="uppercase tracking-widest text-xs" style={{ color: 'var(--text-secondary)' }}>
            Visualization Unavailable
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 neu-button text-xs"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

type TabType = 'mindmap' | 'tree' | 'swot' | 'costbenefit' | 'timeline' | 'projection' | 'compare';

const tabConfig: { id: TabType; label: string; icon: React.ElementType; group: 'visual' | 'analysis' | 'time' }[] = [
  { id: 'mindmap', label: 'Map', icon: Network, group: 'visual' },
  { id: 'tree', label: 'Tree', icon: GitBranch, group: 'visual' },
  { id: 'swot', label: 'SWOT', icon: Target, group: 'analysis' },
  { id: 'costbenefit', label: 'Cost/Benefit', icon: Scale, group: 'analysis' },
  { id: 'compare', label: 'Compare', icon: BarChart3, group: 'analysis' },
  { id: 'timeline', label: 'Timeline', icon: Calendar, group: 'time' },
  { id: 'projection', label: 'Outcomes', icon: TrendingUp, group: 'time' },
];

const App: React.FC = () => {
  const { isDark } = useTheme();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('mindmap');

  // Visualization Data State
  const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);
  const [projectionData, setProjectionData] = useState<ProjectionScenario[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [decisionTreeData, setDecisionTreeData] = useState<DecisionTreeData | null>(null);
  const [swotData, setSWOTData] = useState<SWOTAnalysis | null>(null);
  const [costBenefitData, setCostBenefitData] = useState<CostBenefitAnalysis | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isVisLoading, setIsVisLoading] = useState(false);
  const [visError, setVisError] = useState<string | null>(null);

  // Background update state
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);

  // Refs for caching (used by other visualizations)
  const lastConversationHashRef = useRef<string>('');

  // Generate a simple hash of conversation for cache checking (for other viz)
  const getConversationHash = (msgs: Message[]): string => {
    return msgs.map(m => `${m.role}:${m.text.slice(0, 50)}`).join('|');
  };

  // Background API update (optional - for higher quality, can be toggled)
  const updateMindMapBackground = async () => {
    if (isBackgroundUpdating) return;

    const currentHash = getConversationHash(messages);
    if (currentHash === lastConversationHashRef.current) {
      return;
    }

    setIsBackgroundUpdating(true);
    try {
      const mapData = await safeGenerate(generateMindMapData(messages));
      if (mapData) {
        lastConversationHashRef.current = currentHash;
        setMindMapData(mapData); // Override with higher quality API data
      }
    } catch (e) {
      console.warn("API mind map update failed, using instant version", e);
    } finally {
      setIsBackgroundUpdating(false);
    }
  };

  // Chat Handler - with PARALLEL mind map generation
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', text: input, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsChatLoading(true);

    // START MIND MAP GENERATION IN PARALLEL (don't await - let it run alongside chat)
    const mindMapPromise = (async () => {
      try {
        const mapData = await generateMindMapData(updatedMessages);
        if (mapData) {
          setMindMapData(mapData);
        }
      } catch (e) {
        console.warn("Parallel mind map generation failed:", e);
      }
    })();

    try {
      const stream = sendMessageStream(input);
      let fullResponse = '';

      // Optimistic update for bot message
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date(), isStreaming: true }]);

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev =>
          prev.map((msg, idx) =>
            idx === prev.length - 1 ? { ...msg, text: fullResponse } : msg
          )
        );
      }

      // Mark streaming as done
      setMessages(prev =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 ? { ...msg, isStreaming: false } : msg
        )
      );

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error?.message || "Sorry, I encountered an error. Please try again.";
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}`, timestamp: new Date() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper to safely execute a promise and return null on failure instead of throwing
  const safeGenerate = async <T,>(promise: Promise<T>): Promise<T | null> => {
    try {
      return await promise;
    } catch (e) {
      console.warn("Generation component failed:", e);
      return null;
    }
  };

  // Full Analysis Handler (Manual Trigger)
  const handleAnalyze = async () => {
    if (messages.length < 2) return;
    setIsVisLoading(true);
    setVisError(null);

    try {
      // Run all generations in parallel but catch individual errors so partial results still show
      const [mapData, projData, compData, treeData, swotResult, cbData, tlData] = await Promise.all([
        safeGenerate(generateMindMapData(messages)),
        safeGenerate(generateProjectionData(messages)),
        safeGenerate(generateComparisonData(messages)),
        safeGenerate(generateDecisionTree(messages)),
        safeGenerate(generateSWOTAnalysis(messages)),
        safeGenerate(generateCostBenefit(messages)),
        safeGenerate(generateTimelineData(messages))
      ]);

      // We do not throw error if at least ONE succeeded.
      // If ALL failed, then we show error.
      const anySuccess = mapData || (projData && projData.length > 0) || compData || treeData || swotResult || cbData || tlData;
      if (!anySuccess) {
        throw new Error("Could not generate analysis. Please try elaborating on your situation.");
      }

      setMindMapData(mapData);
      setProjectionData(projData || []);
      setComparisonData(compData);
      setDecisionTreeData(treeData);
      setSWOTData(swotResult);
      setCostBenefitData(cbData);
      setTimelineData(tlData);

    } catch (err: any) {
      console.error("Analysis Error", err);
      setVisError(err.message || "Failed to analyze conversation.");
    } finally {
      setIsVisLoading(false);
    }
  };

  const handleNodeUpdate = (updatedNode: MindMapNode) => {
    console.log("Node updated:", updatedNode);
  };

  const handleExport = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.timestamp.toLocaleTimeString()}:\n${m.text}\n`).join('\n') +
      "\n--- ANALYSIS SUMMARY ---\n" +
      (comparisonData ? `Best Option: ${comparisonData.rows.find(r => r.isRecommended)?.optionName || 'None'}\n` : '') +
      "Pathfinder Export";

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pathfinder-decision.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick action handler - sends a prompt directly to chat (with parallel mind map)
  const handleQuickAction = async (prompt: string) => {
    setInput(prompt);
    // Delay slightly to show the input, then send
    setTimeout(() => {
      const userMsg: Message = { role: 'user', text: prompt, timestamp: new Date() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput('');
      setIsChatLoading(true);

      // START MIND MAP GENERATION IN PARALLEL
      (async () => {
        try {
          const mapData = await generateMindMapData(updatedMessages);
          if (mapData) setMindMapData(mapData);
        } catch (e) {
          console.warn("Parallel mind map generation failed:", e);
        }
      })();

      (async () => {
        try {
          const stream = sendMessageStream(prompt);
          let fullResponse = '';

          setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date(), isStreaming: true }]);

          for await (const chunk of stream) {
            fullResponse += chunk;
            setMessages(prev =>
              prev.map((msg, idx) =>
                idx === prev.length - 1 ? { ...msg, text: fullResponse } : msg
              )
            );
          }

          setMessages(prev =>
            prev.map((msg, idx) =>
              idx === prev.length - 1 ? { ...msg, isStreaming: false } : msg
            )
          );
        } catch (error: any) {
          console.error("Quick action error:", error);
          const errorMessage = error?.message || "Sorry, I encountered an error. Please try again.";
          setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}`, timestamp: new Date() }]);
        } finally {
          setIsChatLoading(false);
        }
      })();
    }, 100);
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500"
      style={{
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Navbar - Neumorphic */}
      <header
        className="h-16 flex items-center justify-between px-6 z-20 neu-panel mx-4 mt-4"
        style={{ borderRadius: 'var(--radius-xl)' }}
      >
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative group">
            <KompassLogo
              className="w-10 h-10 transition-transform duration-300 group-hover:scale-105"
              isDark={isDark}
            />
          </div>
          <div className="flex flex-col">
            <h1
              className="text-xl font-bold tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              KOMPASS
            </h1>
            <span
              className="text-[10px] tracking-widest uppercase hidden sm:block"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Navigate Your Decisions
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isBackgroundUpdating && (
            <div className="flex items-center gap-2 text-xs mr-2" style={{ color: 'var(--text-tertiary)' }}>
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--text-secondary)' }}
              />
              <span className="uppercase tracking-widest hidden md:inline">Syncing</span>
            </div>
          )}

          <ThemeToggle />

          {messages.length > 2 && (
            <button
              onClick={handleExport}
              className="neu-button p-2.5 transition-all duration-200"
              style={{
                color: 'var(--text-tertiary)',
                borderRadius: 'var(--radius-md)',
              }}
              title="Export Decision Log"
            >
              <Download size={18} />
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isVisLoading || messages.length < 2}
            className={`
                neu-button flex items-center gap-2 px-5 py-2.5 font-semibold text-sm tracking-wide 
                transition-all duration-300 
                ${messages.length < 2
                ? 'cursor-not-allowed opacity-50'
                : 'active:scale-95'
              }
              `}
            style={{
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
            }}
          >
            {isVisLoading ? (
              <Sparkles className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {isVisLoading ? 'ANALYZING...' : 'ANALYZE'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left Col: Chat */}
        <div className="lg:col-span-4 h-[calc(100vh-7rem)] min-h-[500px] flex flex-col gap-3">
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            isLoading={isChatLoading}
            onOptionClick={handleQuickAction}
          />

          {/* Quick Actions below Chat */}
          <div className="flex justify-end">
            <QuickActions
              onAction={handleQuickAction}
              isLoading={isChatLoading}
              hasConversation={messages.length >= 2}
            />
          </div>
        </div>

        {/* Right Col: Visualization */}
        <div className="lg:col-span-8 h-[calc(100vh-7rem)] flex flex-col gap-3">

          {/* Tabs - Neumorphic Style */}
          <div
            className="flex p-2 gap-2 overflow-x-auto scrollbar-hide neu-panel"
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            {['visual', 'analysis', 'time'].map((group, groupIdx) => (
              <React.Fragment key={group}>
                {groupIdx > 0 && (
                  <div
                    className="w-px mx-1 self-stretch"
                    style={{ backgroundColor: 'var(--border-visible)' }}
                  />
                )}
                <div className="flex gap-2">
                  {tabConfig.filter(t => t.group === group).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider 
                          transition-all duration-200 whitespace-nowrap
                          ${isActive ? '' : 'hover:opacity-80'}
                        `}
                        style={{
                          background: 'var(--bg-surface)',
                          color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: isActive
                            ? 'var(--shadow-neu-button-pressed)'
                            : 'var(--shadow-neu-button)',
                        }}
                      >
                        <Icon size={14} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Vis Container - Neumorphic */}
          <div
            className="flex-1 neu-inset relative overflow-hidden"
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            {visError && (
              <div
                className="absolute top-0 left-0 w-full z-50 p-3 text-center"
                style={{
                  background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border-visible)',
                }}
              >
                <p className="text-xs flex items-center justify-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                  <AlertCircle size={14} /> {visError}
                </p>
              </div>
            )}

            <VisErrorBoundary>
              <div className="h-full w-full">
                {activeTab === 'mindmap' && (
                  <MindMap data={mindMapData} onNodeUpdate={handleNodeUpdate} />
                )}
                {activeTab === 'tree' && (
                  <DecisionTree data={decisionTreeData} />
                )}
                {activeTab === 'swot' && (
                  <SWOTView data={swotData} />
                )}
                {activeTab === 'costbenefit' && (
                  <CostBenefitView data={costBenefitData} />
                )}
                {activeTab === 'compare' && (
                  <ComparisonView data={comparisonData} />
                )}
                {activeTab === 'timeline' && (
                  <TimelineView data={timelineData} />
                )}
                {activeTab === 'projection' && (
                  <ProjectionView scenarios={projectionData} />
                )}
              </div>
            </VisErrorBoundary>

            {/* Empty State Overlay - Neumorphic */}
            {(!mindMapData && !projectionData.length && !comparisonData && !decisionTreeData && !swotData && !costBenefitData && !timelineData && !isVisLoading && !isBackgroundUpdating) && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8 text-center pointer-events-none"
                style={{ background: 'var(--bg-base)' }}
              >
                <div
                  className="neu-bubble p-6 mb-6 animate-float"
                  style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Navigation size={32} style={{ color: 'var(--bubble-text)' }} />
                </div>
                <h3
                  className="text-2xl font-bold mb-3 tracking-wide"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Ready to Navigate
                </h3>
                <p
                  className="max-w-sm mb-6 font-light leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Start a conversation with Kompass to explore your options.
                  The visualization will update automatically as you chat.
                </p>
                <div
                  className="neu-panel flex items-center gap-2 px-5 py-3 text-xs"
                  style={{ borderRadius: 'var(--radius-full)' }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: 'var(--text-secondary)' }}
                  />
                  <span style={{ color: 'var(--text-tertiary)' }}>Waiting for input...</span>
                </div>
              </div>
            )}

            {isVisLoading && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center z-20"
                style={{ background: 'var(--bg-base)' }}
              >
                <div
                  className="neu-bubble p-5 mb-6"
                  style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Sparkles
                    size={36}
                    strokeWidth={1.5}
                    className="animate-spin"
                    style={{ color: 'var(--bubble-text)' }}
                  />
                </div>
                <p
                  className="font-mono text-sm tracking-widest animate-pulse"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ANALYZING...
                </p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;
