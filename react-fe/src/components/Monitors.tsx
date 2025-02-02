import { useEffect, useState, useContext } from 'react'
import { ConfigContext, ServicesContext } from '../providers'
import { Monitor, MonitorExtended } from '../types'
import { getMonitorStatus, monitorIcon } from '../utils'
import { NavLink } from 'react-router'

import { ChartData } from 'chart.js'
import { Line } from 'react-chartjs-2'

const CHART_SIZE = 20
const CHART_OPTIONS = {
  scales: {
    x: { display: false },
    y: { beginAtZero: true },
  },
}
let timeoutId: number

export default function Monitors() {
  const api = useContext(ServicesContext).api
  const config = useContext(ConfigContext)
  const refreshTime = config.REFRESH_TIME * 1000

  const [monitors, setMonitors] = useState<MonitorExtended[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updateText, setUpdateText] = useState<string>('Loading, please wait... ')
  const [paused, setPaused] = useState<boolean>(false)
  const [chartData, setChartData] = useState<Record<string, ChartData<'line'>>>({})
  const [error, setError] = useState<string>('')

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

      // This is a map of monitor ID to chart data
      const chartData = {} as Record<string, ChartData<'line'>>
      const newMonitors: MonitorExtended[] = []

      for (const mon of fetchedMonitors) {
        const results = await api.getResultsForMonitor(mon.id, CHART_SIZE)
        const last = new Date(results[0]?.date)

        const chartValues: number[] = []
        const chartLabels: string[] = []

        for (let i = results.length - 1; i >= 0; i--) {
          const r = results[i]
          chartValues.push(r.value)
          chartLabels.push(r.date.replace('T', ' ').split('.')[0])
        }

        chartData[mon.id] = {
          datasets: [{ label: 'Value', data: chartValues, tension: 0.3, borderColor: 'rgb(46, 113, 214)', fill: true }],
          labels: chartLabels,
        } as ChartData<'line'>

        newMonitors.push({
          ...mon,
          message: results[0]?.message,
          lastRan: results[0]?.date ? last.toLocaleString() : 'Never',
          status: getMonitorStatus(mon.enabled ? results[0]?.status : -1),
          icon: monitorIcon(mon),
        })
      }

      setChartData(chartData)
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
      {monitors.map((m) => (
        <div className={`card shadow mb-4`} key={m.id}>
          <NavLink to={`/monitor/${m.id}`}>
            <div className={`card-header fs-3 ${m.status.class}`}>{m.name}</div>
          </NavLink>
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div className="p-2">
                <h5 className="card-subtitle mb-2 target fs-4">{m.target}</h5>
                <span className="fs-1 valign-middle" title={m.type}>
                  {m.icon}
                </span>
                <span className={`badge mx-3 p-2 fs-6 ${m.status.class}`}>
                  {m.status.icon}&nbsp;&nbsp;{m.status.text || 'None'}
                </span>
              </div>
              <div className="mini-graph">
                <NavLink to={`/monitor/${m.id}`}>
                  <Line data={chartData[m.id]} options={CHART_OPTIONS} />
                </NavLink>
              </div>
            </div>
          </div>

          <div className="card-footer bg-light">{`Last run: ${m.lastRan || 'never'}`}</div>
        </div>
      ))}

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
