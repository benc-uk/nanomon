import { createContext } from 'react'
import { APIClient } from './api/api-client'
import { AppConfig } from './types'

interface Services {
  api: APIClient
}

export const ServicesContext = createContext<Services>({} as Services)

export function createServicesProvider(appConfig: AppConfig) {
  const services: Services = {
    api: new APIClient(appConfig.API_ENDPOINT),
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
