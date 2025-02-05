import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import { MonitorFromDB, MonitorExtended } from '../types'
import { getStatus } from '../utils'
import MonitorIcon from '../components/MonitorIcon'

import { ChartData } from 'chart.js'
import { Line } from 'react-chartjs-2'
import StatusPill from '../components/StatusPill'
import { useAPI, useConfig } from '../providers'
import Footer from '../components/Footer'

const CHART_SIZE = 20
const CHART_OPTIONS = {
  scales: {
    x: { display: false },
    y: { beginAtZero: true },
  },
}
let timeoutId: number

export default function Monitors() {
  const api = useAPI()
  const config = useConfig()
  const refreshTime = config.REFRESH_TIME * 1000

  const [monitors, setMonitors] = useState<MonitorExtended[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [updated, setUpdated] = useState<Date>(new Date())
  const [paused, setPaused] = useState<boolean>(false)
  const [chartData, setChartData] = useState<Record<string, ChartData<'line'>>>({})
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function fetchMonitors(repeat = true) {
      setLoading(true)
      setError('')
      let fetchedMonitors: MonitorFromDB[] = []
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
        if (!mon.id) continue

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
          status: getStatus(mon.enabled ? results[0]?.status : -1),
        })
      }

      setChartData(chartData)
      setUpdated(new Date())
      setMonitors(newMonitors)
      setLoading(false)

      if (!paused && repeat) {
        timeoutId = setTimeout(fetchMonitors, refreshTime)
      }
    }

    if (!paused) {
      fetchMonitors(false)
        .then(void 0)
        .catch(console.error)
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
      {monitors.map((mon) => (
        <div className={`card shadow mb-4`} key={mon.id}>
          <NavLink to={`/monitor/${mon.id}`}>
            <div className={`card-header fs-3 ${mon.status.class}`}>{mon.name}</div>
          </NavLink>
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div className="p-2">
                <h5 className="card-subtitle mb-2 target fs-4">{mon.target}</h5>
                <span className="fs-1 valign-middle" title={mon.type}>
                  <MonitorIcon monitor={mon} />
                </span>

                <StatusPill statusCode={mon.status.code} large className="mx-3" />
              </div>
              <div className="mini-graph">
                <NavLink to={`/monitor/${mon.id || '-1'}`}>
                  <Line data={chartData[mon.id || '-1']} options={CHART_OPTIONS} />
                </NavLink>
              </div>
            </div>
          </div>

          <div className="card-footer bg-light">{`Last run: ${mon.lastRan || 'never'}`}</div>
        </div>
      ))}

      <Footer refreshTime={refreshTime} loading={loading} updated={updated} paused={paused} setPaused={setPaused} />
    </>
  )
}
