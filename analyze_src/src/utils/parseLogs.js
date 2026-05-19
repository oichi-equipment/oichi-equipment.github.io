import { maskForLocalView } from './maskSensitive';

export const parseLogFile = async (file) => {
  const text = await file.text();
  const rawLines = text.split('\n').filter(Boolean);
  
  const parsedEvents = rawLines.map((line) => {
    try {
      const parsed = JSON.parse(line);
      const masked = maskForLocalView(parsed);
      
      // Calculate derived latencies if fields exist
      if (typeof masked.server_send_epoch_ms === 'number' && typeof masked.client_receive_epoch_ms === 'number') {
        masked.calculated_ws_transport_ms = masked.client_receive_epoch_ms - masked.server_send_epoch_ms;
      }
      if (typeof masked.ws_transport_ms === 'number') {
         masked.calculated_ws_transport_ms = masked.ws_transport_ms;
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
    // 1. WS Transport
    if (typeof ev.calculated_ws_transport_ms === 'number') {
      wsTransport.push(ev.calculated_ws_transport_ms);
    }
    
    // 2. MT5 Execution (MT5_REQUEST -> MT5_RESPONSE diff)
    if (ev.event === 'MT5_REQUEST') {
      lastMt5Request = ev;
    } else if (ev.event === 'MT5_RESPONSE' && lastMt5Request && ev.correlation_id === lastMt5Request.correlation_id) {
      const diff = new Date(ev.timestamp).getTime() - new Date(lastMt5Request.timestamp).getTime();
      if (!isNaN(diff)) mt5Execution.push(diff);
      lastMt5Request = null;
    }

    // 3. Status Build (from STATUS_BUILD_METRICS)
    if (ev.event === 'STATUS_BUILD_METRICS' && ev.payload?.total_build_ms !== undefined) {
      statusBuild.push(ev.payload.total_build_ms);
    }

    // 4. Render (WS_RECEIVE -> FINAL_RENDER)
    if (ev.event === 'WS_RECEIVE') {
      lastWsReceive = ev;
    } else if (ev.event === 'FINAL_RENDER' && lastWsReceive && ev.correlation_id === lastWsReceive.correlation_id) {
      const diff = new Date(ev.timestamp).getTime() - new Date(lastWsReceive.timestamp).getTime();
      if (!isNaN(diff)) render.push(diff);
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
