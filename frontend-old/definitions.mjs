// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Monitor definitions, used by edit.mjs
// ----------------------------------------------------------------------------

/**
 * @typedef MonitorDefinition
 * @property {string} ruleHint
 * @property {string[]} allowedProps
 * @property {Nanomon.Monitor} template
 */

/**
 * @type Record<string, MonitorDefinition>
 */
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
      updated: null,
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
      updated: null,
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
      updated: null,
    },
  },

  dns: {
    ruleHint: 'Properties: <b>respTime, result1, result2, resultCount</b>',
    allowedProps: ['timeout', 'network', 'server', 'type'],
    template: {
      name: 'New DNS Monitor',
      type: 'dns',
      interval: '30s',
      enabled: true,
      target: 'example.net',
      rule: "result1 == '93.184.215.14'",
      properties: {
        timeout: '500ms',
      },
      updated: null,
    },
  },
}
