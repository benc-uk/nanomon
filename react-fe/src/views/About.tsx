import { faCogs, faCubes, faTrafficLight, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'
import { useConfig } from '../providers'
import { useMsal } from '@azure/msal-react'

export default function About() {
  const config = useConfig()
  const apiEndpoint = config.API_ENDPOINT
  const version = config.VERSION
  const buildInfo = config.BUILD_INFO
  const clientID = config.AUTH_CLIENT_ID

  const { accounts } = useMsal()
  const userAccount = accounts[0]

  return (
    <>
      <h1 className="bg-info p-2 text-light px-3">
        <Fa icon={faTrafficLight} />
        &nbsp; NanoMon
      </h1>
      <p>
        NanoMon is a lightweight network and HTTP monitoring system, designed to be self hosted with Kubernetes (or other container based system). It
        is written in Go and based on the microservices pattern. It also serves as a reference & learning app for microservices which can be used in
        workshops in order to demonstrate Kubernetes & container concepts.
      </p>
      <a href="https://github.com/benc-uk/nanomon" target="_blank" className="btn btn-dark fs-5">
        <img src="/github.svg" style={{ height: '20px' }}></img> GitHub project
      </a>
      <hr />
      <h4>
        <Fa icon={faCogs} /> Config
      </h4>
      <ul>
        <li>
          <b>API Endpoint:</b>{' '}
          <a href={`${apiEndpoint}/status`} className="text-info" target="_blank">
            {apiEndpoint}
          </a>
        </li>
        <li>
          <b>Auth Client ID:</b> {clientID || 'None, auth is disabled'}
        </li>
      </ul>
      <h4>
        <Fa icon={faCubes} /> Build Details
      </h4>
      <ul>
        <li>
          <b>Version:</b>&nbsp;
          {version}
        </li>
        <li>
          <b>Build Info:</b>&nbsp;
          {buildInfo}
        </li>
      </ul>
      {userAccount && (
        <div>
          <h4>
            <Fa icon={faUser} /> Logged In User
          </h4>
          <ul>
            <li>
              <b>Name:</b>&nbsp;
              {userAccount.name}
            </li>
            <li>
              <b>Username:</b>&nbsp;
              {userAccount.username}
            </li>
            <li>
              <b>Environment:</b>&nbsp;
              {userAccount.environment}
            </li>
            <li>
              <b>Tenant:</b>&nbsp;
              {userAccount.tenantId}
            </li>
          </ul>
        </div>
      )}
      &copy; Ben Coleman, 2023
    </>
  )
}
