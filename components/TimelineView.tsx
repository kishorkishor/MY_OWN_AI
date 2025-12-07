import React, { useState } from 'react';
import { TimelineData, TimelineMilestone, MilestoneType } from '../types';
import { Calendar, ChevronDown, Flag, AlertTriangle, CheckCircle, Sparkles, GitBranch, Filter } from 'lucide-react';

interface TimelineViewProps {
  data: TimelineData | null;
}

const milestoneConfig: Record<MilestoneType, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  checkpoint: { icon: Flag, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' },
  outcome: { icon: CheckCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' },
  risk: { icon: AlertTriangle, color: 'text-rose-400', bgColor: 'bg-rose-500/20', borderColor: 'border-rose-500/30' },
  decision: { icon: GitBranch, color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/30' },
  benefit: { icon: Sparkles, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
};

const timeOrder = [
  '1 week', '2 weeks', '1 month', '2 months', '3 months', 
  '6 months', '1 year', '2 years', '3 years', '5 years', '10 years'
];

const getTimeIndex = (date: string): number => {
  const normalized = date.toLowerCase().trim();
  const index = timeOrder.findIndex(t => normalized.includes(t.toLowerCase()));
  return index >= 0 ? index : timeOrder.length;
};

const MilestoneCard: React.FC<{ milestone: TimelineMilestone; isFirst: boolean; isLast: boolean; delay: number }> = ({
  milestone,
  isFirst,
  isLast,
  delay
}) => {
  const config = milestoneConfig[milestone.type] || milestoneConfig.checkpoint;
  const Icon = config.icon;

  return (
    <div
      className="relative flex gap-4 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${config.bgColor} border ${config.borderColor} flex items-center justify-center z-10`}>
          <Icon size={18} className={config.color} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-neutral-700 -mt-1" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold ${config.color} uppercase tracking-wider`}>
            {milestone.date}
          </span>
          <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
            {milestone.optionName}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-white mb-1">{milestone.label}</h4>
        {milestone.description && (
          <p className="text-xs text-neutral-400">{milestone.description}</p>
        )}
      </div>
    </div>
  );
};

const TimelineTrack: React.FC<{ 
  milestones: TimelineMilestone[]; 
  optionName: string;
  color: string;
}> = ({ milestones, optionName, color }) => {
  const sortedMilestones = [...milestones].sort((a, b) => getTimeIndex(a.date) - getTimeIndex(b.date));

  return (
    <div className="relative">
      <div className={`sticky top-0 z-10 bg-black/80 backdrop-blur-sm py-2 mb-4 border-b border-neutral-800`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider ${color}`}>
          {optionName}
        </h3>
      </div>
      <div className="space-y-0">
        {sortedMilestones.map((milestone, idx) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            isFirst={idx === 0}
            isLast={idx === sortedMilestones.length - 1}
            delay={idx * 100}
          />
        ))}
      </div>
    </div>
  );
};

const HorizontalTimeline: React.FC<{ milestones: TimelineMilestone[] }> = ({ milestones }) => {
  const sortedMilestones = [...milestones].sort((a, b) => getTimeIndex(a.date) - getTimeIndex(b.date));
  const uniqueTimes = [...new Set(sortedMilestones.map(m => m.date))];

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start gap-0 min-w-max px-4">
        {uniqueTimes.map((time, timeIdx) => {
          const milestonesAtTime = sortedMilestones.filter(m => m.date === time);
          return (
            <div key={time} className="flex flex-col items-center" style={{ minWidth: '160px' }}>
              {/* Time marker */}
              <div className="relative flex items-center w-full">
                <div className={`flex-1 h-0.5 ${timeIdx === 0 ? 'bg-transparent' : 'bg-neutral-700'}`} />
                <div className="w-3 h-3 bg-white rounded-full z-10 flex-shrink-0" />
                <div className={`flex-1 h-0.5 ${timeIdx === uniqueTimes.length - 1 ? 'bg-transparent' : 'bg-neutral-700'}`} />
              </div>
              <span className="text-xs text-neutral-400 mt-2 font-medium">{time}</span>
              
              {/* Milestones at this time */}
              <div className="mt-3 space-y-2 w-full px-2">
                {milestonesAtTime.map((milestone) => {
                  const config = milestoneConfig[milestone.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={milestone.id}
                      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-2 text-xs animate-fade-in`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Icon size={12} className={config.color} />
                        <span className={`font-medium ${config.color}`}>{milestone.optionName}</span>
                      </div>
                      <p className="text-neutral-300 line-clamp-2">{milestone.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimelineView: React.FC<TimelineViewProps> = ({ data }) => {
  const [selectedOption, setSelectedOption] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [filterType, setFilterType] = useState<MilestoneType | 'all'>('all');

  if (!data || !data.milestones || data.milestones.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500 p-8">
        <Calendar size={48} className="mb-4 text-neutral-600" />
        <p className="text-sm uppercase tracking-widest mb-2">Timeline</p>
        <p className="text-xs text-neutral-600 text-center max-w-xs">
          Run Full Analysis to see when key milestones and outcomes occur for each option
        </p>
      </div>
    );
  }

  const filteredMilestones = data.milestones.filter(m => {
    const matchesOption = selectedOption === 'all' || m.optionName === selectedOption;
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesOption && matchesType;
  });

  const optionColors: Record<string, string> = {};
  const colors = ['text-blue-400', 'text-emerald-400', 'text-amber-400', 'text-purple-400', 'text-rose-400'];
  data.options.forEach((opt, idx) => {
    optionColors[opt] = colors[idx % colors.length];
  });

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-white uppercase tracking-wide">Timeline</h2>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('vertical')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'vertical' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Vertical
            </button>
            <button
              onClick={() => setViewMode('horizontal')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'horizontal' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Horizontal
            </button>
          </div>

          {/* Option filter */}
          <div className="relative">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="appearance-none bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-neutral-600 cursor-pointer text-xs"
            >
              <option value="all">All Options</option>
              {data.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as MilestoneType | 'all')}
              className="appearance-none bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-neutral-600 cursor-pointer text-xs"
            >
              <option value="all">All Types</option>
              <option value="checkpoint">Checkpoints</option>
              <option value="outcome">Outcomes</option>
              <option value="risk">Risks</option>
              <option value="decision">Decisions</option>
              <option value="benefit">Benefits</option>
            </select>
            <Filter size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(milestoneConfig).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type as MilestoneType)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                filterType === type || filterType === 'all'
                  ? `${config.bgColor} ${config.borderColor} border`
                  : 'bg-neutral-800/50 text-neutral-500'
              }`}
            >
              <Icon size={12} className={filterType === type || filterType === 'all' ? config.color : ''} />
              <span className={filterType === type || filterType === 'all' ? config.color : ''}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto bg-neutral-900/50 rounded-xl border border-neutral-800 p-4">
        {filteredMilestones.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500">
            <p className="text-sm">No milestones match your filters</p>
          </div>
        ) : viewMode === 'horizontal' ? (
          <HorizontalTimeline milestones={filteredMilestones} />
        ) : selectedOption === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.options.map((optionName) => {
              const optionMilestones = filteredMilestones.filter(m => m.optionName === optionName);
              if (optionMilestones.length === 0) return null;
              return (
                <TimelineTrack
                  key={optionName}
                  milestones={optionMilestones}
                  optionName={optionName}
                  color={optionColors[optionName]}
                />
              );
            })}
          </div>
        ) : (
          <TimelineTrack
            milestones={filteredMilestones}
            optionName={selectedOption}
            color={optionColors[selectedOption] || 'text-white'}
          />
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(milestoneConfig).map(([type, config]) => {
          const count = filteredMilestones.filter(m => m.type === type).length;
          const Icon = config.icon;
          return (
            <div
              key={type}
              className={`${config.bgColor} ${config.borderColor} border rounded-lg p-2 text-center`}
            >
              <Icon size={16} className={`${config.color} mx-auto mb-1`} />
              <span className={`text-lg font-bold ${config.color}`}>{count}</span>
              <p className="text-xs text-neutral-400 capitalize">{type}s</p>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default TimelineView;

