import { maskForLocalView } from './maskSensitive';

export const parseLogFile = async (file) => {
  const text = await file.text();
  const rawLines = text.split('\n').filter(Boolean);
  
  const parsedEvents = rawLines.map((line) => {
    try {
      const parsed = JSON.parse(line);
      const masked = maskForLocalView(parsed);
      
      const p = masked.payload || {};
      masked.normalized_event_type = masked.event || masked.message_type || p.type || p.message_type;
      masked.normalized_message_type = masked.message_type || p.message_type || p.type || masked.event;
      masked.normalized_origin_source = masked.source || null;
      masked.normalized_message_source = p.source || null;
      masked.normalized_source = masked.normalized_origin_source;
      masked.normalized_action = masked.action || p.action;
      masked.normalized_ticket = masked.ticket ?? p.ticket ?? masked.position_ticket ?? p.position_ticket;
      masked.normalized_correlation_id = masked.correlation_id || p.correlation_id;
      masked.normalized_sequence_id = masked.sequence_id ?? p.sequence_id;
      masked.normalized_quote_sequence_id = masked.quote_sequence_id ?? p.quote_sequence_id;
      masked.normalized_profit_sequence_id = masked.profit_sequence_id ?? p.profit_sequence_id;
      masked.normalized_server_send_epoch_ms = masked.server_send_epoch_ms ?? p.server_send_epoch_ms;
      masked.normalized_client_receive_epoch_ms = masked.client_receive_epoch_ms ?? p.client_receive_epoch_ms;
      masked.normalized_ws_transport_ms = masked.ws_transport_ms ?? p.ws_transport_ms;
      
      // Calculate derived latencies if fields exist
      if (typeof masked.normalized_server_send_epoch_ms === 'number' && typeof masked.normalized_client_receive_epoch_ms === 'number') {
        masked.calculated_ws_transport_ms = masked.normalized_client_receive_epoch_ms - masked.normalized_server_send_epoch_ms;
      }
      if (typeof masked.normalized_ws_transport_ms === 'number') {
         masked.calculated_ws_transport_ms = masked.normalized_ws_transport_ms;
      }
      
      return masked;
    } catch {
      return null;
    }
  }).filter(Boolean);
  
  // Sort by timestamp
  parsedEvents.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
  
  return parsedEvents;
};

export const extractLatencies = (events) => {
  const wsTransport = [];
  const mt5Execution = [];
  const render = [];
  const statusBuild = [];
  
  let lastMt5Request = null;
  let lastWsReceive = null;

  events.forEach(ev => {
    const evType = ev.normalized_event_type || ev.event;
    const corrId = ev.normalized_correlation_id || ev.correlation_id;

    // 1. WS Transport
    if (typeof ev.calculated_ws_transport_ms === 'number' && ev.calculated_ws_transport_ms >= 0) {
      wsTransport.push(ev.calculated_ws_transport_ms);
    }
    
    // 2. MT5 Execution (MT5_REQUEST -> MT5_RESPONSE diff)
    if (evType === 'MT5_REQUEST') {
      lastMt5Request = ev;
    } else if (evType === 'MT5_RESPONSE' && lastMt5Request && corrId === (lastMt5Request.normalized_correlation_id || lastMt5Request.correlation_id)) {
      const diff = new Date(ev.timestamp).getTime() - new Date(lastMt5Request.timestamp).getTime();
      if (!isNaN(diff) && diff >= 0) mt5Execution.push(diff);
      lastMt5Request = null;
    }

    // 3. Status Build (from STATUS_BUILD_METRICS)
    if (evType === 'STATUS_BUILD_METRICS' && ev.payload?.total_build_ms !== undefined) {
      statusBuild.push(ev.payload.total_build_ms);
    }

    // 4. Render (WS_RECEIVE -> FINAL_RENDER)
    if (evType === 'WS_RECEIVE') {
      lastWsReceive = ev;
    } else if (evType === 'FINAL_RENDER' && lastWsReceive && corrId === (lastWsReceive.normalized_correlation_id || lastWsReceive.correlation_id)) {
      const diff = new Date(ev.timestamp).getTime() - new Date(lastWsReceive.timestamp).getTime();
      if (!isNaN(diff) && diff >= 0) render.push(diff);
      lastWsReceive = null;
    }
  });

  return {
    wsTransport,
    mt5Execution,
    render,
    statusBuild
  };
};
