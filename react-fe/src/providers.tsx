import { createContext } from 'react'
import { APIClient } from './lib/api-client.ts'
import { AppConfig } from './lib/types.ts'

// Create a global API client instance
interface Services {
  api: APIClient
}

export const ServicesContext = createContext<Services>({} as Services)

export function newServicesProvider(appConfig: AppConfig) {
  const services: Services = {
    api: new APIClient(appConfig.API_ENDPOINT),
  }

  return ({ children }: { children: React.ReactNode }) => {
    return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  }
}

// ============================================================================

export const ConfigContext = createContext<AppConfig>({} as AppConfig)

export function newConfigProvider(appConfig: AppConfig) {
  return ({ children }: { children: React.ReactNode }) => {
    return <ConfigContext.Provider value={appConfig}>{children}</ConfigContext.Provider>
  }
}
