import Alpine from 'https://unpkg.com/alpinejs@3.12.0/dist/module.esm.js'

import { APIClient } from '../lib/api-client.mjs'
import { showToast } from '../lib/toast.mjs'

import { homeComponent } from './views/home.mjs'
import { monitorComponent } from './views/monitor.mjs'
import { editComponent } from './views/edit.mjs'
import { dashComponent } from './views/dash.mjs'
import { resultsComponent } from './views/results.mjs'
import { aboutComponent } from './views/about.mjs'

let msalApp = null
export let config = {}

Alpine.data('app', () => ({
  view: '#home',
  api: null,
  userAccount: null,

  async init() {
    console.log('### Starting Monitr frontend')

    if (config.AUTH_CLIENT_ID) {
      msalApp = new msal.PublicClientApplication({
        auth: {
          clientId: config.AUTH_CLIENT_ID,
          redirectUri: window.location.origin,
        },
        cache: {
          cacheLocation: 'localStorage',
        },
        system: {
          loggerOptions: {
            loggerCallback: (level, message) => {
              console.log(`🔑 (${level}): ${message}`)
            },
            logLevel: 'verbose',
          },
        },
      })

      this.userAccount = msalApp.getActiveAccount()
      if (this.userAccount) {
        showToast(`Welcome ${this.userAccount.name}!`)
      }
    } else {
      this.userAccount = 'AUTH_DISABLED'
    }

    this.api = new APIClient(config.API_ENDPOINT, [`api://${config.AUTH_CLIENT_ID}/system.admin`], msalApp)

    // Support linking to specific views
    if (window.location.hash) {
      this.view = window.location.hash
      this.$nextTick(() => {
        window.dispatchEvent(new CustomEvent('view-changed', { detail: this.view }))
      })
    } else {
      window.location.hash = '#home'
    }

    // This updates the view when the hash changes
    window.addEventListener('hashchange', () => {
      this.view = window.location.hash
      window.dispatchEvent(new CustomEvent('view-changed', { detail: this.view }))
    })
  },

  async login() {
    try {
      const loginResp = await msalApp.loginPopup()
      console.log('### Logged in', loginResp)

      const allAccts = await msalApp.getAllAccounts()
      if (allAccts.length > 0) {
        const acct = allAccts[0]
        console.log('### Will activate account:', acct)
        await msalApp.setActiveAccount(acct)
        showToast(`Logged in!<br>Welcome ${acct.name}`)
        this.updateUser(acct)
      }
    } catch (err) {
      console.log('### Login failed', err)
      this.updateUser(null)
    }
  },

  logout() {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('msal') || key.includes('login') || key.startsWith('fake')) {
        localStorage.removeItem(key)
      }
    }

    this.updateUser(null)
  },

  updateUser(account) {
    this.userAccount = account
    window.dispatchEvent(new CustomEvent('user-changed', { detail: this.userAccount }))
  },
}))

Alpine.data('home', homeComponent)
Alpine.data('monitor', monitorComponent)
Alpine.data('edit', editComponent)
Alpine.data('dash', dashComponent)
Alpine.data('results', resultsComponent)
Alpine.data('about', aboutComponent)

async function startApp() {
  try {
    const configResp = await fetch('config')
    if (configResp.ok) {
      config = await configResp.json()
    } else {
      throw new Error('Unable to fetch config')
    }
  } catch (err) {
    console.warn('### Unable to fetch from /config. Defaults will be used')
    config = {
      API_ENDPOINT: 'http://localhost:8000/api',
      AUTH_CLIENT_ID: '',
      VERSION: '__DEFUALT__',
      BUILD_INFO: '__DEFUALT__',
    }
  }
  console.log(`### Config: ${JSON.stringify(config)}`)

  Alpine.start()
}

startApp()
