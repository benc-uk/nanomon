export const editComponent = (api) => ({
  error: '',
  monitor: null,
  types: ['http', 'ping', 'tcp'],
  monId: null,
  rulePop: false,
  ruleHints: {
    http: 'Outputs: <b>respTime, status, body, bodyLen</b><br>Functions: <b>bodyContains(str)</b>',
    ping: 'Outputs: <b>minRtt, avgRtt, maxRtt, packetsRecv, packetLoss, ipAddress</b>',
    tcp: 'Outputs: <b>respTime, ipAddress</b>',
  },
  allowedProps: {
    http: ['method', 'timeout'],
    ping: ['timeout', 'count', 'interval'],
    tcp: ['timeout'],
  },

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

  newHTTP() {
    this.monitor = {
      name: 'New HTTP Monitor',
      type: 'http',
      interval: '30s',
      enabled: true,
      target: 'http://example.net',
      rule: 'status == 200 && respTime < 1200',
      properties: {
        method: 'GET',
        timeout: '15s',
      },
    }
  },

  newPing() {
    this.monitor = {
      name: 'New Ping Monitor',
      type: 'ping',
      interval: '30s',
      enabled: true,
      target: 'localhost',
      rule: 'packetLoss == 0 && avgRtt < 10',
      properties: {
        timeout: '2s',
      },
    }
  },

  newTCP() {
    this.monitor = {
      name: 'New TCP Monitor',
      type: 'tcp',
      interval: '30s',
      enabled: true,
      target: 'database:3306',
      rule: 'respTime < 10',
      properties: {
        timeout: '5s',
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
