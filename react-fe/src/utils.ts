// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Some view helpers
// ----------------------------------------------------------------------------

import { Status } from './types'

export function getStatus(statusCode: number) {
  const status = {
    code: statusCode,
  } as Status

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
