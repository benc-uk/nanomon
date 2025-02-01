import { useEffect, useState, useContext } from 'react'
import { ConfigContext, ServicesContext } from './providers'
import { Monitor, MonitorExtended, Result } from './lib/types'
import { getStatusFields, monitorIcon } from './lib/utils'
import { NavLink } from 'react-router'

import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const CHART_SIZE = 20
let timeoutId: number
const chartCache = {} as Record<string, Chart>

export default function MonitorsHome() {
  const api = useContext(ServicesContext).api
  const config = useContext(ConfigContext)

  const [monitors, setMonitors] = useState<MonitorExtended[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updateText, setUpdateText] = useState<string>('Never updated')
  const [paused, setPaused] = useState<boolean>(false)
  const [chartData, setChartData] = useState<Record<string, Result[]>>({})

  async function fetchMonitors(repeat = true) {
    const monitorsLatest: Monitor[] = await api.getMonitors()
    const newMonitors: MonitorExtended[] = []
    setUpdateText(new Date().toLocaleTimeString())

    // Collect all results for all monitors, needed for charts
    /** @type Record<string, Nanomon.Result[]> */
    const allResults = {} as Record<string, Result[]>

    for (const m of monitorsLatest) {
      const results = await api.getResultsForMonitor(m.id || '', CHART_SIZE)
      const last = new Date(results[0]?.date)

      allResults[m.id!] = results

      newMonitors.push({
        ...m,
        message: results[0]?.message,
        lastRan: results[0]?.date ? last.toLocaleString() : 'Never',
        status: getStatusFields(m.enabled ? results[0]?.status : -1),
        icon: monitorIcon(m),
      })
    }

    setMonitors(newMonitors)
    setLoading(false)
    setChartData(allResults)

    if (!paused && repeat) {
      timeoutId = setTimeout(fetchMonitors, config.REFRESH_TIME * 1000)
    }
  }

  useEffect(() => {
    if (!paused) {
      fetchMonitors(false)
      timeoutId = setTimeout(fetchMonitors, config.REFRESH_TIME * 1000)
    }

    return () => clearTimeout(timeoutId)
  }, [paused])

  useEffect(() => {
    // Cleanup any existing charts
    for (const c in chartCache) {
      chartCache[c].destroy()
      delete chartCache[c]
    }
  }, [])

  useEffect(() => {
    // Update the charts
    for (const [id, results] of Object.entries(chartData)) {
      const ctx = document.getElementById(`chart_${id}`) as HTMLCanvasElement
      if (!ctx) {
        continue
      }

      const resultValues = []
      const resultLabels = []
      for (let i = results.length - 1; i >= 0; i--) {
        const r = results[i]
        resultValues.push(r.value)
        resultLabels.push(r.date.replace('T', ' ').split('.')[0])
      }

      // Update existing chart data if it exists
      if (chartCache[id]) {
        chartCache[id].data.datasets[0].data = resultValues
        chartCache[id].data.labels = resultLabels
        chartCache[id].update('none')

        continue
      }

      // Otherwise create a new chart
      chartCache[id] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: resultLabels,
          datasets: [
            {
              label: 'Response time',
              data: resultValues,
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.parsed.y} ms`
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
            x: {
              display: false,
            },
          },
        },
      })
    }
  }, [chartData])

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
    <div>
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
                  <i className={m.icon}></i>
                </span>
                <span className={`badge mx-3 p-2 fs-6 ${m.status.class}`}>
                  <i className={m.status.icon}></i>&nbsp;&nbsp;{m.status.text || 'None'}
                </span>
              </div>
              <div className="mini-graph">
                <NavLink to="'monitor/'+m.id">
                  <canvas id={`chart_${m.id}`}></canvas>
                </NavLink>
              </div>
            </div>
          </div>

          <div className="card-footer bg-light">{`Last run: ${m.lastRan || 'never'}`}</div>
        </div>
      ))}

      <div className="footer text-muted">
        {showSpinner()}
        <span>{updateText}</span>
        &mdash; <span x-text="">{paused ? 'Auto update paused' : 'Auto update every ' + config.REFRESH_TIME + ' seconds '}</span> &mdash;
        <a className="badge rounded-pill text-bg-light" type="button" onClick={paused ? () => setPaused(false) : () => setPaused(true)}>
          {paused ? 'UNPAUSE' : 'PAUSE'}
        </a>
      </div>
    </div>
  )
}
