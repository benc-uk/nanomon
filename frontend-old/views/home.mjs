// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { config } from '../app.mjs'
import { getStatusFields, monitorIcon } from '../lib/utils.mjs'

import { Chart } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/+esm'

/** @type {Record<string, import('https://cdn.jsdelivr.net/npm/chart.js').Chart>} */
const charts = {}
const CHART_SIZE = 20

/** @param {import("../lib/api-client.mjs").APIClient} api */
export const homeComponent = (api) => ({
  /** @type Nanomon.Monitor[] */
  monitors: [],

  /** @type string */
  error: '',

  /** @type number */
  autoUpdate: config.refreshTime,

  /** @type Date */
  updated: new Date(),

  /** @type number */
  intervalToken: null,

  /** @type boolean */
  loading: true,

  /** @type string */
  updateText: 'Never updated',

  /** @type boolean */
  paused: false,

  async init() {
    window.addEventListener('view-changed', async (/** @type CustomEvent */ e) => {
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

    /** @type Nanomon.MonitorExtended[] */
    let monitorsNew = []
    this.loading = true

    try {
      monitorsNew = /** @type Nanomon.MonitorExtended[] */ (await api.getMonitors())
      this.error = ''
    } catch (err) {
      this.error = err.message
      return
    }

    this.updateText = new Date().toLocaleTimeString()

    // Collect all results for all monitors, needed for charts
    /** @type Record<string, Nanomon.Result[]> */
    const allResults = {}

    for (const m of monitorsNew) {
      const results = await api.getResultsForMonitor(m.id, CHART_SIZE)

      // Push results into allResults object
      allResults[m.id] = results

      const last = new Date(results[0]?.date)
      m.message = results[0]?.message
      m.lastRan = results[0]?.date ? last.toLocaleString() : 'Never'
      m.status = getStatusFields(m.enabled ? results[0]?.status : -1)
      m.icon = monitorIcon(m)
    }

    this.loading = false
    this.monitors = monitorsNew

    await this.updateCharts(allResults)
  },

  /** @param {Record<string, Nanomon.Result[]>} allResults */
  async updateCharts(allResults) {
    for (const m of this.monitors) {
      const results = allResults[m.id]

      // Build data arrays for chart

      /** @type number[] */
      const resultValues = []
      /** @type string[] */
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
      this.$nextTick(() => {
        const ctx = /** @type HTMLCanvasElement */ (document.getElementById(`chart_${m.id}`))
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
      })
    }
  },
})
