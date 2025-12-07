import React, { useState, useEffect } from 'react';
import { CostBenefitAnalysis, CostBenefitData, CostBenefitItem, CostBenefitCategory } from '../types';
import { Scale, ChevronDown, TrendingUp, TrendingDown, DollarSign, Clock, Heart, Sparkles, Users, Award } from 'lucide-react';

interface CostBenefitViewProps {
  data: CostBenefitAnalysis | null;
}

const categoryConfig: Record<CostBenefitCategory, { icon: React.ElementType; color: string; label: string }> = {
  financial: { icon: DollarSign, color: 'text-green-400', label: 'Financial' },
  time: { icon: Clock, color: 'text-blue-400', label: 'Time' },
  emotional: { icon: Heart, color: 'text-pink-400', label: 'Emotional' },
  opportunity: { icon: Sparkles, color: 'text-amber-400', label: 'Opportunity' },
  social: { icon: Users, color: 'text-purple-400', label: 'Social' },
};

const ItemCard: React.FC<{ item: CostBenefitItem; type: 'cost' | 'benefit'; delay: number }> = ({ 
  item, 
  type, 
  delay 
}) => {
  const config = categoryConfig[item.category] || categoryConfig.opportunity;
  const Icon = config.icon;
  const bgColor = type === 'cost' ? 'bg-rose-500/10' : 'bg-emerald-500/10';
  const borderColor = type === 'cost' ? 'border-rose-500/20' : 'border-emerald-500/20';

  return (
    <div
      className={`${bgColor} ${borderColor} border rounded-lg p-3 animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-2">
        <Icon size={14} className={config.color} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-200">{item.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${config.color}`}>{config.label}</span>
            <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  type === 'cost' ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${(item.magnitude / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs text-neutral-400 font-mono">{item.magnitude}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BalanceScale: React.FC<{ costs: number; benefits: number }> = ({ costs, benefits }) => {
  const total = costs + benefits || 1;
  const costWeight = costs / total;
  const benefitWeight = benefits / total;
  const tilt = (benefitWeight - costWeight) * 30; // Max 30 degree tilt
  
  const [animatedTilt, setAnimatedTilt] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedTilt(tilt), 300);
    return () => clearTimeout(timer);
  }, [tilt]);

  return (
    <div className="relative h-32 w-full flex items-center justify-center">
      {/* Fulcrum */}
      <div className="absolute bottom-0 w-4 h-8 bg-neutral-700 rounded-t-lg" />
      
      {/* Balance beam */}
      <div
        className="relative w-full max-w-xs h-2 bg-neutral-600 rounded-full transition-transform duration-1000 ease-out"
        style={{ transform: `rotate(${animatedTilt}deg)` }}
      >
        {/* Left pan (Costs) */}
        <div className="absolute -left-4 -top-12 flex flex-col items-center">
          <div className="w-20 h-12 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingDown size={16} className="text-rose-400 mx-auto" />
              <span className="text-xs text-rose-400 font-bold">{costs}</span>
            </div>
          </div>
          <div className="w-0.5 h-4 bg-neutral-600" />
        </div>
        
        {/* Right pan (Benefits) */}
        <div className="absolute -right-4 -top-12 flex flex-col items-center">
          <div className="w-20 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp size={16} className="text-emerald-400 mx-auto" />
              <span className="text-xs text-emerald-400 font-bold">{benefits}</span>
            </div>
          </div>
          <div className="w-0.5 h-4 bg-neutral-600" />
        </div>
      </div>
      
      {/* Net score indicator */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700">
        <span className={`text-sm font-bold ${benefits > costs ? 'text-emerald-400' : benefits < costs ? 'text-rose-400' : 'text-neutral-400'}`}>
          Net: {benefits > costs ? '+' : ''}{benefits - costs}
        </span>
      </div>
    </div>
  );
};

const CostBenefitView: React.FC<CostBenefitViewProps> = ({ data }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  if (!data || !data.options || data.options.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500 p-8">
        <Scale size={48} className="mb-4 text-neutral-600" />
        <p className="text-sm uppercase tracking-widest mb-2">Cost-Benefit Analysis</p>
        <p className="text-xs text-neutral-600 text-center max-w-xs">
          Run Full Analysis to weigh the costs against benefits for each option
        </p>
      </div>
    );
  }

  const currentOption = selectedOption
    ? data.options.find(o => o.optionName === selectedOption)
    : data.options[0];

  if (!currentOption) return null;

  const totalCosts = currentOption.costs.reduce((sum, c) => sum + c.magnitude, 0);
  const totalBenefits = currentOption.benefits.reduce((sum, b) => sum + b.magnitude, 0);
  const isBestOption = data.bestOption === currentOption.optionName;

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">Cost-Benefit Analysis</h2>
          {isBestOption && (
            <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">
              <Award size={12} />
              Best Value
            </span>
          )}
        </div>
        
        {data.options.length > 1 && (
          <div className="relative">
            <select
              value={currentOption.optionName}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="appearance-none bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-neutral-600 cursor-pointer"
            >
              {data.options.map((opt) => (
                <option key={opt.optionName} value={opt.optionName}>
                  {opt.optionName}
                  {data.bestOption === opt.optionName ? ' ★' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Balance Scale Visualization */}
      <div className="bg-neutral-900/50 rounded-xl p-6 border border-neutral-800">
        <BalanceScale costs={totalCosts} benefits={totalBenefits} />
      </div>

      {/* Costs and Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Costs Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-rose-500/20 p-1.5 rounded-lg">
              <TrendingDown size={16} className="text-rose-400" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-rose-400">
              Costs
            </h3>
            <span className="ml-auto text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
              Total: {totalCosts}
            </span>
          </div>
          <div className="space-y-2 flex-1 overflow-auto">
            {currentOption.costs.map((cost, idx) => (
              <ItemCard key={cost.id} item={cost} type="cost" delay={idx * 100} />
            ))}
            {currentOption.costs.length === 0 && (
              <p className="text-sm text-neutral-500 italic p-3">No significant costs identified</p>
            )}
          </div>
        </div>

        {/* Benefits Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 p-1.5 rounded-lg">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400">
              Benefits
            </h3>
            <span className="ml-auto text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
              Total: {totalBenefits}
            </span>
          </div>
          <div className="space-y-2 flex-1 overflow-auto">
            {currentOption.benefits.map((benefit, idx) => (
              <ItemCard key={benefit.id} item={benefit} type="benefit" delay={idx * 100 + 200} />
            ))}
            {currentOption.benefits.length === 0 && (
              <p className="text-sm text-neutral-500 italic p-3">No significant benefits identified</p>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {currentOption.recommendation && (
        <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Assessment
          </h3>
          <p className="text-sm text-neutral-300">{currentOption.recommendation}</p>
        </div>
      )}

      {/* Quick Comparison */}
      {data.options.length > 1 && (
        <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
            Compare All Options
          </h3>
          <div className="space-y-2">
            {data.options.map((opt) => {
              const optCosts = opt.costs.reduce((sum, c) => sum + c.magnitude, 0);
              const optBenefits = opt.benefits.reduce((sum, b) => sum + b.magnitude, 0);
              return (
                <div
                  key={opt.optionName}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    opt.optionName === currentOption.optionName
                      ? 'bg-neutral-800'
                      : 'hover:bg-neutral-800/50'
                  }`}
                  onClick={() => setSelectedOption(opt.optionName)}
                >
                  <div className="flex-1">
                    <span className="text-sm text-white">{opt.optionName}</span>
                    {data.bestOption === opt.optionName && (
                      <Award size={12} className="inline ml-2 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-rose-400">-{optCosts}</span>
                    <span className="text-emerald-400">+{optBenefits}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${opt.netScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {opt.netScore >= 0 ? '+' : ''}{opt.netScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default CostBenefitView;

