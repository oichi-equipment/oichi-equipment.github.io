import { calculateStats } from './stats';

export function extractCloseForensics(events) {
  let commandResultCount = 0;
  let closePositionCount = 0;
  let closeAllCount = 0;
  
  const byTicket = {};
  const closeAllTickets = [];
  const closePositionTickets = [];
  
  const mt5ToCommandResultDiffs = [];
  const commandResultTransportMs = [];
  const closeAllWaterfall = [];
  
  const closeAllTimelineRows = [];
  const closePositionTimelineRows = [];
  
  const retcodeCounts = {};
  const resultCounts = {};
  
  let missingTicketCount = 0;
  let missingCorrelationIdCount = 0;

  const mt5Responses = {};

  events.forEach(ev => {
    if (ev.normalized_event_type === 'MT5_RESPONSE' || ev.event === 'MT5_RESPONSE') {
      if (ev.normalized_correlation_id) {
        mt5Responses[ev.normalized_correlation_id] = new Date(ev.timestamp).getTime();
      }
      return;
    }

    if (ev.normalized_message_type === 'COMMAND_RESULT') {
      const source = ev.normalized_message_source;
      if (source === 'CLOSE_ALL' || source === 'CLOSE_POSITION') {
        commandResultCount++;
        
        if (source === 'CLOSE_ALL') closeAllCount++;
        if (source === 'CLOSE_POSITION') closePositionCount++;
        
        const ticket = ev.normalized_ticket;
        const corrId = ev.normalized_correlation_id;
        
        if (ticket == null) missingTicketCount++;
        if (corrId == null) missingCorrelationIdCount++;
        
        if (ticket != null) {
          if (!byTicket[ticket]) {
            byTicket[ticket] = {
              ticket,
              source,
              events: []
            };
          }
          byTicket[ticket].events.push(ev);
          
          if (source === 'CLOSE_ALL' && !closeAllTickets.includes(ticket)) {
            closeAllTickets.push(ticket);
            closeAllWaterfall.push({
              ticket,
              timestamp: ev.timestamp
            });
          }
          if (source === 'CLOSE_POSITION' && !closePositionTickets.includes(ticket)) {
            closePositionTickets.push(ticket);
          }
        }
        
        const p = ev.payload || {};
        if (p.retcode !== undefined) {
          retcodeCounts[p.retcode] = (retcodeCounts[p.retcode] || 0) + 1;
        }
        if (p.result !== undefined) {
          resultCounts[p.result] = (resultCounts[p.result] || 0) + 1;
        }
        
        let dispatchMs = null;
        if (ev.normalized_event_type === 'SERVER_SEND' && corrId && mt5Responses[corrId]) {
          const diff = new Date(ev.timestamp).getTime() - mt5Responses[corrId];
          if (!isNaN(diff) && diff >= 0) {
            dispatchMs = diff;
            mt5ToCommandResultDiffs.push(diff);
          }
        }
        
        let transportMs = null;
        if (typeof ev.normalized_ws_transport_ms === 'number') {
          transportMs = ev.normalized_ws_transport_ms;
        } else if (typeof ev.calculated_ws_transport_ms === 'number') {
          transportMs = ev.calculated_ws_transport_ms;
        } else if (typeof ev.ws_transport_ms === 'number') {
          transportMs = ev.ws_transport_ms;
        }
        
        if (transportMs !== null && transportMs >= 0) {
          commandResultTransportMs.push(transportMs);
        }

        const row = {
          ticket: ticket,
          correlationId: corrId,
          timestamp: ev.timestamp,
          eventType: ev.normalized_event_type,
          messageSource: source,
          result: p.result,
          retcode: p.retcode,
          dispatchMs: dispatchMs,
          transportMs: (transportMs !== null && transportMs >= 0) ? transportMs : null
        };

        if (source === 'CLOSE_ALL') {
          closeAllTimelineRows.push(row);
        } else if (source === 'CLOSE_POSITION') {
          closePositionTimelineRows.push(row);
        }
      }
    }
  });

  return {
    commandResultCount,
    closePositionCount,
    closeAllCount,
    byTicket,
    closeAllTickets,
    closePositionTickets,
    mt5ToCommandResultStats: calculateStats(mt5ToCommandResultDiffs),
    commandResultTransportStats: calculateStats(commandResultTransportMs),
    closeAllWaterfall,
    closeAllTimelineRows,
    closePositionTimelineRows,
    retcodeCounts,
    resultCounts,
    missingTicketCount,
    missingCorrelationIdCount
  };
}
