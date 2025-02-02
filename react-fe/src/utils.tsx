// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Some view helpers
// ----------------------------------------------------------------------------

import { Monitor, MonitorStatus } from './types'

import {
  faGlobe,
  faSatelliteDish,
  faQuestionCircle,
  faPlug,
  faAddressCard,
  faCheckCircle,
  faTriangleExclamation,
  faBolt,
  faBan,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'

export function getMonitorStatus(statusCode: number) {
  const status = {
    code: statusCode,
  } as MonitorStatus

  switch (statusCode) {
    case 0:
      status.text = 'Good'
      status.class = 'bg-success text-light'
      status.icon = <Fa icon={faCheckCircle} fixedWidth={true} />
      break

    case 1:
      status.text = 'Error'
      status.class = 'bg-warning text-dark'
      status.icon = <Fa icon={faTriangleExclamation} fixedWidth={true} />
      break

    case 2:
      status.text = 'Failure'
      status.class = 'bg-danger text-light'
      status.icon = <Fa icon={faBolt} fixedWidth={true} />
      break

    case -1:
      status.text = 'Disabled'
      status.class = 'bg-dark text-light'
      status.icon = <Fa icon={faBan} fixedWidth={true} />
      break

    default:
      status.text = 'Unknown'
      status.class = 'bg-secondary text-light'
      status.icon = <Fa icon={faQuestionCircle} fixedWidth={true} />
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
 * Get the monitor type icon for a given monitor
 */
export function monitorIcon(monitor: Monitor) {
  switch (monitor.type) {
    case 'http':
      return <Fa icon={faGlobe} fixedWidth={true} />
    case 'ping':
      return <Fa icon={faSatelliteDish} fixedWidth={true} />
    case 'tcp':
      return <Fa icon={faPlug} fixedWidth={true} />
    case 'dns':
      return <Fa icon={faAddressCard} fixedWidth={true} />

    default:
      return <Fa icon={faQuestionCircle} fixedWidth={true} />
  }
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
