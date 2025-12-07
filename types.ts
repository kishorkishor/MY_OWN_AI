export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Mind Map Types
export interface MindMapNode {
  id: string; // Unique ID for D3 linking
  name: string;
  type: 'root' | 'topic' | 'option' | 'outcome' | 'pro' | 'con';
  children?: MindMapNode[];
  weight?: number; // 1-10 scale for node size importance
  isRecommendation?: boolean; // If AI selects this as the best choice
  collapsed?: boolean;
}

export interface MindMapLink {
  source: string | MindMapNode;
  target: string | MindMapNode;
}

// Projection Types
export interface ProjectionPoint {
  timeLabel: string; // e.g., "1 Month", "1 Year"
  value: number; // Satisfaction/Success score 0-100
}

export interface ProjectionScenario {
  name: string; // The option name
  data: ProjectionPoint[];
  color?: string;
  description: string;
}

// Comparison Matrix Types
export interface ComparisonCriteria {
  name: string; // e.g., "Cost", "Time", "Risk"
}

export interface ComparisonScore {
  criteria: string;
  score: number;
}

export interface ComparisonRow {
  optionName: string;
  isRecommended: boolean;
  scores: ComparisonScore[]; // Changed to strict array for better schema compliance
  summary: string;
}

export interface ComparisonData {
  criteria: string[];
  rows: ComparisonRow[];
}

export interface VisualizationState {
  mindMap: MindMapNode | null;
  projections: ProjectionScenario[];
  comparison: ComparisonData | null;
  isLoading: boolean;
  error: string | null;
}

// Decision Tree Types
export interface DecisionTreeNode {
  id: string;
  label: string;
  type: 'decision' | 'chance' | 'outcome';
  probability?: number; // 0-100 percentage for chance nodes
  value?: number; // Outcome value/score
  sentiment?: 'positive' | 'negative' | 'neutral';
  children?: DecisionTreeNode[];
}

export interface DecisionTreeData {
  root: DecisionTreeNode;
  recommendation?: string; // ID of recommended path
}

// SWOT Analysis Types
export interface SWOTData {
  optionName: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  overallScore?: number; // Calculated score based on SWOT
}

export interface SWOTAnalysis {
  options: SWOTData[];
  recommendedOption?: string;
}

// Cost-Benefit Analysis Types
export type CostBenefitCategory = 'financial' | 'time' | 'emotional' | 'opportunity' | 'social';

export interface CostBenefitItem {
  id: string;
  category: CostBenefitCategory;
  description: string;
  magnitude: number; // 1-10 scale
}

export interface CostBenefitData {
  optionName: string;
  costs: CostBenefitItem[];
  benefits: CostBenefitItem[];
  netScore: number; // Benefits sum minus Costs sum
  recommendation?: string; // Brief recommendation text
}

export interface CostBenefitAnalysis {
  options: CostBenefitData[];
  bestOption?: string;
}

// Timeline/Roadmap Types
export type MilestoneType = 'checkpoint' | 'outcome' | 'risk' | 'decision' | 'benefit';

export interface TimelineMilestone {
  id: string;
  date: string; // e.g., "1 week", "3 months", "1 year"
  label: string;
  description?: string;
  type: MilestoneType;
  optionId: string;
  optionName: string;
}

export interface TimelineData {
  milestones: TimelineMilestone[];
  options: string[]; // List of option names for filtering
  timeHorizon: 'short' | 'medium' | 'long'; // Default view
}