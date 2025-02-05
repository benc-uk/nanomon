//
// Namespace for Nanomon types
//

declare namespace Nanomon {
  // Monitor data returned by the API
  type Monitor = {
    id?: string
    name: string
    type: string
    interval: string
    target: string
    rule?: string
    updated: string
    enabled: boolean
    properties: { [key: string]: string }
    group?: string
  }

  // Extended monitor data with additional fields for UI
  type MonitorExtended = Monitor & {
    message: string
    lastRan: string
    status: MonitorStatus
    icon: string
  }

  export const StatusOK = 0
  export const StatusError = 1
  export const StatusFailed = 2
  type Status = typeof StatusOK | typeof StatusError | typeof StatusFailed

  type Output = { [key: string]: any }

  // Result data returned by the API
  type Result = {
    date: string
    status: Status
    value: number
    message: string
    monitor_id: string
    monitor_name: string
    monitor_target: string
    outputs: Output
  }

  // Extended result data with additional fields for UI
  type ResultExtended = Result & {
    dateNice: string
    statusDetails: MonitorStatus
  }

  type MonitorStatus = {
    code: number
    text?: string
    class?: string
    icon?: string
  }

  type Config = {
    refreshTime: number
    API_ENDPOINT: string
    AUTH_CLIENT_ID: string
    AUTH_TENANT: string
    VERSION: string
    BUILD_INFO: string
  }
}
