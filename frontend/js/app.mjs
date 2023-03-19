import Alpine from 'https://unpkg.com/alpinejs@3.12.0/dist/module.esm.js'
// import { Chart } from '../lib/dist/chart.js'

import { APIClient } from './api-client.mjs'

const VERSION = '0.0.1'

const charts = {}
let api = null

Alpine.data('app', () => ({
  page: '',
  version: VERSION,
  monitors: [],

  async init() {
    console.log(`### Monitr frontend`)
    api = new APIClient('http://localhost:8000', ['monitr.admin'])

    await this.fetchMonitors()

    setInterval(async () => {
      await this.fetchMonitors()
    }, 3000)
  },

  async fetchMonitors() {
    const mons = await api.getMonitors()

    for (let m of mons) {
      const results = await api.getResultsForMonitor(m.id, 1)
      m.status = results[0]?.status
      m.message = results[0]?.message
      m.lastRan = results[0]?.date.replace('T', ' ').split('.')[0]
      setStatusFields(m)
    }

    this.monitors = mons

    this.updateCharts()
  },

  async updateCharts() {
    for (let m of this.monitors) {
      const results = await api.getResultsForMonitor(m.id, 20)

      const resultValues = []
      const resultLabels = []
      for (let r of results) {
        resultValues.push(r.duration)
        resultLabels.push(r.date.replace('T', ' ').split('.')[0])
      }
      resultValues.reverse()

      if (charts[m.id]) {
        charts[m.id].data.datasets[0].data = resultValues
        charts[m.id].data.labels = resultLabels
        charts[m.id].update('none')
        continue
      }

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
}))

Alpine.start()

function setStatusFields(mon) {
  switch (mon.status) {
    case 0:
      mon.statusText = 'Good'
      mon.statusClass = 'bg-success'
      break
    case 1:
      mon.statusText = 'Error'
      mon.statusClass = 'bg-danger text-light'
      break
    case 2:
      mon.statusText = 'Timeout'
      mon.statusClass = 'bg-warning text-dark'
      break
    case 3:
      mon.statusText = 'Checks Failed'
      mon.statusClass = 'bg-warning text-dark'
      break
    case 4:
      mon.statusText = 'Failed'
      mon.statusClass = 'bg-secondary'
      break
    case 5:
      mon.statusText = 'Breach'
      mon.statusClass = 'bg-warning text-dark'
      break
    default:
      mon.statusText = 'Unknown'
      mon.statusClass = 'bg-info text-light'
  }
}
