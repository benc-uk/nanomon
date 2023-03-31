// =========================================================================
// Monitor definitions - if you want to add a new monitor type, add it here
// =========================================================================

export const definitions = {
  http: {
    ruleHint: 'Outputs: <b>respTime, status, body, bodyLen, certExpiryDays</b>',
    allowedProps: ['method', 'timeout', 'validateTLS', 'body', 'headers'],
    template: {
      name: 'New HTTP Monitor',
      type: 'http',
      interval: '30s',
      enabled: true,
      target: 'http://example.net',
      rule: 'status == 200 && respTime < 1200',
      properties: {
        method: 'GET',
        timeout: '5s',
      },
    },
  },

  ping: {
    ruleHint: 'Outputs: <b>minRtt, avgRtt, maxRtt, packetsRecv, packetLoss, ipAddress</b>',
    allowedProps: ['timeout', 'count', 'interval'],
    template: {
      name: 'New Ping Monitor',
      type: 'ping',
      interval: '30s',
      enabled: true,
      target: 'localhost',
      rule: 'packetLoss == 0 && avgRtt < 50',
      properties: {
        timeout: '2s',
      },
    },
  },

  tcp: {
    ruleHint: 'Outputs: <b>respTime, ipAddress</b>',
    allowedProps: ['timeout'],
    template: {
      name: 'New TCP Monitor',
      type: 'tcp',
      interval: '30s',
      enabled: true,
      target: 'host:port',
      rule: 'respTime < 100',
      properties: {
        timeout: '2s',
      },
    },
  },
}
