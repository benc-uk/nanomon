import { getStatusFields, niceDate, monitorIcon } from '../lib/utils.mjs'

export const monitorComponent = (api, userAccount) => ({
  results: [],
  monitor: null,
  status: null,
  results: [],
  error: '',
  updatedDate: '',
  lastResultDate: '',
  icon: '',
  getStatusFields: getStatusFields,
  userAccount: userAccount,

  async init() {
    this.shown = false

    window.addEventListener('view-changed', async (e) => {
      const view = e.detail

      if (!view || !view.startsWith('#monitor')) {
        return
      }

      const monId = view.split('#monitor/')[1]
      if (!monId) {
        return
      }

      this.loadMonitor(monId)
    })

    window.addEventListener('user-changed', (e) => {
      this.userAccount = e.detail
    })
  },

  async loadMonitor(monId) {
    this.monitor = null
    this.results = []
    this.status = null
    this.error = ''

    try {
      this.monitor = await api.getMonitor(monId)
      this.results = await api.getResultsForMonitor(monId, 50)

      this.updatedDate = niceDate(this.monitor.updated)
      this.icon = monitorIcon(this.monitor)

      if (this.results.length > 0) {
        this.status = getStatusFields(this.monitor.enabled ? this.results[0].status : -1)
        this.lastResultDate = niceDate(this.results[0]?.date)
      }

      const resultValues = []
      const resultLabels = []
      for (let i = this.results.length - 1; i >= 0; i--) {
        const r = this.results[i]

        this.results[i].dateNice = new Date(r.date).toLocaleString()
        this.results[i].statusDetails = getStatusFields(r.status)

        resultValues.push(r.value)
        resultLabels.push(r.date.replace('T', ' ').split('.')[0])
      }

      const chartStatus = Chart.getChart('graph')
      if (chartStatus !== undefined) {
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

  async deleteMonitor() {
    try {
      await api.deleteMonitor(this.monitor.id)
      window.location.hash = '#home'
    } catch (e) {
      this.error = e
    }
  },
})
