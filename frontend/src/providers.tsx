import { createContext, useContext } from 'react'
import { APIClient } from './api/api-client'
import { AppConfig } from './types'
import { AuthProvider } from './api/api-client-base'

interface Services {
  api: APIClient
}

export const ServicesContext = createContext<Services>({} as Services)

export function createServicesProvider(appConfig: AppConfig, authProvider: AuthProvider | null) {
  const services: Services = {
    api: new APIClient(appConfig.API_ENDPOINT, authProvider),
  }

  return ({ children }: { children: React.ReactNode }) => {
    return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  }
}

// ============================================================================

export const ConfigContext = createContext<AppConfig>({} as AppConfig)

export function createConfigProvider(appConfig: AppConfig) {
  return ({ children }: { children: React.ReactNode }) => {
    return <ConfigContext.Provider value={appConfig}>{children}</ConfigContext.Provider>
  }
}

// ============================================================================

export function useAPI() {
  const api = useContext(ServicesContext).api

  return api
}

export function useConfig() {
  const config = useContext(ConfigContext)

  return config
}
