import { calculateStats } from './stats';

export function extractProfitForensics(events) {
  let messageCount = 0;
  let wsReceiveCount = 0;
  let serverSendCount = 0;
  let buildMetricsCount = 0;
  
  const intervals = [];
  let lastWsReceiveTime = null;
  
  const positionsGetMs = [];
  const buildProfitMs = [];
  let busyCount = 0;
  
  const positionsCountList = [];
  let totalProfitUpdates = 0;
  let lastTotalProfit = null;
  
  const transportMsList = [];
  const pushReasonCounts = {};
  const catchupReasonCounts = {};
  
  const samples = [];

  events.forEach(ev => {
    let transportMs = null;
    if (typeof ev.normalized_ws_transport_ms === 'number') {
      transportMs = ev.normalized_ws_transport_ms;
    } else if (typeof ev.calculated_ws_transport_ms === 'number') {
      transportMs = ev.calculated_ws_transport_ms;
    } else if (typeof ev.ws_transport_ms === 'number') {
      transportMs = ev.ws_transport_ms;
    }
    
    if (transportMs !== null && transportMs >= 0) {
      if (ev.normalized_message_type === 'PROFIT_STATUS') {
         transportMsList.push(transportMs);
      }
    }

    if (ev.normalized_message_type === 'PROFIT_STATUS') {
      messageCount++;
      
      if (ev.normalized_event_type === 'WS_RECEIVE') {
         wsReceiveCount++;
      }
      if (ev.normalized_event_type === 'SERVER_SEND') {
         serverSendCount++;
      }
      
      const p = ev.payload || {};
      
      if (typeof p.positions_count === 'number' && p.positions_count >= 0) {
        positionsCountList.push(p.positions_count);
      }
      
      if (p.total_profit !== undefined && p.total_profit !== lastTotalProfit) {
        totalProfitUpdates++;
        lastTotalProfit = p.total_profit;
      }
      
      if (p.push_reason) {
        pushReasonCounts[p.push_reason] = (pushReasonCounts[p.push_reason] || 0) + 1;
      }
      if (p.catchup_reason) {
        catchupReasonCounts[p.catchup_reason] = (catchupReasonCounts[p.catchup_reason] || 0) + 1;
      }
      
      if (ev.normalized_event_type === 'WS_RECEIVE') {
        const time = new Date(ev.timestamp).getTime();
        if (lastWsReceiveTime) {
          const diff = time - lastWsReceiveTime;
          if (!isNaN(diff) && diff >= 0) {
            intervals.push(diff);
          }
        }
        lastWsReceiveTime = time;
      }
      
      if (samples.length < 5) {
        samples.push({
          timestamp: ev.timestamp,
          event_type: ev.normalized_event_type,
          message_type: ev.normalized_message_type,
          source: ev.normalized_origin_source,
          message_source: ev.normalized_message_source
        });
      }
    }

    if (ev.normalized_event_type === 'PROFIT_STATUS_BUILD_METRICS') {
      buildMetricsCount++;
      const p = ev.payload || {};
      
      if (typeof p.positions_get_ms === 'number' && p.positions_get_ms >= 0) positionsGetMs.push(p.positions_get_ms);
      if (typeof p.build_profit_ms === 'number' && p.build_profit_ms >= 0) buildProfitMs.push(p.build_profit_ms);
      
      if (p.mt5_api_busy === true) busyCount++;
    }
  });

  const busyRate = buildMetricsCount > 0 ? Number(((busyCount / buildMetricsCount) * 100).toFixed(2)) : 0;

  return {
    messageCount,
    wsReceiveCount,
    serverSendCount,
    buildMetricsCount,
    intervals,
    intervalStats: calculateStats(intervals),
    positionsGetStats: calculateStats(positionsGetMs),
    buildProfitStats: calculateStats(buildProfitMs),
    busyRate,
    positionsCountStats: calculateStats(positionsCountList),
    totalProfitUpdates,
    transportStats: calculateStats(transportMsList),
    pushReasonCounts,
    catchupReasonCounts,
    samples
  };
}
