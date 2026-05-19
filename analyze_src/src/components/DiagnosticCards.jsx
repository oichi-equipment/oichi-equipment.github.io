import React from 'react';
import { Activity, Zap, Server, Monitor, AlertTriangle } from 'lucide-react';

const Card = ({ title, value, icon: Icon, subtext }) => (
  <div className="bg-[#121214] border border-[#27272A] rounded-[3px] p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between text-[#94A3B8]">
      <span className="text-xs font-semibold uppercase tracking-widest">{title}</span>
      {Icon && <Icon className="w-4 h-4" />}
    </div>
    <div className="text-2xl font-mono text-[#F1F5F9] font-bold">
      {value}
    </div>
    <div className="text-xs text-[#52525B] font-mono">
      {subtext}
    </div>
  </div>
);

export default function DiagnosticCards({ stats, bottleneck, counts }) {
  const isHealthy = bottleneck === 'System Healthy (No obvious bottleneck)';
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border-b border-[#27272A] bg-[#09090B]">
      <Card 
        title="Primary Bottleneck" 
        value={bottleneck} 
        icon={isHealthy ? Activity : AlertTriangle}
        subtext="Determined by p95/median latency"
      />
      
      <Card 
        title="MT5 Execution Latency" 
        value={stats.mt5Execution.median !== 'n/a' ? `${stats.mt5Execution.median}ms` : 'Unknown'}
        icon={Zap}
        subtext={`Median (p95: ${stats.mt5Execution.p95}ms | Count: ${stats.mt5Execution.count})`}
      />
      
      <Card 
        title="WebSocket Transport" 
        value={stats.wsTransport.median !== 'n/a' ? `${stats.wsTransport.median}ms` : 'Unknown'}
        icon={Server}
        subtext={`Median (p95: ${stats.wsTransport.p95}ms | Count: ${stats.wsTransport.count})`}
      />
      
      <Card 
        title="UI Render Cost" 
        value={stats.render.median !== 'n/a' ? `${stats.render.median}ms` : 'Unknown'}
        icon={Monitor}
        subtext={`Median (p95: ${stats.render.p95}ms | Count: ${stats.render.count})`}
      />
    </div>
  );
}
