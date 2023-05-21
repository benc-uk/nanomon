// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend
// ----------------------------------------------------------------------------

import { definitions } from '../definitions.mjs'

export const editComponent = (api) => ({
  error: '',
  monitor: null,
  types: ['http', 'ping', 'tcp'],
  monId: null,
  rulePop: false,
  def: definitions,
  saving: false,

  async init() {
    this.shown = false

    window.addEventListener('view-changed', async (e) => {
      const view = e.detail

      if (!view || !view.startsWith('#edit')) {
        return
      }

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
    }
  },

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

  // Simple form validator
  canSave() {
    let ok = this.monitor.name !== '' && this.monitor.type !== '' && this.monitor.interval !== '' && this.monitor.target !== ''

    // Regex to check interval ends with 's' or 'm' or 'h' and starts with floating point number
    const intervalRegex = /^(\d+\.?\d*)(s|m|h)$/
    if (!intervalRegex.test(this.monitor.interval)) {
      ok = false
    }

    return ok
  },

  // Not used
  appendRule(propName) {
    this.monitor.rule += ` && ${propName} == 'some value'`
  },
})
