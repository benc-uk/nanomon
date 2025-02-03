import { AuthenticationResult, PublicClientApplication } from '@azure/msal-browser'
import { AuthProvider } from './api-client-base'

export class AuthProviderMSAL implements AuthProvider {
  private msalApp: PublicClientApplication
  private scopes: string[]

  constructor(msalApp: PublicClientApplication, scopes: string[]) {
    msalApp.initialize()
    this.msalApp = msalApp
    this.scopes = scopes
  }

  async getAccessToken(): Promise<string> {
    let authResult: AuthenticationResult | null = null

    // Login if no active account
    if (this.msalApp.getActiveAccount() === null) {
      await this.msalApp.loginPopup()

      const accounts = this.msalApp.getAllAccounts()
      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      console.log('### Setting active account:', accounts[0].username)
      this.msalApp.setActiveAccount(accounts[0])
    }

    // Try to get token silently, if that fails, use popup
    try {
      authResult = await this.msalApp.acquireTokenSilent({
        scopes: this.scopes,
      })
    } catch (error) {
      console.error('### MSAL silent token acquisition failed:', error)
      authResult = await this.msalApp.acquireTokenPopup({
        scopes: this.scopes,
      })
    }

    return authResult.accessToken
  }
}
