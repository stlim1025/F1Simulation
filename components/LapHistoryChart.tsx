import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { SimulationResult, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  history: SimulationResult[];
  baseLapTime: number;
  lang: Language;
  formatTime: (sec: number) => string;
}

const LapHistoryChart: React.FC<Props> = ({ history, baseLapTime, lang, formatTime }) => {
  const t = TRANSLATIONS[lang];

  const data = history.map((run) => ({
    name: `Run ${run.runNumber}`,
    lapTime: run.lapTime,
    diff: run.lapTime - baseLapTime,
    formattedTime: formatTime(run.lapTime),
  }));

  const minTime = Math.min(...history.map(h => h.lapTime), baseLapTime) * 0.98;
  const maxTime = Math.max(...history.map(h => h.lapTime), baseLapTime) * 1.02;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const diff = payload[0].payload.diff;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs">
          <p className="font-bold text-slate-300 mb-1">{label}</p>
          <p className="text-white text-sm font-mono">{formatTime(payload[0].value)}</p>
          <p className={`${diff < 0 ? 'text-green-500' : 'text-red-500'}`}>
            {t.diff}: {diff > 0 ? '+' : ''}{diff.toFixed(3)}s
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg mt-6">
      <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider flex justify-between">
          <span>{t.history}</span>
          <span className="text-[10px] normal-case bg-slate-800 px-2 py-1 rounded text-slate-500">
              {t.baseTime}: {formatTime(baseLapTime)}
          </span>
      </h3>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                tick={{ fontSize: 10 }} 
            />
            <YAxis 
                stroke="#64748b" 
                tick={{ fontSize: 10 }} 
                domain={[minTime, maxTime]}
                hide
            />
            <Tooltip cursor={{fill: '#1e293b'}} content={<CustomTooltip />} />
            <ReferenceLine y={baseLapTime} stroke="#10b981" strokeDasharray="3 3" />
            <Bar dataKey="lapTime" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={entry.lapTime < baseLapTime ? '#10b981' : '#f43f5e'} 
                    fillOpacity={index === data.length - 1 ? 1 : 0.4} // Highlight latest run
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LapHistoryChart;