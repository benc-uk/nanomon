export interface AppConfig {
  API_ENDPOINT: string
  AUTH_CLIENT_ID: string
  AUTH_TENANT: string
  VERSION: string
  BUILD_INFO: string
  REFRESH_TIME: number
}

export interface Monitor {
  name: string
  type: string
  interval: string
  target: string
  rule: string
  enabled: boolean
  properties: { [key: string]: string }
  group: string
}

export interface MonitorFromDB extends Monitor {
  id: string
  updated: string
}

export const StatusOK = 0
export const StatusError = 1
export const StatusFailed = 2
export type StatusCode = typeof StatusOK | typeof StatusError | typeof StatusFailed

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Output = { [key: string]: any }

export interface Result {
  date: string
  status: StatusCode
  value: number
  message: string
  monitor_id: string
  monitor_name: string
  monitor_target: string
  outputs: Output
}

export interface Status {
  code: number
  text: string
  class: string
}

export interface ResultExtended extends Result {
  dateNice: string
  statusDetails: Status
}

export interface MonitorExtended extends MonitorFromDB {
  message: string
  lastRan: string
  status: Status
}

export const NewEmptyMonitor: Monitor = {
  name: 'New Monitor',
  type: 'http',
  interval: '60s',
  target: '',
  enabled: true,
  properties: {},
  rule: '',
  group: '',
}

type MonitorDefinition = {
  ruleHint: string
  allowedProps: string[]
  template: Monitor
}

export const MonitorDefinitions: Record<string, MonitorDefinition> = {
  http: {
    ruleHint: 'respTime, status, body, bodyLen, certExpiryDays, regexMatch',
    allowedProps: ['method', 'timeout', 'validateTLS', 'body', 'headers', 'bodyRegex'],
    template: {
      name: 'New HTTP Monitor',
      type: 'http',
      interval: '30s',
      enabled: true,
      target: 'http://example.net',
      rule: 'status == 200 && respTime < 1200',
      properties: {},
      group: '',
    },
  },

  ping: {
    ruleHint: 'minRtt, avgRtt, maxRtt, packetsRecv, packetLoss, ipAddress',
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
      group: '',
    },
  },

  tcp: {
    ruleHint: 'respTime, ipAddress',
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
      group: '',
    },
  },

  dns: {
    ruleHint: 'respTime, result1, result2, resultCount',
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
      group: '',
    },
  },
}
