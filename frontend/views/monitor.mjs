// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { APIClient } from '../lib/api-client.mjs'
import { getStatusFields, niceDate, monitorIcon, isEmpty } from '../lib/utils.mjs'

/**
 * @param {APIClient} api
 * @param {*} userAccount
 */
export const monitorComponent = (api, userAccount) => ({
  /** @type Nanomon.ResultExtended[] */
  results: [],

  /** @type Nanomon.Monitor */
  monitor: null,

  /** @type Nanomon.MonitorStatus */
  status: null,

  /** @type string */
  error: '',

  /** @type string */
  updatedDate: '',

  /** @type string */
  lastResultDate: '',

  /** @type string */
  icon: '',

  /** @type function */
  getStatusFields,

  /** @type function */
  isEmpty,

  /** @type any */
  userAccount,

  /** @type Nanomon.Output */
  output: {},

  async init() {
    this.shown = false

    window.addEventListener('view-changed', async (/** @type CustomEvent */ e) => {
      /** @type string */
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

    window.addEventListener('user-changed', (/** @type CustomEvent */ e) => {
      this.userAccount = e.detail
    })
  },

  /** @param {string} monId */
  async loadMonitor(monId) {
    this.monitor = null
    this.results = []
    this.status = null
    this.lastResultDate = null
    this.error = ''

    try {
      this.monitor = await api.getMonitor(monId)
      this.results = /** @type Nanomon.ResultExtended[] */ (await api.getResultsForMonitor(monId, 50))

      this.updatedDate = niceDate(this.monitor.updated)
      this.icon = monitorIcon(this.monitor)

      if (this.results.length > 0) {
        this.status = getStatusFields(this.monitor.enabled ? this.results[0].status : -1)
        this.lastResultDate = niceDate(this.results[0]?.date)
      }

      /** @type number[] */
      const resultValues = []

      /** @type string[] */
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
                label: 'Result Value',
                data: resultValues,
              },
            ],
          },
          options: {
            plugins: {},
            scales: {
              y: {
                beginAtZero: false,
              },
            },
          },
        })
      }
    } catch (err) {
      console.error(err)

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
