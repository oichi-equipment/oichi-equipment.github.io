export const determinePrimaryBottleneck = (stats) => {
  const candidates = [];
  
  if (stats.mt5Execution.count > 0 && stats.mt5Execution.p95 !== 'n/a') {
    candidates.push({ name: 'MT5 Execution', value: stats.mt5Execution.p95 });
  }
  if (stats.coreExecution && stats.coreExecution.count > 0 && stats.coreExecution.p95 !== 'n/a') {
    candidates.push({ name: 'Synk Mushroom Local', value: stats.coreExecution.p95 });
  }
  if (stats.postExecution && stats.postExecution.count > 0 && stats.postExecution.p95 !== 'n/a') {
    candidates.push({ name: 'Post UI Reflection', value: stats.postExecution.p95 });
  }
  if (stats.wsTransport.count > 0 && stats.wsTransport.p95 !== 'n/a') {
    candidates.push({ name: 'WebSocket Transport', value: stats.wsTransport.p95 });
  }
  if (stats.render.count > 0 && stats.render.p95 !== 'n/a') {
    candidates.push({ name: 'UI Render', value: stats.render.p95 });
  }
  if (stats.statusBuild.count > 0 && stats.statusBuild.p95 !== 'n/a') {
    candidates.push({ name: 'Status Build', value: stats.statusBuild.p95 });
  }

  if (candidates.length === 0) {
    return 'Insufficient evidence';
  }

  // Sort by p95 value descending
  candidates.sort((a, b) => b.value - a.value);
  
  const primary = candidates[0];
  
  // If the biggest bottleneck is very small (e.g. < 50ms), maybe the system is just healthy
  if (primary.value < 50) {
    return 'System Healthy (No obvious bottleneck)';
  }

  return primary.name;
};
