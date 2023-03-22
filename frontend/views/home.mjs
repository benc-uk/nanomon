import { getStatusFields } from '../lib/utils.mjs'

const charts = {}

export const homeComponent = (api) => ({
  monitors: [],
  error: '',
  autoUpdate: 4,
  updated: new Date(),
  intervalToken: null,

  async init() {
    window.addEventListener('view-changed', async (e) => {
      const view = e.detail

      // If we're not the active view stop the refresh
      if (!view || !view.startsWith('#home')) {
        clearInterval(this.intervalToken)

        // Remove old charts
        for (let c in charts) {
          charts[c].destroy()
          delete charts[c]
        }

        return
      }

      // Otherwise start the refresh
      this.intervalToken = setInterval(async () => {
        await this.fetchMonitors()
      }, this.autoUpdate * 1000)

      await this.fetchMonitors()
    })
  },

  async fetchMonitors() {
    console.log('Fetching monitors')
    let monitors = []
    try {
      monitors = await api.getMonitors()
    } catch (err) {
      this.error = err.message
      return
    }

    this.updated = new Date()

    for (let m of monitors) {
      const results = await api.getResultsForMonitor(m.id, 1)
      m.message = results[0]?.message
      m.lastRan = results[0]?.date.replace('T', ' ').split('.')[0]
      m.status = getStatusFields(results[0]?.status)
    }

    this.monitors = monitors
    if (this.monitors.length === 0) {
      this.error = 'No monitors found! Create one to get started'
    }

    this.updateCharts()
  },

  async updateCharts() {
    for (let m of this.monitors) {
      const results = await api.getResultsForMonitor(m.id, 20)

      // Build data arrays for chart
      const resultValues = []
      const resultLabels = []
      for (let i = results.length - 1; i >= 0; i--) {
        const r = results[i]
        resultValues.push(r.duration)
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
