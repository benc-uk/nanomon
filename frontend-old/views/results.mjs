// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { config } from '../app.mjs'
import { getStatusFields } from '../lib/utils.mjs'

/** @param {import("../lib/api-client.mjs").APIClient} api */
export const resultsComponent = (api) => ({
  /** @type Nanomon.ResultExtended[] */
  results: [],

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

  /** @type Nanomon.Output */
  output: null,

  async init() {
    window.addEventListener('view-changed', async (/** @type CustomEvent */ e) => {
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

    /** @type Nanomon.ResultExtended[] */
    let results = []
    this.loading = true

    try {
      results = /** @type Nanomon.ResultExtended[] */ (await api.getResults(100))
      this.error = ''
    } catch (err) {
      this.error = err.message
      return
    }

    // Enhance results with nice date and status details
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
