// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Some view helpers
// ----------------------------------------------------------------------------

import { Monitor, MonitorStatus } from './types'

export function getMonitorStatus(statusCode: number) {
  const status = {
    code: statusCode,
  } as MonitorStatus

  switch (statusCode) {
    case 0:
      status.text = 'Good'
      status.class = 'bg-success text-light'
      status.icon = 'far fa-square-check'
      break

    case 1:
      status.text = 'Error'
      status.class = 'bg-warning text-dark'
      status.icon = 'fas fa-exclamation-triangle'
      break

    case 2:
      status.text = 'Failure'
      status.class = 'bg-danger text-light'
      status.icon = 'fas fa-bomb'
      break

    case -1:
      status.text = 'Disabled'
      status.class = 'bg-dark text-light'
      status.icon = 'fas fa-ban'
      break

    default:
      status.text = 'Unknown'
      status.class = 'bg-secondary text-light'
      status.icon = 'far fa-circle-question'
  }

  return status
}

/**
 * Nice-ify a date string
 */
export function niceDate(dateString: string) {
  if (!dateString) {
    return ''
  }

  return dateString.replace('T', ' ').split('.')[0]
}

/**
 * Get the icon class for a monitor type
 */
export function monitorIcon(monitor: Monitor) {
  switch (monitor.type) {
    case 'http':
      return 'fas fa-globe'
    case 'ping':
      return 'fas fa-satellite-dish'
    case 'tcp':
      return 'fas fa-plug'
    case 'dns':
      return 'fas d fa-address-card'

    default:
      return 'far fa-circle-question'
  }
}

/**
 * Check if an object is empty
 */
export function isEmpty(obj: object) {
  if (obj === undefined || obj === null) {
    return true
  }

  return Object.keys(obj).length === 0
}

/**
 * Sleep function for delaying async operations
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
