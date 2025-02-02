import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router'
import { MonitorExtended, Monitor as MonitorType, ResultExtended } from '../types'
import { getMonitorStatus, monitorIcon, niceDate } from '../utils'
import { ServicesContext } from '../providers'

import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const MAX_RESULTS = 50

export default function Monitor() {
  const { id } = useParams()
  const api = useContext(ServicesContext).api

  const [monitor, setMonitor] = useState<MonitorExtended | null>(null)
  const [error, setError] = useState<string>('')
  const [results, setResults] = useState<ResultExtended[]>([])
  const [updatedDate, setUpdatedDate] = useState<string>('')
  const [lastResultDate, setLastResultDate] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const chartRef = useRef(null)

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

    const fetchedResults = await api.getResultsForMonitor(mon.id, MAX_RESULTS)

    setMonitor({
      ...mon,
      status: getMonitorStatus(mon.enabled ? fetchedResults[0]?.status : -1),
      icon: monitorIcon(mon),
      lastRan: fetchedResults[0]?.date ? new Date(fetchedResults[0].date).toLocaleString() : '',
      message: fetchedResults[0]?.message,
    })

    // Extend results with nice date and status details
    const extendedResults = fetchedResults.map((result) => ({
      ...result,
      dateNice: new Date(result.date).toLocaleString(),
      statusDetails: getMonitorStatus(result.status),
    })) as ResultExtended[]

    setResults(extendedResults)
    setUpdatedDate(niceDate(mon.updated))
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

  // Create chart when results change
  useEffect(() => {
    /** @type number[] */
    const resultValues = []

    /** @type string[] */
    const resultLabels = []

    for (let i = results.length - 1; i >= 0; i--) {
      const r = results[i]
      resultValues.push(r.value)
      resultLabels.push(r.date.replace('T', ' ').split('.')[0])
    }

    const chartStatus = Chart.getChart('graph')
    if (chartStatus !== undefined) {
      chartStatus.destroy()
    }

    if (results.length > 0) {
      new Chart(chartRef.current!, {
        type: 'line',
        data: {
          labels: resultLabels,
          datasets: [{ label: 'Result Value', data: resultValues }],
        },
        options: {
          plugins: {},
          scales: { y: { beginAtZero: false } },
        },
      })
    }
  }, [results])

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
            <i className={`fa-fw ${monitor.icon}`}></i>&nbsp;
            {monitor.name}
          </div>
          <button className="btn btn-light btn-sm" onClick={loadMonitor}>
            <i className="fas fa-refresh fa-fw"></i> REFRESH
          </button>
        </div>
        <div className="card-body">
          <table className="table-sm">
            <tbody>
              <tr>
                <td>Type:</td>
                <td>
                  <i className={`fa-fw ${monitor.icon}`}></i> {monitor.type}
                </td>
              </tr>
              <tr>
                <td>Status:</td>
                <td>
                  <i className={monitor.status?.icon}></i> {monitor.status?.text || 'None'}
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
                <td>{monitor.enabled ? <i className="fa fa-check-circle text-success"></i> : <i className="fa fa-circle-xmark text-danger"></i>}</td>
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

          <div>
            <hr />
            <NavLink className="btn btn-info wide" to={`/edit/${monitor.id}`}>
              <i className="fas fa-edit fa-fw"></i> MODIFY
            </NavLink>
            <button className="mx-3 btn btn-warning wide" data-bs-toggle="modal" data-bs-target="#deleteModal">
              <i className="fas fa-trash fa-fw"></i> DELETE
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && <canvas ref={chartRef}></canvas>}

      {results.length > 0 && (
        <>
          <div className="card shadow mt-4 mb-4">
            <div className="card-header fs-3">Last 50 results</div>
            <div className="card-body">
              <table className="table table-hover">
                <thead className="table-primary">
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Status</th>
                    <th scope="col">Value</th>
                    <th scope="col">Message</th>
                    <th scope="col">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.monitor_id + result.date}>
                      <td className={result.statusDetails.class}>{result.dateNice}</td>
                      <td className={result.statusDetails.class}>
                        <span className={`badge ${result.statusDetails.class}`}>
                          <i className={result.statusDetails.icon}></i> {result.statusDetails.text}
                        </span>
                      </td>
                      <td className={result.statusDetails.class}>{result.value}</td>
                      <td className={result.statusDetails.class}>{result.message}</td>
                      <td className={result.statusDetails.class}>
                        <details className={result.outputs ? '' : 'd-none'}>
                          <summary>Click to see output</summary>
                          <ul className="table-outs">
                            {Object.entries(result.outputs || {}).map(([key, value]) => (
                              <li key={key}>
                                <strong>{key}:</strong> {value}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
