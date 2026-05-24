import { calculateStats } from './stats';

export function extractQuoteForensics(events) {
  let messageCount = 0;
  let wsReceiveCount = 0;
  let serverSendCount = 0;
  let buildMetricsCount = 0;
  
  const intervals = [];
  let lastWsReceiveTime = null;
  
  const buildQuoteMs = [];
  const tickGetMs = [];
  const symbolInfoMs = [];
  let busyCount = 0;
  
  const symbolTransitions = [];
  let lastSymbol = null;
  
  const transportMsList = [];
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
      if (ev.normalized_message_type === 'QUOTE_STATUS') {
         transportMsList.push(transportMs);
      }
    }

    if (ev.normalized_message_type === 'QUOTE_STATUS') {
      messageCount++;
      
      if (ev.normalized_event_type === 'WS_RECEIVE') {
         wsReceiveCount++;
      }
      if (ev.normalized_event_type === 'SERVER_SEND') {
         serverSendCount++;
      }
      
      const sym = (ev.payload && ev.payload.symbol) ? ev.payload.symbol : ev.symbol;
      if (sym && sym !== lastSymbol) {
        symbolTransitions.push({ from: lastSymbol, to: sym, time: ev.timestamp });
        lastSymbol = sym;
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

    if (ev.normalized_event_type === 'QUOTE_STATUS_BUILD_METRICS') {
      buildMetricsCount++;
      const p = ev.payload || {};
      
      if (typeof p.build_quote_ms === 'number' && p.build_quote_ms >= 0) buildQuoteMs.push(p.build_quote_ms);
      if (typeof p.tick_get_ms === 'number' && p.tick_get_ms >= 0) tickGetMs.push(p.tick_get_ms);
      if (typeof p.symbol_info_ms === 'number' && p.symbol_info_ms >= 0) symbolInfoMs.push(p.symbol_info_ms);
      
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
    buildStats: {
      build_quote_ms: calculateStats(buildQuoteMs),
      tick_get_ms: calculateStats(tickGetMs),
      symbol_info_ms: calculateStats(symbolInfoMs)
    },
    busyRate,
    symbolTransitions,
    transportStats: calculateStats(transportMsList),
    samples
  };
}
