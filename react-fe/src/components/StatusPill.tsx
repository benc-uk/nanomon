import { faQuestionCircle, faCheckCircle, faTriangleExclamation, faBolt, faBan } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'

type StatusPillProps = {
  statusCode: number
  large?: boolean
  className?: string
}

export default function StatusPill({ statusCode, large = false, className = '' }: StatusPillProps) {
  const fs = large ? 'fs-5' : ''

  switch (statusCode) {
    case 0:
      return (
        <span className={`badge bg-success ${fs} ${className}`} title="Good">
          <Fa icon={faCheckCircle} fixedWidth /> Good
        </span>
      )
    case 1:
      return (
        <span className={`badge bg-warning ${fs} ${className}`} title="Error">
          <Fa icon={faTriangleExclamation} fixedWidth /> Error
        </span>
      )
    case 2:
      return (
        <span className={`badge bg-danger ${fs} ${className}`} title="Failure">
          <Fa icon={faBolt} fixedWidth /> Failure
        </span>
      )
    case -1:
      return (
        <span className={`badge bg-dark ${fs} ${className}`} title="Disabled">
          <Fa icon={faBan} fixedWidth /> Disabled
        </span>
      )
    default:
      return (
        <span className={`badge bg-secondary ${fs} ${className}`} title="Unknown">
          <Fa icon={faQuestionCircle} fixedWidth /> Unknown
        </span>
      )
  }
}
