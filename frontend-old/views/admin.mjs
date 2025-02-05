// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { config } from '../app.mjs'

/** @param {import("../lib/api-client.mjs").APIClient} api */
export const adminComponent = (api) => ({
  /** @type string */
  apiEndpoint: config.API_ENDPOINT,

  /** @type string */
  message: '',

  /** @type string */
  error: '',

  async init() {
    window.addEventListener('view-changed', async (/** @type CustomEvent */ e) => {
      const view = e.detail

      if (!view || !view.startsWith('#admin')) {
        return
      }

      this.message = ''
      this.error = ''
    })
  },

  async exportMonitors() {
    const monitors = await api.getMonitors()

    // Remove some fields we don't want to export
    for (const mon of monitors) {
      delete mon.id
      delete mon.updated
      if (Object.keys(mon.properties).length === 0) {
        delete mon.properties
      }
    }

    // Force a download of the JSON response
    const a = document.createElement('a')
    a.href = `data:application/json,${encodeURIComponent(JSON.stringify(monitors))}`
    a.download = 'nanomon-export.json'
    a.click()
  },

  async importMonitors() {
    console.log('### Importing monitors...')
    this.error = ''
    this.message = ''

    const file = this.$refs.importBtn.files[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = async (/** @type {ProgressEvent<FileReader>} */ e) => {
      try {
        const data = JSON.parse(/** @type string */ (e.target.result))
        await api.importMonitors(data)

        this.message = `Import from '${file.name}' successful. ${data.length} monitor(s) were imported`
      } catch (err) {
        this.error = `Import failed. ${err}`
      }
    }

    reader.readAsText(file)
  },

  async deleteAllMonitors() {
    console.log('### Deleting all monitors...')
    this.error = ''
    this.message = ''

    try {
      await api.deleteAllMonitors()
      this.message = 'All monitors deleted, bye bye!'
    } catch (err) {
      this.error = `Delete failed. ${err}`
    }
  },

  async deleteAllResults() {
    console.log('### Deleting all results...')
    this.error = ''
    this.message = ''

    try {
      await api.deleteAllResults()
      this.message = 'All results deleted, bye bye!'
    } catch (err) {
      this.error = `Delete failed. ${err}`
    }
  },
})
