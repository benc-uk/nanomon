export const editComponent = (api) => ({
  error: '',
  monitor: {},
  types: ['http', 'ping', 'ssh', 'grpc'],

  async init() {
    this.shown = false

    window.addEventListener('view-changed', async (e) => {
      const view = e.detail

      if (!view || !view.startsWith('#edit')) return

      const monId = view.split('#edit/')[1]
      if (monId == 'new') {
        this.newMonitor()
        return
      }

      if (!monId) return

      this.monitor = await api.getMonitor(monId)
    })
  },

  newMonitor() {
    this.monitor = {
      name: '',
      type: 'http',
      interval: '30s',
      enabled: false,
    }
  },

  save() {
    console.log('saving', this.monitor)
  },

  canSave() {
    let ok = this.monitor.name != '' && this.monitor.type != '' && this.monitor.interval != ''

    // regex to check interval ends with 's' or 'm' or 'h' and starts with floating point number
    const intervalRegex = /^(\d+\.?\d*)(s|m|h)$/

    if (!intervalRegex.test(this.monitor.interval)) {
      ok = false
    }
    return ok
  },
})
