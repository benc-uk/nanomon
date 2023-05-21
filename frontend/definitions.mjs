// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Monitor definitions, used by edit.mjs
// ----------------------------------------------------------------------------

export const definitions = {
  http: {
    ruleHint: 'Properties: <b>respTime, status, body, bodyLen, certExpiryDays, regexMatch</b>',
    allowedProps: ['method', 'timeout', 'validateTLS', 'body', 'headers', 'bodyRegex'],
    template: {
      name: 'New HTTP Monitor',
      type: 'http',
      interval: '30s',
      enabled: true,
      target: 'http://example.net',
      rule: 'status == 200 && respTime < 1200',
      properties: {},
    },
  },

  ping: {
    ruleHint: 'Properties: <b>minRtt, avgRtt, maxRtt, packetsRecv, packetLoss, ipAddress</b>',
    allowedProps: ['timeout', 'count', 'interval'],
    template: {
      name: 'New Ping Monitor',
      type: 'ping',
      interval: '30s',
      enabled: true,
      target: 'localhost',
      rule: 'packetLoss == 0 && avgRtt < 50',
      properties: {
        timeout: '500ms',
      },
    },
  },

  tcp: {
    ruleHint: 'Properties: <b>respTime, ipAddress</b>',
    allowedProps: ['timeout'],
    template: {
      name: 'New TCP Monitor',
      type: 'tcp',
      interval: '30s',
      enabled: true,
      target: 'host:port',
      rule: 'respTime < 100',
      properties: {
        timeout: '500ms',
      },
    },
  },
}
