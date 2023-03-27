import { getStatusFields, monitorIcon } from '../lib/utils.mjs'

const charts = {}

export const homeComponent = (api) => ({
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
      if (!view || !view.startsWith('#home')) {
        clearInterval(this.intervalToken)
        this.intervalToken = null

        // Remove old charts
        for (const c in charts) {
          charts[c].destroy()
          delete charts[c]
        }

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

    for (const m of monitors) {
      const results = await api.getResultsForMonitor(m.id, 1)
      const last = new Date(results[0]?.date)
      m.message = results[0]?.message
      m.lastRan = results[0]?.date ? last.toLocaleString() : 'Never'
      m.status = getStatusFields(results[0]?.status)
      m.icon = monitorIcon(m)
    }

    this.monitors = monitors
    if (this.monitors.length === 0) {
      this.error = 'No monitors found! Create one to get started'
    }

    await this.updateCharts()
  },

  async updateCharts() {
    for (const m of this.monitors) {
      const results = await api.getResultsForMonitor(m.id, 20)

      // Build data arrays for chart
      const resultValues = []
      const resultLabels = []
      for (let i = results.length - 1; i >= 0; i--) {
        const r = results[i]
        resultValues.push(r.value)
        resultLabels.push(r.date.replace('T', ' ').split('.')[0])
      }

      // Update existing chart if it exists
      if (charts[m.id]) {
        charts[m.id].data.datasets[0].data = resultValues
        charts[m.id].data.labels = resultLabels
        charts[m.id].update('none')
        continue
      }

      // Create new chart otherwise
      const ctx = document.getElementById(`chart_${m.id}`)
      charts[m.id] = new Chart(ctx, {
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
  },
})
