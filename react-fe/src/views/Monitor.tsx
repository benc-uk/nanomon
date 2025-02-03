import { useCallback, useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router'
import { MonitorExtended, Monitor as MonitorType, ResultExtended } from '../types'
import { getStatus, niceDate } from '../utils'
import MonitorIcon from '../components/MonitorIcon'
import StatusPill from '../components/StatusPill'
import { useAPI } from '../providers'

import { faRefresh, faCheckSquare, faCircleXmark, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'

import { ChartData } from 'chart.js'
import { Line } from 'react-chartjs-2'
import ResultTable from '../components/ResultTable'

const MAX_RESULTS = 50

export default function Monitor({ isAuth }: { isAuth: boolean }) {
  const { id } = useParams()
  const api = useAPI()

  const [monitor, setMonitor] = useState<MonitorExtended | null>(null)
  const [error, setError] = useState<string>('')
  const [results, setResults] = useState<ResultExtended[]>([])
  const [updatedDate, setUpdatedDate] = useState<string>('')
  const [lastResultDate, setLastResultDate] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [chartData, setChartData] = useState<ChartData<'line'>>({ datasets: [], labels: [] })

  // Fetch monitor and its results from the API
  const loadMonitor = useCallback(async () => {
    if (!id) {
      return
    }

    setLoading(true)

    let mon: MonitorType
    try {
      mon = await api.getMonitor(id)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
      console.error(err)
      return
    }

    const fetchedResults = await api.getResultsForMonitor(mon.id!, MAX_RESULTS)

    setMonitor({
      ...mon,
      status: getStatus(mon.enabled ? fetchedResults[0]?.status : -1),
      lastRan: fetchedResults[0]?.date ? new Date(fetchedResults[0].date).toLocaleString() : '',
      message: fetchedResults[0]?.message,
    })

    // Extend results with nice date and status details
    const extendedResults = fetchedResults.map((result) => ({
      ...result,
      dateNice: new Date(result.date).toLocaleString(),
      statusDetails: getStatus(result.status),
    })) as ResultExtended[]

    const chartValues: number[] = []
    const chartLabels: string[] = []

    for (let i = extendedResults.length - 1; i >= 0; i--) {
      const r = extendedResults[i]
      chartValues.push(r.value)
      chartLabels.push(r.date.replace('T', ' ').split('.')[0])
    }

    setChartData({
      labels: chartLabels,
      datasets: [{ label: 'Value', data: chartValues, tension: 0.3, borderColor: 'rgb(46, 113, 214)', fill: true }],
    })

    setResults(extendedResults)
    setUpdatedDate(niceDate(mon.updated!))
    setLastResultDate(fetchedResults[0]?.date ? niceDate(fetchedResults[0]?.date) : '')
    setError('')
    setLoading(false)
  }, [api, id])

  function deleteMonitor() {
    if (!id) {
      return
    }

    api.deleteMonitor(id).then(() => {
      window.location.href = '/'
    })
  }

  // Fetch monitor on mount
  useEffect(() => {
    loadMonitor()
  }, [loadMonitor])

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border text-secondary fs-3 big-spinner" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!monitor) {
    return (
      <div>
        {error && (
          <div className="alert alert-warning" role="alert">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="card shadow mb-4">
        <div className={`card-header fs-3 d-flex justify-content-between ${monitor.status?.class || 'bg-secondary'}`}>
          <div>
            <MonitorIcon monitor={monitor} />
            &nbsp;
            {monitor.name}
          </div>
          <button className="btn btn-light btn-sm" onClick={loadMonitor}>
            <Fa icon={faRefresh} fixedWidth={true} /> REFRESH
          </button>
        </div>
        <div className="card-body">
          <table className="table-sm">
            <tbody>
              <tr>
                <td>Type:</td>
                <td>
                  <MonitorIcon monitor={monitor} /> {monitor.type}
                </td>
              </tr>
              <tr>
                <td>Status:</td>
                <td>
                  <StatusPill statusCode={monitor.status.code} />
                </td>
              </tr>
              <tr>
                <td>Target:</td>
                {monitor.type === 'http' && (
                  <td>
                    <a href={monitor.target} target="_blank" className="text-primary target-url">
                      {monitor.target}
                    </a>
                  </td>
                )}
                {monitor.type !== 'http' && <td>{monitor.target}</td>}
              </tr>
              <tr className={results[0]?.message ? '' : 'd-none'}>
                <td>Message:</td>
                <td>{results[0]?.message}</td>
              </tr>
              <tr>
                <td>Interval:</td>
                <td>{monitor.interval}</td>
              </tr>
              <tr>
                <td>Enabled:</td>
                <td>
                  {monitor.enabled ? <Fa icon={faCheckSquare} className="text-success" /> : <Fa icon={faCircleXmark} className="text-danger" />}
                </td>
              </tr>
              <tr className={monitor.rule ? '' : 'd-none'}>
                <td>Rule(s):</td>
                <td>{monitor.rule}</td>
              </tr>
              <tr>
                <td>Updated:</td>
                <td>{updatedDate}</td>
              </tr>
            </tbody>
          </table>

          {lastResultDate !== '' && (
            <div className="mt-2">
              <details>
                <summary>Click to see last output results</summary>
                <table className="table table-striped">
                  <tbody>
                    <tr>
                      <td>timestamp</td>
                      <td>{lastResultDate}</td>
                    </tr>
                    {Object.entries(results[0].outputs || {}).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          )}

          <div className={isAuth ? '' : 'd-none'}>
            <hr />
            <NavLink className="btn btn-info wide" to={`/edit/${monitor.id}`}>
              <Fa icon={faEdit} fixedWidth={true} /> MODIFY
            </NavLink>
            <button className="mx-3 btn btn-warning wide" data-bs-toggle="modal" data-bs-target="#deleteModal">
              <Fa icon={faTrash} fixedWidth={true} /> DELETE
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && <Line data={chartData} />}

      {results.length > 0 && (
        <>
          <div className="card shadow mt-4 mb-4">
            <div className="card-header fs-3">Last 50 results</div>
            <div className="card-body">
              <ResultTable results={results} />
            </div>
          </div>
        </>
      )}

      <div className="modal fade" id="deleteModal" tabIndex={-1} aria-labelledby="deleteModalLabel" aria-hidden="false">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-warning">
              <h1 className="modal-title fs-5" id="deleteModalLabel">
                Confirm Deletion
              </h1>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this monitor?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-success wider" onClick={deleteMonitor} data-bs-dismiss="modal">
                Sure thing!
              </button>
              <button type="button" className="btn btn-secondary wider" data-bs-dismiss="modal">
                Yikes no!
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
