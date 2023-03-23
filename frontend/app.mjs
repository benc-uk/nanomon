import Alpine from 'https://unpkg.com/alpinejs@3.12.0/dist/module.esm.js'

import { APIClient } from '../lib/api-client.mjs'
import { homeComponent } from './views/home.mjs'
import { monitorComponent } from './views/monitor.mjs'
import { editComponent } from './views/edit.mjs'
import { dashComponent } from './views/dash.mjs'

const VERSION = '0.0.1'

let API_ENDPOINT = 'http://localhost:8000'
let AUTH_CLIENT_ID = ''

Alpine.data('app', () => ({
  version: VERSION,
  view: '#home',
  api: null,

  async init() {
    console.log('### Starting Monitr frontend')
    console.log(`###  - Endpoint: ${API_ENDPOINT}, clientId: ${AUTH_CLIENT_ID || 'None'}`)
    this.api = new APIClient(API_ENDPOINT, ['monitr.admin'])
    if (window.location.hash) {
      this.view = window.location.hash
      this.$nextTick(() => {
        window.dispatchEvent(new CustomEvent('view-changed', { detail: this.view }))
      })
    } else {
      window.location.hash = '#home'
    }
  },

  hashListener() {
    this.view = window.location.hash
    window.dispatchEvent(new CustomEvent('view-changed', { detail: this.view }))
  },
}))

Alpine.data('home', homeComponent)
Alpine.data('monitor', monitorComponent)
Alpine.data('edit', editComponent)
Alpine.data('dash', dashComponent)

async function startApp() {
  try {
    console.log('### Loading config from .config')
    const configResp = await fetch('.config')
    if (configResp.ok) {
      const config = await configResp.json()
      API_ENDPOINT = config.API_ENDPOINT
      AUTH_CLIENT_ID = config.AUTH_CLIENT_ID
      console.log('### Config loaded:', config)
    }
  } catch (err) {
    console.warn("### The '.config' endpoint is missing. Defaults will be used")
  }

  Alpine.start()
}

startApp()
