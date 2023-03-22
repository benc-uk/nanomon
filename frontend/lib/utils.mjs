export function getStatusFields(statusCode) {
  const status = {
    code: statusCode,
  }

  switch (statusCode) {
    case 0:
      status.text = 'Good'
      status.class = 'bg-success'
      break

    case 1:
      status.text = 'Error'
      status.class = 'bg-danger text-light'
      break

    case 2:
      status.text = 'Timeout'
      status.class = 'bg-warning text-dark'
      break

    case 3:
      status.text = 'Checks Failed'
      status.class = 'bg-warning text-dark'
      break

    case 4:
      status.text = 'Failed'
      status.class = 'bg-failed text-light'
      break

    case 5:
      status.text = 'Breach'
      status.class = 'bg-warning text-dark'
      break

    default:
      status.text = 'Unknown'
      status.class = 'bg-secondary text-light'
  }

  return status
}

export function niceDate(d) {
  return d.replace('T', ' ').split('.')[0]
}
