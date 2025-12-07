import React, { useState } from 'react';
import { SWOTAnalysis, SWOTData } from '../types';
import { TrendingUp, TrendingDown, Zap, Shield, ChevronDown, Award } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SWOTViewProps {
  data: SWOTAnalysis | null;
}

const quadrantConfig = {
  strengths: {
    title: 'Strengths',
    icon: TrendingUp,
    label: 'S',
  },
  weaknesses: {
    title: 'Weaknesses',
    icon: TrendingDown,
    label: 'W',
  },
  opportunities: {
    title: 'Opportunities',
    icon: Zap,
    label: 'O',
  },
  threats: {
    title: 'Threats',
    icon: Shield,
    label: 'T',
  },
};

const QuadrantCard: React.FC<{
  type: keyof typeof quadrantConfig;
  items: string[];
  delay: number;
}> = ({ type, items, delay }) => {
  const config = quadrantConfig[type];
  const Icon = config.icon;

  return (
    <div
      className="neu-panel p-4 flex flex-col gap-3 animate-fade-in transition-all duration-300 hover:scale-[1.01]"
      style={{ 
        animationDelay: `${delay}ms`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="neu-bubble p-2"
          style={{ 
            width: 36, 
            height: 36, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Icon size={16} style={{ color: 'var(--bubble-text)' }} />
        </div>
        <h3 
          className="font-bold text-sm uppercase tracking-wider"
          style={{ color: 'var(--text-primary)' }}
        >
          {config.title}
        </h3>
        <span 
          className="ml-auto text-xs px-3 py-1"
          style={{
            background: 'var(--bg-base)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-neu-inset)',
            color: 'var(--text-tertiary)',
          }}
        >
          {items.length}
        </span>
      </div>
      <ul className="space-y-2 flex-1">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="text-sm flex items-start gap-2 animate-slide-in"
            style={{ 
              animationDelay: `${delay + (idx * 100)}ms`,
              color: 'var(--text-secondary)',
            }}
          >
            <span 
              className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--text-tertiary)' }}
            />
            <span>{item}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
            No items identified
          </li>
        )}
      </ul>
    </div>
  );
};

const ScoreBar: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const normalizedScore = Math.max(-100, Math.min(100, score));
  const percentage = ((normalizedScore + 100) / 200) * 100;
  const isPositive = normalizedScore >= 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-primary)' }}>
          {isPositive ? '+' : ''}{normalizedScore}
        </span>
      </div>
      <div 
        className="h-3 overflow-hidden"
        style={{ 
          background: 'var(--bg-base)',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-neu-inset)',
        }}
      >
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${percentage}%`,
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-neu-subtle)',
          }}
        />
      </div>
    </div>
  );
};

const SWOTView: React.FC<SWOTViewProps> = ({ data }) => {
  const { isDark } = useTheme();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  if (!data || !data.options || data.options.length === 0) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center p-8"
        style={{ color: 'var(--text-muted)' }}
      >
        <div 
          className="neu-panel w-16 h-16 grid grid-cols-2 gap-1 p-2 mb-4"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          {['S', 'W', 'O', 'T'].map((letter, i) => (
            <div 
              key={letter}
              className="rounded flex items-center justify-center text-xs font-bold"
              style={{ 
                background: 'var(--bg-base)',
                boxShadow: 'var(--shadow-neu-inset)',
                color: 'var(--text-tertiary)',
              }}
            >
              {letter}
            </div>
          ))}
        </div>
        <p className="text-sm uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
          SWOT Analysis
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
          Run Full Analysis to see Strengths, Weaknesses, Opportunities, and Threats for each option
        </p>
      </div>
    );
  }

  const currentOption = selectedOption 
    ? data.options.find(o => o.optionName === selectedOption) 
    : data.options[0];

  if (!currentOption) return null;

  const isRecommended = data.recommendedOption === currentOption.optionName;

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-auto">
      {/* Header with Option Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 
            className="text-lg font-bold uppercase tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            SWOT Analysis
          </h2>
          {isRecommended && (
            <span 
              className="neu-button flex items-center gap-1 text-xs px-3 py-1.5"
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              <Award size={12} />
              Recommended
            </span>
          )}
        </div>
        
        {data.options.length > 1 && (
          <div className="relative">
            <select
              value={currentOption.optionName}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="neu-input appearance-none text-sm px-4 py-2.5 pr-10 cursor-pointer"
              style={{ borderRadius: 'var(--radius-lg)' }}
            >
              {data.options.map((opt) => (
                <option key={opt.optionName} value={opt.optionName}>
                  {opt.optionName}
                  {data.recommendedOption === opt.optionName ? ' ★' : ''}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" 
              style={{ color: 'var(--text-tertiary)' }} 
            />
          </div>
        )}
      </div>

      {/* Score Overview */}
      {currentOption.overallScore !== undefined && (
        <div 
          className="neu-panel p-4"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <ScoreBar score={currentOption.overallScore} label="Overall Assessment" />
        </div>
      )}

      {/* SWOT Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        <QuadrantCard type="strengths" items={currentOption.strengths} delay={0} />
        <QuadrantCard type="weaknesses" items={currentOption.weaknesses} delay={100} />
        <QuadrantCard type="opportunities" items={currentOption.opportunities} delay={200} />
        <QuadrantCard type="threats" items={currentOption.threats} delay={300} />
      </div>

      {/* Quick Comparison */}
      {data.options.length > 1 && (
        <div 
          className="neu-panel p-4"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <h3 
            className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Quick Comparison
          </h3>
          <div className="space-y-2">
            {data.options.map((opt) => (
              <div
                key={opt.optionName}
                className="flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 active:scale-98"
                style={{
                  background: opt.optionName === currentOption.optionName 
                    ? 'var(--bg-base)' 
                    : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: opt.optionName === currentOption.optionName 
                    ? 'var(--shadow-neu-inset)' 
                    : 'none',
                }}
                onClick={() => setSelectedOption(opt.optionName)}
              >
                <div className="flex-1">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {opt.optionName}
                  </span>
                  {data.recommendedOption === opt.optionName && (
                    <Award size={12} className="inline ml-2" style={{ color: 'var(--text-secondary)' }} />
                  )}
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    +{opt.strengths.length + opt.opportunities.length}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    -{opt.weaknesses.length + opt.threats.length}
                  </span>
                </div>
                {opt.overallScore !== undefined && (
                  <span 
                    className="text-xs font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {opt.overallScore >= 0 ? '+' : ''}{opt.overallScore}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SWOTView;
