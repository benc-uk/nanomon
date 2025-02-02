// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

// Use the bootswatch Sandstone theme
import 'bootswatch/dist/sandstone/bootstrap.min.css'

// Boostrap JS needed for modal dialogs
import 'bootstrap/dist/js/bootstrap.bundle.min'

import './index.css'

import App from './components/App.tsx'
import { createConfigProvider, createServicesProvider } from './providers.tsx'
import { AppConfig } from './types'
import { AuthProviderMSAL } from './auth-msal'

let config: AppConfig
let authProvider: AuthProviderMSAL
let scopes: string[]
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

    if (config.AUTH_CLIENT_ID) {
      // Create the auth provider, this is a wrapper around MSAL
      scopes = [`api://${config.AUTH_CLIENT_ID}/${APP_SCOPE}`]
      authProvider = new AuthProviderMSAL(config.AUTH_CLIENT_ID, scopes, config.AUTH_TENANT)
      await authProvider.initialize()
    }
  } catch (err) {
    console.warn('### Config error: ' + err)
    console.warn('### Internal defaults will be used')
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
  console.log(`### Config: ${JSON.stringify(config)}`)

  const ServicesProvider = createServicesProvider(config)
  const ConfigProvider = createConfigProvider(config)

  createRoot(document.getElementById('root')!).render(
    // <StrictMode>
    <BrowserRouter>
      <ServicesProvider>
        <ConfigProvider>
          <App />
        </ConfigProvider>
      </ServicesProvider>
    </BrowserRouter>
    /* </StrictMode> */
  )
}

// Start the app
startApp()
