export const editComponent = (api) => ({
  error: '',
  monitor: null,
  types: ['http', 'ping', 'tcp'],
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
    // TODO: Support more monitor types!
    this.monitor = {
      name: '',
      type: 'http',
      interval: '30s',
      enabled: true,
      target: 'http://',
      rule: 'status == 200 && respTime < 1200',
      properties: {
        method: 'GET',
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
    let ok = this.monitor.name != '' && this.monitor.type != '' && this.monitor.interval != '' && this.monitor.target != ''

    // regex to check interval ends with 's' or 'm' or 'h' and starts with floating point number
    const intervalRegex = /^(\d+\.?\d*)(s|m|h)$/
    if (!intervalRegex.test(this.monitor.interval)) {
      ok = false
    }

    return ok
  },
})
