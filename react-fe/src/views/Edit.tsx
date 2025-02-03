import { NavLink, useLocation, useNavigate, useParams } from 'react-router'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'
import { faCheck, faEdit, faGears, faXmark } from '@fortawesome/free-solid-svg-icons'
import MonitorIcon from '../components/MonitorIcon'
import { useEffect, useState } from 'react'
import { Monitor, MonitorDefinitions } from '../types'
import { useAPI } from '../providers'

export default function Edit() {
  // Get the route path that was matched
  const { pathname } = useLocation()
  const editId = useParams().id
  const api = useAPI()
  const navigate = useNavigate()

  const isNew = pathname === '/new' ? true : false
  const title = isNew ? 'Create New Monitor' : 'Update'
  const types = ['http', 'tcp', 'ping', 'dns']

  const [rulePop, setRulePop] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [firstFetch, setFirstFetch] = useState(true)

  const [monitor, setMonitor] = useState<Monitor>(MonitorDefinitions.http.template)

  useEffect(() => {
    async function fetchMonitor() {
      const fetchedMon = await api.getMonitor(editId || '')
      setMonitor(fetchedMon)
      setFirstFetch(false)
    }

    if (!isNew && editId) {
      fetchMonitor()
    }

    if (isNew) {
      setFirstFetch(false)
      setMonitor(MonitorDefinitions.http.template)
    }
  }, [isNew, editId, api])

  async function save() {
    setSaving(true)
    setError('')

    try {
      if (isNew) {
        const createdMon = await api.createMonitor(monitor!)
        setSaving(false)
        navigate(`/monitor/${createdMon.id}`)
        return
      } else {
        await api.updateMonitor(monitor!)
        setSaving(false)
        navigate(`/monitor/${monitor.id}`)
        return
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
      console.error(err)
    }
  }

  function canSave() {
    let ok = monitor.name !== '' && monitor.type !== '' && monitor.interval !== '' && monitor.target !== ''

    // Regex to check interval ends with 's' or 'm' or 'h' and starts with floating point number
    const intervalRegex = /^(\d+\.?\d*)(s|m|h)$/
    if (!intervalRegex.test(monitor.interval)) {
      ok = false
    }

    return ok
  }

  if (saving) {
    return (
      <div className="text-center">
        <h1 className="text-secondary">Saving...</h1>
        <div className="spinner-border text-primary fs-3 big-spinner" role="status">
          <span className="visually-hidden">Saving...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {error && <div className="alert alert-warning">{error}</div>}
      <div className="card shadow mb-4">
        <div className="card-header fs-3 bg-info text-light">
          <Fa icon={faEdit} fixedWidth />
          &nbsp;
          {title}
          {isNew ? '' : `: ${monitor.name}`}
          <span className="float-end">
            <MonitorIcon monitor={monitor}></MonitorIcon>
          </span>
        </div>
        <div className={`card-body ${firstFetch ? 'd-none' : ''}`}>
          <form>
            <div className="form-group mb-2">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                className="form-control"
                placeholder="Enter name for this monitor"
                autoComplete="off"
                value={monitor.name || ''}
                onChange={(e) => setMonitor({ ...monitor, name: e.target.value })}
              />
            </div>

            <div className="d-flex w-100 mb-2">
              <div className="form-group me-3">
                <label htmlFor="type">Type</label>
                <select
                  className="form-control me-4"
                  id="type"
                  value={monitor.type}
                  onChange={(e) => setMonitor({ ...monitor, type: e.target.value })}
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group me-3">
                <label htmlFor="interval">Interval</label>
                <input
                  type="text"
                  value={monitor.interval}
                  onChange={(e) => setMonitor({ ...monitor, interval: e.target.value })}
                  className="form-control"
                  id="interval"
                  placeholder="Interval, e.g. 20s or 5m or 1.5h"
                  autoComplete="off"
                />
              </div>

              <div className="form-group flex-grow-1">
                <label htmlFor="group">Group</label>
                <input
                  type="text"
                  value={monitor.group || ''}
                  onChange={(e) => setMonitor({ ...monitor, group: e.target.value })}
                  className="form-control"
                  id="group"
                  placeholder="Optional group name"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-group mb-2">
              <label htmlFor="target">Target</label>
              <input
                id="target"
                type="text"
                className="form-control"
                placeholder="Enter target URL or IP address"
                value={monitor.target || ''}
                onChange={(e) => setMonitor({ ...monitor, target: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="rule">Rule</label>
              <div className="d-flex">
                <input
                  id="rule"
                  type="text"
                  className="form-control"
                  placeholder="Enter rule for this monitor"
                  value={monitor.rule || ''}
                  onChange={(e) => setMonitor({ ...monitor, rule: e.target.value })}
                />

                <div className="popWrap">
                  <a className="btn btn-secondary ms-4" onClick={() => setRulePop(!rulePop)}>
                    <Fa icon={faGears} />
                  </a>
                  <div className={`popup ${rulePop ? 'show' : 'd-none'}`}>
                    Available Properties:
                    <br />
                    <b>{MonitorDefinitions[monitor.type].ruleHint}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group mt-3">
              <div className="checkbox-container">
                <label htmlFor="enabled">Enabled</label>
                &nbsp;
                <input
                  id="enabled"
                  type="checkbox"
                  className="form-check-input"
                  checked={monitor.enabled}
                  onChange={(e) => setMonitor({ ...monitor, enabled: e.target.checked })}
                />
              </div>
            </div>
          </form>

          <hr />

          <button className="btn btn-success wide" onClick={save} disabled={!canSave()}>
            <Fa icon={faCheck} fixedWidth /> {isNew ? 'CREATE' : 'UPDATE'}
          </button>

          <NavLink to={isNew ? '/' : `/monitor/${monitor.id}`} className="btn btn-warning wide mx-3">
            <Fa icon={faXmark} fixedWidth /> CANCEL
          </NavLink>
        </div>
      </div>
    </>
  )
}
