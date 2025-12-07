import React from 'react';
import { ComparisonData } from '../types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ComparisonViewProps {
  data: ComparisonData | null;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <p className="uppercase tracking-widest text-xs">Waiting for Analysis...</p>
      </div>
    );
  }

  // Calculate total scores for simple sorting/display logic
  const getScoreSum = (scores: {score: number}[]) => {
    return scores.reduce((acc, val) => acc + (Number(val.score) || 0), 0);
  };

  return (
    <div className="flex flex-col h-full w-full bg-black p-6 overflow-hidden">
        <div className="mb-6 border-l-2 border-white pl-4 flex justify-between items-end">
            <div>
                <h3 className="text-white font-bold text-sm uppercase tracking-widest">Decision Matrix</h3>
                <p className="text-neutral-500 text-xs mt-1">Weighted Trade-off Analysis</p>
            </div>
            <div className="text-[10px] text-neutral-600 font-mono hidden md:block">
                SCORES: 1 (POOR) - 10 (EXCELLENT)
            </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar border border-neutral-800 rounded-lg">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-neutral-900 z-10 shadow-sm">
                    <tr>
                        <th className="p-4 border-b border-neutral-800 text-xs font-bold text-neutral-400 uppercase tracking-wider w-1/4">
                            Option
                        </th>
                        {data.criteria.map((c, i) => (
                            <th key={i} className="p-4 border-b border-neutral-800 text-xs font-bold text-white uppercase tracking-wider text-center">
                                {c}
                            </th>
                        ))}
                        <th className="p-4 border-b border-neutral-800 text-xs font-bold text-neutral-400 uppercase tracking-wider text-center w-24">
                            Total
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-black">
                    {data.rows.map((row, idx) => {
                        const isRec = row.isRecommended;
                        const totalScore = getScoreSum(row.scores);
                        
                        return (
                            <tr key={idx} className={`group transition-colors ${isRec ? 'bg-neutral-900/40' : 'hover:bg-neutral-900/20'}`}>
                                <td className="p-4 align-top">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            {isRec && <CheckCircle2 size={16} className="text-white" />}
                                            <span className={`font-bold text-sm ${isRec ? 'text-white underline decoration-wavy decoration-neutral-600' : 'text-neutral-300'}`}>
                                                {row.optionName}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-neutral-500 font-light leading-relaxed mt-1">
                                            {row.summary}
                                        </p>
                                    </div>
                                </td>
                                {data.criteria.map((c, cIdx) => {
                                    // Find score matching this criteria
                                    const scoreItem = row.scores.find(s => s.criteria === c);
                                    const score = scoreItem ? scoreItem.score : 0;
                                    
                                    // Visual bar for score
                                    const percentage = score * 10; 
                                    
                                    return (
                                        <td key={cIdx} className="p-4 align-middle">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-mono font-bold text-neutral-300">{score}</span>
                                                <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden w-12">
                                                    <div 
                                                        className="h-full bg-white transition-all duration-500" 
                                                        style={{ width: `${percentage}%`, opacity: score > 7 ? 1 : 0.4 }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="p-4 align-middle text-center">
                                    <div className={`text-sm font-bold font-mono py-1 px-2 rounded border ${
                                        isRec 
                                        ? 'bg-white text-black border-white' 
                                        : 'bg-black text-neutral-500 border-neutral-800'
                                    }`}>
                                        {totalScore}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        
        {/* Helper Note */}
        <div className="mt-4 flex items-start gap-2 text-[10px] text-neutral-600 border-t border-neutral-900 pt-4">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <p>
                Scores are generated based on context. High scores indicate better alignment with your stated goals.
                Use this matrix to identify trade-offs (e.g., High Impact but High Risk).
            </p>
        </div>
    </div>
  );
};

export default ComparisonView;