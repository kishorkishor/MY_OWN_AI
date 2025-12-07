import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ProjectionScenario } from '../types';

interface ProjectionViewProps {
  scenarios: ProjectionScenario[];
}

// Custom tooltip component for better styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border border-white/20 p-4 rounded shadow-2xl text-xs">
        <p className="font-bold text-white mb-2 uppercase tracking-wide border-b border-neutral-800 pb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.stroke }} className="mb-1 font-mono">
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ProjectionView: React.FC<ProjectionViewProps> = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <p className="uppercase tracking-widest text-xs">No Data Available</p>
      </div>
    );
  }

  // Transform data for Recharts
  const timeLabels = ["Immediate", "1 Month", "6 Months", "1 Year", "5 Years"];
  
  const chartData = timeLabels.map(label => {
    const point: any = { name: label };
    scenarios.forEach(scenario => {
      const dataPoint = scenario.data.find(d => d.timeLabel === label);
      if (dataPoint) {
        point[scenario.name] = dataPoint.value;
      }
    });
    return point;
  });

  // Grayscale / High Contrast Palette
  const colors = ["#ffffff", "#999999", "#555555", "#aaaaaa", "#cccccc"];
  // Dash arrays for differentiating lines without color
  const dashes = ["0", "5 5", "10 5", "2 2", "15 5"];

  return (
    <div className="flex flex-col h-full w-full bg-black p-6">
      <div className="mb-6 border-l-2 border-white pl-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest">Future Projection</h3>
          <p className="text-neutral-500 text-xs mt-1">Satisfaction Impact Over Time</p>
      </div>
      
      <div className="flex-grow w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis 
                dataKey="name" 
                stroke="#666" 
                tick={{fill: '#888', fontSize: 10, fontFamily: 'monospace'}}
                tickLine={{stroke: '#666'}}
                axisLine={{stroke: '#444'}}
            />
            <YAxis 
                stroke="#666" 
                tick={{fill: '#888', fontSize: 10, fontFamily: 'monospace'}}
                tickLine={{stroke: '#666'}}
                axisLine={{stroke: '#444'}}
                domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4'}} />
            <Legend wrapperStyle={{paddingTop: '20px', fontFamily: 'monospace', fontSize: '10px'}} />
            {scenarios.map((scenario, index) => (
              <Line
                key={scenario.name}
                type="monotone"
                dataKey={scenario.name}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                strokeDasharray={dashes[index % dashes.length]}
                dot={{ r: 4, strokeWidth: 2, fill: '#000', stroke: colors[index % colors.length] }}
                activeDot={{ r: 6, fill: '#fff' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-40 custom-scrollbar pr-2">
          {scenarios.map((s, i) => (
              <div key={i} className="bg-neutral-900 p-4 border border-neutral-800 hover:border-neutral-600 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-0.5" style={{
                          backgroundColor: colors[i % colors.length], 
                          borderTop: `2px ${dashes[i % dashes.length] === '0' ? 'solid' : 'dashed'} ${colors[i % colors.length]}`
                        }}></div>
                      <span className="font-bold text-white text-xs uppercase">{s.name}</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed font-light">{s.description}</p>
              </div>
          ))}
      </div>
    </div>
  );
};

export default ProjectionView;