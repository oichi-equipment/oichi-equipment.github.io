export const extractCommandChains = (events) => {
  if (!events || events.length === 0) return [];

  // Group by correlation_id
  const groups = {};
  
  events.forEach(ev => {
    if (!ev.correlation_id || ev.correlation_id === '-' || ev.correlation_id === 'N/A') return;
    
    if (!groups[ev.correlation_id]) {
      groups[ev.correlation_id] = [];
    }
    groups[ev.correlation_id].push(ev);
  });

  const chains = [];

  for (const [corrId, evs] of Object.entries(groups)) {
    // Sort events by timestamp
    evs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let action = 'Unknown';
    let result = 'n/a';
    let retcode = 'n/a';
    let isCloseAll = false;
    let isClosePosition = false;
    let type = 'Unknown';

    let hasTradeEvent = false;
    let hasPollingEvent = false;

    // Latency calculation markers
    let firstTs = null;
    let lastTs = null;
    let mt5ReqTs = null;
    let mt5ResTs = null;
    let wsRecvTs = null;
    let finalRenderTs = null;
    let coreReqTs = null;
    let coreResTs = null;
    let callbackTs = null;

    let mt5Execution = 'n/a';
    let wsTransport = 'n/a';
    let uiRender = 'n/a';
    let statusBuild = 'n/a';

    evs.forEach(ev => {
      const ts = new Date(ev.timestamp).getTime();
      if (!isNaN(ts)) {
        if (firstTs === null) firstTs = ts;
        lastTs = ts;
      }

      // Action determination
      if (ev.event === 'USER_ACTION' && ev.payload?.action) {
        action = ev.payload.action;
      } else if (ev.event === 'HTTP_COMMAND_RECEIVED' && action === 'Unknown' && ev.payload?.action) {
        action = ev.payload.action;
      } else if (ev.event === 'SEND_TRADE' && action === 'Unknown') {
        action = ev.payload?.action || 'SEND_TRADE';
      } else if (ev.event === 'MT5_REQUEST' && action === 'Unknown') {
        action = ev.payload?.action || 'MT5_REQUEST';
      }

      if (action === 'CLOSE_ALL') isCloseAll = true;
      if (action === 'CLOSE_POSITION' || action === 'CLOSE') isClosePosition = true;

      // MT5 Response & Latency
      if (ev.event === 'MT5_REQUEST') {
        mt5ReqTs = ts;
      } else if (ev.event === 'MT5_RESPONSE') {
        mt5ResTs = ts;
        if (ev.payload?.retcode !== undefined) {
          retcode = ev.payload.retcode;
          result = ev.payload.comment || `Retcode ${retcode}`;
        }
        if (mt5ReqTs !== null && !isNaN(ts) && !isNaN(mt5ReqTs)) {
          mt5Execution = ts - mt5ReqTs;
        }
      }

      // Core Execution
      if (ev.event === 'HTTP_COMMAND_RECEIVED') coreReqTs = ts;
      if (ev.event === 'HTTP_COMMAND_RESPONSE_SENT') coreResTs = ts;

      // Post Execution / UI
      if (ev.event === 'COMMAND_CALLBACK_RECEIVED') callbackTs = ts;
      if (ev.event === 'FINAL_RENDER') finalRenderTs = ts;

      // WS Transport
      if (typeof ev.calculated_ws_transport_ms === 'number') {
        wsTransport = ev.calculated_ws_transport_ms;
      }

      // UI Render
      if (ev.event === 'WS_RECEIVE' || ev.event === 'WS_RECEIVE_PRE') {
        wsRecvTs = ts;
      } else if (ev.event === 'FINAL_RENDER' && wsRecvTs !== null && !isNaN(ts) && !isNaN(wsRecvTs)) {
        uiRender = ts - wsRecvTs;
      }

      // Status Build
      if (ev.event === 'STATUS_BUILD_METRICS' && typeof ev.payload?.total_build_ms === 'number') {
        statusBuild = ev.payload.total_build_ms;
      }
      // Type detection hooks
      if (['USER_ACTION', 'SEND_TRADE', 'HTTP_COMMAND_RECEIVED', 'MT5_REQUEST', 'MT5_RESPONSE'].includes(ev.event)) {
        hasTradeEvent = true;
      }
      if (['POLLING_REFRESH', 'POLLING_SKIPPED', 'POLLING_OVERRIDE'].includes(ev.event) || ev.event.includes('POLLING')) {
        hasPollingEvent = true;
      }
    });

    // Classification Logic
    if (corrId.startsWith('cmd_') || hasTradeEvent || ['BUY', 'SELL', 'CLOSE', 'CLOSE_POSITION', 'CLOSE_ALL', 'MODIFY'].includes(action)) {
      type = 'Trade';
    } else if (corrId.startsWith('poll_') || (hasPollingEvent && !hasTradeEvent)) {
      type = 'Polling';
    } else if (statusBuild !== 'n/a' && !hasTradeEvent) {
      // Just a status build chain without trade
      type = 'Polling';
    }

    let totalObserved = 'n/a';
    if (firstTs !== null && lastTs !== null && lastTs >= firstTs) {
      totalObserved = lastTs - firstTs;
    }

    let coreExecution = 'n/a';
    if (coreReqTs !== null && coreResTs !== null && coreResTs >= coreReqTs) {
      coreExecution = coreResTs - coreReqTs;
    }

    let postExecution = 'n/a';
    if (mt5ResTs !== null) {
      let postEndTs = null;
      if (finalRenderTs !== null && finalRenderTs >= mt5ResTs) postEndTs = finalRenderTs;
      if (callbackTs !== null && callbackTs >= mt5ResTs && (postEndTs === null || callbackTs > postEndTs)) postEndTs = callbackTs;
      if (postEndTs !== null) {
        postExecution = postEndTs - mt5ResTs;
      }
    }

    // Determine Dominant Layer
    let dominantLayer = 'Unknown';
    let maxLat = -1;
    
    if (mt5Execution !== 'n/a' && mt5Execution > maxLat) { maxLat = mt5Execution; dominantLayer = 'MT5 Execution'; }
    if (statusBuild !== 'n/a' && statusBuild > maxLat) { maxLat = statusBuild; dominantLayer = 'Status Build'; }
    if (wsTransport !== 'n/a' && wsTransport > maxLat) { maxLat = wsTransport; dominantLayer = 'WebSocket Transport'; }
    if (uiRender !== 'n/a' && uiRender > maxLat) { maxLat = uiRender; dominantLayer = 'UI Render'; }

    if (maxLat === -1) {
      dominantLayer = 'Insufficient evidence';
    }

    const LOGICAL_ORDER = {
      'USER_ACTION': 1,
      'LOCK_APPLIED': 2,
      'COMMAND_SEND_START': 3,
      'SEND_TRADE': 4,
      'HTTP_COMMAND_RECEIVED': 5,
      'MT5_REQUEST': 6,
      'MT5_RESPONSE': 7,
      'HTTP_COMMAND_MT5_DONE': 8,
      'HTTP_COMMAND_RESPONSE_READY': 9,
      'HTTP_COMMAND_RESPONSE_SENT': 10,
      'HTTP_COMMAND_BROADCAST_SCHEDULED': 11,
      'STATUS_BUILD_METRICS': 12,
      'SERVER_SEND': 13,
      'WS_PUSH': 14,
      'WS_RECEIVE_PRE': 15,
      'WS_RECEIVE': 16,
      'STATE_UPDATE': 17,
      'RECONCILE': 18,
      'FINAL_RENDER': 19,
      'COMMAND_CALLBACK_RECEIVED': 20,
      'LOCK_RELEASED': 21,
      'PENDING_ACTION_CLEANUP': 22
    };

    const logicalEvents = [...evs].sort((a, b) => {
      const orderA = LOGICAL_ORDER[a.event] || 999;
      const orderB = LOGICAL_ORDER[b.event] || 999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    chains.push({
      id: corrId,
      type,
      startTime: evs.length > 0 ? evs[0].timestamp : '-',
      action,
      isCloseAll,
      isClosePosition,
      result,
      retcode,
      latencies: {
        totalObserved,
        coreExecution,
        mt5Execution,
        postExecution,
        statusBuild,
        wsTransport,
        uiRender
      },
      dominantLayer,
      events: logicalEvents,
      observedEvents: evs
    });
  }

  // Sort chains descending by time
  chains.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  return chains;
};

export const extractRetcodeSummary = (events) => {
  if (!events || events.length === 0) return [];
  
  const counts = {};
  
  events.forEach(ev => {
    if (ev.event === 'MT5_RESPONSE' && ev.payload) {
      const rc = ev.payload.retcode;
      if (rc !== undefined) {
        const comment = ev.payload.comment || 'Unknown';
        const key = `${rc}_${comment}`;
        if (!counts[key]) {
          counts[key] = {
            retcode: rc,
            comment,
            count: 0,
            examples: new Set()
          };
        }
        counts[key].count++;
        if (ev.correlation_id) {
          counts[key].examples.add(ev.correlation_id);
        }
      }
    }
  });

  const summary = Object.values(counts).map(item => ({
    ...item,
    examples: Array.from(item.examples).slice(0, 3) // Keep up to 3 examples
  }));
  
  // Sort descending by count
  summary.sort((a, b) => b.count - a.count);

  return summary;
};

export const extractPollingSummary = (chains) => {
  if (!chains || chains.length === 0) return null;

  const pollingChains = chains.filter(c => c.type === 'Polling');
  
  const summary = {
    chainCount: pollingChains.length,
    refreshCount: 0,
    skippedCount: 0,
    overrideCount: 0,
    avgDuration: 0,
    maxDuration: 0
  };

  let totalDur = 0;
  let durCount = 0;

  pollingChains.forEach(c => {
    // Check events for polling specifics
    c.events.forEach(ev => {
      if (ev.event === 'POLLING_REFRESH') summary.refreshCount++;
      if (ev.event === 'POLLING_SKIPPED') summary.skippedCount++;
      if (ev.event === 'POLLING_OVERRIDE') summary.overrideCount++;
    });

    if (typeof c.latencies.total === 'number') {
      totalDur += c.latencies.total;
      durCount++;
      if (c.latencies.total > summary.maxDuration) {
        summary.maxDuration = c.latencies.total;
      }
    }
  });

  if (durCount > 0) {
    summary.avgDuration = Math.round(totalDur / durCount);
  }

  return summary;
};
