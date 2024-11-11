//
// As remote type definitions are not supported
//

declare module 'https://cdn.jsdelivr.net/gh/benc-uk/js-library@main/api-client.mjs' {
  type Headers = Record<string, string>

  export type APIClientConfig = {
    verbose?: boolean
    headers?: Headers
    delay?: number
    authProvider?: import('https://cdn.jsdelivr.net/gh/benc-uk/js-library@main/auth-provider-msal.mjs').AuthProvider
    success?: (response: Response) => boolean
  }

  export class APIClient {
    constructor(endpoint: string, config?: APIClientConfig)
    _request(path: string, method?: string, payload?: any, auth?: boolean, reqHeaders?: Headers): Promise<any>
  }
}

declare module 'https://cdn.jsdelivr.net/gh/benc-uk/js-library@main/auth-provider-msal.mjs' {
  interface AuthProvider {
    getAccessToken(): string
    initialize(): void
  }

  class AuthProviderMSAL implements AuthProvider {
    constructor(clientId: string, scopes: string[], tenantId: string)
    getAccessToken(): string
    initialize(): void

    msalApp: any
  }

  type UserAccount = {
    name: string
    username?: string
    environment?: string
    tenantId?: string
  }
}

declare module 'https://cdn.jsdelivr.net/gh/benc-uk/js-library@main/toast.mjs' {
  export function showToast(message: string, time?: number): void
}
