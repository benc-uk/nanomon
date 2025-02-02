import { useEffect, useState, useContext } from 'react'
import { ConfigContext, ServicesContext } from '../providers'
import { Monitor, MonitorExtended } from '../types'
import { getMonitorStatus, monitorIcon } from '../utils'
import { NavLink } from 'react-router'

let timeoutId: number

export default function Dashboard() {
  const api = useContext(ServicesContext).api
  const config = useContext(ConfigContext)
  const refreshTime = config.REFRESH_TIME * 1000

  const [monitors, setMonitors] = useState<MonitorExtended[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updateText, setUpdateText] = useState<string>('Never updated')
  const [paused, setPaused] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Handle pausing and resuming the monitor fetching
  useEffect(() => {
    async function fetchMonitors(repeat = true) {
      setLoading(true)
      let fetchedMonitors: Monitor[] = []
      try {
        fetchedMonitors = await api.getMonitors()
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        }
        console.error(err)
      }

      const newMonitors: MonitorExtended[] = []

      for (const mon of fetchedMonitors) {
        const results = await api.getResultsForMonitor(mon.id, 1)

        newMonitors.push({
          ...mon,
          status: getMonitorStatus(mon.enabled ? results[0]?.status : -1),
          icon: monitorIcon(mon),
        })
      }

      setUpdateText(new Date().toLocaleTimeString())
      setMonitors(newMonitors)
      setLoading(false)

      if (!paused && repeat) {
        timeoutId = setTimeout(fetchMonitors, refreshTime)
      }
    }

    if (!paused) {
      fetchMonitors(false)
      timeoutId = setTimeout(fetchMonitors, refreshTime)
    }

    return () => clearTimeout(timeoutId)
  }, [paused, api, refreshTime])

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error}
      </div>
    )
  }

  if (monitors.length === 0 && !loading) {
    return (
      <div className="alert alert-light" role="alert">
        Create some monitors to get started 😀
      </div>
    )
  }

  function showSpinner() {
    if (loading) {
      return (
        <div className="spinner-border spinner-border-sm text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      )
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-center">
        {monitors.map((mon) => (
          <NavLink
            className={`dash m-2 p-1 rounded-2 d-flex flex-column justify-content-center ${mon.status.class}`}
            to={`/monitor/${mon.id}`}
            key={mon.id}
          >
            <div className="fs-1">{mon.icon}</div>
            <div className="dash-name">{mon.name}</div>
          </NavLink>
        ))}
      </div>

      <div className="footer text-muted">
        {showSpinner()}&nbsp;
        <span>🕒 {updateText}</span>
        &mdash; <span>{paused ? 'Auto update paused' : 'Auto update every ' + config.REFRESH_TIME + ' seconds '}</span> &mdash;
        <a className="badge rounded-pill text-bg-light" type="button" onClick={paused ? () => setPaused(false) : () => setPaused(true)}>
          {paused ? 'UNPAUSE' : 'PAUSE'}
        </a>
      </div>
    </>
  )
}
