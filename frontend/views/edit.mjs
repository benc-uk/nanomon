export const editComponent = (api) => ({
  error: '',
  monitor: {},
  types: ['http', 'ping', 'ssh', 'grpc'],
  monId: null,

  async init() {
    this.shown = false

    window.addEventListener('view-changed', async (e) => {
      const view = e.detail

      if (!view || !view.startsWith('#edit')) return

      this.monId = view.split('#edit/')[1]
      if (this.monId == 'new') {
        this.newMonitor()
        return
      } else {
        if (!this.monId) return

        this.monitor = await api.getMonitor(this.monId)
      }
    })
  },

  newMonitor() {
    // TODO: Support more monitor types!
    this.monitor = {
      name: '',
      type: 'http',
      interval: '30s',
      enabled: true,
      properties: {
        url: 'http://',
        method: 'GET',
        allowedStatus: '200-299',
        checkFor: '',
        notCheckFor: '',
      },
    }
  },

  async save() {
    try {
      if (this.monId == 'new') {
        await api.createMonitor(this.monitor)
        window.location.hash = '#home'
      } else {
        await api.updateMonitor(this.monId, this.monitor)
        window.location.hash = '#monitor/' + this.monId
      }
    } catch (e) {
      this.error = e
    }
  },

  canSave() {
    let ok = this.monitor.name != '' && this.monitor.type != '' && this.monitor.interval != ''

    // regex to check interval ends with 's' or 'm' or 'h' and starts with floating point number
    const intervalRegex = /^(\d+\.?\d*)(s|m|h)$/
    if (!intervalRegex.test(this.monitor.interval)) {
      ok = false
    }

    if (!this.monitor.properties?.url) {
      ok = false
    }

    return ok
  },
})
