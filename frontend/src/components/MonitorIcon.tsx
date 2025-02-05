import { faAddressCard, faGlobe, faPlug, faQuestionCircle, faSatelliteDish } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'
import { Monitor } from '../types'

export default function MonitorIcon({ monitor }: { monitor: Monitor }) {
  switch (monitor.type) {
    case 'http':
      return <Fa icon={faGlobe} fixedWidth />
    case 'ping':
      return <Fa icon={faSatelliteDish} fixedWidth />
    case 'tcp':
      return <Fa icon={faPlug} fixedWidth />
    case 'dns':
      return <Fa icon={faAddressCard} fixedWidth />

    default:
      return <Fa icon={faQuestionCircle} fixedWidth />
  }
}
