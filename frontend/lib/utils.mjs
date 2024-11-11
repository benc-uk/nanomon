// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Some view helpers
// ----------------------------------------------------------------------------

/**
 *
 * @param {number} statusCode
 * @returns {Nanomon.MonitorStatus}
 */
export function getStatusFields(statusCode) {
  /** @type Nanomon.MonitorStatus */
  const status = {
    code: statusCode,
  }

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
 * Makes date strings more readable
 * @param {string} dateString
 * @returns string
 */
export function niceDate(dateString) {
  if (!dateString) {
    return ''
  }
  return dateString.replace('T', ' ').split('.')[0]
}

/**
 * Get a font-awesome icon for a monitor based on type
 * @param {Nanomon.Monitor} monitor
 * @returns string
 */
export function monitorIcon(monitor) {
  switch (monitor.type) {
    case 'http':
      return '<i class="fas fa-globe"></i>'
    case 'ping':
      return '<i class="fas fa-satellite-dish"></i>'
    case 'tcp':
      return '<i class="fas fa-plug"></i>'
    case 'dns':
      return '<i class="fas d fa-address-card"></i>'

    default:
      return '<i class="far fa-circle-question"></i>'
  }
}

/**
 * Check if an object is empty
 * @param {object} obj
 * @returns boolean
 */
export function isEmpty(obj) {
  if (obj === undefined || obj === null) {
    return true
  }
  return Object.keys(obj).length === 0
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
