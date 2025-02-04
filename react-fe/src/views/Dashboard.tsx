import { useEffect, useState } from 'react'
import { MonitorFromDB, MonitorExtended } from '../types'
import { getStatus } from '../utils'
import { NavLink } from 'react-router'
import MonitorIcon from '../components/MonitorIcon'
import { useAPI, useConfig } from '../providers'
import Footer from '../components/Footer'

let timeoutId: number

export default function Dashboard() {
  const api = useAPI()
  const config = useConfig()
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
      let fetchedMonitors: MonitorFromDB[] = []
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
        if (!mon.id) {
          continue
        }

        const results = await api.getResultsForMonitor(mon.id, 1)

        newMonitors.push({
          ...mon,
          status: getStatus(mon.enabled ? results[0]?.status : -1),
          lastRan: '', // Not shown on dashboard
          message: '', // Not shown on dashboard
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

  return (
    <>
      <div className="d-flex flex-wrap justify-content-center">
        {monitors.map((mon) => (
          <NavLink
            className={`dash m-2 p-1 rounded-2 d-flex flex-column justify-content-center ${mon.status.class}`}
            to={`/monitor/${mon.id}`}
            key={mon.id}
          >
            <div className="fs-1">
              <MonitorIcon monitor={mon} />
            </div>
            <div className="dash-name">{mon.name}</div>
          </NavLink>
        ))}
      </div>

      <Footer refreshTime={refreshTime} loading={loading} updateText={updateText} paused={paused} setPaused={setPaused} />
    </>
  )
}
