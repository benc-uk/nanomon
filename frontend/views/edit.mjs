// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { definitions } from '../definitions.mjs'
import { monitorIcon } from '../lib/utils.mjs'

/** @param {import("../lib/api-client.mjs").APIClient} api */
export const editComponent = (api) => ({
  /** @type string */
  error: '',

  /** @type {Nanomon.Monitor} */
  monitor: null,

  /** @type string[] */
  types: [],

  /** @type string */
  monId: null,

  /** @type boolean */
  rulePop: false,

  /** @type boolean */
  saving: false,

  monitorIcon,

  monitorDefs: definitions,

  async init() {
    this.shown = false

    window.addEventListener('view-changed', async (/** @type CustomEvent */ e) => {
      const view = e.detail

      if (!view || !view.startsWith('#edit')) {
        return
      }

      // Populate types using keys from definitions
      this.types = Object.keys(definitions)

      this.error = ''
      this.saving = false
      this.monId = view.split('#edit/')[1]
      if (this.monId === 'new') {
        this.newMonitor()
        return
      } else {
        if (!this.monId) {
          return
        }

        try {
          const monitor = await api.getMonitor(this.monId)
          this.monitor = monitor
        } catch (e) {
          this.error = e
        }
      }
    })
  },

  newMonitor() {
    this.monitor = {
      name: '',
      type: 'http',
      interval: '30s',
      enabled: true,
      target: '',
      rule: '',
      properties: {},
      updated: null,
    }
  },

  /** @param {string} monType */
  newFromTemplate(monType) {
    this.monitor = definitions[monType].template
  },

  // Save or create monitor using API
  async save() {
    this.saving = true

    try {
      if (this.monId === 'new') {
        await api.createMonitor(this.monitor)

        setTimeout(() => {
          window.location.hash = '#home'
        }, 500)
      } else {
        await api.updateMonitor(this.monId, this.monitor)

        setTimeout(() => {
          window.location.hash = '#monitor/' + this.monId
        }, 500)
      }
    } catch (e) {
      this.error = e
    }
  },

  /**
   * Simple form validation
   * @returns boolean
   */
  canSave() {
    let ok = this.monitor.name !== '' && this.monitor.type !== '' && this.monitor.interval !== '' && this.monitor.target !== ''

    // Regex to check interval ends with 's' or 'm' or 'h' and starts with floating point number
    const intervalRegex = /^(\d+\.?\d*)(s|m|h)$/
    if (!intervalRegex.test(this.monitor.interval)) {
      ok = false
    }

    return ok
  },

  /**
   * Get the title for the edit view depending on new or existing monitor
   * @returns string
   */
  title() {
    let title = this.monId === 'new' ? 'Create New Monitor' : 'Update Monitor'
    title += `<span class='float-end'>` + monitorIcon(this.monitor) + '</span>'
    return title
  },
})
