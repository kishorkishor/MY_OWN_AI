import React, { useState } from 'react';
import { Lightbulb, HelpCircle, Microscope, RefreshCw, X, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
  isLoading: boolean;
  hasConversation: boolean;
}

const quickActionPresets = [
  {
    id: 'deep-dive',
    icon: Microscope,
    label: 'Deep Dive',
    description: 'Get more details on a specific option',
    prompt: 'Can you dive deeper into the pros and cons of the recommended option? What are the hidden considerations I might be missing?',
  },
  {
    id: 'what-if',
    icon: HelpCircle,
    label: 'What If...',
    description: 'Explore hypothetical scenarios',
    prompt: 'What if my circumstances changed? For example, what if I had more time, less budget, or different priorities? How would that change your recommendation?',
  },
  {
    id: 'explain-why',
    icon: Lightbulb,
    label: 'Explain Why',
    description: 'Understand the reasoning',
    prompt: 'Can you explain your reasoning more clearly? Why did you recommend this option over the others? What assumptions are you making?',
  },
  {
    id: 'reconsider',
    icon: RefreshCw,
    label: 'Reconsider',
    description: 'Challenge the recommendation',
    prompt: 'Play devil\'s advocate. What arguments could be made against your recommendation? Are there scenarios where a different option would be better?',
  },
];

const QuickActions: React.FC<QuickActionsProps> = ({ onAction, isLoading, hasConversation }) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleActionClick = (prompt: string) => {
    onAction(prompt);
    setIsExpanded(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      onAction(customPrompt);
      setCustomPrompt('');
      setIsExpanded(false);
    }
  };

  if (!hasConversation) return null;

  return (
    <div className="relative">
      {/* Toggle Button - Neumorphic */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 active:scale-95"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: isExpanded ? 'var(--shadow-neu-button-pressed)' : 'var(--shadow-neu-button)',
          color: 'var(--text-secondary)',
          opacity: isLoading ? 0.5 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isExpanded ? <X size={14} /> : <Zap size={14} />}
        {isExpanded ? 'Close' : 'Quick Actions'}
      </button>

      {/* Expanded Panel - Neumorphic */}
      {isExpanded && (
        <div 
          className="absolute bottom-full right-0 mb-2 w-80 neu-panel p-4 animate-scale-in z-50"
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          <h3 
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Quick Actions
          </h3>
          
          {/* Preset Actions - Neumorphic buttons */}
          <div className="space-y-2 mb-4">
            {quickActionPresets.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-start gap-3 p-3 transition-all duration-200 active:scale-98 group"
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-neu-subtle)',
                    opacity: isLoading ? 0.5 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div 
                    className="neu-bubble p-2 transition-all duration-200 group-hover:scale-105"
                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon size={14} style={{ color: 'var(--bubble-text)' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <span 
                      className="text-sm font-semibold block"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {action.label}
                    </span>
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {action.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Prompt - Neumorphic */}
          <div 
            className="pt-3"
            style={{ borderTop: '1px solid var(--border-visible)' }}
          >
            <form onSubmit={handleCustomSubmit}>
              <label 
                className="text-xs uppercase tracking-wider mb-2 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Custom Question
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ask anything..."
                  className="neu-input flex-1 text-sm"
                  style={{ 
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                  }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !customPrompt.trim()}
                  className="neu-button px-4 py-2 text-xs font-semibold uppercase transition-all duration-200 active:scale-95"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    opacity: !customPrompt.trim() || isLoading ? 0.5 : 1,
                    cursor: !customPrompt.trim() || isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Ask
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActions;
