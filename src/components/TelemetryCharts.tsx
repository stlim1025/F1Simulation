import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { TelemetryPoint } from '../types';

interface Props {
  data: TelemetryPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs">
        <p className="font-bold text-slate-300 mb-1">{`거리: ${label}m`}</p>
        <p className="text-cyan-400">{`속도: ${payload[0].value} km/h`}</p>
        {payload[1] && <p className="text-green-400">{`스로틀: ${payload[1].value}%`}</p>}
      </div>
    );
  }
  return null;
};

const TelemetryCharts: React.FC<Props> = ({ data }) => {
  return (
    <div className="space-y-6">
        {/* Speed Trace */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">속도 그래프</h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                        dataKey="distance" 
                        stroke="#64748b" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => `${val}m`} 
                        minTickGap={50}
                    />
                    <YAxis 
                        stroke="#64748b" 
                        tick={{ fontSize: 10 }}
                        domain={[0, 360]}
                        tickFormatter={(val) => `${val}`} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                        type="monotone" 
                        dataKey="speed" 
                        stroke="#06b6d4" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorSpeed)"
                        animationDuration={1500}
                    />
                </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* RPM / Gear */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">RPM & 기어</h3>
            <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="distance" hide />
                    <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 13000]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 9]} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="rpm" stroke="#ef4444" dot={false} strokeWidth={1} />
                    <Line yAxisId="right" type="stepAfter" dataKey="gear" stroke="#fbbf24" dot={false} strokeWidth={2} />
                </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default TelemetryCharts;