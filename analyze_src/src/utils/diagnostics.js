export const determinePrimaryBottleneck = (stats) => {
  const candidates = [];
  
  if (stats.mt5Execution.count > 0 && stats.mt5Execution.median !== 'n/a') {
    candidates.push({ name: 'MT5 Execution Layer', value: stats.mt5Execution.median });
  }
  if (stats.wsTransport.count > 0 && stats.wsTransport.median !== 'n/a') {
    candidates.push({ name: 'WebSocket Transport', value: stats.wsTransport.median });
  }
  if (stats.render.count > 0 && stats.render.median !== 'n/a') {
    candidates.push({ name: 'UI Render Layer', value: stats.render.median });
  }
  if (stats.statusBuild.count > 0 && stats.statusBuild.median !== 'n/a') {
    candidates.push({ name: 'Status Build Layer', value: stats.statusBuild.median });
  }

  if (candidates.length === 0) {
    return 'Insufficient evidence';
  }

  // Sort by median value descending
  candidates.sort((a, b) => b.value - a.value);
  
  const primary = candidates[0];
  
  // If the biggest bottleneck is very small (e.g. < 50ms), maybe the system is just healthy
  if (primary.value < 50) {
    return 'System Healthy (No obvious bottleneck)';
  }

  return primary.name;
};
