import { getStatusFields, niceDate } from '../lib/utils.mjs'

export const monitorComponent = (api) => ({
  results: [],
  monitor: null,
  status: null,
  results: [],
  error: '',
  updatedDate: '',
  lastResultDate: '',

  async init() {
    this.shown = false

    window.addEventListener('view-changed', (e) => {
      const view = e.detail

      if (!view || !view.startsWith('#monitor')) return

      const monId = view.split('#monitor/')[1]
      if (!monId) return

      this.loadMonitor(monId)
    })
  },

  async loadMonitor(monId) {
    console.log('### Monitor view changed:', monId)
    this.monitor = null
    this.results = []
    this.status = null
    this.error = ''

    try {
      this.monitor = await api.getMonitor(monId)
      this.results = await api.getResultsForMonitor(monId, 50)
      this.updatedDate = niceDate(this.monitor.updated)

      if (this.results.length > 0) {
        this.status = getStatusFields(this.results[0]?.status)
        this.lastResultDate = niceDate(this.results[0]?.date)
      }

      const resultValues = []
      const resultLabels = []
      for (let i = this.results.length - 1; i >= 0; i--) {
        const r = this.results[i]
        this.results[i].dateNice = r.date.replace('T', ' ').split('.')[0]
        resultValues.push(r.duration)
        resultLabels.push(r.date.replace('T', ' ').split('.')[0])
      }

      let chartStatus = Chart.getChart('graph')
      if (chartStatus != undefined) {
        chartStatus.destroy()
      }

      if (this.results.length > 0) {
        const ctx = document.getElementById('graph')
        new Chart(ctx, {
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
                beginAtZero: false,
              },
            },
          },
        })
      }
    } catch (err) {
      this.monitor = null
      this.error = err
    }
  },
})
