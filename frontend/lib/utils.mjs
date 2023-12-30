// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Some view helpers
// ----------------------------------------------------------------------------

export function getStatusFields(statusCode) {
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

export function niceDate(d) {
  return d.replace('T', ' ').split('.')[0]
}

export function monitorIcon(monitor) {
  switch (monitor.type) {
    case 'http':
      return '<i class="fas fa-globe"></i>'
    case 'ping':
      return '<i class="fas fa-satellite-dish"></i>'
    case 'tcp':
      return '<i class="fas fa-plug"></i>'

    default:
      return '<i class="far fa-circle-question"></i>'
  }
}

export function isEmpty(obj) {
  if (obj === undefined || obj === null) {
    return true
  }
  return Object.keys(obj).length === 0
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
