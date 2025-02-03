// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Some view helpers
// ----------------------------------------------------------------------------

import { MonitorStatus } from './types'

export function getMonitorStatus(statusCode: number) {
  const status = {
    code: statusCode,
  } as MonitorStatus

  switch (statusCode) {
    case 0:
      status.text = 'Good'
      status.class = 'bg-success text-light'
      break

    case 1:
      status.text = 'Error'
      status.class = 'bg-warning text-dark'
      break

    case 2:
      status.text = 'Failure'
      status.class = 'bg-danger text-light'
      break

    case -1:
      status.text = 'Disabled'
      status.class = 'bg-dark text-light'
      break

    default:
      status.text = 'Unknown'
      status.class = 'bg-secondary text-light'
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
 * Check if an object is empty
 */
export function isEmpty(obj: object | null | undefined) {
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
