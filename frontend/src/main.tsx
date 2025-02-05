import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

// CSS
import 'bootswatch/dist/sandstone/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min'
import './index.css'

// Register the required components for Chart.js
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { AuthProviderMSAL } from './api/auth-provider-msal.ts'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

import App from './App.tsx'
import { createConfigProvider, createServicesProvider } from './providers.tsx'
import { AppConfig } from './types'

let msalApp: PublicClientApplication
let authProvider: AuthProviderMSAL | null = null
let config: AppConfig

// This scope is used to validate access to the API. The app registration must
// - be configured to allow & expose this scope. Also see services/api/server.go
const APP_SCOPE = 'system.admin'

// Async wrapper to fetch config before starting the app
async function startApp() {
  // Attempt to fetch the config from the server
  // NOTE 1: When running in dev mode, the local config file will be found and used
  // NOTE 2: The frontend gets it's version and build info from the backend
  try {
    const configResp = await fetch('/config.json')
    console.log(`### Fetching config from /config.json, status: ${configResp.status}`)
    if (configResp.ok) {
      config = (await configResp.json()) as AppConfig

      if (config.API_ENDPOINT === '' || !config.API_ENDPOINT) {
        throw new Error('Config was provided, but API_ENDPOINT is not set')
      }
    } else {
      throw new Error('Unable to fetch config')
    }

    // Setup MSAL & auth only if client ID is provided, otherwise it's disabled
    if (config.AUTH_CLIENT_ID) {
      console.log(`### Enabling MSAL auth for clientId: ${config.AUTH_CLIENT_ID}`)

      msalApp = new PublicClientApplication({
        auth: {
          clientId: config.AUTH_CLIENT_ID,
          redirectUri: window.location.origin,
          authority: `https://login.microsoftonline.com/${config.AUTH_TENANT}`,
        },
        cache: {
          cacheLocation: 'localStorage',
        },
      })
      await msalApp.initialize()

      // Auth provider, is a wrapper around MSAL for our API client & token acquisition
      authProvider = new AuthProviderMSAL(msalApp, [`api://${config.AUTH_CLIENT_ID}/${APP_SCOPE}`])
    }
  } catch (err) {
    console.warn(`### Config error: ${err as Error}`)
    console.log('### Internal defaults will be used')
    config = {
      API_ENDPOINT: 'http://localhost:8000/api',
      AUTH_CLIENT_ID: '',
      AUTH_TENANT: '',
      VERSION: '__DEFAULT__',
      BUILD_INFO: '__DEFAULT__',
      REFRESH_TIME: 15,
    }
  }

  config.REFRESH_TIME = config.REFRESH_TIME || 15
  console.log(`### App config: ${JSON.stringify(config)}`)

  const ServicesProvider = createServicesProvider(config, authProvider)
  const ConfigProvider = createConfigProvider(config)

  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <ServicesProvider>
        <ConfigProvider>
          {msalApp ? (
            <MsalProvider instance={msalApp}>
              <App />
            </MsalProvider>
          ) : (
            <App />
          )}
        </ConfigProvider>
      </ServicesProvider>
    </BrowserRouter>,
  )
}

// Start the app, can't use top-level await yet
await startApp()
