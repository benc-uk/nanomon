import { getStatusFields } from '../lib/utils.mjs'

export const resultsComponent = (api) => ({
  results: [],
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
      if (!view || !view.startsWith('#results')) {
        clearInterval(this.intervalToken)
        this.intervalToken = null

        return
      }

      // Otherwise start the refresh
      if (!this.intervalToken) {
        this.intervalToken = setInterval(async () => {
          await this.fetchResults()
        }, this.autoUpdate * 1000)
      }

      await this.fetchResults()
    })
  },

  async fetchResults() {
    if (this.paused) {
      return
    }

    let results = []
    this.loading = true

    try {
      results = await api.getResults(100)
      this.error = ''
    } catch (err) {
      this.error = err.message
      this.loading = false
      return
    }

    for (const result of results) {
      result.dateNice = new Date(result.date).toLocaleString()
      result.statusDetails = getStatusFields(result.status)
    }

    this.loading = false
    this.updateText = new Date().toLocaleTimeString()

    this.results = results
    if (this.results.length === 0) {
      this.error = 'No results found! Wait for some monitors to run'
    }
  },
})
