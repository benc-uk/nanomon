import { ReactNode } from 'react'

export interface AppConfig {
  API_ENDPOINT: string
  AUTH_CLIENT_ID: string
  AUTH_TENANT: string
  VERSION: string
  BUILD_INFO: string
  REFRESH_TIME: number
}

export interface Monitor {
  id: string
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

export const StatusOK = 0
export const StatusError = 1
export const StatusFailed = 2
export type Status = typeof StatusOK | typeof StatusError | typeof StatusFailed

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Output = { [key: string]: any }

export interface Result {
  date: string
  status: Status
  value: number
  message: string
  monitor_id: string
  monitor_name: string
  monitor_target: string
  outputs: Output
}

export interface MonitorStatus {
  code: number
  text?: string
  class?: string
  icon?: ReactNode
}

export interface ResultExtended extends Result {
  dateNice: string
  statusDetails: MonitorStatus
}

export interface MonitorExtended extends Monitor {
  message?: string
  lastRan?: string
  status: MonitorStatus
  icon: ReactNode
}
