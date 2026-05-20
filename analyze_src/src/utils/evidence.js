export const extractMeasuredEvidence = (events) => {
  const evidence = [];
  let idCounter = 1;

  const pushEv = (layer, metric, value, unit, sourceEvent, correlationId, basis, sourceJson, timestamp = '-') => {
    evidence.push({
      id: idCounter++,
      timestamp,
      layer,
      metric,
      value,
      unit,
      sourceEvent,
      correlationId: correlationId || '-',
      basis,
      sourceJson
    });
  };

  let lastMt5Request = null;
  let lastWsReceive = null;

  events.forEach(ev => {
    const ts = ev.timestamp || '-';
    const corr = ev.correlation_id || '-';
    const json = ev;

    // A. MT5 Execution Layer
    if (ev.event === 'MT5_REQUEST') {
      lastMt5Request = ev;
    } else if (ev.event === 'MT5_RESPONSE' && lastMt5Request && ev.correlation_id === lastMt5Request.correlation_id) {
      const diff = new Date(ev.timestamp).getTime() - new Date(lastMt5Request.timestamp).getTime();
      if (!isNaN(diff)) {
        pushEv('MT5 Execution', 'mt5_execution_latency', diff, 'ms', 'MT5_RESPONSE', corr, 'MT5_REQUEST → MT5_RESPONSE', json, ts);
      }
      lastMt5Request = null;
    }

    // B. WebSocket Transport Layer
    if (typeof ev.calculated_ws_transport_ms === 'number') {
      pushEv('WebSocket Transport', 'ws_transport', ev.calculated_ws_transport_ms, 'ms', ev.event, corr, 'server_send → client_receive', json, ts);
    }

    // C. UI Render Layer
    if (ev.event === 'WS_RECEIVE') {
      lastWsReceive = ev;
    } else if (ev.event === 'FINAL_RENDER' && lastWsReceive && ev.correlation_id === lastWsReceive.correlation_id) {
      const diff = new Date(ev.timestamp).getTime() - new Date(lastWsReceive.timestamp).getTime();
      if (!isNaN(diff)) {
        pushEv('UI Render', 'ui_render_latency', diff, 'ms', 'FINAL_RENDER', corr, 'WS_RECEIVE → FINAL_RENDER', json, ts);
      }
      lastWsReceive = null;
    }

    // D. Status Build Layer
    if (ev.event === 'STATUS_BUILD_METRICS' && ev.payload) {
      if (typeof ev.payload.total_build_ms === 'number') {
        pushEv('Status Build', 'status_build_total', ev.payload.total_build_ms, 'ms', 'STATUS_BUILD_METRICS', corr, 'STATUS_BUILD_METRICS.total_build_ms', json, ts);
      }
      if (typeof ev.payload.positions_get_ms === 'number') {
        pushEv('Status Build', 'positions_get', ev.payload.positions_get_ms, 'ms', 'STATUS_BUILD_METRICS', corr, 'STATUS_BUILD_METRICS.positions_get_ms', json, ts);
      }
      if (typeof ev.payload.orders_get_ms === 'number') {
        pushEv('Status Build', 'orders_get', ev.payload.orders_get_ms, 'ms', 'STATUS_BUILD_METRICS', corr, 'STATUS_BUILD_METRICS.orders_get_ms', json, ts);
      }
    }

    // E. Broker / Symbol Layer
    if (ev.event === 'SYMBOL_SNAPSHOT' && ev.payload) {
      const p = ev.payload;
      const sym = p.resolved_symbol || ev.symbol || p.requested_symbol;
      if (sym) pushEv('Broker / Symbol', 'symbol', sym, '', 'SYMBOL_SNAPSHOT', corr, 'SYMBOL_SNAPSHOT.resolved_symbol', json, ts);
      if (p.spread !== undefined) pushEv('Broker / Symbol', 'spread', p.spread, 'points', 'SYMBOL_SNAPSHOT', corr, 'SYMBOL_SNAPSHOT.spread', json, ts);
      if (p.trade_stops_level !== undefined) pushEv('Broker / Symbol', 'trade_stops_level', p.trade_stops_level, 'points', 'SYMBOL_SNAPSHOT', corr, 'SYMBOL_SNAPSHOT.trade_stops_level', json, ts);
      if (p.trade_freeze_level !== undefined) pushEv('Broker / Symbol', 'trade_freeze_level', p.trade_freeze_level, 'points', 'SYMBOL_SNAPSHOT', corr, 'SYMBOL_SNAPSHOT.trade_freeze_level', json, ts);
      if (p.filling_mode !== undefined) pushEv('Broker / Symbol', 'filling_mode', p.filling_mode, '', 'SYMBOL_SNAPSHOT', corr, 'SYMBOL_SNAPSHOT.filling_mode', json, ts);
      if (p.trade_exemode !== undefined) pushEv('Broker / Symbol', 'execution_mode', p.trade_exemode, '', 'SYMBOL_SNAPSHOT', corr, 'SYMBOL_SNAPSHOT.trade_exemode', json, ts);
      if (p.volume_step !== undefined) pushEv('Broker / Symbol', 'volume_step', p.volume_step, 'lot', 'SYMBOL_SNAPSHOT', corr, 'SYMBOL_SNAPSHOT.volume_step', json, ts);
    }

    // F. Account / Broker Layer
    if (ev.event === 'ACCOUNT_SNAPSHOT' && ev.payload) {
      const p = ev.payload;
      if (p.server) pushEv('Account', 'server', p.server, '', 'ACCOUNT_SNAPSHOT', corr, 'ACCOUNT_SNAPSHOT.server', json, ts);
      if (p.company) pushEv('Account', 'company', p.company, '', 'ACCOUNT_SNAPSHOT', corr, 'ACCOUNT_SNAPSHOT.company', json, ts);
      if (p.leverage !== undefined) pushEv('Account', 'leverage', p.leverage, 'x', 'ACCOUNT_SNAPSHOT', corr, 'ACCOUNT_SNAPSHOT.leverage', json, ts);
      if (p.currency) pushEv('Account', 'currency', p.currency, '', 'ACCOUNT_SNAPSHOT', corr, 'ACCOUNT_SNAPSHOT.currency', json, ts);
    }
  });

  return evidence;
};
