import { getStatusFields } from '../lib/utils.mjs'

export const dashComponent = (api) => ({
  monitors: [],
  error: '',
  autoUpdate: 5,
  updated: new Date(),
  intervalToken: null,
  loading: true,
  updateText: 'Never updated',
  paused: false,

  async init() {
    window.addEventListener('view-changed', async (e) => {
      const view = e.detail

      // If we're not the active view stop the refresh
      if (!view || !view.startsWith('#dash')) {
        clearInterval(this.intervalToken)
        this.intervalToken = null

        return
      }

      // Otherwise start the refresh
      if (!this.intervalToken) {
        this.intervalToken = setInterval(async () => {
          await this.fetchMonitors()
        }, this.autoUpdate * 1000)
      }

      await this.fetchMonitors()
    })
  },

  async fetchMonitors() {
    if (this.paused) {
      return
    }

    let monitors = []
    this.loading = true

    try {
      monitors = await api.getMonitors()
      this.error = ''
    } catch (err) {
      this.error = err.message
      this.loading = false
      return
    }

    this.loading = false
    this.updateText = new Date().toLocaleTimeString()

    for (let m of monitors) {
      const results = await api.getResultsForMonitor(m.id, 1)
      m.status = getStatusFields(results[0]?.status)
    }

    this.monitors = monitors
    if (this.monitors.length === 0) {
      this.error = 'No monitors found! Create one to get started'
    }
  },
})
