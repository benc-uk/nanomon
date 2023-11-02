// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend - Main app entry point
// ----------------------------------------------------------------------------

import Alpine from 'https://unpkg.com/alpinejs@3.x.x/dist/module.esm.js'

import { APIClient } from './lib/api-client.mjs'
import { showToast } from './lib/toast.mjs'

import { homeComponent } from './views/home.mjs'
import { monitorComponent } from './views/monitor.mjs'
import { editComponent } from './views/edit.mjs'
import { dashComponent } from './views/dash.mjs'
import { resultsComponent } from './views/results.mjs'
import { aboutComponent } from './views/about.mjs'

export let config = {}
let msalApp = null

// This scope is used to request access to the API
// The app registration must be configured to allow & expose this scope
// See services/api/server.go where this is also set
const appScope = 'system.admin'
let scopes = []

// Top level Alpine.js component
Alpine.data('app', () => ({
  // This is key to our lightweight routing/SPA approach
  view: '#home',

  // API client passed to some views
  api: null,

  // User account object, will be a string if auth is disabled
  userAccount: null,

  // This is called after Alpine.start()
  async init() {
    console.log('### Starting NanoMon frontend')

    // Set up the auth client using MSAL
    if (config.AUTH_CLIENT_ID) {
      // Create the MSAL app, this is our main interface to MSAL and Azure AD
      msalApp = new msal.PublicClientApplication({
        auth: {
          clientId: config.AUTH_CLIENT_ID,
          redirectUri: window.location.origin,
          authority: `https://login.microsoftonline.com/${config.AUTH_TENANT}`,
        },
        cache: {
          cacheLocation: 'localStorage',
        },
      })

      // Load any cached user
      this.userAccount = msalApp.getActiveAccount()
      if (this.userAccount) {
        showToast(`Welcome ${this.userAccount.name}!`)
        this.updateUser(this.userAccount)
      }
    } else {
      // Set a string value as the user account to indicate auth is disabled
      this.userAccount = 'AUTH_DISABLED'
    }

    // Save scopes array for further use
    scopes = [`api://${config.AUTH_CLIENT_ID}/${appScope}`]

    // Create the API client, passing in the MSAL app
    this.api = new APIClient(config.API_ENDPOINT, scopes, msalApp)

    // Support direct linking to specific views, when the page (re)loads
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
      console.log(`### User '${loginResp.account.username}' logged in`)

      const allAccts = await msalApp.getAllAccounts()
      if (allAccts.length > 0) {
        const acct = allAccts[0]

        await msalApp.setActiveAccount(acct)

        showToast(`Logged in!<br>Welcome ${acct.name}`)
        this.updateUser(acct)

        // Get an preemptive access token for the API, it will be cached
        try {
          const tokenResp = await msalApp.acquireTokenSilent({ scopes })
          console.log(`### Got a new access token, expires: ${tokenResp.expiresOn}`)
        } catch (e) {
          const tokenResp = await msalApp.acquireTokenPopup({ scopes })
          console.log(`### Got a new access token, expires: ${tokenResp.expiresOn}`)
        }
      }
    } catch (err) {
      console.dir(err)
      showToast(`Login Failed 😵<br>` + err, 15000)
      this.updateUser(null)
    }
  },

  async logout() {
    try {
      await msalApp.logoutPopup({
        account: this.userAccount,
        mainWindowRedirectUri: '/',
      })

      this.updateUser(null)
    } catch (err) {
      console.error(err)
    }
  },

  updateUser(account) {
    this.userAccount = account

    // We need to notify any components that care about the user
    window.dispatchEvent(new CustomEvent('user-changed', { detail: this.userAccount }))
  },
}))

// A sort of fake router, each view is a component
Alpine.data('home', homeComponent)
Alpine.data('monitor', monitorComponent)
Alpine.data('edit', editComponent)
Alpine.data('dash', dashComponent)
Alpine.data('results', resultsComponent)
Alpine.data('about', aboutComponent)

// Async wrapper to fetch config before starting Alpine
async function startApp() {
  // Attempt to fetch the config from the server
  // NOTE 1: When running in dev mode, the local config file will be found and used
  // NOTE 2: The frontend gets it's version and build info from the backend
  try {
    const configResp = await fetch('/config')
    if (configResp.ok) {
      config = await configResp.json()
    } else {
      throw new Error('Unable to fetch config')
    }
  } catch (err) {
    console.warn('### Unable to fetch from /config. Internal defaults will be used')
    config = {
      API_ENDPOINT: 'http://localhost:8000/api',
      AUTH_CLIENT_ID: '',
      VERSION: '__DEFAULT__',
      BUILD_INFO: '__DEFAULT__',
    }
  }
  console.log(`### Config: ${JSON.stringify(config)}`)

  Alpine.start()
}

// Begin here!
startApp()
