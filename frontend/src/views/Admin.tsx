import { faBomb, faDownload, faTrashCan, faUpload, faWrench } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon as Fa } from '@fortawesome/react-fontawesome'
import { useRef, useState } from 'react'
import { useAPI } from '../providers'
import { Monitor } from '../types'

export default function Admin() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const inputFileRef = useRef<HTMLInputElement>(null)
  const api = useAPI()

  function importMonitors() {
    setError('')
    setMessage('')

    const file = inputFileRef.current?.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        if (!event.target || !event.target.result) {
          throw new Error('No data in file')
        }

        const data = JSON.parse(event.target.result as string) as Monitor[]
        await api.importMonitors(data)

        setMessage(`Import from '${file.name}' successful. ${data.length} monitor(s) were imported`)
        setError('')
      } catch (err) {
        setError(`Import failed. ${err as Error}`)
      }
    }

    reader.readAsText(file)
  }

  async function exportMonitors() {
    const monitors = await api.getMonitors()

    // Remove some fields we don't want to export
    const exportMons = []
    for (const mon of monitors) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monForExport = { ...mon } as { [key: string]: any }
      delete monForExport.id
      delete monForExport.updated
      if (Object.keys(mon.properties).length === 0) {
        delete monForExport.properties
      }
      exportMons.push(monForExport)
    }

    // Force a download of the JSON response
    const a = document.createElement('a')
    a.href = `data:application/json,${encodeURIComponent(JSON.stringify(exportMons))}`
    a.download = 'nanomon-export.json'
    a.click()
  }

  async function deleteAllMonitors() {
    try {
      await api.deleteAllMonitors()
    } catch (err) {
      setError(`Failed to delete all monitors. ${err as Error}`)
      return
    }

    setMessage('All monitors have been deleted')
    setError('')
  }

  async function deleteAllResults() {
    try {
      await api.deleteAllResults()
    } catch (err) {
      setError(`Failed to delete all results. ${err as Error}`)
      return
    }

    setMessage('All results have been deleted')
    setError('')
  }

  return (
    <>
      <div className="modal fade" id="importModal" tabIndex={-1} aria-labelledby="importModalLabel" aria-hidden="false">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-warning">
              <h1 className="modal-title fs-5" id="importModalLabel">
                Confirm Import
              </h1>
            </div>
            <div className="modal-body">
              <p>Importing monitors will replace all existing configuration and monitors! Are you sure you want to continue?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-info wider" onClick={() => inputFileRef?.current?.click()} data-bs-dismiss="modal">
                Import JSON
              </button>
              <button type="button" className="btn btn-secondary wider" data-bs-dismiss="modal">
                Yikes no!
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="nukeModal" tabIndex={-1} aria-labelledby="nukeModalLabel" aria-hidden="false">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-danger text-white">
              <h1 className="modal-title fs-5" id="nukeModalLabel">
                Confirm Nuke
              </h1>
            </div>
            <div className="modal-body">
              <p>
                💥 This will remove all monitors, this means everything! 💥
                <br />
                Are you sure you want to continue?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger wider" onClick={deleteAllMonitors} data-bs-dismiss="modal">
                Nuke it all!
              </button>
              <button className="btn btn-secondary wider" data-bs-dismiss="modal">
                Yikes no!
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="nukeResultsModal" tabIndex={-1} aria-labelledby="nukeResultsModalLabel" aria-hidden="false">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-danger text-white">
              <h1 className="modal-title fs-5" id="nukeResultsModalLabel">
                Confirm Results Wipe
              </h1>
            </div>
            <div className="modal-body">
              <p>
                💥 This will remove all results, this will wipe everything! 💥
                <br />
                Are you sure you want to continue?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger wider" onClick={deleteAllResults} data-bs-dismiss="modal">
                Throw it away!
              </button>
              <button className="btn btn-secondary wider" data-bs-dismiss="modal">
                Yikes no!
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow mb-4">
        <div className="card-header fs-3 bg-info text-light">
          <Fa icon={faWrench} fixedWidth /> Data Import & Export
        </div>
        <div className="card-body">
          <h3>Import & Export</h3>
          <button className="btn btn-success btn-larger mb-3 wide-button" onClick={exportMonitors}>
            <Fa icon={faDownload} fixedWidth /> EXPORT CONFIG
          </button>

          <form>
            <input type="file" style={{ display: 'none' }} onChange={importMonitors} ref={inputFileRef} />
          </form>

          <button className="btn btn-warning btn-larger mb-3 wide-button" data-bs-toggle="modal" data-bs-target="#importModal">
            <Fa icon={faUpload} fixedWidth /> IMPORT CONFIG
          </button>

          <h3 className="mt-3">Data Removal</h3>
          <button className="btn btn-danger btn-larger mb-3 wide-button" data-bs-toggle="modal" data-bs-target="#nukeModal">
            <Fa icon={faBomb} fixedWidth /> DELETE CONFIG
          </button>

          <br />
          <button className="btn btn-danger btn-larger mb-3 wide-button" data-bs-toggle="modal" data-bs-target="#nukeResultsModal">
            <Fa icon={faTrashCan} fixedWidth /> DELETE RESULTS
          </button>

          {message && (
            <div className="alert alert-success" role="alert">
              {message}
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
